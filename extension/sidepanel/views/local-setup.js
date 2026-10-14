/**
 * StyleSwift - 本机 Agent 设置面板（引导页 / 设置页 / 弹窗共用）
 * 状态：授权 → 检测 Bridge → 安装 / 更新 → 选择可用引擎
 */

import { detectBridge, engineState, requestNativePermission } from "../agent/engines/bridge-client.js";
import { ENGINES } from "../agent/engines/prefs.js";
import { formatMessage, getMessage } from "../i18n.js";
import { escapeHtml } from "../ui/dom-utils.js";

const STORE_EXTENSION_ID = "llchggmimjgnbjlcgpkjmplhfbkjjcli";
const RAW = "https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts";
export const INSTALL_SCRIPT_URLS = { windows: `${RAW}/install.ps1`, unix: `${RAW}/install.sh` };
const LOGIN_COMMANDS = { "claude-code": "claude", codex: "codex login" };
const INSTALL_DOCS = { "claude-code": "https://docs.anthropic.com/en/docs/claude-code", codex: "https://github.com/openai/codex" };
const LOCAL_ENGINES = ENGINES.filter((e) => e.local);

export function installCommands(runtimeId, isWindows) {
  const devSuffix = runtimeId === STORE_EXTENSION_ID ? "" : ` --extension-id ${runtimeId}`;
  return {
    node: `npx -y styleswift-bridge@latest install${devSuffix}`,
    noNode: isWindows ? `irm ${INSTALL_SCRIPT_URLS.windows} | iex` : `curl -fsSL ${INSTALL_SCRIPT_URLS.unix} | sh`,
  };
}

function commandBlock(label, cmd) {
  return `
    <div class="local-cmd">
      <span class="local-cmd-label">${escapeHtml(label)}</span>
      <code>${escapeHtml(cmd)}</code>
      <button class="btn btn-secondary local-copy" data-copy="${escapeHtml(cmd)}">${getMessage("localCopy")}</button>
    </div>`;
}

function engineRow(engine, detection) {
  const state = engineState(detection, engine.id);
  const info = detection.engines?.[engine.id] ?? {};
  const status = {
    ready: formatMessage("localEngineReady", { version: info.version || "" }),
    "not-logged-in": formatMessage("localEngineNotLoggedIn", { cmd: LOGIN_COMMANDS[engine.id] }),
    "cli-missing": getMessage("localEngineMissing"),
    error: formatMessage("localEngineError", { error: info.error || "" }),
  }[state];
  const action = state === "ready"
    ? `<button class="btn btn-primary" data-action="use" data-engine="${engine.id}">${getMessage("localUseEngine")}</button>`
    : state === "cli-missing"
      ? `<a href="${INSTALL_DOCS[engine.id]}" target="_blank" rel="noopener">${getMessage("localInstallDocs")}</a>`
      : `<button class="btn btn-ghost" data-action="recheck">${getMessage("localRecheck")}</button>`;
  return `
    <div class="local-engine" data-engine="${engine.id}" data-state="${state}">
      <strong>${escapeHtml(engine.label)}</strong>
      <span class="local-engine-status">${escapeHtml(status)}</span>
      ${action}
    </div>`;
}

function render(detection) {
  const isWindows = /win/i.test(navigator.userAgentData?.platform || navigator.platform || "");
  const cmds = installCommands(chrome.runtime.id, isWindows);
  const recheck = `<button class="btn btn-ghost" data-action="recheck">${getMessage("localRecheck")}</button>`;
  const body = {
    "no-permission": `
      <p class="hint">${getMessage("localGrantHint")}</p>
      <button class="btn btn-primary" data-action="grant">${getMessage("localGrantPermission")}</button>`,
    "not-installed": `
      <p>${getMessage("localBridgeMissing")}</p>
      ${commandBlock(getMessage("localTabHasNode"), cmds.node)}
      ${commandBlock(getMessage("localTabNoNode"), cmds.noNode)}
      <p class="hint">${getMessage("localWaiting")}</p>${recheck}`,
    outdated: `
      <p>${getMessage("localBridgeOutdated")}</p>
      ${commandBlock(getMessage("localTabHasNode"), cmds.node)}${recheck}`,
    ok: LOCAL_ENGINES.map((e) => engineRow(e, detection)).join(""),
  }[detection.status];
  return `<div class="local-setup" data-state="${detection.status}">${body}</div>`;
}

export function renderLocalSetup(container, { onReady, pollMs = 3000 }) {
  let timer = null;
  let destroyed = false;

  const stopPolling = () => {
    clearInterval(timer);
    timer = null;
  };

  async function refresh() {
    if (destroyed) return;
    const detection = await detectBridge();
    if (destroyed) return;
    container.innerHTML = render(detection);
    // 未安装 / 过旧时自动轮询，等用户在终端装完
    if (["not-installed", "outdated"].includes(detection.status)) {
      timer ??= setInterval(refresh, pollMs);
    } else {
      stopPolling();
    }
  }

  async function onClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.copy) {
      await navigator.clipboard?.writeText(btn.dataset.copy);
      btn.textContent = getMessage("localCopied");
    } else if (btn.dataset.action === "grant") {
      if (await requestNativePermission()) await refresh();
      else container.querySelector(".hint").textContent = getMessage("localPermissionDenied");
    } else if (btn.dataset.action === "recheck") {
      container.querySelector(".local-setup").dataset.checking = "true";
      await refresh();
    } else if (btn.dataset.action === "use") {
      onReady(btn.dataset.engine);
    }
  }

  container.addEventListener("click", onClick);
  container.innerHTML = `<div class="local-setup" data-state="checking"><p class="hint">${getMessage("localChecking")}</p></div>`;
  return {
    refresh,
    destroy() {
      destroyed = true;
      stopPolling();
      container.removeEventListener("click", onClick);
    },
  };
}
