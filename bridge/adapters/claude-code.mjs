/**
 * Claude Code 适配器：claude -p，stream-json 输入输出
 * 参数均在 Claude Code 2.1.292 上实测（2026-10-14）
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { MCP_NAME } from "../lib/mcp-server.mjs";
import { classifyError, contentText, execText, resolveBin, streamCli } from "../lib/process.mjs";

const TOOL_PREFIX = `mcp__${MCP_NAME}__`;

/** Claude 的会话按工作目录存储：目录必须稳定，否则 --resume 找不到会话 */
export function claudeWorkDir(workRoot) {
  return join(workRoot, "claude-code");
}

/** 多窗口可能并发运行：每次运行用唯一文件名 */
export function claudeRunFiles(workRoot) {
  const id = randomUUID();
  const dir = claudeWorkDir(workRoot);
  return { systemFile: join(dir, `system-${id}.md`), mcpFile: join(dir, `mcp-${id}.json`) };
}

export function buildClaudeArgs({ systemFile, mcpFile, resume }) {
  const args = [
    "-p",
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--verbose",
    "--system-prompt-file", systemFile,
    "--mcp-config", mcpFile,
    "--strict-mcp-config",
    "--setting-sources", "", // 不加载用户 hooks / CLAUDE.md
    "--tools", "", // 关闭全部内置工具
    "--allowedTools", `mcp__${MCP_NAME}`,
  ];
  if (resume) args.push("--resume", resume);
  return args;
}

export function mapClaudeEvent(ev) {
  if (ev.type === "system" && ev.subtype === "init") return [{ type: "session", id: ev.session_id }];
  if (ev.type === "assistant") {
    return (ev.message?.content ?? []).flatMap((b) => {
      if (b.type === "text") return [{ type: "text", text: b.text }];
      if (b.type === "thinking") return [{ type: "thinking", text: b.thinking }];
      if (b.type === "tool_use") {
        return [{ type: "tool_use", id: b.id, name: b.name.replace(TOOL_PREFIX, ""), input: b.input }];
      }
      return [];
    });
  }
  if (ev.type === "user") {
    const blocks = Array.isArray(ev.message?.content) ? ev.message.content : [];
    return blocks
      .filter((b) => b.type === "tool_result")
      .map((b) => ({ type: "tool_result", id: b.tool_use_id, text: contentText(b.content) }));
  }
  if (ev.type === "result") {
    if (ev.is_error) {
      const message = String(ev.result || ev.errors?.join("\n") || "Claude Code error");
      return [{ type: "error", code: classifyError(message), message }];
    }
    return [{ type: "result", usage: ev.usage }];
  }
  return [];
}

export const claudeCode = {
  id: "claude-code",

  async detect() {
    const bin = await resolveBin("claude");
    if (!bin) return { installed: false };
    try {
      const version = (await execText(bin, ["--version"])).trim();
      const status = await execText(bin, ["auth", "status"]).then(JSON.parse).catch(() => ({}));
      return { installed: true, version, loggedIn: status.loggedIn === true };
    } catch (err) {
      return { installed: true, error: err.message };
    }
  },

  run({ prompt, system, mcpUrl, mcpToken, resume, workRoot }) {
    const cwd = claudeWorkDir(workRoot);
    mkdirSync(cwd, { recursive: true });
    const { systemFile, mcpFile } = claudeRunFiles(workRoot);
    writeFileSync(systemFile, system, { mode: 0o600 });
    writeFileSync(mcpFile, JSON.stringify({
      mcpServers: { [MCP_NAME]: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${mcpToken}` } } },
    }), { mode: 0o600 });
    return streamCli({
      name: "claude",
      args: buildClaudeArgs({ systemFile, mcpFile, resume }),
      cwd,
      stdin: JSON.stringify({ type: "user", message: { role: "user", content: prompt } }) + "\n",
      mapEvent: mapClaudeEvent,
      cleanup: () => {
        rmSync(systemFile, { force: true });
        rmSync(mcpFile, { force: true });
      },
    });
  },
};
