import { describe, test, expect, beforeEach } from "vitest";

const store = {};
globalThis.chrome = {
  storage: {
    local: {
      get: async (k) => (k in store ? { [k]: store[k] } : {}),
      set: async (o) => Object.assign(store, o),
    },
  },
};

const { getEngine, setEngine, isLocalEngine, engineSessionKey } = await import("../sidepanel/agent/engines/prefs.js");
const { stripSections, buildLocalSystemPrompt, buildTranscript, withTranscript } = await import("../sidepanel/agent/engines/local-prompt.js");

describe("engine prefs", () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  test("defaults to builtin and ignores unknown ids", async () => {
    expect(await getEngine()).toBe("builtin");
    store.agent_engine = "gpt-agent";
    expect(await getEngine()).toBe("builtin");
    await setEngine("codex");
    expect(await getEngine()).toBe("codex");
  });

  test("local flags and session key", () => {
    expect(isLocalEngine("builtin")).toBe(false);
    expect(isLocalEngine("claude-code")).toBe(true);
    expect(engineSessionKey("codex", "a.com", "s1")).toBe("engine_session:codex:a.com:s1");
  });
});

describe("local system prompt", () => {
  test("stripSections removes whole sections by title", () => {
    const p = "intro\n## A\na body\n## B\nb body\n## C\nc body\n";
    expect(stripSections(p, ["B"])).toBe("intro\n## A\na body\n## C\nc body\n");
  });

  test("drops builtin-only sections and adds context + styles summary", () => {
    const out = buildLocalSystemPrompt({ sessionContext: "\n[Session Context]\nDomain: a.com\n", skillDescriptions: "\n[Available Skills]\n", stylesSummary: "3 条规则" });
    expect(out).not.toMatch(/## Task Planning/);
    expect(out).not.toMatch(/## Quality Audit/);
    expect(out).not.toMatch(/## Think Tool Usage/);
    expect(out).toMatch(/## Trust & Security/);
    expect(out).toMatch(/Domain: a\.com/);
    expect(out).toMatch(/Applied Styles: 3 条规则/);
    expect(out).toMatch(/capture_screenshot/);
  });

  test("omits styles line when nothing applied", () => {
    expect(buildLocalSystemPrompt({ sessionContext: "", skillDescriptions: "" })).not.toMatch(/Applied Styles/);
  });
});

describe("transcript", () => {
  test("keeps text turns from any engine, skips tool-only and compressed messages", () => {
    const history = [
      { role: "user", content: "make it dark" },
      { role: "assistant", content: [{ type: "text", text: "done" }, { type: "tool_use", id: "t", name: "x", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "ok" }] },
      { role: "user", content: "old", _isCompressed: true },
      { role: "assistant", content: "via codex", _engine: "codex" },
    ];
    expect(buildTranscript(history)).toBe("User: make it dark\nAssistant: done\nAssistant: via codex");
  });

  test("keeps most recent turns within the limit", () => {
    const history = [{ role: "user", content: "a".repeat(50) }, { role: "user", content: "recent" }];
    expect(buildTranscript(history, 20)).toBe("User: recent");
  });

  test("a single oversized latest message keeps its tail instead of becoming empty", () => {
    const out = buildTranscript([{ role: "assistant", content: "x".repeat(100) + "END" }], 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("END")).toBe(true);
  });

  test("withTranscript wraps only when there is history", () => {
    expect(withTranscript("hi", "")).toBe("hi");
    expect(withTranscript("hi", "User: a")).toBe("[Previous conversation]\nUser: a\n\n[Current request]\nhi");
  });
});
