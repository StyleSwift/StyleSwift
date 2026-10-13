/**
 * StyleSwift - Panel UI Module
 *
 * Side Panel UI controller
 * Responsible for: onboarding, main view, settings view management and interactions
 *
 * This file implements:
 * - First-run onboarding (shown when no API Key detected)
 * - View switching logic
 * - Skill chips area
 */

// ============================================================================
// Imports
// ============================================================================

import {
	checkFirstRun,
} from "./api.js";
import {
	applyTranslations,
	formatMessage,
	getMessage,
} from "./i18n.js";
import { TypewriterEffect } from "./ui/typewriter.js";
import { StreamingTextRenderer } from "./ui/streaming-renderer.js";
import { ToolCardManager, getToolDisplayName } from "./ui/tool-card-manager.js";
import { TodoCardManager } from "./ui/todo-card-manager.js";
import { ConfirmationOverlay } from "./ui/confirmation-overlay.js";
import { escapeHtml, iconHtml } from "./ui/dom-utils.js";
import {
	extractPath,
} from "./session/context.js";

import { AppState, DOM, stateManager } from "./panel-state.js";
import { initOnboarding } from "./views/onboarding.js";
import { handleNewSession, showConfirmModal, updateStatusIndicator } from "./views/session-list.js";
import { initSettingsView } from "./views/settings.js";
import { initSkillArea, setSkillAreaVisible } from "./views/skill-area.js";
import { bindTopBarEvents, handleUndoStyleClick, scopeHintText, scopeMismatch, setScopeMismatch, updateScopeButton } from "./views/top-bar.js";

// ============================================================================
// 打字机效果管理器
// ============================================================================

// 创建全局打字机效果实例
const typewriterEffect = new TypewriterEffect();

// ============================================================================
// 应用状态
// ============================================================================

/**
 * 应用全局状态定义
 *
 * 设计参考：§16.5 全局状态联动
 *
 * 状态说明：
 * - agentStatus: Agent 运行状态
 *   - 'idle': 空闲，等待用户输入
 *   - 'running': 正在处理用户请求
 *   - 'error': 出现错误
 *   - 'restricted': 受限页面（chrome:// 等）
 *
 * - apiKeyStatus: API Key 状态
 *   - 'valid': 已验证有效
 *   - 'invalid': 验证失败/过期
 *   - 'missing': 未配置
 *
 * - pageStatus: 页面状态
 *   - 'ready': 正常页面，可操作
 *   - 'restricted': 受限页面，不支持样式修改
 *
 * - hasActiveStyles: 是否有样式生效
 *
 * - storageWarning: 存储空间警告
 *   - 'none': 无警告
 *   - 'warning': 存储将满（>80%）
 *   - 'critical': 存储严重不足（>95%）
 */


/**
 * 当前选中的元素列表（由元素选择器设置）
 * 支持多选，存在时会作为上下文注入到 agentLoop 的 prompt 中
 * @type {Array<Object>}
 */
let _pickedElementInfo = [];

/**
 * 元素选择器是否处于激活状态
 * @type {boolean}
 */
let _pickerActive = false;

/**
 * 当前附加的图片列表
 * 每个图片对象包含: { file, dataUrl, preview }
 * @type {Array<Object>}
 */
let _attachedImages = [];


// ============================================================================
// 视图切换
// ============================================================================

/**
 * 切换视图
 * @param {'onboarding' | 'main' | 'settings'} viewName - 目标视图名称
 */
function switchView(viewName) {
	// 隐藏所有视图
	DOM.onboardingView.classList.add("hidden");
	DOM.mainView.classList.add("hidden");
	DOM.settingsView.classList.add("hidden");

	// 显示目标视图
	switch (viewName) {
		case "onboarding":
			DOM.onboardingView.classList.remove("hidden");
			break;
		case "main":
			DOM.mainView.classList.remove("hidden");
			break;
		case "settings":
			DOM.settingsView.classList.remove("hidden");
			break;
		default:
			console.error("[Panel] Unknown view:", viewName);
			return;
	}

	AppState.currentView = viewName;
	console.log("[Panel] Switched to view:", viewName);
}

/**
 * 显示加载状态
 * @param {boolean} show - 是否显示
 */
function showLoading(show) {
	if (show) {
		DOM.loadingOverlay.classList.remove("hidden");
	} else {
		DOM.loadingOverlay.classList.add("hidden");
	}
}

/**
 * 显示错误提示
 * @param {string} message - 错误消息
 * @param {number} duration - 显示时长(ms)，默认 5000ms
 */
function showError(message, duration = 5000) {
	DOM.errorMessage.textContent = message;
	DOM.errorToast.classList.remove("hidden");

	// 自动隐藏
	setTimeout(() => {
		DOM.errorToast.classList.add("hidden");
	}, duration);
}

/**
 * 隐藏错误提示
 */
function hideError() {
	DOM.errorToast.classList.add("hidden");
}

// ============================================================================
// 全局状态联动
// ============================================================================

/**
 * 全局状态联动配置表
 *
 * 设计参考：§16.5 全局状态联动
 *
 * 定义各状态下各区域的表现
 *
 * 区域定义：
 * - topBar: 顶栏状态指示灯
 * - chatArea: 对话区
 * - inputArea: 输入区
 * - skillArea: 技能快捷区
 * - errorBanner: 错误横幅
 */
const GLOBAL_STATE_CONFIG = {
	/**
	 * 就绪状态
	 * - 顶栏：🟢 绿色
	 * - 对话区：正常
	 * - 输入区：可输入，发送按钮
	 * - 技能区：正常
	 */
	ready: {
		topBar: { status: "idle" },
		chatArea: { mode: "normal" },
		inputArea: { mode: "idle" },
		skillArea: { mode: "normal" },
		errorBanner: { show: false },
	},

	/**
	 * 处理中状态
	 * - 顶栏：🟡 黄色 + 脉动动画
	 * - 对话区：流式输出 + 工具卡片
	 * - 输入区：可输入（支持排队消息），停止按钮可见
	 * - 技能区：正常但不可点击
	 */
	processing: {
		topBar: { status: "running" },
		chatArea: { mode: "streaming" },
		inputArea: { mode: "queuing" }, // 新模式：允许用户排队消息
		skillArea: { mode: "disabled" },
		errorBanner: { show: false },
	},

	/**
	 * 有样式生效状态
	 * - 顶栏：🟢 绿色
	 * - 对话区：正常
	 * - 输入区：正常 + 样式应用后浮层
	 * - 技能区：正常
	 */
	hasStyles: {
		topBar: { status: "idle" },
		chatArea: { mode: "normal" },
		inputArea: { mode: "idle" },
		skillArea: { mode: "normal" },
		errorBanner: { show: false },
	},

	/**
	 * API Key 缺失状态
	 * - 顶栏：🔴 红色
	 * - 其他区域：不显示（引导页）
	 */
	apiKeyMissing: {
		topBar: { status: "error" },
		chatArea: { mode: "hidden" },
		inputArea: { mode: "hidden" },
		skillArea: { mode: "hidden" },
		errorBanner: { show: false },
	},

	/**
	 * API Key 无效状态
	 * - 顶栏：🔴 红色
	 * - 对话区：顶部错误横幅
	 * - 输入区：可输入
	 * - 技能区：正常
	 */
	apiKeyInvalid: {
		topBar: { status: "error" },
		chatArea: { mode: "normal" },
		inputArea: { mode: "idle" },
		skillArea: { mode: "normal" },
		errorBanner: { show: true, type: "API_KEY_INVALID" },
	},

	/**
	 * 网络错误状态
	 * - 顶栏：🔴 红色
	 * - 对话区：顶部错误横幅 + 重试按钮
	 * - 输入区：可输入
	 * - 技能区：正常
	 */
	networkError: {
		topBar: { status: "error" },
		chatArea: { mode: "normal" },
		inputArea: { mode: "idle" },
		skillArea: { mode: "normal" },
		errorBanner: { show: true, type: "NETWORK_ERROR" },
	},

	/**
	 * API 错误状态
	 * - 顶栏：🔴 红色
	 * - 对话区：顶部错误横幅 + 重试按钮
	 * - 输入区：可输入
	 * - 技能区：正常
	 */
	apiError: {
		topBar: { status: "error" },
		chatArea: { mode: "normal" },
		inputArea: { mode: "idle" },
		skillArea: { mode: "normal" },
		errorBanner: { show: true, type: "API_ERROR" },
	},

	/**
	 * 受限页面状态
	 * - 顶栏：⚪ 灰色
	 * - 对话区：居中提示
	 * - 输入区：整体置灰禁用
	 * - 技能区：整体置灰禁用
	 */
	restricted: {
		topBar: { status: "restricted" },
		chatArea: { mode: "restricted" },
		inputArea: { mode: "restricted" },
		skillArea: { mode: "disabled" },
		errorBanner: { show: false },
	},

	/**
	 * 存储将满状态（不单独作为主状态，叠加在其他状态上）
	 * - 顶栏：继承主状态
	 * - 其他区域：无影响，设置页内提醒
	 */
	storageWarning: {
		// 存储警告不改变主状态，仅作为叠加状态
		topBar: { inherit: true },
		chatArea: { inherit: true },
		inputArea: { inherit: true },
		skillArea: { inherit: true },
		errorBanner: { inherit: true },
	},
};

/**
 * 计算当前全局状态
 * 根据各子状态综合计算最终的全局状态
 * @returns {string} 全局状态名称
 */
function computeGlobalState() {
	const agentStatus = stateManager.get("agentStatus");
	const apiKeyStatus = stateManager.get("apiKeyStatus");
	const pageStatus = stateManager.get("pageStatus");
	const hasActiveStyles = stateManager.get("hasActiveStyles");
	const currentError = stateManager.get("currentError");

	// 优先级：受限页面 > API Key 缺失 > 处理中 > 错误 > 有样式 > 就绪

	// 1. 受限页面
	if (pageStatus === "restricted") {
		return "restricted";
	}

	// 2. API Key 缺失（显示引导页）
	if (apiKeyStatus === "missing") {
		return "apiKeyMissing";
	}

	// 3. 处理中
	if (agentStatus === "running") {
		return "processing";
	}

	// 4. 错误状态
	if (currentError) {
		switch (currentError) {
			case "API_KEY_INVALID":
				return "apiKeyInvalid";
			case "NETWORK_ERROR":
				return "networkError";
			case "API_ERROR":
				return "apiError";
		}
	}

	// 5. 有样式生效
	if (hasActiveStyles) {
		return "hasStyles";
	}

	// 6. 就绪状态
	return "ready";
}

/**
 * 应用全局状态到 UI
 * 根据当前状态配置更新所有区域的显示
 * @param {string} [forceState] - 强制指定的状态（可选，用于调试）
 */
function applyGlobalState(forceState) {
	const globalState = forceState || computeGlobalState();
	const config = GLOBAL_STATE_CONFIG[globalState];

	if (!config) {
		console.error("[Panel] Unknown global state:", globalState);
		return;
	}

	console.log("[Panel] Applying global state:", globalState);

	// 1. 更新顶栏状态指示灯
	applyTopBarState(config.topBar);

	// 2. 更新对话区状态
	applyChatAreaState(config.chatArea);

	// 3. 更新输入区状态
	applyInputAreaState(config.inputArea);

	// 4. 更新技能区状态
	applySkillAreaState(config.skillArea);

	// 5. 更新错误横幅
	applyErrorBannerState(config.errorBanner);
}

/**
 * 应用顶栏状态
 * @param {Object} config - 顶栏配置
 */
