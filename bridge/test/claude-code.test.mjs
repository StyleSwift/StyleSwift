// @vitest-environment node
import { describe, test, expect } from "vitest";
import { buildClaudeArgs, mapClaudeEvent, claudeWorkDir, claudeRunFiles } from "../adapters/claude-code.mjs";

describe("buildClaudeArgs", () => {
  test("locks down tools and settings", () => {
    const args = buildClaudeArgs({ systemFile: "/t/s.md", mcpFile: "/t/m.json" });
    const flag = (f) => args[args.indexOf(f) + 1];
    expect(args[0]).toBe("-p");
    expect(flag("--tools")).toBe("");
    expect(flag("--setting-sources")).toBe("");
    expect(flag("--allowedTools")).toBe("mcp__styleswift");
    expect(args).toContain("--strict-mcp-config");
    expect(flag("--system-prompt-file")).toBe("/t/s.md");
    expect(flag("--mcp-config")).toBe("/t/m.json");
    expect(args).not.toContain("--resume");
  });
  test("adds --resume when given", () => {
    const args = buildClaudeArgs({ systemFile: "s", mcpFile: "m", resume: "abc-123" });
    expect(args.slice(-2)).toEqual(["--resume", "abc-123"]);
  });
});

describe("work dir", () => {
  test("cwd is stable per workRoot (resume depends on it), files are unique per run", () => {
    expect(claudeWorkDir("/tmp/ss")).toBe(claudeWorkDir("/tmp/ss"));
    const a = claudeRunFiles("/tmp/ss");
    const b = claudeRunFiles("/tmp/ss");
    expect(a.systemFile).not.toBe(b.systemFile);
    expect(a.mcpFile).not.toBe(b.mcpFile);
  });
});

describe("mapClaudeEvent", () => {
  test("init → session", () => {
    expect(mapClaudeEvent({ type: "system", subtype: "init", session_id: "s1" })).toEqual([{ type: "session", id: "s1" }]);
  });
  test("assistant blocks → text / thinking / tool_use (prefix stripped)", () => {
    expect(mapClaudeEvent({
      type: "assistant",
      message: { content: [
        { type: "thinking", thinking: "hmm" },
        { type: "text", text: "hi" },
        { type: "tool_use", id: "t1", name: "mcp__styleswift__grep", input: { query: "h1" } },
      ] },
    })).toEqual([
      { type: "thinking", text: "hmm" },
      { type: "text", text: "hi" },
      { type: "tool_use", id: "t1", name: "grep", input: { query: "h1" } },
    ]);
  });
  test("user tool_result → tool_result", () => {
    expect(mapClaudeEvent({
      type: "user",
      message: { content: [{ type: "tool_result", tool_use_id: "t1", content: [{ type: "text", text: "found" }] }] },
    })).toEqual([{ type: "tool_result", id: "t1", text: "found" }]);
  });
  test("result → result or classified error", () => {
    expect(mapClaudeEvent({ type: "result", is_error: false, result: "done", usage: { input_tokens: 5 } }))
      .toEqual([{ type: "result", usage: { input_tokens: 5 } }]);
    expect(mapClaudeEvent({ type: "result", is_error: true, result: "Not logged in · Please run /login" }))
      .toEqual([{ type: "error", code: "LOCAL_NOT_LOGGED_IN", message: "Not logged in · Please run /login" }]);
  });
  test("unknown events are ignored", () => {
    expect(mapClaudeEvent({ type: "stream_event" })).toEqual([]);
  });
});
