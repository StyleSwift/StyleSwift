/**
 * Codex 适配器：codex exec --json
 * 参数均在 Codex CLI 0.139.0 上实测（2026-10-14）：
 * - MCP 工具总是延迟在 tool_search 后，需在 AGENTS.md 中提示模型先加载
 * - approval_policy=never 下 MCP 调用默认被拒，需 default_tools_approval_mode=approve
 * - --ignore-user-config 会丢掉用户的模型设置，需从 config.toml 读回
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MCP_NAME } from "../lib/mcp-server.mjs";
import { classifyError, contentText, execText, resolveBin, streamCli } from "../lib/process.mjs";

export const TOKEN_ENV = "STYLESWIFT_MCP_TOKEN";
const DISABLED_FEATURES = ["shell_tool", "image_generation", "apps", "goals", "multi_agent", "plugins"];

export const CODEX_TOOL_HINT = `

## Tools
Your StyleSwift tools live in the MCP namespace \`${MCP_NAME}\` and are deferred: before your first action, use tool_search (query "${MCP_NAME}") to load them. Only use ${MCP_NAME} tools; never run shell commands or edit files.
`;

export function readCodexModel(tomlText) {
  const topLevel = tomlText.split(/^\s*\[/m)[0];
  const pick = (key) => topLevel.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"))?.[1];
  return { model: pick("model"), effort: pick("model_reasoning_effort") };
}

function userCodexModel() {
  const home = process.env.CODEX_HOME || join(homedir(), ".codex");
  try {
    return readCodexModel(readFileSync(join(home, "config.toml"), "utf8"));
  } catch {
    return {};
  }
}

export function buildCodexArgs({ mcpUrl, resume, model, effort }) {
  const args = ["exec"];
  if (resume) args.push("resume", resume);
  args.push(
    "--json", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
    "-c", "sandbox_mode=read-only", // exec resume 不支持 -s
    "-c", "approval_policy=never",
    "-c", "web_search=disabled",
    "-c", "include_apply_patch_tool=false",
    ...DISABLED_FEATURES.flatMap((f) => ["--disable", f]),
    "-c", `mcp_servers.${MCP_NAME}.url=${mcpUrl}`,
    "-c", `mcp_servers.${MCP_NAME}.bearer_token_env_var=${TOKEN_ENV}`,
    "-c", `mcp_servers.${MCP_NAME}.default_tools_approval_mode=approve`,
  );
  if (model) args.push("-m", model);
  if (effort) args.push("-c", `model_reasoning_effort=${effort}`);
  args.push("-"); // prompt 从 stdin 读取
  return args;
}

function unwrapMessage(message) {
  try {
    return JSON.parse(message)?.error?.message || message;
  } catch {
    return message;
  }
}

export function mapCodexEvent(ev) {
  const item = ev.item ?? {};
  switch (ev.type) {
    case "thread.started":
      return [{ type: "session", id: ev.thread_id }];
    case "item.started":
      return item.type === "mcp_tool_call"
        ? [{ type: "tool_use", id: item.id, name: item.tool, input: item.arguments ?? {} }]
        : [];
    case "item.completed":
      if (item.type === "agent_message") return [{ type: "text", text: item.text }];
      if (item.type === "reasoning") return [{ type: "thinking", text: item.text }];
      if (item.type === "mcp_tool_call") {
        const text = item.error ? `Error: ${item.error.message}` : contentText(item.result?.content);
        return [{ type: "tool_result", id: item.id, text }];
      }
      return [];
    case "turn.completed":
      return [{ type: "result", usage: ev.usage }];
    case "turn.failed": {
      const message = unwrapMessage(ev.error?.message || "Codex turn failed");
      return [{ type: "error", code: classifyError(message), message }];
    }
    default:
      return []; // 顶层 error 事件之后总会跟 turn.failed
  }
}

export const codex = {
  id: "codex",

  async detect() {
    const bin = await resolveBin("codex");
    if (!bin) return { installed: false };
    try {
      const version = (await execText(bin, ["--version"])).trim();
      const loggedIn = await execText(bin, ["login", "status"]).then(() => true, () => false);
      return { installed: true, version, loggedIn };
    } catch (err) {
      return { installed: true, error: err.message };
    }
  },

  run({ prompt, system, mcpUrl, mcpToken, resume, workRoot }) {
    // Codex 按 UUID 续接，不依赖工作目录；每次运行用独立目录放 AGENTS.md
    const cwd = mkdtempSync(join(workRoot, "codex-"));
    writeFileSync(join(cwd, "AGENTS.md"), system + CODEX_TOOL_HINT);
    return streamCli({
      name: "codex",
      args: buildCodexArgs({ mcpUrl, resume, ...userCodexModel() }),
      cwd,
      env: { [TOKEN_ENV]: mcpToken },
      stdin: prompt,
      mapEvent: mapCodexEvent,
      cleanup: () => rmSync(cwd, { recursive: true, force: true }),
    });
  },
};
