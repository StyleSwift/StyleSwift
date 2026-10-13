/**
 * StyleSwift - Side Panel session-list
 * 从 panel.js 拆分（行为不变）
 */

import { formatMessage, getMessage } from "../i18n.js";
import { AppState, DOM, stateManager } from "../panel-state.js";
import { clearMessages, renderHistoryMessages, setHasActiveStyles, showEmptyState, showError, updateTopBarDisplay } from "../panel.js";
import { escapeHtml, iconHtml } from "../ui/dom-utils.js";
import { setSkillAreaVisible } from "./skill-area.js";
import { clearPageOverride, setScopeMismatch, updateScopeButton } from "./top-bar.js";

// ============================================================================
// 会话下拉面板功能
// ============================================================================

/**
 * 渲染会话列表
 * 显示当前域名的所有会话，包括标题、日期、预览
 */
export async function renderSessionList() {
	const listContainer = document.getElementById("session-list");
	if (!listContainer) return;

	// 获取当前域名
	const domain = AppState.currentDomain;
	if (!domain) {
		listContainer.innerHTML =
			'<div class="session-list-empty">' +
			getMessage("domainNotDetected") +
			"</div>";
		return;
	}

	try {
		// 动态导入 session 模块
		const session = await import("../session.js");

		// 读取会话索引
		const indexKey = `sessions:${domain}:index`;
		const { [indexKey]: index = [] } = await chrome.storage.local.get(indexKey);

		if (!Array.isArray(index) || index.length === 0) {
			listContainer.innerHTML =
				'<div class="session-list-empty">' +
				getMessage("noSessions") +
				"</div>";
			return;
		}

		// 按创建时间降序排序
		const sorted = [...index].sort(
			(a, b) => (b.created_at || 0) - (a.created_at || 0),
		);

		// 清空列表
		listContainer.innerHTML = "";

		// 获取当前会话 ID
		const currentSessionId = session.getCurrentSession()?.sessionId;

		// 有页面级会话时按「全站 / 各页面路径」分组（规格 5）
		const hasPageSessions = sorted.some((s) => s.scope === "page");
		const groups = new Map();
		for (const item of sorted) {
			const key = item.scope === "page" ? item.path : "";
			groups.set(key, [...(groups.get(key) || []), item]);
		}
		const currentPath = stateManager.get("currentPath") || "/";
		const orderedKeys = [...groups.keys()].sort((a, b) =>
			a === "" ? -1 : b === "" ? 1 : a.localeCompare(b),
		);
		for (const key of orderedKeys) {
			if (hasPageSessions) {
				const title = document.createElement("div");
				title.className =
					"session-group-title" + (key && key === currentPath ? " current-path" : "");
				title.textContent = key || getMessage("scopeGroupDomain");
				listContainer.appendChild(title);
			}
			for (const sessionItem of groups.get(key)) {
				const card = await createSessionCard(
					sessionItem,
					domain,
					currentSessionId,
				);
				listContainer.appendChild(card);
			}
		}

		console.log(
			`[Panel] Rendered ${sorted.length} sessions for domain: ${domain}`,
		);
	} catch (error) {
		console.error("[Panel] Failed to render session list:", error);
		listContainer.innerHTML =
			'<div class="session-list-empty">' +
			getMessage("loadSessionError") +
			"</div>";
	}
}

/**
 * 创建会话卡片元素
 * @param {Object} sessionItem - 会话索引项
 * @param {string} domain - 域名
 * @param {string|null} currentSessionId - 当前会话 ID
 * @returns {Promise<HTMLElement>}
 */
export async function createSessionCard(sessionItem, domain, currentSessionId) {
	const { id, created_at } = sessionItem;

	// 动态导入 session 模块
	const session = await import("../session.js");

	// 加载会话元数据
	const meta = await session.loadSessionMeta(domain, id);

	// 加载首条用户消息（用于预览）
	const historyData = await session.loadAndPrepareHistory(domain, id);
	const firstUserMessage = historyData.messages.find(
		(msg) => msg.role === "user",
	);
	const preview = firstUserMessage?.content || getMessage("noContent");

	// 创建卡片元素
	const card = document.createElement("div");
	card.className = `session-card ${id === currentSessionId ? "active" : ""}`;
	card.dataset.sessionId = id;
	card.dataset.domain = domain;

	// 格式化日期
	const date = new Date(created_at || Date.now());
	const dateStr = date.toLocaleDateString("zh-CN", {
		month: "numeric",
		day: "numeric",
	});

	// 组装卡片内容
	card.innerHTML = `
    <div class="session-info">
      <div class="session-title">${escapeHtml(meta.title || getMessage("newSession"))}</div>
      <div class="session-date">${dateStr}</div>
      <div class="session-preview">${escapeHtml(preview.slice(0, 50))}</div>
    </div>
    <div class="session-actions">
      <button class="session-delete-btn" title="${getMessage("deleteSession")}" ${id === currentSessionId ? "disabled" : ""}>
        ${iconHtml("trash", 13)}
      </button>
    </div>
  `;

	// 绑定点击事件（切换会话）
	card.addEventListener("click", (e) => {
		// 如果点击的是删除按钮，不触发切换
		if (e.target.closest(".session-delete-btn")) return;
		handleSessionClick(domain, id);
	});

	// 绑定删除按钮事件
	const deleteBtn = card.querySelector(".session-delete-btn");
	deleteBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		if (!deleteBtn.disabled) {
			handleDeleteSession(domain, id, meta.title || getMessage("newSession"));
		}
	});

	return card;
}

