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
    const stdinText = "test-stdin-content";
    const scriptCode = `let stdin='';process.stdin.on('data',d=>stdin+=d);process.stdin.on('end',()=>{console.log(JSON.stringify({n:1,stdin:stdin.trim()}));console.log("log noise");console.log(JSON.stringify({n:2}));process.stderr.write('boom');process.exit(0);});`;
    const run = streamCli({
      name: node, resolve: false,
      args: ["-e", scriptCode],
      cwd: process.cwd(), stdin: stdinText,
      mapEvent: (raw) => [{ type: "text", text: String(raw.n) + (raw.stdin ? ":" + raw.stdin : "") }],
    });
    expect(await collect(run.events)).toEqual([
      { type: "text", text: "1:test-stdin-content" },
      { type: "text", text: "2" }
    ]);
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

  test("kill() before iteration starts prevents spawn and runs cleanup", async () => {
    let cleaned = false;
    const run = streamCli({
      name: node, resolve: false,
      args: ["-e", script(['{"n":1}'])],
      cwd: process.cwd(), stdin: "",
      mapEvent: () => [{ type: "text", text: "event" }],
      cleanup: () => { cleaned = true; },
    });
    run.kill(); // Call kill before starting iteration
    const events = await collect(run.events);
    expect(events).toEqual([]); // No events because generator returned early
    expect(cleaned).toBe(true); // cleanup still ran
  });

  test("breaking from for-await kills the child", async () => {
    let cleaned = false;
    let childPid = null;
    const scriptCode = `process.stdin.resume();console.log(JSON.stringify({n:1,pid:process.pid}));setTimeout(()=>{},30000);`;
    const run = streamCli({
      name: node, resolve: false,
      args: ["-e", scriptCode],
      cwd: process.cwd(), stdin: "",
      mapEvent: (raw) => {
        if (raw.pid) childPid = raw.pid;
        return [{ type: "text", text: String(raw.n) }];
      },
      cleanup: () => { cleaned = true; },
    });
    let count = 0;
    for await (const e of run.events) {
      count++;
      if (count === 1) break; // Break after first event
    }
    expect(count).toBe(1);
    expect(childPid).not.toBeNull();
    expect(cleaned).toBe(true);

    // Prove the child was actually killed: poll process.kill(pid, 0) until ESRCH
    // with a 5s timeout (well under the 30s sleep in the script)
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        process.kill(childPid, 0); // ESRCH if process doesn't exist
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        if (err.code === "ESRCH") {
          return; // Process is dead, test passes
        }
        throw err;
      }
    }
    throw new Error(`Child process ${childPid} still alive after 5s`);
  });
});
