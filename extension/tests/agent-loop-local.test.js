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
vi.mock("../sidepanel/agent/engines/local-engine.js", () => ({
  runLocalEngine: async (args) => { localRuns.push(args); return "reply from codex"; },
}));

const { agentLoop } = await import("../sidepanel/agent/agent-loop.js");
const { loadAndPrepareHistory } = await import("../sidepanel/session.js");

beforeEach(() => { localRuns.length = 0; for (const k of Object.keys(store)) delete store[k]; store.agent_engine = "codex"; });

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
      expect.objectContaining({ role: "assistant", content: "reply from codex", _engine: "codex" }),
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
});