/**
 * 处理会话点击（切换会话）
 *
 * 实现完整的会话切换流程：
 * 1. 卸载当前会话样式（移除 activeStyleEl）
 * 2. 加载目标会话历史（从 IndexedDB）
 * 3. 注入目标会话样式（从 stylesKey 读取）
 * 4. 更新 UI 对话区（渲染历史消息）
 * 5. 替换 SessionContext
 *
 *
 * 设计参考：§8.2 会话生命周期 — 切换会话
 *
 * @param {string} domain - 域名
 * @param {string} sessionId - 会话 ID
 */
export async function handleSessionClick(domain, sessionId) {
	try {
		console.log(`[Panel] Switching to session: ${sessionId}`);

		// 动态导入依赖模块
		const session = await import("../session.js");
		const { sendToContentScript } = await import("../tools.js");

		// === 1. 创建目标会话上下文；页面级会话只在其页面生效 ===
		const newSession = await session.loadSessionContext(domain, sessionId);
		session.setCurrentSession(newSession);
		updateScopeButton();
		const currentPath = stateManager.get("currentPath") || "/";
		const mismatch = newSession.scope === "page" && newSession.path !== currentPath;
		setScopeMismatch(
			mismatch
				? formatMessage("scopeMismatch", { path: newSession.path, current: currentPath })
				: null,
		);

		// === 2. 卸载当前会话样式并加载目标会话样式（不匹配时保持页面现状） ===
		if (!mismatch) try {
			await sendToContentScript({ tool: "unload_session_css" });
			console.log("[Panel] Unloaded current session CSS");
		} catch (error) {
			console.warn(
				"[Panel] Failed to unload session CSS (Content Script may not be ready):",
				error.message,
			);
			// 继续执行，不中断切换流程
		}

		if (!mismatch) {
			// 记录活跃会话；在本页选择全站会话时，移除本页的页面级覆盖
			await session.setActiveSession(domain, sessionId, newSession.scope, newSession.path);
			if (newSession.scope === "domain") await clearPageOverride(domain, currentPath);
		}

		// === 3. 加载目标会话样式并注入 ===
		const stylesKey = newSession.stylesKey;
		const { [stylesKey]: sessionCSS = "" } =
			await chrome.storage.local.get(stylesKey);

		// 同步 active_styles（供页面刷新时 early-inject.js 读取）
		const aKey = newSession.activeStylesKey;
		if (mismatch) {
			// 页面级会话不在其页面：不改动当前页面样式
		} else if (sessionCSS && sessionCSS.trim()) {
			await chrome.storage.local.set({ [aKey]: sessionCSS });
			try {
				await sendToContentScript({
					tool: "load_session_css",
					args: { css: sessionCSS },
				});
				console.log("[Panel] Loaded target session CSS");
				setHasActiveStyles(true);
			} catch (error) {
				console.warn("[Panel] Failed to load session CSS:", error.message);
			}
		} else {
			await chrome.storage.local.remove(aKey);
			setHasActiveStyles(false);
		}

		// === 4. 更新顶栏显示 ===
		const meta = await session.loadSessionMeta(domain, sessionId);
		updateTopBarDisplay(domain, meta.title || getMessage("newSession"));

		// 更新全局状态中的域名和会话 ID
		stateManager.set("currentDomain", domain);
		stateManager.set("currentSessionId", sessionId);

		// === 5. 关闭下拉面板 ===
		const panel = document.getElementById("session-list-panel");
		if (panel) panel.classList.add("hidden");

		// === 6. 清空当前对话区并加载历史消息 ===
		clearMessages();

		// 加载会话历史（新格式 { messages, snapshots }）
		const historyData = await session.loadAndPrepareHistory(domain, sessionId);

		// 渲染历史消息
		if (historyData.messages && historyData.messages.length > 0) {
			renderHistoryMessages(historyData.messages);
			// 有历史消息时：标记会话已开始，隐藏技能区
			stateManager.set("hasConversationStarted", true);
			setSkillAreaVisible(false);
			console.log(
				`[Panel] Loaded ${historyData.messages.length} history messages`,
			);
		} else {
			// 空会话：重置状态，显示技能区
			stateManager.set("hasConversationStarted", false);
			showEmptyState();
		}

		console.log("[Panel] Session switched successfully");
	} catch (error) {
		console.error("[Panel] Failed to switch session:", error);
		showError(getMessage("switchSessionError"));
	}
}

