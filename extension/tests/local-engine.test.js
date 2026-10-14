import { describe, test, expect, beforeEach, vi } from "vitest";
import { AgentError } from "../sidepanel/agent/llm-client.js";

const store = {};
globalThis.chrome = {
  runtime: {},
  storage: {
    local: {
      get: async (k) => (k in store ? { [k]: store[k] } : {}),
      set: async (o) => Object.assign(store, o),
      remove: async (k) => { for (const key of [].concat(k)) delete store[key]; },
    },
  },
};

const runs = [];
let script; // (request) => { events: EngineEvent[], toolCalls?: [name,args][] }
vi.mock("../sidepanel/agent/engines/bridge-client.js", () => ({
  runBridge: async (request, { onEvent, onToolCall }) => {
    runs.push(request);
    const { events, toolCalls = [], throws } = script(request, runs.length);
    if (throws) throw throws;
    for (const [name, args] of toolCalls) request._toolResults = [...(request._toolResults || []), await onToolCall(name, args)];
    for (const e of events) onEvent(e);
  },
}));
vi.mock("../sidepanel/tools/index.js", () => ({
  ALL_TOOLS: [{ name: "grep", description: "g", input_schema: {} }, { name: "Task" }, { name: "TodoWrite" }, { name: "think" }],
  CAPTURE_SCREENSHOT_TOOL: { name: "capture_screenshot", description: "c", input_schema: {} },
  executeTool: async (name) => (name === "capture_screenshot" ? { _screenshot_result: true, dataUrl: "data:image/png;base64,QUJD" } : `ran ${name}`),
  normalizeToolResult: (v) => (typeof v === "string" ? v : JSON.stringify(v)),
}));

const { runLocalEngine, LOCAL_TOOLS, toMcpContent } = await import("../sidepanel/agent/engines/local-engine.js");

function ui() {
  const calls = [];
  const rec = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    cb: {
      appendText: rec("text"), appendReasoning: rec("reasoning"), showToolCall: rec("toolCall"),
      showToolResult: rec("toolResult"), showToolExecuting: rec("executing"), onNewIteration: rec("newIteration"),
      onEngineStarting: rec("starting"), onEngineStarted: rec("started"), onEngineNotice: rec("notice"),
    },
  };
}

const base = { engine: "codex", prompt: "make it dark", system: "SYS", tabId: 1, domain: "a.com", sessionId: "s1", history: [{ role: "user", content: "earlier" }] };
const signal = new AbortController().signal;
// 最近一条助手消息出自同一引擎 → 可续接
const resumable = { ...base, history: [...base.history, { role: "assistant", content: [{ type: "text", text: "ok" }], _engine: "codex" }] };

beforeEach(() => { runs.length = 0; for (const k of Object.keys(store)) delete store[k]; });

describe("tools", () => {
  test("LOCAL_TOOLS drops loop-only tools and adds screenshot", () => {
    expect(LOCAL_TOOLS.map((t) => t.name)).toEqual(["grep", "capture_screenshot"]);
  });
  test("toMcpContent maps screenshots to image content", () => {
    expect(toMcpContent({ _screenshot_result: true, dataUrl: "data:image/png;base64,QUJD" })).toEqual([{ type: "image", mimeType: "image/png", data: "QUJD" }]);
    expect(toMcpContent("ok")).toEqual([{ type: "text", text: "ok" }]);
  });
});