function applyTopBarState(config) {
	if (!DOM.statusDot) return;

	const dot = DOM.statusDot.querySelector(".dot");
	if (!dot) return;

	// 更新状态指示灯颜色
	dot.classList.remove("ready", "processing", "error", "restricted");

	switch (config.status) {
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

/**
 * 更新顶栏显示
 * @param {string} domain - 当前域名
 * @param {string} title - 会话标题
 */
function updateTopBarDisplay(domain, title) {
	const domainEl = document.getElementById("current-domain");
	const titleEl = document.getElementById("session-title");

	if (domainEl) {
		domainEl.textContent = domain || "--";
	}

	if (titleEl) {
		titleEl.textContent = title || getMessage("newSession");
	}
}

/**
 * 应用对话区状态
 * @param {Object} config - 对话区配置
 */
function applyChatAreaState(config) {
	if (!DOM.messagesContainer) return;

	// 移除所有状态类
	DOM.messagesContainer.classList.remove("restricted-mode", "hidden");

	switch (config.mode) {
		case "normal": {
			// 正常模式
			// 移除受限提示（如果存在）
			const restrictedTip =
				DOM.messagesContainer.querySelector(".restricted-tip");
			if (restrictedTip) {
				restrictedTip.remove();
			}
			break;
		}

		case "streaming":
			// 流式输出模式（由 Agent Loop 控制）
			break;

		case "restricted": {
			// 受限页面模式：居中提示
			DOM.messagesContainer.classList.add("restricted-mode");

			// 清空并显示受限提示
			DOM.messagesContainer.innerHTML = "";
			const tip = document.createElement("div");
			tip.className = "restricted-tip";
			tip.innerHTML = `
        <div class="restricted-icon">${iconHtml("lock", 48)}</div>
        <div class="restricted-title">${getMessage("restrictedPage")}</div>
        <div class="restricted-desc">${getMessage("restrictedPageDesc")}</div>
      `;
			DOM.messagesContainer.appendChild(tip);
			break;
		}

		case "hidden":
			// 隐藏模式（引导页时）
			DOM.messagesContainer.classList.add("hidden");
			break;
	}
}

/**
 * 应用输入区状态
 * @param {Object} config - 输入区配置
 */
function applyInputAreaState(config) {
	if (!DOM.inputArea || !DOM.messageInput || !DOM.sendBtn || !DOM.stopBtn)
		return;

	// 移除所有状态类
	DOM.inputArea.classList.remove("processing", "restricted", "hidden", "queuing");
	DOM.sendBtn.classList.remove("hidden");
	DOM.stopBtn.classList.add("hidden");

	switch (config.mode) {
		case "idle":
			// 空闲态：输入框可用 + 发送按钮
			DOM.messageInput.disabled = false;
			DOM.messageInput.placeholder = "";
			// 恢复打字机效果显示（如果输入框为空且未聚焦）
			typewriterEffect.checkShow();
			break;

		case "queuing":
			// 排队态（Agent运行中）：输入框可用 + 发送按钮 + 停止按钮
			// 用户可以发送消息，消息会被排队到下一轮迭代
			DOM.inputArea.classList.add("queuing");
			DOM.messageInput.disabled = false;
			DOM.messageInput.placeholder = "";
			DOM.sendBtn.classList.remove("hidden");
			DOM.stopBtn.classList.remove("hidden"); // 同时显示停止按钮
			typewriterEffect.hide();
			break;

		case "processing":
			// 处理中（传统模式，暂不使用）：输入框禁用 + 停止按钮
			DOM.inputArea.classList.add("processing");
			DOM.messageInput.disabled = true;
			DOM.messageInput.placeholder = getMessage("processing");
			DOM.sendBtn.classList.add("hidden");
			DOM.stopBtn.classList.remove("hidden");
			// Agent 运行时隐藏打字机效果
			typewriterEffect.hide();
			break;

		case "restricted":
			// 受限页面：整体置灰 + 提示
			DOM.inputArea.classList.add("restricted");
			DOM.messageInput.disabled = true;
			DOM.messageInput.placeholder = getMessage("restrictedPage");
			// 保留草稿：跟随标签页切换时可能短暂经过受限页（新标签页、加载中）
			DOM.sendBtn.disabled = true;
			// 受限页面隐藏打字机效果
			typewriterEffect.hide();
			break;

		case "hidden":
			// 隐藏模式（引导页时）
			DOM.inputArea.classList.add("hidden");
			break;
	}
}

/**
 * 应用技能区状态
 * @param {Object} config - 技能区配置
 */
function applySkillAreaState(config) {
	if (!DOM.skillArea) return;

	// 检查会话是否已开始对话
	// 如果已开始对话，技能区应始终隐藏（仅新会话显示）
	const hasConversationStarted = stateManager.get("hasConversationStarted");
	if (hasConversationStarted) {
		DOM.skillArea.classList.add("hidden");
		DOM.skillArea.classList.remove("disabled");
		return;
	}

	// 移除所有状态类
	DOM.skillArea.classList.remove("disabled", "hidden");

	switch (config.mode) {
		case "normal":
			// 正常模式：可点击
			DOM.skillArea.style.pointerEvents = "";
			DOM.skillArea.style.opacity = "";
			break;

		case "disabled":
			// 禁用模式：置灰不可点击
			DOM.skillArea.classList.add("disabled");
			DOM.skillArea.style.pointerEvents = "none";
			DOM.skillArea.style.opacity = "0.5";
			break;

		case "hidden":
			// 隐藏模式
			DOM.skillArea.classList.add("hidden");
			break;
	}
}

/**
 * 应用错误横幅状态
 * @param {Object} config - 错误横幅配置
 */
function applyErrorBannerState(config) {
	if (!DOM.errorBanner) return;

	if (config.show) {
		const alreadyShown =
			!DOM.errorBanner.classList.contains("hidden") &&
			DOM.errorBanner.dataset.type === config.type;
		if (!alreadyShown) showErrorBanner(config.type);
	} else {
		hideErrorBanner();
	}
}

/**
 * 设置处理中状态（便捷方法）
 * 自动更新 agentStatus 并应用全局状态
 * @param {boolean} isProcessing - 是否处理中
 */
function setProcessingState(isProcessing) {
	stateManager.set("agentStatus", isProcessing ? "running" : "idle");
	stateManager.set("currentError", null); // 清除错误
	applyGlobalState();
}

/**
 * 设置受限页面状态（便捷方法）
 * @param {boolean} isRestricted - 是否为受限页面
 */
function setRestrictedPageState(isRestricted) {
	stateManager.set("pageStatus", isRestricted ? "restricted" : "ready");
	applyGlobalState();
}

/**
 * 设置错误状态（便捷方法）
 * @param {string|null} errorType - 错误类型：'API_KEY_INVALID' | 'NETWORK_ERROR' | 'API_ERROR' | null
 */
function setErrorState(errorType) {
	stateManager.set("currentError", errorType);
	if (errorType) {
		stateManager.set("agentStatus", "error");
	}
	applyGlobalState();
}

/**
 * 清除错误状态
 */
function clearErrorState() {
	stateManager.set("currentError", null);
	if (stateManager.get("agentStatus") === "error") {
		stateManager.set("agentStatus", "idle");
	}
	applyGlobalState();
}

/**
 * 设置样式生效状态
 * @param {boolean} hasStyles - 是否有样式生效
 */
function setHasActiveStyles(hasStyles) {
	stateManager.set("hasActiveStyles", hasStyles);
	applyGlobalState();
}

/**
 * 设置 API Key 状态
 * @param {string} status - API Key 状态：'valid' | 'invalid' | 'missing'
 */
function setApiKeyStatus(status) {
	stateManager.set("apiKeyStatus", status);
	applyGlobalState();
}

/**
 * 初始化状态联动
 * 设置状态变化监听器
 */
function initStateSync() {
	// 监听关键状态变化，自动应用全局状态
	const watchedKeys = [
		"agentStatus",
		"apiKeyStatus",
		"pageStatus",
		"hasActiveStyles",
		"currentError",
	];

	watchedKeys.forEach((key) => {
		stateManager.subscribe(key, () => {
			applyGlobalState();
		});
	});

	console.log("[Panel] State sync initialized");
}

// ============================================================================
// 主界面逻辑
// ============================================================================

/**
 * 动态注入 Content Scripts 到当前标签页
 * 用于处理扩展刷新后已打开页面没有注入脚本的情况
 * @returns {Promise<void>}
 */
async function injectContentScripts() {
	const { getTargetTabId } = await import("./tools.js");
	const tabId = await getTargetTabId();

	// Content Scripts 配置
	const scripts = [
		{ file: "content/early-inject.js", name: "early-inject" },
		{ file: "content/content.js", name: "content-script" },
	];

	console.log(`[Panel] Dynamically injecting content scripts to tab ${tabId}`);

	for (const script of scripts) {
		try {
			await chrome.scripting.executeScript({
				target: { tabId },
				files: [script.file],
			});
			console.log(`[Panel] Injected ${script.name}`);
		} catch (err) {
			// 忽略已注入或无法注入的错误
			if (
				err.message?.includes("Cannot access") ||
				err.message?.includes("Cannot script")
			) {
				throw new Error(`Page not injectable: ${err.message}`);
			}
			console.log(`[Panel] Failed to inject ${script.name}:`, err.message);
		}
	}
}

/**
 * 初始化主界面
 *
 * 完整初始化流程（设计参考：§16.8 完整使用流程）：
 * 1. 获取当前 Tab 域名（通过 Content Script）
 * 2. 加载/创建会话
 * 3. 加载技能 chip
 * 4. 恢复会话历史（如果有）
 */
async function initMainView() {
	// 获取 DOM 元素
	DOM.statusDot = document.getElementById("status-dot");
	DOM.currentDomain = document.getElementById("current-domain");
	DOM.sessionTitle = document.getElementById("session-title");
	DOM.chatArea = document.getElementById("chat-area"); // 滚动容器
	DOM.messagesContainer = document.getElementById("messages-container");
	DOM.messageInput = document.getElementById("message-input");
	DOM.sendBtn = document.getElementById("send-btn");
	DOM.stopBtn = document.getElementById("stop-btn");
	DOM.inputArea = document.getElementById("input-area");
	DOM.inputWrapper = document.getElementById("input-wrapper");
	DOM.typewriterPlaceholder = document.getElementById("typewriter-placeholder");
	DOM.typewriterText = document.getElementById("typewriter-text");

	// 获取元素选择器 DOM 元素
	DOM.pickerBtn = document.getElementById("picker-btn");
	DOM.pickedElementBar = document.getElementById("picked-element-bar");
	// pickedElementLabel 和 pickedElementClear 已移除，由动态生成的容器替代

	// 获取图片上传 DOM 元素
	DOM.imageUploadBtn = document.getElementById("image-upload-btn");
	DOM.imageUploadInput = document.getElementById("image-upload-input");
	DOM.attachedImagesBar = document.getElementById("attached-images-bar");
	DOM.attachedImagesContainer = document.getElementById(
		"attached-images-container",
	);
	DOM.attachedImagesClear = document.getElementById("attached-images-clear");

	// 获取技能区 DOM 元素
	DOM.skillArea = document.getElementById("skill-area");
	DOM.skillChips =
		document.getElementById("skill-chips-inner") ||
		document.getElementById("skill-chips");
	DOM.skillAreaToggle = document.getElementById("skill-area-toggle");

	// 获取错误横幅 DOM 元素
	DOM.errorBanner = document.getElementById("error-banner");
	DOM.errorBannerMessage = document.getElementById("error-banner-message");
	DOM.errorBannerAction = document.getElementById("error-banner-action");
	DOM.errorBannerClose = document.getElementById("error-banner-close");

	// 初始化状态同步系统
	initStateSync();

	// 设置初始状态
	stateManager.set("agentStatus", "idle");
	stateManager.set("apiKeyStatus", "valid"); // 进入主界面说明已有有效 Key
	stateManager.set("pageStatus", "ready");

	// 应用初始全局状态
	applyGlobalState();

	// 更新顶栏显示
	updateTopBarDisplay("--", getMessage("newSession"));

	// 绑定顶栏交互事件
	bindTopBarEvents();

	// 初始化错误横幅事件
	initErrorBanner();

	// 绑定新建会话按钮事件
	const newSessionBtn = document.getElementById("new-session-btn");
	if (newSessionBtn) {
		newSessionBtn.addEventListener("click", handleNewSession);
	}

	// 初始化输入区
	initInputArea();

	// 初始化元素选择器
	initElementPicker();

	// 初始化图片上传
	initImageUpload();

	// 初始化技能快捷区
	initSkillArea();

	// 初始化打字机效果
	initTypewriter();

	// 初始化滚动到底部按钮
	initScrollToBottomButton();

	// 显示空状态（默认）
	showEmptyState();

	// 跟随当前窗口的活动标签页切换（扩展页、新标签页等会显示受限状态）
	chrome.tabs.onActivated.addListener(handleActiveTabChange);
	chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
		if (tab.active && (changeInfo.status === "complete" || changeInfo.url)) {
			handleActiveTabChange();
		}
	});

	await loadCurrentTab();
}

/**
 * 活动标签页变化：站点改变或从受限页切出时重新加载（Agent 运行中不切换）
 */
