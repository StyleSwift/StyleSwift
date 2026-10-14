/**
 * StyleSwift - 输入框旁的引擎切换器
 * 下一条消息生效；运行中不可切换；会话中途切换时在消息流插入提示。
 */

import { detectBridge, engineState } from "../agent/engines/bridge-client.js";
import { ENGINES, engineLabel, getEngine, isLocalEngine, setEngine } from "../agent/engines/prefs.js";
import { getSettings } from "../api.js";
import { formatMessage, getMessage } from "../i18n.js";
import { escapeHtml } from "../ui/dom-utils.js";
import { renderLocalSetup } from "./local-setup.js";

let deps = null;

export const engineDisplayName = (id) => (id === "builtin" ? getMessage("engineBuiltin") : engineLabel(id));

async function hasApiKey() {
  try {
    await getSettings();
    return true;
  } catch {
    return false;
  }
}

export async function refreshEngineLabel() {
  document.querySelector("#engine-btn .engine-label").textContent = engineDisplayName(await getEngine());
}

function closeMenu() {
  document.getElementById("engine-menu").classList.add("hidden");
  document.getElementById("engine-btn").setAttribute("aria-expanded", "false");
}

async function choose(engineId) {
  closeMenu();
  if (deps.isBusy()) return;
  if ((await getEngine()) === engineId) return;
  await setEngine(engineId);
  await refreshEngineLabel();
  if (deps.hasMessages()) deps.onNotice(formatMessage("engineSwitched", { engine: engineDisplayName(engineId) }));
}

export async function openEngineMenu() {
  if (deps.isBusy()) return;
  const menu = document.getElementById("engine-menu");
  const [current, keyOk, detection] = await Promise.all([getEngine(), hasApiKey(), detectBridge()]);
  if (deps.isBusy()) return; // 检测期间开始了运行
  menu.innerHTML =
    `<div class="engine-menu-title">${getMessage("engineMenuTitle")}</div>` +
    ENGINES.map((e) => {
      const available = isLocalEngine(e.id) ? engineState(detection, e.id) === "ready" : keyOk;
      const hint = available ? "" : getMessage(isLocalEngine(e.id) ? "engineGoSetup" : "engineConfigureApiKey");
      return `<button class="engine-menu-item" role="menuitemradio" aria-checked="${e.id === current}"
        data-engine="${e.id}" data-available="${available}">
        <span>${escapeHtml(engineDisplayName(e.id))}</span><span class="hint">${escapeHtml(hint)}</span></button>`;
    }).join("");
  menu.classList.remove("hidden");
  document.getElementById("engine-btn").setAttribute("aria-expanded", "true");
}

export function openLocalSetupModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-container" role="dialog" aria-modal="true">
      <div class="modal-header"><h3 class="modal-title">${getMessage("localAgentTitle")}</h3></div>
      <div class="modal-body" id="local-setup-modal-body"></div>
      <div class="modal-footer"><button class="modal-btn modal-btn-secondary" data-action="close">${getMessage("cancel")}</button></div>
    </div>`;
  document.body.append(overlay);
  const close = () => {
    setup.destroy();
    overlay.remove();
  };
  const setup = renderLocalSetup(overlay.querySelector("#local-setup-modal-body"), {
    onReady: async (engineId) => {
      close();
      await choose(engineId);
    },
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest('[data-action="close"]')) close();
  });
  setup.refresh();
}

export async function initEngineSwitcher(options) {
  deps = options;
  await refreshEngineLabel();
  const btn = document.getElementById("engine-btn");
  const menu = document.getElementById("engine-menu");
  if (btn.dataset.bound === "true") return;
  btn.dataset.bound = "true";

  btn.addEventListener("click", () => (menu.classList.contains("hidden") ? openEngineMenu() : closeMenu()));
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-engine]");
    if (!item) return;
    if (item.dataset.available === "true") return choose(item.dataset.engine);
    closeMenu();
    if (isLocalEngine(item.dataset.engine)) openLocalSetupModal();
    else deps.openSettings();
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });
}
