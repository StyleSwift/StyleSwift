/**
 * StyleSwift - Claude Code 引擎（原型）
 *
 * 通过 Native Messaging（bridge/host.mjs）驱动用户本机的 Claude Code CLI。
 * 页面工具仍在扩展内执行：CLI 经 MCP 调用 → host 转发 tool_call → 这里 executeTool → 回传结果。
 */

import { ALL_TOOLS, CAPTURE_SCREENSHOT_TOOL, executeTool, normalizeToolResult } from "../tools/index.js";

const HOST_NAME = "com.styleswift.bridge";
const MCP_PREFIX = "mcp__styleswift__";
export const ENGINE_KEY = "agent_engine";

// Task / TodoWrite / think 依赖自研 loop 的子 agent 与确认 UI，Claude Code 自带同类能力
const EXCLUDED_TOOLS = new Set(["Task", "TodoWrite", "think"]);
const CLAUDE_CODE_TOOLS = [
  ...ALL_TOOLS.filter((t) => !EXCLUDED_TOOLS.has(t.name)),
  CAPTURE_SCREENSHOT_TOOL,
].map(({ name, description, input_schema }) => ({ name, description, input_schema }));

export async function getEngine() {
  const { [ENGINE_KEY]: engine = "builtin" } = await chrome.storage.local.get(ENGINE_KEY);
  return engine;
}

/**
 * 检测 bridge 与 Claude Code 是否可用
 * @returns {Promise<{ok: boolean, version?: string, error?: string}>}
 */
export function detectClaudeCode() {
  return new Promise((resolve) => {
    let port;
    try {
      port = chrome.runtime.connectNative(HOST_NAME);
    } catch (err) {
      resolve({ ok: false, error: err.message });
      return;
    }
    port.onMessage.addListener((msg) => {
      if (msg.type === "detect_result") {
        resolve(msg);
        port.disconnect();
      }
    });
    port.onDisconnect.addListener(() =>
      resolve({ ok: false, error: chrome.runtime.lastError?.message || "Bridge disconnected" }),
    );
    port.postMessage({ type: "detect" });
  });
}

async function toMcpContent(output) {
  if (output && typeof output === "object" && output._screenshot_result) {
    const [, mimeType, data] = output.dataUrl.match(/^data:(.+?);base64,(.*)$/);
    return [{ type: "image", mimeType, data }];
  }
  return [{ type: "text", text: normalizeToolResult(output) }];
}

/**
 * 运行一轮 Claude Code
 * @returns {Promise<string>} 最终回复文本
 */
export function runClaudeCode({ prompt, system, tabId, resumeKey }, uiCallbacks, signal) {
  return new Promise(async (resolve, reject) => {
    const { [resumeKey]: resume } = await chrome.storage.local.get(resumeKey);
    const port = chrome.runtime.connectNative(HOST_NAME);
    let finalText = "";
    let afterToolResult = false;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
      port.disconnect();
    };

    signal.addEventListener("abort", () => finish(reject, new DOMException("Aborted", "AbortError")), { once: true });
    port.onDisconnect.addListener(() =>
      finish(reject, new Error(chrome.runtime.lastError?.message || "Claude Code bridge disconnected")),
    );

    port.onMessage.addListener(async (msg) => {
      if (msg.type === "tool_call") {
        uiCallbacks.showToolExecuting?.(msg.name);
        let output;
        try {
          output = await executeTool(msg.name, msg.args, { abortSignal: signal, tabId, uiCallbacks });
        } catch (err) {
          output = `Error: ${err.message}`;
        }
        port.postMessage({ type: "tool_result", id: msg.id, content: await toMcpContent(output) });
        return;
      }

      if (msg.type === "done") {
        if (msg.code === 0) finish(resolve, finalText);
        else finish(reject, new Error(`Claude Code exited (${msg.code}): ${msg.error || ""}`));
        return;
      }

      if (msg.type !== "event") return;
      const ev = msg.event;
      if (ev.type === "system" && ev.subtype === "init") {
        await chrome.storage.local.set({ [resumeKey]: ev.session_id });
      } else if (ev.type === "assistant") {
        if (afterToolResult) uiCallbacks.onNewIteration?.();
        afterToolResult = false;
        for (const block of ev.message.content) {
          if (block.type === "text") uiCallbacks.appendText?.(block.text);
          else if (block.type === "thinking") uiCallbacks.appendReasoning?.(block.thinking);
          else if (block.type === "tool_use") {
            uiCallbacks.showToolCall?.({ ...block, name: block.name.replace(MCP_PREFIX, "") });
          }
        }
      } else if (ev.type === "user") {
        for (const block of ev.message.content) {
          if (block.type !== "tool_result") continue;
          const text = Array.isArray(block.content)
            ? block.content.map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n")
            : block.content;
          uiCallbacks.showToolResult?.(block.tool_use_id, text);
          afterToolResult = true;
        }
      } else if (ev.type === "result") {
        finalText = ev.result || "";
      }
    });

    port.postMessage({ type: "run", prompt, system, tools: CLAUDE_CODE_TOOLS, resume });
  });
}