async function handleActiveTabChange() {
	if (AppState.agentStatus === "running") return;
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	// 加载中的标签页等 onUpdated(complete) 再处理，避免内容脚本未就绪时重复注入
	if (tab?.status === "loading") return;
	let host = null;
	try {
		host = new URL(tab?.url).hostname || null;
	} catch {
		// 无权限读取或非标准 URL：按受限页处理
	}
	const sameSite = host && host === stateManager.get("currentDomain");
	if (sameSite && stateManager.get("pageStatus") !== "restricted") {
		const path = extractPath(tab.url);
		if (path === stateManager.get("currentPath")) return;
		stateManager.set("currentPath", path);
		// 同站换页：仅当该页应使用的会话变化（页面级会话）时才重新加载
		const session = await import("./session.js");
		const resolved = await session.resolveSession(host, path);
		if (resolved.id === stateManager.get("currentSessionId") && !scopeMismatch) {
			updateScopeButton();
			return;
		}
	}
	await loadCurrentTab();
}

/**
 * 加载当前活动标签页：重置页面相关的界面状态，检测域名并加载对应会话
 */
async function loadCurrentTab() {
	clearMessages();
	clearPickedElement();
	hideConfirmationOverlay(false);
	stateManager.set("pageStatus", "ready");
	stateManager.set("currentDomain", null);
	setHasActiveStyles(false);
	setScopeMismatch(null);
	updateTopBarDisplay("--", getMessage("newSession"));
	showEmptyState();
	const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
	stateManager.set("currentPath", extractPath(activeTab?.url));

	// === Step 4: 获取域名 ===
	try {
		const { sendToContentScript } = await import("./tools.js");

		// 获取域名（同时检测页面是否受限）
		let domain = null;
		try {
			// 尝试向 Content Script 发送消息获取域名
			domain = await sendToContentScript({ tool: "get_domain" });
		} catch (contentScriptError) {
			// Content Script 不可达，可能是扩展刚刷新导致的
			// 尝试动态注入 Content Script 后重试
			console.log(
				"[Panel] Content Script not reachable, attempting dynamic injection:",
				contentScriptError.message,
			);

			try {
				// 动态注入 Content Scripts
				await injectContentScripts();
				// 重试获取域名
				domain = await sendToContentScript({ tool: "get_domain" });
				console.log("[Panel] Dynamic injection successful, domain:", domain);
			} catch (retryError) {
				// 重试失败，确认为受限页面
				console.log(
					"[Panel] Content Script still not reachable after dynamic injection:",
					retryError.message,
				);
				stateManager.set("pageStatus", "restricted");
				stateManager.set("currentDomain", null);
				applyGlobalState();
				return;
			}
		}

		if (domain && domain !== "unknown") {
			console.log("[Panel] Current domain:", domain);
			stateManager.set("currentDomain", domain);

			// 更新顶栏显示
			updateTopBarDisplay(domain, getMessage("newSession"));

			// === Step 5: 加载会话 ===
			await loadSessionForDomain(domain);
		} else {
			console.warn("[Panel] Failed to get domain");
			// 无法获取域名时，显示空状态
			showEmptyState();
		}
	} catch (err) {
		console.error("[Panel] Failed to get domain or load session:", err);
		// 继续显示空状态
		showEmptyState();
	}

	await applyPendingPrompt();
}

/**
 * 欢迎页「使用此风格」传来的提示词：预填到输入框（不自动发送）
 */
async function applyPendingPrompt() {
	const { pendingPrompt } = await chrome.storage.local.get("pendingPrompt");
	if (!pendingPrompt || !DOM.messageInput || DOM.messageInput.value) return;
	DOM.messageInput.value = pendingPrompt;
	resizeMessageInput();
	typewriterEffect.hide();
	await chrome.storage.local.remove("pendingPrompt");
}

/**
 * 为指定域名加载会话
 * 设计参考：§8.2 会话生命周期
 *
 * @param {string} domain - 域名
 */
async function loadSessionForDomain(domain) {
	try {
		// 动态导入依赖模块
		const session = await import("./session.js");

		// 按当前页面路径解析会话（页面级会话优先）
		const resolved = await session.resolveSession(
			domain,
			stateManager.get("currentPath") || "/",
		);
		const sessionId = resolved.id;
		console.log("[Panel] Session loaded:", sessionId, resolved.scope);

		// 创建 SessionContext 并设置为当前会话
		const currentSession = new session.SessionContext(
			domain,
			sessionId,
			resolved.scope,
			resolved.path,
		);
		session.setCurrentSession(currentSession);
		updateScopeButton();

		// 记录活跃会话（确保下次打开 Side Panel 时恢复到此会话）
		await session.setActiveSession(domain, sessionId, resolved.scope, resolved.path);

		// 更新全局状态中的会话 ID
		stateManager.set("currentSessionId", sessionId);

		// 加载会话元数据
		const meta = await session.loadSessionMeta(domain, sessionId);

		// 更新顶栏显示（如果有标题）
		if (meta.title) {
			updateTopBarDisplay(domain, meta.title);
		}

		// 加载会话历史（新格式 { messages, snapshots }）
		const historyData = await session.loadAndPrepareHistory(domain, sessionId);

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

		// 加载会话样式到 Content Script（接管 early-inject.js 的样式）
		// 无样式时也发送：空 css 会清掉上一个会话留在页面上的样式
		const stylesKey = currentSession.stylesKey;
		const { [stylesKey]: sessionStyles = "" } =
			await chrome.storage.local.get(stylesKey);

		try {
			const { sendToContentScript } = await import("./tools.js");
			await sendToContentScript({
				tool: "load_session_css",
				args: { css: sessionStyles },
			});
		} catch (error) {
			console.warn(
				"[Panel] Failed to load session CSS on init:",
				error.message,
			);
		}

		if (sessionStyles && sessionStyles.trim()) {
			// 同步 active_styles（确保与当前会话一致）
			await chrome.storage.local.set({
				[currentSession.activeStylesKey]: sessionStyles,
			});
			setHasActiveStyles(true);
		}
	} catch (err) {
		console.error("[Panel] Failed to load session for domain:", domain, err);
		// 失败时显示空状态
		showEmptyState();
	}
}

// ============================================================================
// 输入区逻辑
// ============================================================================

/**
 * 根据内容自动增高输入框（多行友好）
 * 受 CSS min-height / max-height 约束
 */
function resizeMessageInput() {
	const el = DOM.messageInput;
	if (!el) return;

	// 临时设置 overflow-y: hidden 以正确计算 scrollHeight
	el.style.overflowY = "hidden";
	el.style.height = "auto";

	const maxH = 200; // 与 CSS --input-max-height 一致
	const scrollHeight = el.scrollHeight;
	const h = Math.min(Math.max(scrollHeight, 44), maxH);
	el.style.height = `${h}px`;

	// 当内容超出最大高度时，启用滚动条
	if (scrollHeight > maxH) {
		el.style.overflowY = "auto";
	} else {
		el.style.overflowY = "hidden";
	}
}

/**
 * 初始化输入区
 */
function initInputArea() {
	// 绑定发送按钮点击事件
	if (DOM.sendBtn) {
		DOM.sendBtn.addEventListener("click", handleSendClick);
	}

	// 绑定停止按钮点击事件
	if (DOM.stopBtn) {
		DOM.stopBtn.addEventListener("click", handleStopClick);
	}

	if (DOM.messageInput) {
		DOM.messageInput.addEventListener("keydown", handleInputKeydown);
		// 输入时自动增高，便于长文本
		DOM.messageInput.addEventListener("input", resizeMessageInput);
		DOM.messageInput.addEventListener("focus", resizeMessageInput);
	}

	// 初始化为空闲态
	updateInputAreaState("idle");

	// 代码块复制按钮事件委托
	if (DOM.messagesContainer) {
		DOM.messagesContainer.addEventListener("click", handleCodeCopyClick);
	}
}

/**
 * 初始化打字机效果
 * 在输入框中显示循环滚动的示例文本
 */
function initTypewriter() {
	if (DOM.typewriterText && DOM.typewriterPlaceholder && DOM.messageInput) {
		typewriterEffect.init(
			DOM.typewriterText,
			DOM.typewriterPlaceholder,
			DOM.messageInput,
		);
	}
}

/**
 * 更新输入区状态
 * @param {'idle' | 'processing' | 'restricted'} state - 状态
 * @deprecated 请使用 setProcessingState / setRestrictedPageState / applyGlobalState
 */
function updateInputAreaState(state) {
	if (!DOM.inputArea || !DOM.messageInput || !DOM.sendBtn || !DOM.stopBtn)
		return;

	// 移除所有状态类
	DOM.inputArea.classList.remove("processing", "restricted");
	DOM.sendBtn.classList.remove("hidden");
	DOM.stopBtn.classList.add("hidden");

	switch (state) {
		case "idle":
			// 空闲态：输入框可用 + 发送按钮
			DOM.messageInput.disabled = false;
			DOM.messageInput.placeholder = "";
			DOM.messageInput.value = "";
			DOM.sendBtn.disabled = false;
			break;

		case "processing":
			// 处理中：输入框禁用 + 停止按钮
			DOM.inputArea.classList.add("processing");
			DOM.messageInput.disabled = true;
			DOM.messageInput.placeholder = getMessage("processing");
			DOM.messageInput.value = "";
			DOM.sendBtn.classList.add("hidden");
			DOM.stopBtn.classList.remove("hidden");
			break;

		case "restricted":
			// 受限页面：整体置灰 + 提示
			DOM.inputArea.classList.add("restricted");
			DOM.messageInput.disabled = true;
			DOM.messageInput.placeholder = getMessage("restrictedPage");
			DOM.messageInput.value = "";
			DOM.sendBtn.disabled = true;
			break;

		default:
			console.warn("[Panel] Unknown input area state:", state);
			return;
	}

	console.log("[Panel] Input area state changed to:", state);
}

/**
 * 处理代码块复制按钮点击
 * @param {Event} e - 点击事件
 */
function handleCodeCopyClick(e) {
	const copyBtn = e.target.closest(".code-copy-btn");
	if (!copyBtn) return;

	const code = decodeURIComponent(copyBtn.dataset.code || "");
	if (!code) return;

	// 复制到剪贴板
	navigator.clipboard.writeText(code).then(() => {
		// 显示复制成功状态
		copyBtn.textContent = "Copied!";
		copyBtn.classList.add("copied");

		// 2秒后恢复原状态
		setTimeout(() => {
			copyBtn.textContent = "Copy";
			copyBtn.classList.remove("copied");
		}, 2000);
	}).catch((err) => {
		console.error("[Panel] Failed to copy code:", err);
		copyBtn.textContent = "Failed";
		setTimeout(() => {
			copyBtn.textContent = "Copy";
		}, 2000);
	});
}

/**
 * 处理发送按钮点击
 *
 * 完整流程：
 * 1. 清空输入框
 * 2. 渲染用户消息气泡
 * 3. 隐藏空状态（如果有）
 * 4. 切换为处理中状态
 * 5. 创建助手消息容器和流式渲染器
 * 6. 调用 agentLoop 并传入 UI 回调
 * 7. 完成后恢复就绪态
 * 8. 显示确认浮层（如果有样式应用）
 */
