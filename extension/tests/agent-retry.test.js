/**
 * 回归：AgentError 发生在首次回复前时，不保存本轮用户消息（否则「重试」会重复它）
 */
import { test, expect, vi } from "vitest";

const saveHistory = vi.fn();

vi.mock("../sidepanel/tools.js", () => ({
  BASE_TOOLS: [],
  SUBAGENT_TOOLS: [],
  ALL_TOOLS: [],
  getSkillManager: async () => null,
  getTargetTabId: async () => 1,
  lockTab: () => {},
  unlockTab: () => {},
  executeTool: async () => "",
}));

vi.mock("../sidepanel/session.js", () => ({
  resolveSession: async () => ({ id: "s1", scope: "domain", path: null }),
  extractPath: () => "/",
  loadAndPrepareHistory: async () => ({
    messages: [{ role: "user", content: "old" }],
    snapshots: {},
  }),
  saveHistory,
  loadSessionMeta: async () => ({}),
  saveSessionMeta: async () => {},
  SessionContext: class {},
  setCurrentSession: () => {},
  currentSession: null,
  countUserTextMessages: () => 1,
}));

vi.mock("../sidepanel/profile.js", () => ({ getProfileOneLiner: async () => "" }));
vi.mock("../sidepanel/api.js", () => ({
  getSettings: async () => ({ model: "m" }),
  DEFAULT_MODEL: "m",
}));

vi.mock("../sidepanel/agent/llm-client.js", async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    callLLMStreamSafe: async () => {
      throw new actual.AgentError("RATE_LIMITED", "429");
    },
  };
});

test("首次回复前失败：保存的历史不含本轮用户消息", async () => {
  vi.stubGlobal("chrome", {
    runtime: {},
    storage: { local: { get: async () => ({}), set: async () => {} } },
    tabs: {
      get: async () => ({ url: "https://example.com/" }),
      sendMessage: (_id, _msg, cb) => cb("example.com"),
    },
  });

  const { agentLoop } = await import("../sidepanel/agent/agent-loop.js");
  await expect(agentLoop("P", {})).rejects.toMatchObject({ code: "RATE_LIMITED" });

  expect(saveHistory).toHaveBeenCalledOnce();
  expect(saveHistory.mock.calls[0][2].messages).toEqual([{ role: "user", content: "old" }]);
});
