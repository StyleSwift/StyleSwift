/**
 * StyleSwift - Side Panel top-bar
 * 从 panel.js 拆分（行为不变）
 */

import { formatMessage, getMessage } from "../i18n.js";
import { AppState, DOM, stateManager } from "../panel-state.js";
import { showError, switchView } from "../panel.js";
import { getCurrentSession, pageActiveKey, pageStylesKey } from "../session/context.js";
import { handleNewSession, renderSessionList } from "./session-list.js";
import { initSettingsView } from "./settings.js";

// ============================================================================
// 顶栏与样式控制
// ============================================================================

/**
 * 绑定顶栏交互事件
 */
export function bindTopBarEvents() {
	// 会话标题区域点击 - 展开/收起会话列表
	const sessionHeader = document.getElementById("session-header");
	const sessionListToggle = document.getElementById("session-list-toggle");

	if (sessionHeader) {
		sessionHeader.addEventListener("click", toggleSessionList);
	}

	if (sessionListToggle) {
		sessionListToggle.addEventListener("click", (e) => {
			e.stopPropagation();
			toggleSessionList();
		});
	}

	// 新建会话按钮
	const newSessionBtn = document.getElementById("new-session-btn");
	if (newSessionBtn) {
		newSessionBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			handleNewSession();
		});
	}

	// 设置按钮
	const settingsBtn = document.getElementById("settings-btn");
	if (settingsBtn) {
		settingsBtn.addEventListener("click", () => {
			initSettingsView();
			switchView("settings");
		});
	}

	// 样式控制：撤销上一步 / 站点样式开关
	document
		.getElementById("undo-style-btn")
		?.addEventListener("click", handleUndoStyleClick);
	document
		.getElementById("toggle-styles-btn")
		?.addEventListener("click", handleToggleStylesClick);
	stateManager.subscribe("currentDomain", refreshStyleControls);
	stateManager.subscribe("currentPath", refreshStyleControls);
	document.getElementById("scope-btn")?.addEventListener("click", handleScopeToggle);
	chrome.storage.onChanged.addListener((changes, area) => {
		const domain = stateManager.get("currentDomain");
		if (
			area === "local" &&
			Object.keys(changes).some(
				(k) =>
					k === `active_styles:${domain}` ||
					k.startsWith(`active_styles:${domain}:page:`) ||
					k === `styles_disabled:${domain}`,
			)
		) {
			refreshStyleControls();
		}
	});
	refreshStyleControls();

	// 点击会话列表外部关闭
	document.addEventListener("click", (e) => {
		const panel = document.getElementById("session-list-panel");
		const sessionHeader = document.getElementById("session-header");

		if (panel && sessionHeader) {
			const isClickInside =
				panel.contains(e.target) || sessionHeader.contains(e.target);
			if (!isClickInside && !panel.classList.contains("hidden")) {
				panel.classList.add("hidden");
			}
		}
	});
}

/**
 * 按存储状态刷新顶栏样式控制按钮：有样式才显示，开关图标反映站点开/关
 */
export async function refreshStyleControls() {
	const undoBtn = document.getElementById("undo-style-btn");
	const toggleBtn = document.getElementById("toggle-styles-btn");
	if (!undoBtn || !toggleBtn) return;

	const domain = stateManager.get("currentDomain");
	const pKey = pageStylesKey(domain, stateManager.get("currentPath") || "/");
	const aKey = `active_styles:${domain}`;
	const dKey = `styles_disabled:${domain}`;
	const r = domain ? await chrome.storage.local.get([pKey, aKey, dKey]) : {};
	const hasStyles = !!(r[pKey] || r[aKey]);
	const disabled = !!r[dKey];

	undoBtn.classList.toggle("hidden", !hasStyles);
	toggleBtn.classList.toggle("hidden", !hasStyles);
	toggleBtn.setAttribute("aria-pressed", String(!disabled));
	toggleBtn.querySelector(".icon").classList.toggle("icon-eye", !disabled);
	toggleBtn.querySelector(".icon").classList.toggle("icon-eye-off", disabled);
	const label = formatMessage(disabled ? "showSiteStyles" : "hideSiteStyles", { domain });
	toggleBtn.title = label;
	toggleBtn.setAttribute("aria-label", label);
}

/**
 * 撤销最近一次样式修改（顶栏按钮与应用后浮层共用）
 */
export async function handleUndoStyleClick() {
	if (AppState.agentStatus === "running") return;
	// 会话属于其他页面时，撤销会把它的样式写到当前页
	if (scopeMismatch) {
		showError(getMessage("scopeMismatchBlocked"));
		return;
	}
	try {
		const { executeTool } = await import("../tools.js");
		const result = await executeTool("apply_styles", { mode: "rollback_last" });
		if (String(result).startsWith("没有可回滚")) {
			showError(getMessage("nothingToUndo"));
		}
	} catch (error) {
		console.error("[Panel] 撤销失败:", error);
		showError(getMessage("undoStyleFailed"));
	}
}

