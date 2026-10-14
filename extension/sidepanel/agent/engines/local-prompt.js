/**
 * StyleSwift - 本机引擎系统提示词与对话文字记录
 */

import { SYSTEM_BASE } from "../system-prompt.js";

export const TRANSCRIPT_LIMIT = 8000;

// 依赖内置循环的工具（TodoWrite / Task / think），本机引擎不提供
const BUILTIN_ONLY_SECTIONS = ["Task Planning", "Quality Audit", "Think Tool Usage"];

const LOCAL_GUIDANCE = `
[Local Engine]
After large changes (8+ rules or theme-wide colors), call capture_screenshot and fix visible issues yourself.
`;

export function stripSections(prompt, titles) {
  return prompt
    .split(/^(?=## )/m)
    .filter((part) => !titles.some((t) => part.startsWith(`## ${t}`)))
    .join("");
}

export function buildLocalSystemPrompt({ sessionContext, skillDescriptions, stylesSummary }) {
  const styles = stylesSummary
    ? `Applied Styles: ${stylesSummary} (call get_current_styles for the exact CSS)\n`
    : "";
  return stripSections(SYSTEM_BASE, BUILTIN_ONLY_SECTIONS) + sessionContext + styles + skillDescriptions + LOCAL_GUIDANCE;
}

function messageText(msg) {
  if (typeof msg.content === "string") return msg.content;
  if (!Array.isArray(msg.content)) return "";
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

/** 最近的纯文本对话，从新到旧累加直到超出 limit；最新一条过长时保留其末尾 */
export function buildTranscript(history, limit = TRANSCRIPT_LIMIT) {
  const lines = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && !m._isCompressed)
    .map((m) => [m.role, messageText(m).trim()])
    .filter(([, text]) => text)
    .map(([role, text]) => `${role === "user" ? "User" : "Assistant"}: ${text}`);

  let out = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const next = out ? `${lines[i]}\n${out}` : lines[i];
    if (next.length > limit) {
      if (!out) out = lines[i].slice(-limit);
      break;
    }
    out = next;
  }
  return out;
}

export function withTranscript(prompt, transcript) {
  return transcript ? `[Previous conversation]\n${transcript}\n\n[Current request]\n${prompt}` : prompt;
}
