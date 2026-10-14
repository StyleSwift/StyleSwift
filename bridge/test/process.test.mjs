// @vitest-environment node
import { describe, test, expect } from "vitest";
import { pickBin, quoteArg, classifyError, contentText, streamCli } from "../lib/process.mjs";

describe("pickBin", () => {
  test("windows prefers .exe, then .cmd, ignores extensionless shims", () => {
    expect(pickBin(["C:\\npm\\codex", "C:\\npm\\codex.cmd", "C:\\bin\\codex.exe"], "win32")).toBe("C:\\bin\\codex.exe");
    expect(pickBin(["C:\\npm\\codex", "C:\\npm\\codex.cmd"], "win32")).toBe("C:\\npm\\codex.cmd");
    expect(pickBin(["C:\\npm\\codex"], "win32")).toBeNull();
  });
  test("posix takes the first hit", () => {
    expect(pickBin(["/usr/local/bin/claude"], "darwin")).toBe("/usr/local/bin/claude");
    expect(pickBin([], "linux")).toBeNull();
  });
});

describe("quoteArg", () => {
  test("quotes safe args including empty string", () => {
    expect(quoteArg("--tools")).toBe('"--tools"');
    expect(quoteArg("")).toBe('""');
    expect(quoteArg("mcp_servers.styleswift.url=http://127.0.0.1:5/mcp")).toBe('"mcp_servers.styleswift.url=http://127.0.0.1:5/mcp"');
  });
  test("rejects cmd metacharacters", () => {
    for (const bad of ['a"b', "50%", "a&b", "a|b", "a^b", "a<b", "a>b", "a!b"]) {
      expect(() => quoteArg(bad)).toThrow(/Unsafe/);
    }
  });
});

describe("classifyError", () => {
  test.each([
    ["Not logged in · Please run /login", "LOCAL_NOT_LOGGED_IN"],
    ["401 Unauthorized", "LOCAL_NOT_LOGGED_IN"],
    ["You've hit your usage limit", "LOCAL_QUOTA"],
    ["429 Too Many Requests", "LOCAL_QUOTA"],
    ["The 'gpt-6' model requires a newer version of Codex.", "LOCAL_ENGINE_ERROR"],
    ["", "LOCAL_ENGINE_ERROR"],
  ])("%s → %s", (text, code) => expect(classifyError(text)).toBe(code));
});

describe("contentText", () => {
  test("joins text blocks and labels others", () => {
    expect(contentText("plain")).toBe("plain");
    expect(contentText([{ type: "text", text: "a" }, { type: "image" }, { type: "text", text: "b" }])).toBe("a\n[image]\nb");
    expect(contentText(undefined)).toBe("");
  });
});

describe("streamCli", () => {
  const node = process.execPath;
  const script = (lines, code = 0) =>
    `process.stdin.resume();process.stdin.on('end',()=>{${lines.map((l) => `console.log(${JSON.stringify(l)});`).join("")}process.stderr.write('boom');process.exit(${code});});`;

  async function collect(it) {
    const out = [];
    for await (const e of it) out.push(e);
    return out;
  }

  test("maps JSON lines, skips non-JSON, passes stdin", async () => {
    const run = streamCli({
      name: node, resolve: false,
      args: ["-e", script(['{"n":1}', "log noise", '{"n":2}'])],
      cwd: process.cwd(), stdin: "hi\n",
      mapEvent: (raw) => [{ type: "text", text: String(raw.n) }],
    });
    expect(await collect(run.events)).toEqual([{ type: "text", text: "1" }, { type: "text", text: "2" }]);
  });

  test("non-zero exit without error event yields classified error from stderr", async () => {
    const run = streamCli({
      name: node, resolve: false, args: ["-e", script([], 3)], cwd: process.cwd(), stdin: "",
      mapEvent: () => [],
    });
    const events = await collect(run.events);
    expect(events).toEqual([{ type: "error", code: "LOCAL_ENGINE_ERROR", message: "boom" }]);
  });

  test("missing CLI yields LOCAL_CLI_MISSING and runs cleanup", async () => {
    let cleaned = false;
    const run = streamCli({
      name: "definitely-not-a-real-cli-xyz", args: [], cwd: process.cwd(), stdin: "",
      mapEvent: () => [], cleanup: () => { cleaned = true; },
    });
    const events = await collect(run.events);
    expect(events[0].code).toBe("LOCAL_CLI_MISSING");
    expect(cleaned).toBe(true);
  });
});
