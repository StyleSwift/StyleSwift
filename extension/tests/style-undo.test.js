/**
 * 针对真实 registry.runApplyStyles 的撤销 / 站点开关测试
 */

import { describe, test, expect, beforeEach, vi } from "vitest";

const store = {};
let history = [];
const sent = [];

vi.mock("../sidepanel/session.js", () => ({
  currentSession: {
    domain: "example.com",
    sessionId: "s1",
    stylesKey: "sessions:example.com:s1:styles",
    activeStylesKey: "active_styles:example.com",
  },
  updateStylesSummary: async () => {},
  loadStylesHistory: async () => [...history],
  saveStylesHistory: async (_d, _s, h) => { history = [...h]; },
  checkQuotaAndMigrate: async () => ({ migrated: false }),
}));

globalThis.chrome = {
  runtime: {},
  tabs: {
    query: async () => [{ id: 1 }],
    sendMessage: (_id, msg, cb) => { sent.push(msg); cb({ success: true }); },
  },
  storage: {
    local: {
      get: async (k) => (k in store ? { [k]: store[k] } : {}),
      set: async (o) => Object.assign(store, o),
      remove: async (k) => { for (const key of [].concat(k)) delete store[key]; },
    },
  },
};

const { runApplyStyles } = await import("../sidepanel/tools/registry.js");

describe("runApplyStyles 撤销", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    history = [];
    sent.length = 0;
  });

  test("首次应用后撤销应清空样式", async () => {
    await runApplyStyles("body { color: red; }", "save");
    expect(store["active_styles:example.com"]).toBeTruthy();

    await runApplyStyles(null, "rollback_last");

    expect(store["sessions:example.com:s1:styles"]).toBeUndefined();
    expect(store["active_styles:example.com"]).toBeUndefined();
    expect(sent.at(-1)).toEqual({ tool: "rollback_css", args: { scope: "all" } });
  });

  test("两次应用后撤销回到第一次", async () => {
    await runApplyStyles("body { color: red; }", "save");
    await runApplyStyles("a { color: blue; }", "save");

    await runApplyStyles(null, "rollback_last");

    const css = store["sessions:example.com:s1:styles"];
    expect(css).toContain("color: red");
    expect(css).not.toContain("color: blue");
  });

  test("应用新样式会自动打开站点样式开关", async () => {
    store["styles_disabled:example.com"] = true;
    await runApplyStyles("body { color: red; }", "save");
    expect(store["styles_disabled:example.com"]).toBeUndefined();
  });
});