async function handleSendClick() {
	const message = DOM.messageInput?.value?.trim();

	if (!message) {
		console.log("[Panel] Empty message, ignored");
		return;
	}

	// 禁止在受限页面发送
	if (AppState.pageStatus === "restricted") {
		console.warn("[Panel] Page is restricted, cannot send message");
		return;
	}

	// 页面级会话不在其页面时不发送（Agent 会按当前页面解析到其他会话）
	if (scopeMismatch) {
		showError(getMessage("scopeMismatchBlocked"));
		return;
	}

	// 如果有选中的元素，将其信息附加到 prompt 中
	let finalMessage = message;
	const pickedElements = _pickedElementInfo;
	if (pickedElements.length > 0) {
		// 支持多选：将所有选中元素的信息附加到消息中
		if (pickedElements.length === 1) {
			// 单选：保持原有格式
			const pickedInfo = pickedElements[0];
			const elementContext = [
				`\n[用户指定元素]`,
				`选择器: ${pickedInfo.fullPath}`,
				`标签: ${pickedInfo.tag}`,
				pickedInfo.id ? `ID: ${pickedInfo.id}` : null,
				pickedInfo.classes.length
					? `Classes: ${pickedInfo.classes.join(" ")}`
					: null,
				pickedInfo.text ? `文本: "${pickedInfo.text}"` : null,
				`尺寸: ${pickedInfo.rect.width}×${pickedInfo.rect.height}`,
			]
				.filter(Boolean)
				.join("\n");
			finalMessage = message + "\n" + elementContext;
		} else {
			// 多选：列出所有元素
			const elementsContext = pickedElements.map((pickedInfo, index) => {
				const info = [
					`[元素 ${index + 1}]`,
					`选择器: ${pickedInfo.fullPath}`,
					`标签: ${pickedInfo.tag}`,
					pickedInfo.id ? `ID: ${pickedInfo.id}` : null,
					pickedInfo.classes.length
						? `Classes: ${pickedInfo.classes.join(" ")}`
						: null,
					pickedInfo.text ? `文本: "${pickedInfo.text}"` : null,
					`尺寸: ${pickedInfo.rect.width}×${pickedInfo.rect.height}`,
				].filter(Boolean).join("\n");
				return info;
			}).join("\n\n");
			
			finalMessage = message + "\n\n[用户指定了以下多个元素]\n" + elementsContext;
		}
		clearPickedElement();
	}

	// 保存图片信息用于显示（在清空前）
	const imagesToSend = [..._attachedImages];
	const hasImages = imagesToSend.length > 0;

	// 如果有图片，构建多模态内容
	let messageContent;
	if (hasImages) {
		// 构建多模态内容数组
		messageContent = [
			{ type: "text", text: finalMessage },
			...imagesToSend.map((img) => ({
				type: "image_url",
				image_url: {
					url: img.dataUrl,
				},
			})),
		];
	} else {
		messageContent = finalMessage;
	}

	// --- 检查 Agent 是否正在运行 ---
	// 如果正在运行，将消息排队到下次迭代注入
	if (AppState.agentStatus === "running") {
		console.log("[Panel] Agent is running, queuing user message for next iteration");

		try {
			// 动态导入 queueUserMessage 函数
			const { queueUserMessage } = await import("./agent/agent-loop.js");

			// 排队用户消息
			const queued = queueUserMessage(messageContent);

			if (queued) {
				// 清空输入框并恢复高度
				DOM.messageInput.value = "";
				resizeMessageInput();

				// 清除已附加的图片
				clearAttachedImages();

				// 渲染用户消息气泡（静默排队，不显示额外提示）
				// 使用 finalMessage 作为显示文本（不含排队提示）
				const userMessageEl = renderUserMessage(finalMessage, {
					turn: 0,
					showRewind: false,
				});
				addMessageToContainer(userMessageEl);

				console.log(`[Panel] Message queued successfully.`);
			} else {
				console.warn("[Panel] Failed to queue message");
				showError(getMessage("queueMessageFailed"));
			}
		} catch (err) {
			console.error("[Panel] Error queueing message:", err);
			showError(getMessage("queueMessageFailed"));
		}
		return;
	}

	// 清空输入框并恢复高度
	DOM.messageInput.value = "";
	resizeMessageInput();

	// 清除已附加的图片
	clearAttachedImages();

	// 隐藏确认浮层（如果有）- 用户发新消息视为隐式确认上一步
	if (isConfirmationOverlayVisible()) {
		hideConfirmationOverlay(false);
	}

	// 移除空状态提示（如果存在）
	const emptyState = DOM.messagesContainer?.querySelector(".chat-area-empty");
	if (emptyState) {
		emptyState.remove();
	}

	// 标记会话已开始对话（技能区将永久隐藏）
	stateManager.set("hasConversationStarted", true);

	// 隐藏技能快捷区（用户开始对话后隐藏）
	setSkillAreaVisible(false);

	// 渲染用户消息气泡（附带元素定位标记和图片指示）
	let displayMessage = message;
	if (pickedElements.length > 0) {
		// 多选支持：显示所有选中元素的选择器
		const selectors = pickedElements.map(el => el.selector).join(", ");
		displayMessage += `\n📍 ${selectors}`;
		if (pickedElements.length > 1) {
			displayMessage = message + `\n📍 ${formatMessage("selectedElements_other", { count: pickedElements.length })}`;
		}
	}
	if (hasImages) {
		displayMessage += `\n🖼 ${formatMessage("images", { count: imagesToSend.length })}`;
	}

	// 计算当前轮次（统计已有的用户文本消息数量 + 1）
	const existingUserMessages =
		DOM.messagesContainer?.querySelectorAll(
			".message-user .message-bubble[data-turn]",
		) || [];
	const currentTurn = existingUserMessages.length + 1;

	const userMessageEl = renderUserMessage(displayMessage, {
		turn: currentTurn,
		showRewind: true,
	});
	addMessageToContainer(userMessageEl);

	// 切换为处理中状态
	setProcessingState(true);

	// 清除上一次的任务列表显示
	todoCardManager.clear();

	// 创建首个助手消息容器（用于流式输出）
	let curAssistantEl = renderAssistantMessageContainer();
	let curBubble = curAssistantEl.querySelector(".message-bubble");
	let curReasoningBlock = curAssistantEl.querySelector(".reasoning-block");
	let curReasoningContentEl =
		curAssistantEl.querySelector(".reasoning-content");
	let curReasoningHeader = curAssistantEl.querySelector(".reasoning-header");
	let curReasoningTitleEl = curAssistantEl.querySelector(".reasoning-title");
	addMessageToContainer(curAssistantEl);

	// 创建流式文本渲染器
	let streamingRenderer = createStreamingRenderer(curBubble);

	// 创建推理内容流式渲染器
	let reasoningRenderer = createStreamingRenderer(curReasoningContentEl, {
		showCursor: true,
		autoScroll: true,
	});
	let reasoningCharCount = 0;

	// 工具输入暂存 Map（toolId -> input），在 showToolResult 时使用
	const toolInputMap = new Map();

	// SubAgent 活动面板 Map（taskToolId -> { panel, toolCardMgr, streamingRenderer, toolInputMap }）
	const subAgentPanelMap = new Map();

	// 样式应用计数器（用于确认浮层）
	let applyStylesCount = 0;

	/**
	 * 结束当前气泡的流式输出，为下一轮 LLM 迭代做准备
	 * 由 onNewIteration 回调调用
	 */
	function finalizeCurrentBubble() {
		if (reasoningCharCount > 0) {
			reasoningRenderer.finish();
			curReasoningBlock.classList.add("finished", "collapsed");
			curReasoningHeader.setAttribute("aria-expanded", "false");
			if (curReasoningTitleEl) {
				curReasoningTitleEl.textContent = formatMessage("thinkingProcess", {
					count: reasoningCharCount,
				});
			}
		}
		streamingRenderer.finish();
		finalizeToolCardGroup();
	}

	/**
	 * 创建新的助手消息气泡，更新所有当前气泡引用
	 * 在 agentLoop 每轮新迭代开始时调用
	 */
	function createNewAssistantBubble() {
		finalizeCurrentBubble();
		curAssistantEl = renderAssistantMessageContainer();
		curBubble = curAssistantEl.querySelector(".message-bubble");
		curReasoningBlock = curAssistantEl.querySelector(".reasoning-block");
		curReasoningContentEl = curAssistantEl.querySelector(".reasoning-content");
		curReasoningHeader = curAssistantEl.querySelector(".reasoning-header");
		curReasoningTitleEl = curAssistantEl.querySelector(".reasoning-title");
		addMessageToContainer(curAssistantEl);
		streamingRenderer = createStreamingRenderer(curBubble);
		reasoningRenderer = createStreamingRenderer(curReasoningContentEl, {
			showCursor: true,
			autoScroll: true,
		});
		reasoningCharCount = 0;
	}

	// 动态导入 agent-loop 模块
	try {
		const { agentLoop } = await import("./agent/agent-loop.js");

		// UI 回调函数
		const uiCallbacks = {
			/**
			 * 新的 LLM 迭代开始：结束当前气泡，创建新气泡
			 */
			onNewIteration: () => {
				createNewAssistantBubble();
			},

			/**
			 * 追加推理文本（reasoning_content 字段）
			 * @param {string} delta - 推理文本增量
			 */
			appendReasoning: (delta) => {
				if (!delta) return;
				if (reasoningCharCount === 0) {
					curReasoningBlock.classList.add("visible");
				}
				reasoningCharCount += delta.length;
				reasoningRenderer.appendText(delta);
			},

			/**
			 * 追加流式文本
			 * @param {string} delta - 文本增量
			 */
			appendText: (delta) => {
				streamingRenderer.appendText(delta);
			},

			/**
			 * 显示工具调用（开始时）
			 * @param {Object} block - 工具调用块
			 */
			showToolCall: (block) => {
				if (block.type === "tool_use") {
					toolInputMap.set(block.id, block.input);
					createToolCard(block.id, block.name);
					if (block.name === "apply_styles" && block.input?.mode === "save") {
						applyStylesCount++;
					}
				}
			},

			/**
			 * 子智能体开始执行时创建内嵌活动面板，返回子 uiCallbacks
			 * @param {string} taskId - Task 工具调用 ID
			 * @param {Object} input - Task 工具输入（含 agent_type、description）
			 * @returns {Object} 子 uiCallbacks
			 */
			onTaskStart: (taskId, input) => {
				const panel = createSubAgentPanel(taskId, input);
				subAgentPanelMap.set(taskId, panel);
				return panel.uiCallbacks;
			},

			/**
			 * 显示工具执行中状态
			 * @param {string} toolName - 工具名称
			 */
			showToolExecuting: (toolName) => {
				console.log("[Panel] Tool executing:", toolName);
			},

			/**
			 * 显示工具执行结果
			 * @param {string} toolId - 工具调用 ID
			 * @param {string} output - 工具输出
			 */
			showToolResult: (toolId, output) => {
				// 如果有对应的子智能体面板，先完成它
				const subPanel = subAgentPanelMap.get(toolId);
				if (subPanel) {
					subPanel.uiCallbacks.finalize();
					subAgentPanelMap.delete(toolId);
				}
				const card = toolCardManager.cardMap.get(toolId);
				const toolName = card?.dataset.toolName || null;
				const toolInput = toolInputMap.get(toolId) ?? null;
				completeToolCard(toolId, toolName, toolInput, output);
			},

			/**
			 * 更新任务列表显示
			 * @param {Array<{id: string, content: string, status: string}>} todos - 任务列表
			 * @param {Object} [meta] - 元信息
			 * @param {boolean} [meta.awaitingConfirmation] - 是否等待用户确认
			 */
			onTodoUpdate: (todos, meta) => {
				todoCardManager.updateTodos(todos, meta?.awaitingConfirmation);
			},

			/**
			 * 上下文压缩开始时调用
			 * 在助手消息气泡中显示压缩状态指示器
			 */
			onCompressionStart: () => {
				showCompressionStatus("compressing_history");
			},

			/**
			 * 上下文压缩进度更新时调用
			 * @param {string} phase - 压缩阶段: 'summarizing_history' | 'compressing_tool_results'
			 */
			onCompressionProgress: (phase) => {
				showCompressionStatus(phase);
			},

			/**
			 * 上下文压缩完成时调用
			 * 移除压缩状态指示器
			 */
			onCompressionEnd: () => {
				hideCompressionStatus();
			},
		};

		// 调用 Agent Loop（传递多模态内容）
		const response = await agentLoop(messageContent, uiCallbacks);

		// 完成最后一个气泡的推理流式输出
		if (reasoningCharCount > 0) {
			reasoningRenderer.finish();
			curReasoningBlock.classList.add("finished");
			curReasoningBlock.classList.add("collapsed");
			curReasoningHeader.setAttribute("aria-expanded", "false");
			if (curReasoningTitleEl) {
				curReasoningTitleEl.textContent = formatMessage("thinkingProcess", {
					count: reasoningCharCount,
				});
			}
		}

		// 完成最后一个气泡的流式文本输出
		streamingRenderer.finish();

		// 结束工具卡片组
		finalizeToolCardGroup();

		// 恢复就绪状态
		setProcessingState(false);
		showTurnUsage();

		if (applyStylesCount > 0) {
			showConfirmationOverlay({
				applyCount: applyStylesCount,
				scopeText: scopeHintText(),
				onConfirm: () => {
					console.log("[Panel] 样式已确认");
				},
				onUndo: handleUndoStyleClick,
				onUndoAll: async () => {
					try {
						const { executeTool } = await import("./tools.js");
						await executeTool("apply_styles", { mode: "rollback_all" });
						setHasActiveStyles(false);
						console.log("[Panel] 已直接撤销所有样式");
					} catch (error) {
						console.error("[Panel] 全部撤销失败:", error);
						showError(getMessage("undoStyleFailed"));
					}
				},
			});
		}

		console.log("[Panel] Agent response:", response);
	} catch (error) {
		console.error("[Panel] Agent loop error:", error);

		// 完成流式输出
		streamingRenderer.finish();

		// 结束工具卡片组
		finalizeToolCardGroup();

		// 恢复就绪状态
		setProcessingState(false);
		showTurnUsage();

		// 重试时恢复原消息、选中元素和图片
		showAgentError(error, () => {
			DOM.messageInput.value = message;
			_pickedElementInfo = [...pickedElements];
			updatePickedElementsBar();
			_attachedImages = [...imagesToSend];
			renderAttachedImages();
			handleSendClick();
		});
	}
}

