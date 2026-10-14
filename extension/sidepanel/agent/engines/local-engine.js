/**
 * StyleSwift - 本机引擎运行器
 * 一轮对话：经 Bridge 驱动 CLI，CLI 的工具调用在扩展内执行，事件映射到 uiCallbacks。
 */

import { AgentError } from "../llm-client.js";
import { ALL_TOOLS, CAPTURE_SCREENSHOT_TOOL, executeTool, normalizeToolResult } from "../../tools/index.js";
import { getMessage } from "../../i18n.js";
import { runBridge } from "./bridge-client.js";
import { engineLabel, engineSessionKey } from "./prefs.js";
import { buildTranscript, withTranscript } from "./local-prompt.js";

// Task / TodoWrite / think 依赖内置循环的子 agent 与确认 UI
const LOOP_ONLY_TOOLS = new Set(["Task", "TodoWrite", "think"]);

export const LOCAL_TOOLS = [...ALL_TOOLS.filter((t) => !LOOP_ONLY_TOOLS.has(t.name)), CAPTURE_SCREENSHOT_TOOL].map(
  ({ name, description, input_schema }) => ({ name, description, input_schema }),
);
const LOCAL_TOOL_NAMES = new Set(LOCAL_TOOLS.map((t) => t.name));

export function toMcpContent(output) {
  if (output && typeof output === "object" && output._screenshot_result) {
    const [, mimeType, data] = output.dataUrl.match(/^data:(.+?);base64,(.*)$/);
    return [{ type: "image", mimeType, data }];
  }
  return [{ type: "text", text: normalizeToolResult(output) }];
}

async function runOnce({ engine, prompt, system, tabId, resume, key }, ui, signal) {
  const reply = [];
  let error = null;
  let progressed = false;
  let started = false;
  let afterToolResult = false;

  const markStarted = () => {
    if (!started) {
      started = true;
      ui.onEngineStarted?.();
    }
  };
  // 工具结果之后的新内容开新气泡，与内置引擎的多轮迭代一致
  const nextBubbleIfNeeded = () => {
    if (afterToolResult) {
      ui.onNewIteration?.();
      afterToolResult = false;
    }
  };

  ui.onEngineStarting?.(engineLabel(engine));
  try {
    await runBridge(
      { engine, prompt, system, tools: LOCAL_TOOLS, resume },
      {
        onEvent: (ev) => {
          markStarted();
          switch (ev.type) {
            case "session":
              chrome.storage.local.set({ [key]: ev.id });
              break;
            case "text":
              nextBubbleIfNeeded();
              progressed = true;
              reply.push(ev.text);
              ui.appendText?.(ev.text);
              break;
            case "thinking":
              ui.appendReasoning?.(ev.text);
              break;
            case "tool_use":
              nextBubbleIfNeeded();
              progressed = true;
              ui.showToolCall?.({ type: "tool_use", id: ev.id, name: ev.name, input: ev.input });
              break;
            case "tool_result":
              ui.showToolResult?.(ev.id, ev.text);
              afterToolResult = true;
              break;
            case "error":
              error ??= ev;
              break;
          }
        },
        onToolCall: async (name, args) => {
          if (!LOCAL_TOOL_NAMES.has(name)) return [{ type: "text", text: `Error: unknown tool ${name}` }];
          ui.showToolExecuting?.(name);
          try {
            return toMcpContent(await executeTool(name, args, { abortSignal: signal, tabId, uiCallbacks: ui }));
          } catch (err) {
            return [{ type: "text", text: `Error: ${err.message}` }];
          }
        },
      },
      signal,
    );
  } finally {
    markStarted();
  }

  if (error) {
    throw Object.assign(new AgentError(error.code, error.message), { resumeFailed: Boolean(resume) && !progressed && error.code === "LOCAL_ENGINE_ERROR" });
  }
  return reply.join("\n\n");
}

export async function runLocalEngine({ engine, prompt, system, tabId, domain, sessionId, history }, ui, signal) {
  const key = engineSessionKey(engine, domain, sessionId);
  const { [key]: resume } = await chrome.storage.local.get(key);
  const fresh = () =>
    runOnce({ engine, prompt: withTranscript(prompt, buildTranscript(history)), system, tabId, key }, ui, signal);

  if (!resume) return fresh();
  // 中途换过引擎：CLI 会话缺了中间几轮，改用文字记录重新开始
  if (history.findLast((m) => m.role === "assistant")?._engine !== engine) {
    await chrome.storage.local.remove(key);
    return fresh();
  }
  try {
    return await runOnce({ engine, prompt, system, tabId, resume, key }, ui, signal);
  } catch (err) {
    if (!err.resumeFailed || signal?.aborted) throw err;
    await chrome.storage.local.remove(key);
    ui.onEngineNotice?.(getMessage("localSessionExpired"));
    return fresh();
  }
}
