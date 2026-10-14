import { describe, test, expect, beforeEach, vi } from "vitest";

let granted = true;
let lastPort;
let hostBehavior;

function makePort() {
  const msgL = [];
  const discL = [];
  const port = {
    posted: [],
    onMessage: { addListener: (f) => msgL.push(f) },
    onDisconnect: { addListener: (f) => discL.push(f) },
    postMessage: (m) => { port.posted.push(m); hostBehavior?.(m, port); },
    disconnect: vi.fn(),
    emit: (m) => msgL.forEach((f) => f(m)),
    drop: () => discL.forEach((f) => f()),
  };
  return port;
}

globalThis.chrome = {
  runtime: {
    lastError: null,
    connectNative: vi.fn(() => (lastPort = makePort())),
  },
  permissions: {
    contains: async () => granted,
    request: async () => (granted = true),
  },
};

const { detectBridge, engineState, runBridge, PROTOCOL_VERSION } = await import("../sidepanel/agent/engines/bridge-client.js");

beforeEach(() => { granted = true; hostBehavior = null; chrome.runtime.lastError = null; });

describe("detectBridge", () => {
  test("no permission → no-permission without connecting", async () => {
    granted = false;
    chrome.runtime.connectNative.mockClear();
    expect(await detectBridge()).toEqual({ status: "no-permission" });
    expect(chrome.runtime.connectNative).not.toHaveBeenCalled();
  });

  test("host missing → not-installed", async () => {
    hostBehavior = (_m, port) => { chrome.runtime.lastError = { message: "Specified native messaging host not found." }; port.drop(); };
    expect(await detectBridge()).toEqual({ status: "not-installed", error: "Specified native messaging host not found." });
  });

  test("protocol match → ok, mismatch or missing → outdated", async () => {
    hostBehavior = (_m, port) => port.emit({ type: "detect_result", protocol: PROTOCOL_VERSION, bridgeVersion: "0.1.0", engines: { codex: { installed: true, loggedIn: true } } });
    expect(await detectBridge()).toEqual({ status: "ok", bridgeVersion: "0.1.0", engines: { codex: { installed: true, loggedIn: true } } });
    hostBehavior = (_m, port) => port.emit({ type: "detect_result", ok: true, version: "x" }); // 原型 host
    expect((await detectBridge()).status).toBe("outdated");
  });
});

describe("engineState", () => {
  const ok = (e) => ({ status: "ok", engines: { codex: e } });
  test.each([
    [{ status: "not-installed" }, "not-installed"],
    [ok(undefined), "cli-missing"],
    [ok({ installed: false }), "cli-missing"],
    [ok({ installed: true, error: "x" }), "error"],
    [ok({ installed: true, loggedIn: false }), "not-logged-in"],
    [ok({ installed: true, loggedIn: true }), "ready"],
  ])("%o → %s", (detection, state) => expect(engineState(detection, "codex")).toBe(state));
});

describe("runBridge", () => {
  test("sends run with protocol, relays events and tool results, resolves on done", async () => {
    const events = [];
    hostBehavior = (m, port) => {
      if (m.type === "run") {
        port.emit({ type: "event", event: { type: "text", text: "hi" } });
        port.emit({ type: "tool_call", id: 7, name: "grep", args: { q: 1 } });
      }
      if (m.type === "tool_result") port.emit({ type: "done" });
    };
    await runBridge(
      { engine: "codex", prompt: "p", system: "s", tools: [] },
      { onEvent: (e) => events.push(e), onToolCall: async () => [{ type: "text", text: "r" }] },
      new AbortController().signal,
    );
    expect(lastPort.posted[0]).toMatchObject({ type: "run", protocol: PROTOCOL_VERSION, engine: "codex" });
    expect(lastPort.posted[1]).toEqual({ type: "tool_result", id: 7, content: [{ type: "text", text: "r" }] });
    expect(events).toEqual([{ type: "text", text: "hi" }]);
    expect(lastPort.disconnect).toHaveBeenCalled();
  });

  test("disconnect → LOCAL_BRIDGE_UNAVAILABLE", async () => {
    hostBehavior = (_m, port) => port.drop();
    await expect(runBridge({ engine: "codex" }, { onEvent() {}, onToolCall: async () => [] }, new AbortController().signal))
      .rejects.toMatchObject({ code: "LOCAL_BRIDGE_UNAVAILABLE" });
  });

  test("abort → AbortError and port disconnected", async () => {
    const ac = new AbortController();
    const p = runBridge({ engine: "codex" }, { onEvent() {}, onToolCall: async () => [] }, ac.signal);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(lastPort.disconnect).toHaveBeenCalled();
  });

  test("onToolCall rejects → sends error result and continues on done", async () => {
    hostBehavior = (m, port) => {
      if (m.type === "run") {
        port.emit({ type: "tool_call", id: 7, name: "grep", args: { q: 1 } });
      }
      if (m.type === "tool_result") port.emit({ type: "done" });
    };
    await runBridge(
      { engine: "codex", prompt: "p", system: "s", tools: [] },
      { onEvent: () => {}, onToolCall: async () => { throw new Error("boom"); } },
      new AbortController().signal,
    );
    expect(lastPort.posted[1]).toMatchObject({ type: "tool_result", id: 7 });
    expect(lastPort.posted[1].content[0].text).toContain("boom");
  });
});