/**
 * 处理新建会话
 */
export async function handleNewSession() {
	try {
		console.log("[Panel] Creating new session");

		// 获取当前域名
		const domain = AppState.currentDomain;
		if (!domain) {
			showError(getMessage("domainNotDetected"));
			return;
		}

		// 动态导入 session 模块
		const session = await import("../session.js");

		// 生成新会话 ID
		const newSessionId = crypto.randomUUID();

		// 更新会话索引
		const indexKey = `sessions:${domain}:index`;
		const { [indexKey]: index = [] } = await chrome.storage.local.get(indexKey);

		const now = Date.now();
		const newSessionItem = {
			id: newSessionId,
			created_at: now,
		};

		// 添加到索引（最新会话放在最前面）
		const newIndex = [newSessionItem, ...index];
		await chrome.storage.local.set({ [indexKey]: newIndex });

		// 创建新的 SessionContext
		const newSession = new session.SessionContext(domain, newSessionId);
		session.setCurrentSession(newSession);

		// 记录活跃会话（确保下次打开 Side Panel 时恢复到此新会话）
		await session.setActiveSession(domain, newSessionId);
		// 新会话为全站范围：移除本页的页面级覆盖，否则本页仍会使用页面级会话
		await clearPageOverride(domain, stateManager.get("currentPath") || "/");
		stateManager.set("currentSessionId", newSessionId);
		setScopeMismatch(null);
		updateScopeButton();

		// 卸载当前会话样式并清空 active_styles
		try {
			const { sendToContentScript } = await import("../tools.js");
			await sendToContentScript({ tool: "unload_session_css" });
		} catch (error) {
			console.warn("[Panel] Failed to unload session CSS:", error.message);
		}
		await chrome.storage.local.remove(newSession.activeStylesKey);
		setHasActiveStyles(false);

		// 创建默认元数据
		await session.saveSessionMeta(domain, newSessionId, {
			title: null,
			created_at: now,
			message_count: 0,
		});

		// 重置会话对话状态（新会话允许显示技能区）
		stateManager.set("hasConversationStarted", false);

		// 更新顶栏显示
		updateTopBarDisplay(domain, getMessage("newSession"));

		// 关闭下拉面板
		const panel = document.getElementById("session-list-panel");
		if (panel) panel.classList.add("hidden");

		// 清空当前对话区
		clearMessages();
		showEmptyState();

		console.log(`[Panel] New session created: ${newSessionId}`);
	} catch (error) {
		console.error("[Panel] Failed to create new session:", error);
		showError(getMessage("createSessionError"));
	}
}

/**
 * 处理删除会话
 * @param {string} domain - 域名
 * @param {string} sessionId - 会话 ID
 * @param {string} sessionTitle - 会话标题
 */
export async function handleDeleteSession(domain, sessionId, sessionTitle) {
	try {
		// 先执行删除（不立即删除，等待确认）
		const indexKey = `sessions:${domain}:index`;
		const { [indexKey]: index = [] } = await chrome.storage.local.get(indexKey);

		// 判断是否为最后一个会话
		const isLastSession = index.length === 1;

		if (isLastSession) {
			// 最后一个会话，显示特殊提示
			showLastSessionModal(domain, sessionId, sessionTitle);
		} else {
			// 普通删除，显示标准确认弹窗
			showDeleteConfirmationModal(domain, sessionId, sessionTitle);
		}
	} catch (error) {
		console.error("[Panel] Failed to handle delete session:", error);
		showError(getMessage("deleteSessionFailed"));
	}
}

/**
 * 通用确认弹窗（替代原生 confirm，与面板内其他弹窗样式一致）
 * @param {{title: string, message: string, confirmText: string}} options
 * @returns {Promise<boolean>} 用户是否确认
 */
