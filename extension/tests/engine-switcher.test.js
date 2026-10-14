import { describe, test, expect, beforeEach, vi } from "vitest";

const store = {};
globalThis.chrome = {
  runtime: { id: "x" },
  i18n: { getMessage: (k) => k, getUILanguage: () => "en" },
  storage: { local: { get: async (k) => (k in store ? { [k]: store[k] } : {}), set: async (o) => Object.assign(store, o) } },
};

let detection = { status: "ok", engines: { "claude-code": { installed: true, loggedIn: true }, codex: { installed: true, loggedIn: false } } };
vi.mock("../sidepanel/agent/engines/bridge-client.js", async () => {
  const actual = await vi.importActual("../sidepanel/agent/engines/bridge-client.js");
  return { ...actual, detectBridge: async () => detection };
});
let hasKey = true;
vi.mock("../sidepanel/api.js", () => ({ getSettings: async () => { if (!hasKey) throw new Error("none"); return { apiKey: "k" }; } }));

const { initEngineSwitcher, openEngineMenu } = await import("../sidepanel/views/engine-switcher.js");

function mount() {
  document.body.innerHTML = `
    <button id="engine-btn"><span class="engine-label"></span></button>
    <div id="engine-menu" class="hidden"></div>`;
}

const deps = (over = {}) => ({ isBusy: () => false, hasMessages: () => true, onNotice: vi.fn(), openSettings: vi.fn(), ...over });

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; hasKey = true; mount(); });

describe("engine switcher", () => {
  test("label reflects the stored engine", async () => {
    store.agent_engine = "codex";
    await initEngineSwitcher(deps());
    expect(document.querySelector(".engine-label").textContent).toBe("Codex");
  });

  test("menu lists engines with availability", async () => {
    await initEngineSwitcher(deps());
    await openEngineMenu();
    const items = [...document.querySelectorAll("#engine-menu [data-engine]")].map((b) => [b.dataset.engine, b.dataset.available]);
    expect(items).toEqual([["builtin", "true"], ["claude-code", "true"], ["codex", "false"]]);
  });

  test("choosing an available engine saves it and posts a notice when the chat has messages", async () => {
    const d = deps();
    await initEngineSwitcher(d);
    await openEngineMenu();
    document.querySelector('#engine-menu [data-engine="claude-code"]').click();
    await vi.waitFor(() => expect(store.agent_engine).toBe("claude-code"));
    expect(d.onNotice).toHaveBeenCalledWith("engineSwitched");
    expect(document.querySelector("#engine-menu").classList.contains("hidden")).toBe(true);
  });

  test("no notice in an empty chat", async () => {
    const d = deps({ hasMessages: () => false });
    await initEngineSwitcher(d);
    await openEngineMenu();
    document.querySelector('#engine-menu [data-engine="claude-code"]').click();
    await vi.waitFor(() => expect(store.agent_engine).toBe("claude-code"));
    expect(d.onNotice).not.toHaveBeenCalled();
  });

  test("builtin without API key opens settings instead of switching", async () => {
    hasKey = false;
    store.agent_engine = "codex";
    const d = deps();
    await initEngineSwitcher(d);
    await openEngineMenu();
    document.querySelector('#engine-menu [data-engine="builtin"]').click();
    expect(d.openSettings).toHaveBeenCalled();
    expect(store.agent_engine).toBe("codex");
  });

  test("busy agent blocks opening the menu", async () => {
    await initEngineSwitcher(deps({ isBusy: () => true }));
    document.querySelector("#engine-btn").click();
    expect(document.querySelector("#engine-menu").classList.contains("hidden")).toBe(true);
  });
});