/**
 * 在对话末尾显示本轮 token 用量（服务商未返回时为估算值）
 */
async function showTurnUsage() {
	const { getTurnUsage } = await import("./agent/agent-loop.js");
	const { input, output } = getTurnUsage();
	const total = input + output;
	if (!total) return;
	const el = document.createElement("div");
	el.className = "turn-usage";
	el.textContent = formatMessage("turnUsage", {
		tokens: total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total,
	});
	el.title = formatMessage("turnUsageDetail", { input, output });
	addMessageToContainer(el);
}

/**
 * 处理停止按钮点击
 *
 * 调用 cancelAgentLoop 取消当前处理
 * 已应用的样式保留
 */
async function handleStopClick() {
	console.log("[Panel] Stop button clicked");

	try {
		// 动态导入 agent-loop 模块
		const { cancelAgentLoop } = await import("./agent/agent-loop.js");

		// 取消 Agent Loop
		cancelAgentLoop();

		// 结束工具卡片组
		finalizeToolCardGroup();

		// 恢复空闲态
		setProcessingState(false);

		console.log("[Panel] Agent loop cancelled");
	} catch (error) {
		console.error("[Panel] Failed to cancel agent loop:", error);

		// 即使出错也要恢复空闲态
		setProcessingState(false);
	}
}

/**
 * 处理输入框键盘事件
 * @param {KeyboardEvent} e - 键盘事件
 */
function handleInputKeydown(e) {
	// Enter 键发送（Shift+Enter 换行）
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		handleSendClick();
	}
}

// ============================================================================
// 元素选择器逻辑
// ============================================================================

/**
 * 初始化元素选择器
 * 绑定按钮事件和消息监听
 */
function initElementPicker() {
	if (DOM.pickerBtn) {
		DOM.pickerBtn.addEventListener("click", togglePicker);
	}
	// 注意：picked-element-clear 已移除，删除按钮现在是动态生成的

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.type === "element_picked") {
			onElementPicked(message.data);
			sendResponse({ ok: true });
		} else if (message.type === "picker_cancelled") {
			setPickerActive(false);
			sendResponse({ ok: true });
		}
		return false;
	});
}

/**
 * 切换元素选择器激活状态
 */
async function togglePicker() {
	if (AppState.agentStatus === "running") return;
	if (AppState.pageStatus === "restricted") return;

	try {
		const { sendToContentScript } = await import("./tools.js");
		if (_pickerActive) {
			await sendToContentScript({ tool: "stop_picker" });
			setPickerActive(false);
		} else {
			await sendToContentScript({ tool: "start_picker" });
			setPickerActive(true);
		}
	} catch (err) {
		console.error("[Panel] Picker toggle failed:", err);
		setPickerActive(false);
	}
}

/**
 * 更新选择器按钮的激活态 UI
 */
function setPickerActive(active) {
	_pickerActive = active;
	if (DOM.pickerBtn) {
		DOM.pickerBtn.classList.toggle("active", active);
	}
}

/**
 * 元素被选中后的回调（支持多选）
 * 选中元素后会继续保持在选择模式，不自动关闭 picker
 */
function onElementPicked(info) {
	// 检查是否已存在相同路径的元素（避免重复选择）
	const exists = _pickedElementInfo.some(
		(el) => el.fullPath === info.fullPath || el.selector === info.selector
	);
	
	if (exists) {
		// 如果已选中，则取消选中（toggle 行为）
		_pickedElementInfo = _pickedElementInfo.filter(
			(el) => el.fullPath !== info.fullPath && el.selector !== info.selector
		);
	} else {
		// 添加到选中列表
		_pickedElementInfo.push(info);
	}
	
	// 不自动关闭 picker，保持选择状态
	// setPickerActive(false);

	updatePickedElementsBar();
}

/**
 * 更新选中元素条的 UI 显示（支持多个元素）
 */
function updatePickedElementsBar() {
	const container = document.getElementById("picked-elements-container");
	
	if (!container || !DOM.pickedElementBar) return;
	
	// 清空容器
	container.innerHTML = "";
	
	if (_pickedElementInfo.length === 0) {
		// 没有选中元素时隐藏整个栏
		DOM.pickedElementBar.classList.add("hidden");
		return;
	}
	
	// 显示选中元素条
	DOM.pickedElementBar.classList.remove("hidden");
	
	// 渲染每个选中元素
	_pickedElementInfo.forEach((info, index) => {
		const label = info.fullPath || info.selector || info.tag;
		
		const elementTag = document.createElement("div");
		elementTag.className = "picked-element-tag";
		elementTag.innerHTML = `
			<span class="picked-element-text" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
			<button class="picked-element-remove" data-index="${index}" data-i18n-title="removeElement" data-i18n-aria-label="removeElement">
				<span class="icon icon-x" style="width:10px;height:10px" aria-hidden="true"></span>
			</button>
		`;
		
		// 绑定删除按钮事件
		const removeBtn = elementTag.querySelector(".picked-element-remove");
		removeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			removePickedElement(index);
		});
		
		container.appendChild(elementTag);
	});
	
	// 添加"完成选择"按钮（用于关闭 picker）
	if (_pickerActive) {
		const doneBtn = document.createElement("button");
		doneBtn.className = "picked-element-done-btn";
		doneBtn.id = "picker-done-btn";
		doneBtn.innerHTML = `<span>${getMessage("finishPicking")}</span>`;
		doneBtn.addEventListener("click", async (e) => {
			e.stopPropagation();
			await finishPicking();
		});
		container.appendChild(doneBtn);
	}
}

/**
 * 移除指定索引的选中元素
 * @param {number} index - 元素索引
 */
function removePickedElement(index) {
	if (index >= 0 && index < _pickedElementInfo.length) {
		_pickedElementInfo.splice(index, 1);
		updatePickedElementsBar();
	}
}

/**
 * 清除所有已选中的元素
 */
function clearPickedElement() {
	_pickedElementInfo = [];
	if (DOM.pickedElementBar) {
		DOM.pickedElementBar.classList.add("hidden");
	}
	const container = document.getElementById("picked-elements-container");
	if (container) {
		container.innerHTML = "";
	}
}

/**
 * 完成选择（关闭 picker）
 */
async function finishPicking() {
	try {
		const { sendToContentScript } = await import("./tools.js");
		await sendToContentScript({ tool: "stop_picker" });
		setPickerActive(false);
		updatePickedElementsBar();
	} catch (err) {
		console.error("[Panel] Failed to stop picker:", err);
		setPickerActive(false);
	}
}

/**
 * 获取当前选中的元素信息数组（供外部模块使用）
 * @returns {Array<Object>}
 */
function getPickedElementInfo() {
	return _pickedElementInfo;
}

// ============================================================================
// 图片上传逻辑
// ============================================================================

/**
 * 最大图片数量
 * @type {number}
 */
const MAX_ATTACHED_IMAGES = 5;

/**
 * 图片压缩阈值（2MB）
 * 超过此大小的图片将被压缩
 * @type {number}
 */
const IMAGE_COMPRESSION_THRESHOLD = 2 * 1024 * 1024;

/**
 * 压缩图片的最大尺寸（像素）
 * @type {number}
 */
const MAX_IMAGE_DIMENSION = 1920;

/**
 * 压缩图片的质量（0-1）
 * @type {number}
 */
const COMPRESSION_QUALITY = 0.8;

/**
 * 初始化图片上传功能
 * 绑定按钮事件和文件选择
 */
function initImageUpload() {
	if (DOM.imageUploadBtn) {
		DOM.imageUploadBtn.addEventListener("click", () => {
			DOM.imageUploadInput?.click();
		});
	}

	if (DOM.imageUploadInput) {
		DOM.imageUploadInput.addEventListener("change", handleImageSelect);
	}

	if (DOM.attachedImagesClear) {
		DOM.attachedImagesClear.addEventListener("click", clearAttachedImages);
	}

	// 监听粘贴事件（在输入区域或整个文档）
	const pasteTarget = DOM.inputArea || document;
	pasteTarget.addEventListener("paste", handlePaste);
}

/**
 * 处理粘贴事件
 * 从剪贴板提取图片并添加到附件列表
 * @param {ClipboardEvent} event - 粘贴事件
 */
async function handlePaste(event) {
	const items = event.clipboardData?.items;
	if (!items) return;

	// 检查数量限制
	const remaining = MAX_ATTACHED_IMAGES - _attachedImages.length;
	if (remaining <= 0) {
		console.warn("[Panel] Max images reached");
		return;
	}

	let addedCount = 0;

	for (const item of items) {
		// 只处理图片类型
		if (!item.type.startsWith("image/")) continue;
		if (addedCount >= remaining) break;

		const file = item.getAsFile();
		if (!file) continue;

		// 验证文件大小（最大 10MB）
		if (file.size > 10 * 1024 * 1024) {
			console.warn("[Panel] Pasted image too large:", file.size);
			continue;
		}

		try {
			// 读取图片
			let dataUrl = await readFileAsDataURL(file);

			// 如果超过 2MB，进行压缩
			let wasCompressed = false;
			if (file.size > IMAGE_COMPRESSION_THRESHOLD) {
				const result = await compressImage(dataUrl, file.size);
				dataUrl = result.dataUrl;
				wasCompressed = result.wasCompressed;
			}

			_attachedImages.push({
				file,
				dataUrl,
				name: file.name || `${getMessage("pastedImage")} ${_attachedImages.length + 1}`,
				wasCompressed,
			});

			addedCount++;
		} catch (err) {
			console.error("[Panel] Failed to process pasted image:", err);
		}
	}

	// 如果添加了图片，阻止默认行为并更新 UI
	if (addedCount > 0) {
		event.preventDefault();
		renderAttachedImages();
	}
}

/**
 * 处理图片选择
 * @param {Event} event - 文件选择事件
 */
async function handleImageSelect(event) {
	const files = Array.from(event.target.files || []);
	if (!files.length) return;

	// 检查数量限制
	const remaining = MAX_ATTACHED_IMAGES - _attachedImages.length;
	if (remaining <= 0) {
		console.warn("[Panel] Max images reached");
		return;
	}

	const filesToAdd = files.slice(0, remaining);

	for (const file of filesToAdd) {
		// 验证文件类型
		if (!file.type.startsWith("image/")) {
			console.warn("[Panel] Invalid file type:", file.type);
			continue;
		}

		// 验证文件大小（最大 10MB）
		if (file.size > 10 * 1024 * 1024) {
			console.warn("[Panel] Image too large:", file.size);
			continue;
		}

		try {
			// 读取原始图片
			let dataUrl = await readFileAsDataURL(file);

			// 如果超过 2MB，进行压缩
			let wasCompressed = false;
			if (file.size > IMAGE_COMPRESSION_THRESHOLD) {
				const result = await compressImage(dataUrl, file.size);
				dataUrl = result.dataUrl;
				wasCompressed = result.wasCompressed;
			}

			_attachedImages.push({
				file,
				dataUrl,
				name: file.name,
				wasCompressed,
			});
		} catch (err) {
			console.error("[Panel] Failed to read image:", err);
		}
	}

	// 清空 input 以便重复选择同一文件
	event.target.value = "";

	// 更新 UI
	renderAttachedImages();
}

/**
 * 将文件读取为 Data URL
 * @param {File} file - 文件对象
 * @returns {Promise<string>} Data URL
 */