export function showConfirmModal({ title, message, confirmText }) {
	return new Promise((resolve) => {
		const overlay = document.createElement("div");
		overlay.className = "modal-overlay";
		overlay.innerHTML = `
    <div class="modal-container" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
      </div>
      <div class="modal-body">
        <p style="white-space: pre-line">${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-secondary" data-action="cancel">${getMessage("cancel")}</button>
        <button class="modal-btn modal-btn-danger" data-action="confirm">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;
		const close = (ok) => {
			overlay.remove();
			document.removeEventListener("keydown", onKey);
			resolve(ok);
		};
		const onKey = (e) => {
			if (e.key === "Escape") close(false);
		};
		overlay.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-action]");
			if (btn) close(btn.dataset.action === "confirm");
			else if (e.target === overlay) close(false);
		});
		document.addEventListener("keydown", onKey);
		document.body.appendChild(overlay);
		overlay.querySelector('[data-action="cancel"]').focus();
	});
}

/**
 * 显示删除确认弹窗
 * @param {string} domain - 域名
 * @param {string} sessionId - 会话 ID
 * @param {string} sessionTitle - 会话标题
 */
export function showDeleteConfirmationModal(domain, sessionId, sessionTitle) {
	// 创建遮罩
	const overlay = document.createElement("div");
	overlay.className = "modal-overlay";

	// 创建弹窗
	const modal = document.createElement("div");
	modal.className = "modal-container";

	modal.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${formatMessage("deleteConfirmTitle", { title: escapeHtml(sessionTitle) })}</h3>
    </div>
    <div class="modal-body">
      <p>${getMessage("deleteConfirmDesc")}</p>
    </div>
    <div class="modal-footer">
      <button class="modal-btn modal-btn-secondary" data-action="cancel">${getMessage("cancel")}</button>
      <button class="modal-btn modal-btn-danger" data-action="confirm">${getMessage("confirm")}</button>
    </div>
  `;

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	// 绑定事件
	const handleAction = async (action) => {
		if (action === "confirm") {
			await executeDeleteSession(domain, sessionId);
		}
		// 关闭弹窗
		overlay.remove();
	};

	modal.addEventListener("click", (e) => {
		const btn = e.target.closest("[data-action]");
		if (btn) {
			handleAction(btn.dataset.action);
		}
	});

	// 点击遮罩关闭
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) {
			handleAction("cancel");
		}
	});
}

/**
 * 显示最后会话删除提示
 * @param {string} domain - 域名
 * @param {string} sessionId - 会话 ID
 * @param {string} sessionTitle - 会话标题
 */
export function showLastSessionModal(domain, sessionId, sessionTitle) {
	const overlay = document.createElement("div");
	overlay.className = "modal-overlay";

	const modal = document.createElement("div");
	modal.className = "modal-container";

	modal.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${formatMessage("lastSession", { domain: escapeHtml(domain) })}</h3>
    </div>
    <div class="modal-body">
      <p>${getMessage("lastSessionDesc")}</p>
    </div>
    <div class="modal-footer">
      <button class="modal-btn modal-btn-secondary" data-action="cancel">${getMessage("cancel")}</button>
      <button class="modal-btn modal-btn-danger" data-action="delete">${getMessage("confirm")}</button>
    </div>
  `;

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	const handleAction = async (action) => {
		if (action === "delete") {
			await executeDeleteSession(domain, sessionId);
		}
		overlay.remove();
	};

	modal.addEventListener("click", (e) => {
		const btn = e.target.closest("[data-action]");
		if (btn) {
			handleAction(btn.dataset.action);
		}
	});

	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) {
			overlay.remove();
		}
	});
}

/**
 * 执行删除会话
 * @param {string} domain - 域名
 * @param {string} sessionId - 会话 ID
 */
export async function executeDeleteSession(domain, sessionId) {
	try {
		console.log(`[Panel] Deleting session: ${sessionId}`);

		const session = await import("../session.js");
		await session.deleteSession(domain, sessionId);

		const currentSession = session.getCurrentSession();
		if (currentSession && currentSession.sessionId === sessionId) {
			await handleNewSession();
		} else {
			await renderSessionList();
		}

		console.log("[Panel] Session deleted successfully");
	} catch (error) {
		console.error("[Panel] Failed to delete session:", error);
		showError(getMessage("deleteSession") + " " + getMessage("saveFailed"));
	}
}

/**
 * 更新状态指示灯
 * @param {'idle' | 'running' | 'error' | 'restricted'} status - 状态
 * @deprecated 请使用 setProcessingState / setErrorState / setRestrictedPageState
 */
export function updateStatusIndicator(status) {
	// 兼容旧接口：仅更新 agentStatus
	stateManager.set("agentStatus", status);
	// 直接更新指示灯，不触发完整联动（避免循环）
	const dot = DOM.statusDot?.querySelector(".dot");
	if (!dot) return;

	dot.classList.remove("ready", "processing", "error", "restricted");

	switch (status) {
		case "idle":
			dot.classList.add("ready");
			break;
		case "running":
			dot.classList.add("processing");
			break;
		case "error":
			dot.classList.add("error");
			break;
		case "restricted":
			dot.classList.add("restricted");
			break;
	}
}

