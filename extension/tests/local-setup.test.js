import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";

globalThis.chrome = { runtime: { id: "llchggmimjgnbjlcgpkjmplhfbkjjcli" }, i18n: { getMessage: (k) => k, getUILanguage: () => "en" } };

let detection;
const requestNativePermission = vi.fn(async () => true);
vi.mock("../sidepanel/agent/engines/bridge-client.js", async () => {
  const actual = await vi.importActual("../sidepanel/agent/engines/bridge-client.js");
  return { ...actual, detectBridge: vi.fn(async () => detection), requestNativePermission };
});

const { renderLocalSetup, installCommands } = await import("../sidepanel/views/local-setup.js");

let container;
beforeEach(() => { container = document.createElement("div"); document.body.append(container); });
afterEach(() => { container.remove(); vi.useRealTimers(); });

describe("installCommands", () => {
  test("store build uses plain npx; dev build appends its id", () => {
    expect(installCommands("llchggmimjgnbjlcgpkjmplhfbkjjcli", true).node).toBe("npx -y styleswift-bridge@latest install");
    expect(installCommands("a".repeat(32), false).node).toBe(`npx -y styleswift-bridge@latest install --extension-id ${"a".repeat(32)}`);
    expect(installCommands("x", true).noNode).toMatch(/^irm .*install\.ps1 \| iex$/);
    expect(installCommands("x", false).noNode).toMatch(/^curl -fsSL .*install\.sh \| sh$/);
  });
});

describe("renderLocalSetup", () => {
  test("no permission → grant button requests permission then re-detects", async () => {
    detection = { status: "no-permission" };
    const ui = renderLocalSetup(container, { onReady() {} });
    await ui.refresh();
    expect(container.querySelector(".local-setup").dataset.state).toBe("no-permission");
    detection = { status: "not-installed" };
    container.querySelector('[data-action="grant"]').click();
    await vi.waitFor(() => expect(container.querySelector(".local-setup").dataset.state).toBe("not-installed"));
    expect(requestNativePermission).toHaveBeenCalled();
    ui.destroy();
  });

  test("not installed shows copyable commands and polls until installed", async () => {
    vi.useFakeTimers();
    detection = { status: "not-installed" };
    const ui = renderLocalSetup(container, { onReady() {}, pollMs: 3000 });
    await ui.refresh();
    expect(container.querySelectorAll("[data-copy]").length).toBe(2);
    detection = { status: "ok", engines: { "claude-code": { installed: true, loggedIn: true, version: "2.1" } } };
    await vi.advanceTimersByTimeAsync(3000);
    expect(container.querySelector(".local-setup").dataset.state).toBe("ok");
    ui.destroy();
  });

  test("destroy stops polling", async () => {
    vi.useFakeTimers();
    detection = { status: "not-installed" };
    const { detectBridge } = await import("../sidepanel/agent/engines/bridge-client.js");
    const ui = renderLocalSetup(container, { onReady() {}, pollMs: 3000 });
    await ui.refresh();
    ui.destroy();
    detectBridge.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(detectBridge).not.toHaveBeenCalled();
  });

  test("unchanged poll result keeps the same DOM nodes", async () => {
    vi.useFakeTimers();
    detection = { status: "not-installed" };
    const { detectBridge } = await import("../sidepanel/agent/engines/bridge-client.js");
    const ui = renderLocalSetup(container, { onReady() {}, pollMs: 3000 });
    await ui.refresh();
    const copyBtn = container.querySelector("[data-copy]");
    detectBridge.mockClear();
    await vi.advanceTimersByTimeAsync(3000);
    expect(detectBridge).toHaveBeenCalledTimes(1);
    expect(container.contains(copyBtn)).toBe(true);
    ui.destroy();
  });

  test("removed container stops polling without destroy()", async () => {
    vi.useFakeTimers();
    detection = { status: "not-installed" };
    const { detectBridge } = await import("../sidepanel/agent/engines/bridge-client.js");
    const ui = renderLocalSetup(container, { onReady() {}, pollMs: 3000 });
    await ui.refresh();
    container.remove();
    detectBridge.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(detectBridge).not.toHaveBeenCalled();
  });

  test("detectBridge rejection is treated as not-installed", async () => {
    detection = { status: "not-installed" };
    const { detectBridge } = await import("../sidepanel/agent/engines/bridge-client.js");
    detectBridge.mockRejectedValueOnce(new Error("boom"));
    const ui = renderLocalSetup(container, { onReady() {} });
    await ui.refresh();
    expect(container.querySelector(".local-setup").dataset.state).toBe("not-installed");
    ui.destroy();
  });

  test("refresh while a detect is in flight is skipped", async () => {
    detection = { status: "not-installed" };
    const { detectBridge } = await import("../sidepanel/agent/engines/bridge-client.js");
    let release;
    detectBridge.mockClear();
    detectBridge.mockImplementationOnce(() => new Promise((r) => { release = () => r(detection); }));
    const ui = renderLocalSetup(container, { onReady() {} });
    const first = ui.refresh();
    await ui.refresh();
    expect(detectBridge).toHaveBeenCalledTimes(1);
    release();
    await first;
    ui.destroy();
  });

  test("ok lists engines with states; only ready engines can be chosen", async () => {
    detection = { status: "ok", engines: {
      "claude-code": { installed: true, loggedIn: true, version: "2.1.292" },
      codex: { installed: true, loggedIn: false, version: "0.139.0" },
    } };
    const onReady = vi.fn();
    const ui = renderLocalSetup(container, { onReady });
    await ui.refresh();
    const rows = [...container.querySelectorAll(".local-engine")].map((r) => [r.dataset.engine, r.dataset.state]);
    expect(rows).toEqual([["claude-code", "ready"], ["codex", "not-logged-in"]]);
    expect(container.querySelector('[data-action="use"][data-engine="codex"]')).toBeNull();
    container.querySelector('[data-action="use"][data-engine="claude-code"]').click();
    expect(onReady).toHaveBeenCalledWith("claude-code");
    ui.destroy();
  });
});
