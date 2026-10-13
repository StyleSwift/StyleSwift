/**
 * 页面级样式范围（docs/superpowers/specs/2026-04-10-page-level-style-scope-design.md）
 */

import { describe, test, expect, beforeEach, vi } from "vitest";

const data = {};
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: async (keys) => {
        const list = typeof keys === "string" ? [keys] : keys;
        return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
      },
      set: async (o) => Object.assign(data, o),
      remove: async (keys) => [].concat(keys).forEach((k) => delete data[k]),
    },
  },
});
// deleteSession 会清理 IndexedDB 历史：给一个立即完成的最小实现
vi.stubGlobal("indexedDB", {
  open: () => {
    const req = {};
    const db = {
      objectStoreNames: { contains: () => true },
      transaction: () => {
        const tx = { objectStore: () => ({ delete: () => ({}) }) };
        setTimeout(() => tx.oncomplete?.(), 0);
        return tx;
      },
    };
    setTimeout(() => req.onsuccess?.({ target: { result: db } }), 0);
    req.result = db;
    return req;
  },
});
let uuid = 0;
vi.stubGlobal("crypto", { randomUUID: () => `id-${++uuid}` });

const {
  extractPath,
  resolveSession,
  setSessionScope,
  loadSessionContext,
  deleteSession,
  SessionContext,
} = await import("../sidepanel/session.js");

const D = "github.com";

beforeEach(() => {
  for (const k of Object.keys(data)) delete data[k];
  uuid = 0;
});

describe("extractPath (spec 7.1)", () => {
  test.each([
    ["https://github.com/pulls", "/pulls"],
    ["https://github.com/pulls?q=open", "/pulls"],
    ["https://github.com/pulls#section", "/pulls"],
    ["https://github.com/pulls/", "/pulls"],
    ["https://github.com/", "/"],
    ["https://github.com", "/"],
    ["not a url", "/"],
  ])("%s -> %s", (url, path) => expect(extractPath(url)).toBe(path));
});

describe("SessionContext keys", () => {
  test("domain vs page active styles key", () => {
    expect(new SessionContext(D, "a").activeStylesKey).toBe(`active_styles:${D}`);
    expect(new SessionContext(D, "a", "page", "/pulls").activeStylesKey).toBe(
      `active_styles:${D}:page:/pulls`,
    );
  });
});

describe("resolveSession", () => {
  test("creates a domain session when none exist (legacy-compatible)", async () => {
    const s = await resolveSession(D, "/pulls");
    expect(s).toEqual({ id: "id-1", scope: "domain", path: null });
    expect(data[`sessions:${D}:index`][0]).toMatchObject({ id: "id-1" });
  });

  test("legacy index entries without scope are domain sessions", async () => {
    data[`sessions:${D}:index`] = [{ id: "old", created_at: 1 }];
    expect(await resolveSession(D, "/x")).toEqual({ id: "old", scope: "domain", path: null });
  });

  test("page session wins on its own path only; never the domain fallback", async () => {
    data[`sessions:${D}:index`] = [
      { id: "dom", created_at: 1 },
      { id: "pg", created_at: 2, scope: "page", path: "/pulls" },
    ];
    data[`sessions:${D}:active:page:/pulls`] = "pg";
    expect((await resolveSession(D, "/pulls")).id).toBe("pg");
    // 页面级会话虽然更新，但不能成为其他页面的默认会话
    expect((await resolveSession(D, "/issues")).id).toBe("dom");
  });
});

describe("setSessionScope (spec 4.2)", () => {
  test("domain -> page moves active styles and pointers; page -> domain moves back", async () => {
    data[`sessions:${D}:index`] = [{ id: "s", created_at: 1 }];
    data[`sessions:${D}:s:styles`] = "body{color:red}";
    data[`active_styles:${D}`] = "body{color:red}";
    data[`sessions:${D}:active`] = "s";

    await setSessionScope(D, "s", "page", "/pulls");
    expect(data[`active_styles:${D}`]).toBeUndefined();
    expect(data[`active_styles:${D}:page:/pulls`]).toBe("body{color:red}");
    expect(data[`sessions:${D}:active:page:/pulls`]).toBe("s");
    expect(data[`sessions:${D}:index`][0]).toMatchObject({ scope: "page", path: "/pulls" });
    expect(data[`sessions:${D}:s:meta`]).toMatchObject({ scope: "page", path: "/pulls" });
    expect(await loadSessionContext(D, "s")).toMatchObject({ scope: "page", path: "/pulls" });

    await setSessionScope(D, "s", "domain", null);
    expect(data[`active_styles:${D}:page:/pulls`]).toBeUndefined();
    expect(data[`sessions:${D}:active:page:/pulls`]).toBeUndefined();
    expect(data[`active_styles:${D}`]).toBe("body{color:red}");
    expect(data[`sessions:${D}:active`]).toBe("s");
  });
});

describe("deleteSession", () => {
  test("removes page pointer and page active styles of a page session", async () => {
    data[`sessions:${D}:index`] = [
      { id: "dom", created_at: 1 },
      { id: "pg", created_at: 2, scope: "page", path: "/pulls" },
    ];
    data[`sessions:${D}:active:page:/pulls`] = "pg";
    data[`active_styles:${D}:page:/pulls`] = "a{}";
    await deleteSession(D, "pg");
    expect(data[`sessions:${D}:active:page:/pulls`]).toBeUndefined();
    expect(data[`active_styles:${D}:page:/pulls`]).toBeUndefined();
  });
});