function readFileAsDataURL(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * 压缩图片
 * 如果图片超过阈值，使用 Canvas 进行压缩
 * @param {string} dataUrl - 原始 Data URL
 * @param {number} originalSize - 原始文件大小（字节）
 * @returns {Promise<{dataUrl: string, wasCompressed: boolean}>} 压缩后的 Data URL 和是否进行了压缩
 */
function compressImage(dataUrl, originalSize) {
	return new Promise((resolve, reject) => {
		// 如果小于阈值，直接返回
		if (originalSize <= IMAGE_COMPRESSION_THRESHOLD) {
			resolve({ dataUrl, wasCompressed: false });
			return;
		}

		const img = new Image();
		img.onload = () => {
			try {
				// 计算压缩后的尺寸
				let width = img.width;
				let height = img.height;

				// 如果尺寸过大，按比例缩小
				if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
					const ratio = Math.min(
						MAX_IMAGE_DIMENSION / width,
						MAX_IMAGE_DIMENSION / height,
					);
					width = Math.round(width * ratio);
					height = Math.round(height * ratio);
				}

				// 创建 Canvas 进行压缩
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0, width, height);

				// 导出为 JPEG 格式（比 PNG 更小）
				const compressedDataUrl = canvas.toDataURL(
					"image/jpeg",
					COMPRESSION_QUALITY,
				);

				console.log(
					`[Panel] Image compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ` +
						`${((compressedDataUrl.length * 0.75) / 1024 / 1024).toFixed(2)}MB`,
				);

				resolve({ dataUrl: compressedDataUrl, wasCompressed: true });
			} catch (err) {
				console.error("[Panel] Compression failed, using original:", err);
				resolve({ dataUrl, wasCompressed: false });
			}
		};

		img.onerror = () => {
			console.error("[Panel] Failed to load image for compression");
			resolve({ dataUrl, wasCompressed: false });
		};

		img.src = dataUrl;
	});
}

/**
 * 渲染已附加的图片预览
 */
function renderAttachedImages() {
	if (!DOM.attachedImagesContainer) return;

	DOM.attachedImagesContainer.innerHTML = "";

	if (_attachedImages.length === 0) {
		DOM.attachedImagesBar?.classList.add("hidden");
		return;
	}

	DOM.attachedImagesBar?.classList.remove("hidden");

	_attachedImages.forEach((img, index) => {
		const item = document.createElement("div");
		item.className = "attached-image-item";

		const preview = document.createElement("img");
		preview.src = img.dataUrl;
		preview.alt = img.name || formatMessage("imageAlt", { index: index + 1 });
		item.appendChild(preview);

		const removeBtn = document.createElement("button");
		removeBtn.className = "attached-image-remove";
		removeBtn.textContent = "×";
		removeBtn.title = getMessage("removeImage");
		removeBtn.addEventListener("click", () => removeAttachedImage(index));
		item.appendChild(removeBtn);

		DOM.attachedImagesContainer.appendChild(item);
	});
}

/**
 * 移除指定索引的图片
 * @param {number} index - 图片索引
 */
function removeAttachedImage(index) {
	_attachedImages.splice(index, 1);
	renderAttachedImages();
}

/**
 * 清除所有已附加的图片
 */
function clearAttachedImages() {
	_attachedImages = [];
	renderAttachedImages();
}

/**
 * 获取当前附加的图片列表
 * @returns {Array<Object>}
 */
function getAttachedImages() {
	return _attachedImages;
}

/**
 * 检查是否有附加图片
 * @returns {boolean}
 */
function hasAttachedImages() {
	return _attachedImages.length > 0;
}

// ============================================================================
// 初始化
// ============================================================================

/**
 * 应用初始化入口
 *
 * 完整初始化流程（设计参考：§16.8 完整使用流程 / §7.5 清理触发时机）：
 * 1. checkAndMigrateStorage - 存储 Schema 版本迁移
 * 2. checkFirstRun - 检测 API Key
 * 3. 无 Key 展示引导页 / 有 Key 进入主界面
 * 4. 获取域名（通过 Content Script）
 * 5. 加载会话
 * 6. 加载技能 chip
 * 7. 后台执行 cleanupStorage（不阻塞 UI）
 */
async function init() {
	console.log("[Panel] Initializing...");

	// Initialize i18n translations
	applyTranslations();

	// === Step 1: 存储 Schema 版本迁移 ===
	try {
		const session = await import("./session.js");
		await session.checkAndMigrateStorage();
		console.log("[Panel] Storage migration checked");
	} catch (err) {
		console.error("[Panel] Storage migration failed:", err);
		// 继续执行，不中断初始化
	}

	// 缓存 DOM 元素
	DOM.onboardingView = document.getElementById("onboarding-view");
	DOM.mainView = document.getElementById("main-view");
	DOM.settingsView = document.getElementById("settings-view");
	DOM.loadingOverlay = document.getElementById("loading-overlay");
	DOM.errorToast = document.getElementById("error-toast");
	DOM.errorMessage = document.getElementById("error-message");

	// 错误提示关闭按钮
	const dismissErrorBtn = document.getElementById("dismiss-error");
	if (dismissErrorBtn) {
		dismissErrorBtn.addEventListener("click", hideError);
	}

	// 设置按钮
	const settingsBtn = document.getElementById("settings-btn");
	if (settingsBtn) {
		settingsBtn.addEventListener("click", () => {
			initSettingsView();
			switchView("settings");
		});
	}

	// === Step 2: 检测 API Key ===
	try {
		const { needsSetup } = await checkFirstRun();

		if (needsSetup) {
			// === Step 3a: 首次使用，显示引导页 ===
			console.log("[Panel] First run detected, showing onboarding");
			initOnboarding();
			switchView("onboarding");
			AppState.apiKeyStatus = "missing";
		} else {
			// === Step 3b: 已有配置，进入主界面 ===
			console.log("[Panel] Existing settings found, entering main view");
			AppState.apiKeyStatus = "valid";

			// 初始化主界面（包含获取域名、加载会话、加载技能 chip）
			await initMainView();

			switchView("main");

			// === Step 7: 后台执行 cleanupStorage（不阻塞 UI）===
			import("./session.js").then((session) => {
				session.cleanupStorage().catch((err) => {
					console.error("[Panel] Background cleanup failed:", err);
				});
			});
		}
	} catch (err) {
		console.error("[Panel] Init error:", err);
		// 出错时显示引导页
		initOnboarding();
		switchView("onboarding");
	}
}

// ============================================================================
// 启动
// ============================================================================

// DOM 加载完成后初始化
document.addEventListener("DOMContentLoaded", init);

// ============================================================================
// 消息渲染函数
// ============================================================================

/**
 * 渲染用户消息气泡
 * @param {string} content - 消息内容
 * @param {Object} [options] - 可选参数
 * @param {number} [options.turn] - 轮次号（用于时间旅行回退）
 * @param {boolean} [options.showRewind] - 是否显示回退按钮
 * @returns {HTMLElement} - 消息 DOM 元素
 */
function renderUserMessage(content, options = {}) {
	const messageDiv = document.createElement("div");
	messageDiv.className = "message message-user";

	const bubbleDiv = document.createElement("div");
	bubbleDiv.className = "message-bubble";
	bubbleDiv.textContent = content;

	if (options.turn != null) {
		bubbleDiv.dataset.turn = options.turn;
	}

	if (options.showRewind && options.turn != null) {
		const rewindBtn = document.createElement("button");
		rewindBtn.className = "rewind-btn";
		rewindBtn.title = getMessage("rewindHere");
		rewindBtn.innerHTML = "↩";
		rewindBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			handleRewindClick(options.turn);
		});
		bubbleDiv.appendChild(rewindBtn);
	}

	messageDiv.appendChild(bubbleDiv);
	return messageDiv;
}

/**
 * 渲染助手消息容器（用于流式输出）
 * @returns {HTMLElement} - 消息 DOM 元素（包含推理块和气泡容器）
 */
function renderAssistantMessageContainer() {
	const messageDiv = document.createElement("div");
	messageDiv.className = "message message-assistant";

	// 推理思考块（初始隐藏，有 reasoning_content 时才显示）
	const reasoningBlock = document.createElement("div");
	reasoningBlock.className = "reasoning-block";

	const reasoningHeader = document.createElement("button");
	reasoningHeader.className = "reasoning-header";
	reasoningHeader.setAttribute("aria-expanded", "true");
	reasoningHeader.innerHTML =
		'<span class="reasoning-spinner"></span>' +
		'<span class="reasoning-title">' +
		getMessage("thinking") +
		"</span>" +
		'<span class="reasoning-chevron"></span>';

	const reasoningContent = document.createElement("div");
	reasoningContent.className = "reasoning-content";

	reasoningHeader.addEventListener("click", () => {
		const expanded = reasoningHeader.getAttribute("aria-expanded") === "true";
		reasoningHeader.setAttribute("aria-expanded", String(!expanded));
		reasoningBlock.classList.toggle("collapsed", expanded);
	});

	reasoningBlock.appendChild(reasoningHeader);
	reasoningBlock.appendChild(reasoningContent);

	const bubbleDiv = document.createElement("div");
	bubbleDiv.className = "message-bubble streaming-text";

	messageDiv.appendChild(reasoningBlock);
	messageDiv.appendChild(bubbleDiv);
	return messageDiv;
}

// ============================================================================
// 流式文本渲染器
// ============================================================================

/**
 * 添加消息到对话区
 * @param {HTMLElement} messageElement - 消息 DOM 元素
 */
function addMessageToContainer(messageElement) {
	if (DOM.messagesContainer) {
		DOM.messagesContainer.appendChild(messageElement);
		// 自动滚动到底部
		scrollToBottom();
	}
}

/**
 * 清空对话区所有消息
 */
function clearMessages() {
	if (DOM.messagesContainer) {
		DOM.messagesContainer.innerHTML = "";
	}
}

/**
 * 滚动对话区到底部（平滑滚动）
 * @param {Object} options - 配置选项
 * @param {boolean} options.instant - 是否使用即时滚动（用于历史消息加载）
 * @param {boolean} options.force - 是否强制滚动（忽略用户是否在底部）
 */
function scrollToBottom(options = {}) {
	// 注意：滚动容器是 #chat-area，而不是 #messages-container
	const scrollContainer = DOM.chatArea;
	if (!scrollContainer) return;

	const { instant = false, force = false } = options;

	// 如果不是强制滚动，只有当用户在底部附近时才滚动
	if (!force && !isNearBottom()) {
		return;
	}

	// 使用双重 requestAnimationFrame 确保 DOM 完全渲染和布局完成
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			scrollContainer.scrollTo({
				top: scrollContainer.scrollHeight,
				behavior: instant ? "instant" : "smooth",
			});

			// 滚动到底部后隐藏滚动按钮
			hideScrollToBottomButton();
		});
	});
}

/**
 * 创建流式文本渲染器实例
 * @param {HTMLElement} container - 目标容器元素
 * @param {Object} options - 配置选项
 * @returns {StreamingTextRenderer} - 渲染器实例
 */
function createStreamingRenderer(container, options = {}) {
	// 默认配置：自动滚动，使用 chatArea 作为滚动容器
	const defaultOptions = {
		showCursor: true,
		autoScroll: true,
		scrollContainer: DOM.chatArea,
		isNearBottom,
		...options,
	};

	return new StreamingTextRenderer(container, defaultOptions);
}

/**
 * 显示空状态提示
 * 会先移除已有的空状态，保证只存在一个。
 */
function showEmptyState() {
	if (!DOM.messagesContainer) return;

	const existing = DOM.messagesContainer.querySelector(".chat-area-empty");
	if (existing) existing.remove();

	// 显示技能快捷区（新会话/空状态时显示）
	setSkillAreaVisible(true);

	// 注意：示例提示现在以打字机效果显示在输入框中
	// 由 TypewriterEffect 类管理，这里不再创建底部示例按钮

	// 创建空的空状态容器（保持布局一致性）
	const emptyState = document.createElement("div");
	emptyState.className = "chat-area-empty";
	DOM.messagesContainer.appendChild(emptyState);

	// 启动打字机效果
	if (typewriterEffect && DOM.messageInput) {
		const isEmpty = DOM.messageInput.value.trim() === "";
		const isFocused = document.activeElement === DOM.messageInput;
		if (isEmpty && !isFocused) {
			typewriterEffect.show();
		}
	}
}

// ============================================================================
// 上下文压缩状态显示
// ============================================================================

