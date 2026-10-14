/**
 * StyleSwift - Native Messaging Bridge 客户端
 * 协议见 bridge/lib/host-core.mjs
 */

import { AgentError } from "../llm-client.js";

export const HOST_NAME = "com.styleswift.bridge";
export const PROTOCOL_VERSION = 1;
const PERMISSION = { permissions: ["nativeMessaging"] };

export const hasNativePermission = () => chrome.permissions.contains(PERMISSION);
export const requestNativePermission = () => chrome.permissions.request(PERMISSION);

export async function detectBridge() {
  if (!(await hasNativePermission())) return { status: "no-permission" };
  return new Promise((resolve) => {
    let port;
    try {
      port = chrome.runtime.connectNative(HOST_NAME);
    } catch (err) {
      resolve({ status: "not-installed", error: err.message });
      return;
    }
    port.onDisconnect.addListener(() =>
      resolve({ status: "not-installed", error: chrome.runtime.lastError?.message }),
    );
    port.onMessage.addListener((msg) => {
      if (msg.type !== "detect_result") return;
      port.disconnect();
      resolve(
        msg.protocol === PROTOCOL_VERSION
          ? { status: "ok", bridgeVersion: msg.bridgeVersion, engines: msg.engines }
          : { status: "outdated", bridgeVersion: msg.bridgeVersion },
      );
    });
    port.postMessage({ type: "detect" });
  });
}

export function engineState(detection, engineId) {
  if (detection.status !== "ok") return detection.status;
  const e = detection.engines?.[engineId];
  if (!e?.installed) return "cli-missing";
  if (e.error) return "error";
  return e.loggedIn ? "ready" : "not-logged-in";
}

export function runBridge(request, { onEvent, onToolCall }, signal) {
  return new Promise((resolve, reject) => {
    let port = null;
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      try {
        port?.disconnect(); // host 收到 EOF 后结束 CLI 子进程
      } catch {}
      err ? reject(err) : resolve();
    };

    if (signal.aborted) return finish(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", () => finish(new DOMException("Aborted", "AbortError")), { once: true });

    try {
      port = chrome.runtime.connectNative(HOST_NAME);
    } catch (err) {
      return finish(new AgentError("LOCAL_BRIDGE_UNAVAILABLE", err.message));
    }
    port.onDisconnect.addListener(() =>
      finish(new AgentError("LOCAL_BRIDGE_UNAVAILABLE", chrome.runtime.lastError?.message || "Bridge disconnected")),
    );
    port.onMessage.addListener(async (msg) => {
      if (msg.type === "event") onEvent(msg.event);
      else if (msg.type === "done") finish();
      else if (msg.type === "tool_call") {
        const content = await onToolCall(msg.name, msg.args);
        if (!settled) port.postMessage({ type: "tool_result", id: msg.id, content });
      }
    });
    port.postMessage({ type: "run", protocol: PROTOCOL_VERSION, ...request });
  });
}
