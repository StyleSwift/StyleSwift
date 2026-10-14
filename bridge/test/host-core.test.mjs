// @vitest-environment node
import { describe, test, expect, afterEach } from "vitest";
import { createHost, PROTOCOL_VERSION } from "../lib/host-core.mjs";
import { MAX_STRING } from "../lib/framing.mjs";

let host;
afterEach(() => host?.shutdown());

function setup(adapters) {
  const sent = [];
  const send = (msg, opts) => sent.push({ msg, opts });
  host = createHost({ adapters, send, bridgeVersion: "9.9.9", workRoot: "/tmp" });
  return sent;
}

const fakeAdapter = (runImpl) => ({
  id: "fake",
  detect: async () => ({ installed: true, version: "1.0", loggedIn: true }),
  run: (opts) => ({ events: runImpl(opts), kill: () => {} }),
});

describe("host core", () => {
  test("detect reports protocol, version and every engine", async () => {
    const sent = setup({ fake: fakeAdapter(async function* () {}), broken: { detect: async () => { throw new Error("x"); } } });
    await host.handle({ type: "detect" });
    expect(sent[0].msg).toEqual({
      type: "detect_result", protocol: PROTOCOL_VERSION, bridgeVersion: "9.9.9",
      engines: { fake: { installed: true, version: "1.0", loggedIn: true }, broken: { installed: false, error: "x" } },
    });
  });

  test("run streams truncated events and ends with done", async () => {
    const sent = setup({ fake: fakeAdapter(async function* () { yield { type: "text", text: "hi" }; }) });
    await host.handle({ type: "run", protocol: PROTOCOL_VERSION, engine: "fake", prompt: "p", system: "s", tools: [] });
    expect(sent.map((s) => s.msg)).toEqual([{ type: "event", event: { type: "text", text: "hi" } }, { type: "done" }]);
    expect(sent[0].opts).toEqual({ truncate: true });
  });

  test("protocol mismatch → LOCAL_PROTOCOL_MISMATCH + done", async () => {
    const sent = setup({ fake: fakeAdapter(async function* () {}) });
    await host.handle({ type: "run", protocol: 999, engine: "fake" });
    expect(sent[0].msg.event.code).toBe("LOCAL_PROTOCOL_MISMATCH");
    expect(sent.at(-1).msg).toEqual({ type: "done" });
  });

  test("unknown engine → LOCAL_ENGINE_ERROR + done", async () => {
    const sent = setup({});
    await host.handle({ type: "run", protocol: PROTOCOL_VERSION, engine: "nope" });
    expect(sent[0].msg.event.code).toBe("LOCAL_ENGINE_ERROR");
    expect(sent.at(-1).msg).toEqual({ type: "done" });
  });

  test("adapter tool calls reach the extension untruncated and results flow back", async () => {
    const longCss = "a{}".repeat(MAX_STRING);
    let sent;
    let seenCall;
    const adapter = fakeAdapter(async function* ({ mcpUrl, mcpToken }) {
      const res = await fetch(mcpUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${mcpToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "apply_styles", arguments: { css: longCss } } }),
      });
      yield { type: "text", text: (await res.json()).result.content[0].text };
    });
    sent = setup({ fake: adapter });
    const pump = setInterval(() => {
      const call = sent.find((s) => s.msg.type === "tool_call");
      if (call) {
        clearInterval(pump);
        seenCall = call;
        host.handle({ type: "tool_result", id: call.msg.id, content: [{ type: "text", text: "applied" }] });
      }
    }, 5);
    await host.handle({ type: "run", protocol: PROTOCOL_VERSION, engine: "fake", prompt: "p", system: "s", tools: [] });
    expect(seenCall.opts).toBeUndefined();
    expect(seenCall.msg.args.css).toBe(longCss);
    expect(sent.find((s) => s.msg.type === "event").msg.event).toEqual({ type: "text", text: "applied" });
  });

  test("adapter throwing mid-stream → error event and exactly one done", async () => {
    const sent = setup({ fake: fakeAdapter(async function* () { yield { type: "text", text: "a" }; throw new Error("boom"); }) });
    await host.handle({ type: "run", protocol: PROTOCOL_VERSION, engine: "fake", prompt: "p", system: "s", tools: [] });
    const msgs = sent.map((s) => s.msg);
    expect(msgs.filter((m) => m.type === "done")).toHaveLength(1);
    expect(msgs.at(-1)).toEqual({ type: "done" });
    expect(msgs.find((m) => m.event?.type === "error").event).toMatchObject({ code: "LOCAL_ENGINE_ERROR", message: "boom" });
  });

  test("concurrent run is rejected synchronously-claimed", async () => {
    let calls = 0;
    const sent = setup({ fake: fakeAdapter(async function* () { calls++; yield { type: "text", text: "x" }; }) });
    const m = { type: "run", protocol: PROTOCOL_VERSION, engine: "fake", prompt: "p", system: "s", tools: [] };
    await Promise.all([host.handle(m), host.handle(m)]);
    expect(calls).toBe(1);
    expect(sent.some((s) => s.msg.event?.message === "Another run is in progress")).toBe(true);
  });
});
