// @vitest-environment node
import { describe, test, expect } from "vitest";
import { buildCodexArgs, mapCodexEvent, readCodexModel, CODEX_TOOL_HINT } from "../adapters/codex.mjs";

describe("readCodexModel", () => {
  test("reads only top-level keys", () => {
    const toml = 'model = "gpt-5.5"\nmodel_reasoning_effort = "high"\n\n[profiles.x]\nmodel = "other"\n';
    expect(readCodexModel(toml)).toEqual({ model: "gpt-5.5", effort: "high" });
  });
  test("missing keys → undefined", () => {
    expect(readCodexModel("[features]\nx = true\n")).toEqual({ model: undefined, effort: undefined });
  });
});

describe("buildCodexArgs", () => {
  const base = { mcpUrl: "http://127.0.0.1:9/mcp" };
  test("locks down built-ins and wires MCP", () => {
    const args = buildCodexArgs(base);
    const configs = args.flatMap((a, i) => (a === "-c" ? [args[i + 1]] : []));
    const disabled = args.flatMap((a, i) => (a === "--disable" ? [args[i + 1]] : []));
    expect(args.slice(0, 2)).toEqual(["exec", "--json"]);
    expect(args).toEqual(expect.arrayContaining(["--ignore-user-config", "--ignore-rules", "--skip-git-repo-check"]));
    expect(configs).toEqual(expect.arrayContaining([
      "sandbox_mode=read-only",
      "approval_policy=never",
      "web_search=disabled",
      "include_apply_patch_tool=false",
      "skills.include_instructions=false",
      "mcp_servers.styleswift.url=http://127.0.0.1:9/mcp",
      "mcp_servers.styleswift.bearer_token_env_var=STYLESWIFT_MCP_TOKEN",
      "mcp_servers.styleswift.default_tools_approval_mode=approve",
    ]));
    expect(disabled.sort()).toEqual(["apps", "goals", "image_generation", "multi_agent", "plugins", "shell_tool"]);
    expect(args.at(-1)).toBe("-");
  });
  test("no argument contains a double quote (safe for .cmd shells)", () => {
    expect(buildCodexArgs({ ...base, model: "gpt-5.5", effort: "high", resume: "u-1" }).some((a) => a.includes('"'))).toBe(false);
  });
  test("resume and model placement", () => {
    const args = buildCodexArgs({ ...base, resume: "u-1", model: "gpt-5.5", effort: "high" });
    expect(args.slice(0, 4)).toEqual(["exec", "resume", "u-1", "--json"]);
    expect(args[args.indexOf("-m") + 1]).toBe("gpt-5.5");
    expect(args).toContain("model_reasoning_effort=high");
  });
});

describe("mapCodexEvent", () => {
  test("thread.started → session", () => {
    expect(mapCodexEvent({ type: "thread.started", thread_id: "t-1" })).toEqual([{ type: "session", id: "t-1" }]);
  });
  test("mcp tool call lifecycle", () => {
    expect(mapCodexEvent({ type: "item.started", item: { id: "i0", type: "mcp_tool_call", tool: "grep", arguments: { query: "h1" } } }))
      .toEqual([{ type: "tool_use", id: "i0", name: "grep", input: { query: "h1" } }]);
    expect(mapCodexEvent({ type: "item.completed", item: { id: "i0", type: "mcp_tool_call", result: { content: [{ type: "text", text: "ok" }] }, error: null } }))
      .toEqual([{ type: "tool_result", id: "i0", text: "ok" }]);
    expect(mapCodexEvent({ type: "item.completed", item: { id: "i1", type: "mcp_tool_call", result: null, error: { message: "denied" } } }))
      .toEqual([{ type: "tool_result", id: "i1", text: "Error: denied" }]);
  });
  test("agent_message / reasoning / turn.completed", () => {
    expect(mapCodexEvent({ type: "item.completed", item: { type: "agent_message", text: "hi" } })).toEqual([{ type: "text", text: "hi" }]);
    expect(mapCodexEvent({ type: "item.completed", item: { type: "reasoning", text: "r" } })).toEqual([{ type: "thinking", text: "r" }]);
    expect(mapCodexEvent({ type: "turn.completed", usage: { input_tokens: 1 } })).toEqual([{ type: "result", usage: { input_tokens: 1 } }]);
  });
  test("turn.failed unwraps the nested JSON error message", () => {
    const message = JSON.stringify({ type: "error", status: 400, error: { message: "The 'gpt-6' model requires a newer version of Codex." } });
    expect(mapCodexEvent({ type: "turn.failed", error: { message } })).toEqual([
      { type: "error", code: "LOCAL_ENGINE_ERROR", message: "The 'gpt-6' model requires a newer version of Codex." },
    ]);
  });
  test("top-level error is ignored (turn.failed follows it)", () => {
    expect(mapCodexEvent({ type: "error", message: "x" })).toEqual([]);
  });
});

test("tool hint tells the model to load deferred styleswift tools", () => {
  expect(CODEX_TOOL_HINT).toMatch(/tool_search/);
  expect(CODEX_TOOL_HINT).toMatch(/styleswift/);
});
