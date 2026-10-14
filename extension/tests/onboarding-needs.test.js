import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("../sidepanel/panel.js", () => ({ initMainView: vi.fn(), showLoading: vi.fn(), switchView: vi.fn() }));

let store;
globalThis.chrome = {
  runtime: { id: "x" },
  i18n: { getMessage: (k) => k, getUILanguage: () => "en" },
  storage: { local: { get: async (key) => ({ [key]: store[key] }) } },
};

const { needsOnboarding } = await import("../sidepanel/views/onboarding.js");

describe("needsOnboarding", () => {
  beforeEach(() => { store = {}; });

  test("no API key + builtin engine → true", async () => {
    expect(await needsOnboarding()).toBe(true);
  });

  test("no API key + local engine → false", async () => {
    store.agent_engine = "codex";
    expect(await needsOnboarding()).toBe(false);
  });

  test("API key configured → false", async () => {
    store.settings = { apiKey: "sk-test" };
    expect(await needsOnboarding()).toBe(false);
  });
});
