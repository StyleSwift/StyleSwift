import { describe, test, expect, beforeEach, vi } from "vitest";

const store = {};
globalThis.chrome = {
  runtime: { id: "x" },
  i18n: { getMessage: (k) => k, getUILanguage: () => "en" },
  tabs: {
    query: async () => [{ id: 1, url: "https://a.com/p" }],
    get: async () => ({ id: 1, url: "https://a.com/p" }),
    sendMessage: (_id, msg, cb) => cb(msg.tool === "get_domain" ? "a.com" : { success: true }),
  },
  storage: {
    local: {
      get: async (k) => {
        if (k === null || k === undefined) return { ...store };
        const keys = Array.isArray(k) ? k : typeof k === "object" ? Object.keys(k) : [k];
        return Object.fromEntries(keys.filter((x) => x in store).map((x) => [x, store[x]]));
      },
      set: async (o) => Object.assign(store, o),
      remove: async (k) => { for (const key of [].concat(k)) delete store[key]; },
    },
  },
};

// Minimal in-memory IndexedDB: session history is read/written through openDB().
const idb = {};
globalThis.indexedDB = {
  open: () => {
    const request = {};
    const db = {
      name: "test",
      version: 1,
      close() {},
      transaction: (storeName) => {
        const tx = {};
        const rows = (idb[storeName] ??= {});
        tx.objectStore = () => ({
          put: (v, k) => { rows[k] = structuredClone(v); queueMicrotask(() => tx.oncomplete?.()); },
          get: (k) => { const r = { result: structuredClone(rows[k]) }; queueMicrotask(() => r.onsuccess?.()); return r; },
          delete: (k) => { delete rows[k]; queueMicrotask(() => tx.oncomplete?.()); },
        });
        return tx;
      },
    };
    setTimeout(() => request.onsuccess?.({ target: { result: db } }));
    return request;
  },
};

const localRuns = [];
let duringFirstRun = null;
vi.mock("../sidepanel/agent/engines/local-engine.js", () => ({
  runLocalEngine: async (args) => {
    localRuns.push(args);
    if (localRuns.length === 1) duringFirstRun?.();
    return "reply from codex";
  },
}));

const { agentLoop, queueUserMessage } = await import("../sidepanel/agent/agent-loop.js");
const { serializeToClaude, serializeToOpenAI } = await import("../sidepanel/agent/message-serialization.js");
const { loadAndPrepareHistory } = await import("../sidepanel/session.js");

beforeEach(() => { localRuns.length = 0; duringFirstRun = null; for (const k of Object.keys(store)) delete store[k]; store.agent_engine = "codex"; });

describe("agentLoop with a local engine", () => {
  test("delegates to runLocalEngine and stores plain-text turns tagged with the engine", async () => {
    const reply = await agentLoop("make it dark", { appendText() {} });
    expect(reply).toBe("reply from codex");
    expect(localRuns[0]).toMatchObject({ engine: "codex", prompt: "make it dark", domain: "a.com", tabId: 1 });
    expect(localRuns[0].system).not.toMatch(/## Task Planning/);
    const sessionId = localRuns[0].sessionId;
    const { messages } = await loadAndPrepareHistory("a.com", sessionId);
    expect(messages.slice(-2)).toEqual([
      expect.objectContaining({ role: "user", content: "make it dark", _engine: "codex" }),
      expect.objectContaining({ role: "assistant", content: [{ type: "text", text: "reply from codex" }], _engine: "codex" }),
    ]);
  });

  test("attached images are ignored with a visible notice", async () => {
    const texts = [];
    await agentLoop(
      [{ type: "text", text: "match this" }, { type: "image_url", image_url: { url: "data:image/png;base64,AA" } }],
      { appendText: (t) => texts.push(t) },
    );
    expect(localRuns[0].prompt).toBe("match this");
    expect(texts.join("")).toMatch(/localImagesIgnored/);
  });

  test("history from a local turn still serializes for the built-in engine", async () => {
    await agentLoop("make it dark", { appendText() {} });
    store.agent_engine = "builtin";
    const { messages } = await loadAndPrepareHistory("a.com", localRuns[0].sessionId);
    expect(() => serializeToClaude(messages)).not.toThrow();
    expect(JSON.stringify(serializeToClaude(messages))).toContain("reply from codex");
    expect(JSON.stringify(serializeToOpenAI("", messages))).toContain("reply from codex");
  });

  test("queued message with an image keeps its text, shows the notice, and runs a second turn", async () => {
    const texts = [];
    duringFirstRun = () => queueUserMessage([
      { type: "text", text: "also blue" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AA" } },
    ]);
    await agentLoop("make it dark", { appendText: (t) => texts.push(t) });
    expect(localRuns).toHaveLength(2);
    expect(localRuns[1].prompt).toBe("also blue");
    expect(texts.join("").match(/localImagesIgnored/g)).toHaveLength(1);
  });

  test("queued image-only message runs no extra turn and stores no empty user message", async () => {
    const texts = [];
    duringFirstRun = () => queueUserMessage([{ type: "image_url", image_url: { url: "data:image/png;base64,AA" } }]);
    await agentLoop("make it dark", { appendText: (t) => texts.push(t) });
    expect(localRuns).toHaveLength(1);
    expect(texts.join("")).toMatch(/localImagesIgnored/);
    const { messages } = await loadAndPrepareHistory("a.com", localRuns[0].sessionId);
    expect(messages.filter((m) => m.role === "user" && m.content === "")).toHaveLength(0);
  });
});