/**
 * 压缩状态元素引用
 * @type {HTMLElement|null}
 */
let compressionStatusEl = null;

/**
 * 显示上下文压缩状态指示器
 * 
 * 在助手消息气泡中显示压缩进度，让用户知道 Agent 正在进行上下文压缩操作。
 * 
 * @param {string} phase - 压缩阶段:
 *   - 'compressing_history': 开始压缩历史记录
 *   - 'summarizing_history': 正在生成摘要
 *   - 'compressing_tool_results': 正在压缩工具结果
 */
function showCompressionStatus(phase) {
	// 获取当前助手消息气泡
	const assistantMessages = DOM.messagesContainer?.querySelectorAll(".message-assistant");
	if (!assistantMessages || assistantMessages.length === 0) {
		console.warn("[Compression Status] No assistant message container found");
		return;
	}

	const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];
	const bubble = lastAssistantMsg?.querySelector(".message-bubble");
	if (!bubble) {
		console.warn("[Compression Status] No message bubble found");
		return;
	}

	// 移除已存在的压缩状态元素
	hideCompressionStatus();

	// 创建压缩状态元素
	compressionStatusEl = document.createElement("div");
	compressionStatusEl.className = "compression-status";
	
	// 根据阶段设置不同的文本和图标
	const statusConfig = {
		compressing_history: {
			icon: "loader",
			text: getMessage("compressingHistory"),
		},
		summarizing_history: {
			icon: "loader",
			text: getMessage("summarizingHistory"),
		},
		compressing_tool_results: {
			icon: "loader",
			text: getMessage("compressingToolResults"),
		},
	};

	const config = statusConfig[phase] || statusConfig.compression_history;

	compressionStatusEl.innerHTML = `
		<div class="compression-status-content">
			<span class="compression-icon">${iconHtml(config.icon, 14, "spin")}</span>
			<span class="compression-text">${config.text}</span>
		</div>
	`;

	// 插入到气泡内容的最前面（在已有内容之前）
	bubble.insertBefore(compressionStatusEl, bubble.firstChild);

	console.log(`[Compression Status] Showing: ${phase}`);
}

/**
 * 隐藏上下文压缩状态指示器
 */
function hideCompressionStatus() {
	if (compressionStatusEl) {
		compressionStatusEl.remove();
		compressionStatusEl = null;
		console.log("[Compression Status] Hidden");
	}
}

/**
 * 渲染历史消息到对话区
 *
 * 用于会话切换时恢复对话历史。
 * 支持 Anthropic Messages API 的消息格式。
 *
 * @param {Array} history - 对话历史数组，格式为 [{ role, content }, ...]
 * @returns {void}
 *
 * @example
 * const history = [
 *   { role: 'user', content: '把背景改成深蓝色' },
 *   { role: 'assistant', content: [{ type: 'text', text: '好的...' }] }
 * ];
 * renderHistoryMessages(history);
 */
function renderHistoryMessages(history) {
	if (!DOM.messagesContainer) return;

	// 清空当前对话区
	clearMessages();

	// 兼容新旧格式：可传入 messages 数组或 { messages, snapshots } 对象
	const rawMessages = Array.isArray(history) ? history : history?.messages || [];

	if (!rawMessages || rawMessages.length === 0) {
		showEmptyState();
		return;
	}

	// 过滤掉摘要和学习确认消息（不显示在 UI 上）
	// _isSummary: 历史摘要消息 - AI 生成的压缩摘要
	// _isLearned: "OK, I've learned about the previous conversation." 确认消息
	// 注意: _isCompressed 消息保留显示，用户可以看到早期对话记录
	const messages = rawMessages.filter(
		(msg) => !msg._isSummary && !msg._isLearned,
	);

	// 预先构建 tool_use_id -> tool_result 的映射，供渲染工具卡片时使用
	const toolResultMap = new Map();
	for (const msg of messages) {
		if (msg.role === "user" && Array.isArray(msg.content)) {
			for (const block of msg.content) {
				if (block.type === "tool_result" && block.tool_use_id) {
					const content = block.content;
					toolResultMap.set(
						block.tool_use_id,
						typeof content === "string" ? content : JSON.stringify(content),
					);
				}
			}
		}
	}

	let currentTurn = 0;

	// 遍历历史消息并渲染
	for (const message of messages) {
		if (message.role === "user") {
			// 渲染用户消息
			const userContent =
				typeof message.content === "string"
					? message.content
					: message.content?.[0]?.text || "";

			if (userContent) {
				// 用户文本消息（非 tool_result）才计入轮次
				if (typeof message.content === "string") {
					currentTurn++;
				}
				const showRewind = typeof message.content === "string";
				const userMessageEl = renderUserMessage(userContent, {
					turn: typeof message.content === "string" ? currentTurn : undefined,
					showRewind,
				});
				addMessageToContainer(userMessageEl);
			}
		} else if (message.role === "assistant") {
			// 渲染助手消息
			const assistantMessageEl = renderAssistantMessageContainer();
			const bubble = assistantMessageEl.querySelector(".message-bubble");

			// 渲染推理文本（_reasoning 字段由 agent-loop 在完整历史中保存）
			if (message._reasoning) {
				const reasoningBlock =
					assistantMessageEl.querySelector(".reasoning-block");
				const reasoningContentEl =
					assistantMessageEl.querySelector(".reasoning-content");
				const reasoningHeader =
					assistantMessageEl.querySelector(".reasoning-header");
				const reasoningTitleEl =
					assistantMessageEl.querySelector(".reasoning-title");
				const charCount = message._reasoning.length;
				const reasoningRenderer = createStreamingRenderer(reasoningContentEl, {
					showCursor: false,
				});
				reasoningRenderer.appendText(message._reasoning);
				reasoningRenderer.finish();
				reasoningBlock.classList.add("visible", "finished", "collapsed");
				reasoningHeader.setAttribute("aria-expanded", "false");
				if (reasoningTitleEl) {
					reasoningTitleEl.textContent = formatMessage("thinkingProcess", {
						count: charCount,
					});
				}
			}

			// 处理 content 数组
			if (Array.isArray(message.content)) {
				let textContent = "";
				const toolCalls = [];

				for (const block of message.content) {
					if (block.type === "text") {
						textContent += block.text || "";
					} else if (block.type === "tool_use") {
						toolCalls.push(block);
					}
				}

				// 渲染文本内容
				if (textContent) {
					const renderer = createStreamingRenderer(bubble, {
						showCursor: false,
					});
					renderer.appendText(textContent);
					renderer.finish();
				}

				// 渲染工具调用卡片（从后续 tool_result 消息中查找实际输出）
				if (toolCalls.length > 0) {
					const cardGroup = toolCardManager.createCardGroup();

					for (const toolCall of toolCalls) {
						toolCardManager.addToolCard(toolCall.id, toolCall.name);
						const actualOutput = toolResultMap.get(toolCall.id) ?? null;
						toolCardManager.completeToolCard(
							toolCall.id,
							toolCall.name,
							toolCall.input,
							actualOutput,
						);
					}

					addMessageToContainer(cardGroup);
					toolCardManager.finalizeCardGroup();
				}
			} else if (typeof message.content === "string") {
				const renderer = createStreamingRenderer(bubble, { showCursor: false });
				renderer.appendText(message.content);
				renderer.finish();
			}

			addMessageToContainer(assistantMessageEl);
		}
	}

	// 滚动到底部（使用即时滚动确保正确显示最新消息）
	scrollToBottom({ instant: true });

	console.log(`[Panel] Rendered ${messages.length} history messages`);
}

// ============================================================================
// 时间旅行：回退到指定轮次
// ============================================================================

/**
 * 处理回退按钮点击
 * 弹出确认对话框，确认后截断历史、恢复样式、重新渲染 UI
 *
 * @param {number} targetTurn - 要回退到的轮次号
 */
async function handleRewindClick(targetTurn) {
	if (AppState.agentStatus === "running") {
		console.warn("[Panel] Agent is running, cannot rewind");
		return;
	}

	const confirmed = await showConfirmModal({
		title: getMessage("rewindHere"),
		message: getMessage("rewindConfirmDesc"),
		confirmText: getMessage("rewindHere"),
	});
	if (!confirmed) return;

	try {
		// 获取被回撤轮次的用户消息内容，以便恢复到输入框
		const userBubble = DOM.messagesContainer?.querySelector(
			`.message-user .message-bubble[data-turn="${targetTurn}"]`,
		);
		const rewoundMessage = userBubble?.firstChild?.textContent || "";

		const session = await import("./session.js");
		const { sendToContentScript } = await import("./tools.js");

		const domain = stateManager.get("currentDomain");
		const sessionId = stateManager.get("currentSessionId");
		if (!domain || !sessionId) {
			console.error("[Panel] Cannot rewind: no active session");
			return;
		}

		const result = await session.rewindToTurn(domain, sessionId, targetTurn);

		// 注入回退后的 CSS 到页面
		try {
			await sendToContentScript({
				tool: "load_session_css",
				args: { css: result.css || "" },
			});
		} catch (err) {
			console.warn("[Panel] Failed to load rewound CSS:", err.message);
		}

		setHasActiveStyles(!!result.css?.trim());

		// 重新渲染对话区
		renderHistoryMessages(result.messages);

		// 将回撤的用户输入恢复到输入框
		if (rewoundMessage && DOM.messageInput) {
			DOM.messageInput.value = rewoundMessage;
			DOM.messageInput.focus();
		}

		// 隐藏确认浮层（如果有）
		if (isConfirmationOverlayVisible()) {
			hideConfirmationOverlay(false);
		}

		console.log(`[Panel] Rewound to turn ${targetTurn}`);
	} catch (error) {
		console.error("[Panel] Rewind failed:", error);
	}
}

// ============================================================================
// 任务列表卡片渲染
// ============================================================================

/**
 * 全局工具卡片管理器实例
 */
const toolCardManager = new ToolCardManager(scrollToBottom);

/**
 * 全局任务卡片管理器实例
 */
const todoCardManager = new TodoCardManager();

/**
 * 创建工具调用卡片（处理中状态）
 * @param {string} toolId - 工具调用ID
 * @param {string} toolName - 工具名称
 * @returns {HTMLElement} 卡片组容器
 */
function createToolCard(toolId, toolName) {
	// 确保有卡片组
	if (!toolCardManager.hasActiveCardGroup()) {
		const group = toolCardManager.createCardGroup();
		addMessageToContainer(group);
	}

	toolCardManager.addToolCard(toolId, toolName);

	return toolCardManager.getCurrentCardGroup();
}

/**
 * 完成工具调用卡片
 * @param {string} toolId - 工具调用ID
 * @param {string} toolName - 工具名称
 * @param {Object|null} input - 工具输入参数
 * @param {string} output - 工具输出结果
 */
function completeToolCard(toolId, toolName, input, output) {
	toolCardManager.completeToolCard(toolId, toolName, input, output);
}

/**
 * 结束当前工具卡片组
 */
function finalizeToolCardGroup() {
	toolCardManager.finalizeCardGroup();
}

/**
 * 创建新的工具卡片组
 * @returns {HTMLElement}
 */
function createToolCardGroup() {
	return toolCardManager.createCardGroup();
}

/**
 * 在消息容器中创建子智能体活动面板，并返回对应的子 uiCallbacks
 * @param {string} taskId - Task 工具调用 ID
 * @param {Object} input - Task 工具输入（agent_type、description 等）
 * @returns {{ uiCallbacks: Object }}
 */