describe("runLocalEngine", () => {
  test("first run carries the transcript, stores session id, returns joined text", async () => {
    script = () => ({ events: [
      { type: "session", id: "thread-1" },
      { type: "text", text: "Done." },
      { type: "tool_use", id: "i0", name: "grep", input: {} },
      { type: "tool_result", id: "i0", text: "found" },
      { type: "text", text: "All set." },
    ] });
    const { calls, cb } = ui();
    const reply = await runLocalEngine(base, cb, signal);
    expect(runs[0].prompt).toBe("[Previous conversation]\nUser: earlier\n\n[Current request]\nmake it dark");
    expect(runs[0].resume).toBeUndefined();
    expect(store["engine_session:codex:a.com:s1"]).toBe("thread-1");
    expect(reply).toBe("Done.\n\nAll set.");
    expect(calls.map((c) => c[0])).toEqual(["starting", "started", "text", "toolCall", "toolResult", "newIteration", "text"]);
    expect(calls.find((c) => c[0] === "starting")[1]).toBe("Codex");
  });

  test("with a stored session it resumes and sends the bare prompt", async () => {
    store["engine_session:codex:a.com:s1"] = "thread-1";
    script = () => ({ events: [{ type: "text", text: "ok" }] });
    await runLocalEngine(resumable, ui().cb, signal);
    expect(runs[0]).toMatchObject({ resume: "thread-1", prompt: "make it dark" });
  });

  test("resume failing before any progress → drop mapping, notice, rerun with transcript", async () => {
    store["engine_session:codex:a.com:s1"] = "gone";
    script = (_req, n) => (n === 1
      ? { events: [{ type: "error", code: "LOCAL_ENGINE_ERROR", message: "session not found" }] }
      : { events: [{ type: "session", id: "thread-2" }, { type: "text", text: "fresh" }] });
    const { calls, cb } = ui();
    expect(await runLocalEngine(resumable, cb, signal)).toBe("fresh");
    expect(runs[1].resume).toBeUndefined();
    expect(runs[1].prompt).toMatch(/^\[Previous conversation\]/);
    expect(store["engine_session:codex:a.com:s1"]).toBe("thread-2");
    expect(calls.some((c) => c[0] === "notice")).toBe(true);
  });

  test("errors after progress are thrown as AgentError with the engine's code", async () => {
    store["engine_session:codex:a.com:s1"] = "thread-1";
    script = () => ({ events: [{ type: "text", text: "partial" }, { type: "error", code: "LOCAL_QUOTA", message: "usage limit" }] });
    await expect(runLocalEngine(resumable, ui().cb, signal)).rejects.toMatchObject({ code: "LOCAL_QUOTA", message: "usage limit" });
    expect(runs).toHaveLength(1);
  });

  test("non-engine errors before progress on a resumed run do not trigger the fallback", async () => {
    store["engine_session:codex:a.com:s1"] = "thread-1";
    script = () => ({ events: [{ type: "error", code: "LOCAL_QUOTA", message: "usage limit" }] });
    const { calls, cb } = ui();
    await expect(runLocalEngine(resumable, cb, signal)).rejects.toMatchObject({ code: "LOCAL_QUOTA" });
    expect(runs).toHaveLength(1);
    expect(store["engine_session:codex:a.com:s1"]).toBe("thread-1");
    expect(calls.some((c) => c[0] === "notice")).toBe(false);
  });

  test.each([
    ["another local engine", { _engine: "claude-code" }],
    ["the built-in engine", {}],
  ])("last assistant turn by %s → drop the stale mapping and run fresh with the transcript", async (_label, tag) => {
    store["engine_session:codex:a.com:s1"] = "thread-old";
    script = () => ({ events: [{ type: "session", id: "thread-new" }, { type: "text", text: "ok" }] });
    const history = [...resumable.history, { role: "user", content: "in between" }, { role: "assistant", content: [{ type: "text", text: "other" }], ...tag }];
    const { calls, cb } = ui();
    await runLocalEngine({ ...base, history }, cb, signal);
    expect(runs).toHaveLength(1);
    expect(runs[0].resume).toBeUndefined();
    expect(runs[0].prompt).toMatch(/^\[Previous conversation\][\s\S]*in between/);
    expect(store["engine_session:codex:a.com:s1"]).toBe("thread-new");
    expect(calls.some((c) => c[0] === "notice")).toBe(false);
  });

  test("a rejecting bridge still clears the starting state", async () => {
    script = () => ({ events: [], throws: new AgentError("LOCAL_BRIDGE_UNAVAILABLE", "no bridge") });
    const { calls, cb } = ui();
    await expect(runLocalEngine(base, cb, signal)).rejects.toMatchObject({ code: "LOCAL_BRIDGE_UNAVAILABLE" });
    expect(calls.map((c) => c[0])).toEqual(["starting", "started"]);
  });

  test("tool calls are executed through executeTool", async () => {
    let req;
    script = (r) => { req = r; return { events: [], toolCalls: [["grep", { q: 1 }], ["capture_screenshot", {}]] }; };
    const { calls, cb } = ui();
    await runLocalEngine(base, cb, signal);
    expect(req._toolResults).toEqual([[{ type: "text", text: "ran grep" }], [{ type: "image", mimeType: "image/png", data: "QUJD" }]]);
    expect(calls.filter((c) => c[0] === "executing").map((c) => c[1])).toEqual(["grep", "capture_screenshot"]);
  });

  test("tool names outside LOCAL_TOOLS are rejected without executing", async () => {
    let req;
    script = (r) => { req = r; return { events: [], toolCalls: [["Task", {}], ["rm_rf", {}]] }; };
    const { calls, cb } = ui();
    await runLocalEngine(base, cb, signal);
    expect(req._toolResults).toEqual([[{ type: "text", text: "Error: unknown tool Task" }], [{ type: "text", text: "Error: unknown tool rm_rf" }]]);
    expect(calls.some((c) => c[0] === "executing")).toBe(false);
  });
});