/**
 * 站点样式开关：写入 styles_disabled:{domain}，由 content script 和 early-inject 生效
 */
export async function handleToggleStylesClick() {
	const domain = stateManager.get("currentDomain");
	if (!domain) return;
	const dKey = `styles_disabled:${domain}`;
	try {
		const { [dKey]: disabled } = await chrome.storage.local.get(dKey);
		if (disabled) {
			await chrome.storage.local.remove(dKey);
		} else {
			await chrome.storage.local.set({ [dKey]: true });
		}
	} catch (error) {
		console.error("[Panel] 切换站点样式失败:", error);
		showError(getMessage("toggleStylesFailed"));
	}
}

/** 当前查看的页面级会话是否不属于当前页面 */
export let scopeMismatch = false;

/**
 * 显示/隐藏「页面级会话不匹配」提示（规格 7.2）
 * @param {string|null} text - 提示文案，null 表示隐藏
 */
export function setScopeMismatch(text) {
	scopeMismatch = !!text;
	document.getElementById("scope-notice")?.remove();
	if (!text) return;
	const notice = document.createElement("div");
	notice.id = "scope-notice";
	notice.className = "scope-notice";
	notice.textContent = text;
	DOM.chatArea?.prepend(notice);
}

/**
 * 移除某页面的页面级覆盖（活跃指针与页面级活跃样式）
 */
export async function clearPageOverride(domain, path) {
	await chrome.storage.local.remove([
		pageActiveKey(domain, path),
		pageStylesKey(domain, path),
	]);
}

/** 应用样式后浮层中的作用范围说明 */
export function scopeHintText() {
	const session = getCurrentSession();
	return session?.scope === "page"
		? formatMessage("scopeHintPage", { path: session.path })
		: formatMessage("scopeHint", { domain: stateManager.get("currentDomain") || "" });
}

/**
 * 刷新输入区「全站 / 仅本页」开关
 */
export function updateScopeButton() {
	const btn = document.getElementById("scope-btn");
	if (!btn) return;
	const session = getCurrentSession();
	const isPage = session?.scope === "page";
	btn.classList.toggle("active", isPage);
	const icon = btn.querySelector(".icon");
	icon.classList.toggle("icon-file", isPage);
	icon.classList.toggle("icon-globe", !isPage);
	btn.querySelector(".scope-label").textContent = getMessage(
		isPage ? "scopePage" : "scopeDomain",
	);
	const label = formatMessage(isPage ? "scopePageTitle" : "scopeDomainTitle", {
		domain: stateManager.get("currentDomain") || "",
		path: isPage ? session.path : stateManager.get("currentPath") || "/",
	});
	btn.title = label;
	btn.setAttribute("aria-label", label);
	btn.setAttribute("aria-pressed", String(isPage));
}

/**
 * 切换当前会话的作用范围：全站 ↔ 仅当前页面（样式保留，只改变应用范围）
 */
export async function handleScopeToggle() {
	if (AppState.agentStatus === "running") return;
	const domain = stateManager.get("currentDomain");
	const current = getCurrentSession();
	if (!domain || !current) return;
	const path = stateManager.get("currentPath") || "/";
	const toScope = current.scope === "page" ? "domain" : "page";

	try {
		const session = await import("../session.js");
		const { sendToContentScript } = await import("../tools.js");
		const ctx = await session.setSessionScope(
			domain,
			current.sessionId,
			toScope,
			toScope === "page" ? path : null,
		);
		session.setCurrentSession(ctx);
		// 改为全站时，移除本页其他页面级会话的覆盖，确保本会话在本页生效
		if (toScope === "domain") await clearPageOverride(domain, path);

		const { [ctx.stylesKey]: css = "" } = await chrome.storage.local.get(ctx.stylesKey);
		await sendToContentScript({ tool: "load_session_css", args: { css } });
		setScopeMismatch(null);
		updateScopeButton();
		refreshStyleControls();
	} catch (error) {
		console.error("[Panel] Failed to switch style scope:", error);
		showError(getMessage("scopeSwitchFailed"));
	}
}

/**
 * 切换会话列表面板
 */
export function toggleSessionList() {
	const panel = document.getElementById("session-list-panel");
	if (!panel) return;

	const isHidden = panel.classList.contains("hidden");

	if (isHidden) {
		// 显示面板前先加载会话列表
		renderSessionList();
		panel.classList.remove("hidden");
	} else {
		panel.classList.add("hidden");
	}
}