function createSubAgentPanel(taskId, input) {
	const agentType = input?.agent_type || "SubAgent";
	const description = input?.description || "";

	// 外层面板容器
	const panel = document.createElement("div");
	panel.className = "subagent-panel";
	panel.dataset.taskId = taskId;

	// 面板头部（标签 + 折叠按钮）
	const header = document.createElement("div");
	header.className = "subagent-panel-header";
	header.innerHTML = `
    <span class="subagent-panel-icon">${iconHtml("bot", 14)}</span>
    <span class="subagent-panel-label">${escapeHtml(agentType)}</span>
    ${description ? `<span class="subagent-panel-desc">${escapeHtml(description)}</span>` : ""}
    <span class="icon icon-chevron-down subagent-panel-toggle" style="width:12px;height:12px" aria-hidden="true"></span>
  `;
	panel.appendChild(header);

	// 面板主体（内嵌输出区域）
	const body = document.createElement("div");
	body.className = "subagent-panel-body";
	panel.appendChild(body);

	// 折叠/展开交互
	header.addEventListener("click", () => {
		panel.classList.toggle("collapsed");
	});

	addMessageToContainer(panel);

	// 子智能体独立的文本气泡
	const textBubble = document.createElement("div");
	textBubble.className = "subagent-text-bubble";
	body.appendChild(textBubble);

	const subStreamingRenderer = createStreamingRenderer(textBubble);
	let hasText = false;

	// 子智能体独立的工具卡片管理器
	const subCardManager = new ToolCardManager(scrollToBottom);

	const subToolInputMap = new Map();

	const uiCallbacks = {
		appendText: (delta) => {
			if (!delta) return;
			if (!hasText) {
				hasText = true;
				textBubble.classList.add("has-content");
			}
			subStreamingRenderer.appendText(delta);
		},

		appendReasoning: (_delta) => {
			// SubAgent 推理内容暂不展示，避免界面过于拥挤
		},

		showToolCall: (block) => {
			if (block.type !== "tool_use") return;
			subToolInputMap.set(block.id, block.input);
			if (!subCardManager.hasActiveCardGroup()) {
				const group = subCardManager.createCardGroup();
				body.appendChild(group);
				scrollToBottom();
			}
			subCardManager.addToolCard(block.id, block.name);
			scrollToBottom();
		},

		showToolExecuting: (_toolName) => {},

		showToolResult: (toolId, output) => {
			const card = subCardManager.cardMap.get(toolId);
			const toolName = card?.dataset.toolName || null;
			const toolInput = subToolInputMap.get(toolId) ?? null;
			subCardManager.completeToolCard(toolId, toolName, toolInput, output);
		},

		finalize: () => {
			subStreamingRenderer.finish();
			subCardManager.finalizeCardGroup();
			panel.classList.add("done");
		},
	};

	return { panel, body, uiCallbacks };
}

// ============================================================================
// 操作确认浮层
// ============================================================================

/**
 * 全局确认浮层管理器实例
 */
const confirmationOverlay = new ConfirmationOverlay();

/**
 * 显示确认浮层
 * @param {Object} options - 配置选项
 */
function showConfirmationOverlay(options) {
	confirmationOverlay.show(options);
}

/**
 * 隐藏确认浮层
 * @param {boolean} animate - 是否使用动画
 */
function hideConfirmationOverlay(animate = true) {
	confirmationOverlay.hide(animate);
}

/**
 * 检查确认浮层是否显示
 * @returns {boolean}
 */
function isConfirmationOverlayVisible() {
	return confirmationOverlay.isVisible();
}

/**
 * 获取确认浮层实例
 * @returns {ConfirmationOverlay}
 */
function getConfirmationOverlay() {
	return confirmationOverlay;
}

// ============================================================================
// 错误横幅逻辑
// ============================================================================

/**
 * 错误类型配置
 */
const ERROR_BANNER_CONFIGS = {
	API_KEY_INVALID: { messageKey: "errApiKeyInvalid", action: "settings" },
	NETWORK_ERROR: { messageKey: "errNetwork", action: "retry" },
	API_ERROR: { messageKey: "errApi", action: "retry" },
};

/** 横幅操作按钮文案 */
const ERROR_ACTION_LABEL_KEYS = {
	settings: "goToSettings",
	retry: "retry",
	newSession: "newSession",
};

/**
 * Agent 错误码 → 横幅类型、文案与操作
 */
const AGENT_ERROR_UI = {
	API_KEY_INVALID: { type: "API_KEY_INVALID", key: "errApiKeyInvalid", action: "settings" },
	ACCESS_DENIED: { type: "API_KEY_INVALID", key: "errAccessDenied", action: "settings" },
	MODEL_NOT_FOUND: { type: "API_ERROR", key: "errModelNotFound", action: "settings" },
	INSUFFICIENT_BALANCE: { type: "API_ERROR", key: "errInsufficientBalance", action: "retry" },
	RATE_LIMITED: { type: "API_ERROR", key: "errRateLimited", action: "retry" },
	MAX_RETRIES: { type: "API_ERROR", key: "errRateLimited", action: "retry" },
	CONTEXT_TOO_LONG: { type: "API_ERROR", key: "errContextTooLong", action: "newSession" },
	NETWORK_ERROR: { type: "NETWORK_ERROR", key: "errNetwork", action: "retry" },
};

/**
 * 按错误码显示可操作的错误横幅（发送消息与技能 chip 共用）
 * @param {Error} error - agentLoop 抛出的错误（AgentError 带 code）
 * @param {Function} onRetry - 重试回调
 */
function showAgentError(error, onRetry) {
	const code =
		error.code || (error instanceof TypeError ? "NETWORK_ERROR" : null);
	const ui = AGENT_ERROR_UI[code];
	const type = ui?.type || "API_ERROR";
	const customMessage = ui
		? getMessage(ui.key)
		: `${getMessage("errApi")}: ${String(error.message || "").slice(0, 200)}`;
	setErrorState(type);
	showErrorBanner(type, { customMessage, action: ui?.action, onRetry });
}

/**
 * 显示错误横幅
 * @param {string} errorType - 错误类型：'API_KEY_INVALID' | 'NETWORK_ERROR' | 'API_ERROR'
 * @param {Object} options - 可选配置
 * @param {string} options.customMessage - 自定义错误消息
 * @param {Function} options.onRetry - 重试回调（仅 NETWORK_ERROR 和 API_ERROR）
 */
function showErrorBanner(errorType, options = {}) {
	if (!DOM.errorBanner) return;

	const config = ERROR_BANNER_CONFIGS[errorType];
	if (!config) {
		console.error("[Panel] Unknown error type:", errorType);
		return;
	}

	// 设置错误消息
	const message = options.customMessage || getMessage(config.messageKey);
	DOM.errorBannerMessage.textContent = message;

	DOM.errorBanner.dataset.type = errorType;

	// 设置操作按钮
	const action = options.action || config.action;
	if (action) {
		DOM.errorBannerAction.textContent = getMessage(ERROR_ACTION_LABEL_KEYS[action]);
		DOM.errorBannerAction.classList.remove("hidden");
		DOM.errorBannerAction.dataset.action = action;

		// 如果是重试操作，保存回调
		if (action === "retry" && options.onRetry) {
			DOM.errorBannerAction.dataset.hasCallback = "true";
			// 使用闭包保存回调
			DOM.errorBannerAction._retryCallback = options.onRetry;
		} else {
			DOM.errorBannerAction.dataset.hasCallback = "false";
			DOM.errorBannerAction._retryCallback = null;
		}
	} else {
		DOM.errorBannerAction.classList.add("hidden");
	}

	// 显示横幅
	DOM.errorBanner.classList.remove("hidden");

	// 更新状态指示灯为错误状态
	updateStatusIndicator("error");

	console.log("[Panel] Error banner shown:", errorType, message);
}

/**
 * 隐藏错误横幅
 */
function hideErrorBanner() {
	if (!DOM.errorBanner) return;

	DOM.errorBanner.classList.add("hidden");

	// 清除重试回调
	if (DOM.errorBannerAction) {
		DOM.errorBannerAction._retryCallback = null;
	}

	// 恢复状态指示灯
	if (AppState.agentStatus === "error") {
		updateStatusIndicator("idle");
	}

	console.log("[Panel] Error banner hidden");
}

/**
 * 初始化错误横幅事件
 */
function initErrorBanner() {
	// 关闭按钮
	if (DOM.errorBannerClose) {
		DOM.errorBannerClose.addEventListener("click", () => {
			hideErrorBanner();
		});
	}

	// 操作按钮
	if (DOM.errorBannerAction) {
		DOM.errorBannerAction.addEventListener("click", () => {
			const action = DOM.errorBannerAction.dataset.action;

			switch (action) {
				case "settings":
					// 跳转到设置页
					hideErrorBanner();
					initSettingsView();
					switchView("settings");
					break;

				case "retry":
					// 执行重试回调
					const retry = DOM.errorBannerAction._retryCallback;
					if (retry) {
						hideErrorBanner();
						clearErrorState();
						retry();
					}
					break;

				case "newSession":
					hideErrorBanner();
					clearErrorState();
					handleNewSession();
					break;
			}
		});
	}
}

// ============================================================================
// 滚动到底部按钮
// ============================================================================

/**
 * 滚动到底部按钮相关的状态和阈值
 */
const SCROLL_BOTTOM_THRESHOLD = 100; // 距离底部多少像素时认为"在底部"

/**
 * 初始化滚动到底部按钮
 * 绑定点击事件和滚动监听器
 */
function initScrollToBottomButton() {
	DOM.scrollToBottomBtn = document.getElementById("scroll-to-bottom-btn");

	if (!DOM.scrollToBottomBtn || !DOM.chatArea) {
		console.warn("[Panel] Scroll to bottom button or chat area not found");
		return;
	}

	// 绑定点击事件
	DOM.scrollToBottomBtn.addEventListener("click", handleScrollToBottomClick);

	// 监听滚动事件
	DOM.chatArea.addEventListener("scroll", handleChatAreaScroll);

	// 初始状态：隐藏按钮
	hideScrollToBottomButton();

	console.log("[Panel] Scroll to bottom button initialized");
}

/**
 * 处理滚动到底部按钮点击
 */
function handleScrollToBottomClick() {
	scrollToBottom({ instant: false, force: true }); // 强制平滑滚动到底部
	hideScrollToBottomButton();
}

/**
 * 处理聊天区域滚动事件
 * 根据滚动位置显示或隐藏按钮
 */
function handleChatAreaScroll() {
	if (!DOM.chatArea || !DOM.scrollToBottomBtn) return;

	const { scrollTop, scrollHeight, clientHeight } = DOM.chatArea;
	const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

	// 如果距离底部超过阈值，显示按钮
	if (distanceFromBottom > SCROLL_BOTTOM_THRESHOLD) {
		showScrollToBottomButton();
	} else {
		hideScrollToBottomButton();
	}
}

/**
 * 显示滚动到底部按钮
 */
function showScrollToBottomButton() {
	if (DOM.scrollToBottomBtn) {
		DOM.scrollToBottomBtn.classList.add("visible");
		DOM.scrollToBottomBtn.classList.remove("hidden");
	}
}

/**
 * 隐藏滚动到底部按钮
 */
function hideScrollToBottomButton() {
	if (DOM.scrollToBottomBtn) {
		DOM.scrollToBottomBtn.classList.remove("visible");
		DOM.scrollToBottomBtn.classList.add("hidden");
	}
}

/**
 * 检查是否在底部附近
 * @returns {boolean}
 */
function isNearBottom() {
	if (!DOM.chatArea) return true;

	const { scrollTop, scrollHeight, clientHeight } = DOM.chatArea;
	return scrollHeight - scrollTop - clientHeight < SCROLL_BOTTOM_THRESHOLD;
}

// ============================================================================
// 导出函数
// ============================================================================

export {
	AppState,
	addMessageToContainer,
	applyGlobalState,
	// 操作确认浮层导出
	ConfirmationOverlay,
	clearAttachedImages,
	clearErrorState,
	clearMessages,
	clearPickedElement,
	completeToolCard,
	computeGlobalState,
	confirmationOverlay,
	createStreamingRenderer,
	createToolCard,
	createToolCardGroup,
	finalizeToolCardGroup,
	// 图片上传导出
	getAttachedImages,
	getConfirmationOverlay,
	// 元素选择器导出
	getPickedElementInfo,
	getToolDisplayName,
	hasAttachedImages,
	// 错误横幅导出
	hideConfirmationOverlay,
	hideErrorBanner,
	hideScrollToBottomButton,
	initStateSync,
	isConfirmationOverlayVisible,
	renderAssistantMessageContainer,
	renderUserMessage,
	StreamingTextRenderer,
	scrollToBottom,
	setApiKeyStatus,
	setErrorState,
	setHasActiveStyles,
	setProcessingState,
	setRestrictedPageState,
	showConfirmationOverlay,
	showEmptyState,
	showError,
	// 错误横幅导出
	showErrorBanner,
	showScrollToBottomButton,
	stateManager,
	switchView,
	// 工具调用卡片导出
	ToolCardManager,
	toolCardManager,
	updateInputAreaState,
	updateStatusIndicator,
};




export { /* views */ createSubAgentPanel, initMainView, renderHistoryMessages, showAgentError, showLoading, showTurnUsage, todoCardManager, updateTopBarDisplay };
