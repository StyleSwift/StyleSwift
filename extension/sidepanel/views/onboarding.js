/**
 * StyleSwift - Side Panel onboarding
 * 从 panel.js 拆分（行为不变）
 */

import { DEFAULT_API_BASE, DEFAULT_MODEL, PROVIDER_PRESETS, normalizeApiBase, saveSettings, validateConnection } from "../api.js";
import { formatMessage, getMessage, isChineseLanguage } from "../i18n.js";
import { AppState, DOM } from "../panel-state.js";
import { initMainView, showLoading, switchView } from "../panel.js";
import { setEngine } from "../agent/engines/prefs.js";
import { renderLocalSetup } from "./local-setup.js";

// ============================================================================
// 引导页逻辑
// ============================================================================

/**
 * 初始化引导页
 */
export function initOnboarding() {
	// 获取 DOM 元素
	DOM.apiKeyInput = document.getElementById("api-key-input");
	DOM.apiBaseInput = document.getElementById("api-base-input");
	DOM.modelInput = document.getElementById("model-input");
	DOM.startBtn = document.getElementById("start-btn");
	DOM.setupError = document.getElementById("setup-error");

	// 监听输入变化
	DOM.apiKeyInput.addEventListener("input", validateOnboardingForm);
	DOM.apiBaseInput.addEventListener("input", validateOnboardingForm);
	DOM.modelInput.addEventListener("input", validateOnboardingForm);

	// 监听开始按钮
	DOM.startBtn.addEventListener("click", handleStartClick);

	// 服务商下拉：中文界面默认 PPIO，其他默认 Anthropic
	DOM.providerSelect = document.getElementById("provider-select");
	DOM.providerSelect.replaceChildren(
		...PROVIDER_PRESETS.map(
			(p) => new Option(p.name || getMessage("providerCustom"), p.id),
		),
	);
	DOM.providerSelect.value = isChineseLanguage() ? "ppio" : "anthropic";
	DOM.providerSelect.addEventListener("change", applyProviderPreset);
	applyProviderPreset();

	// 初始验证表单
	validateOnboardingForm();

	// 动态设置 API 供应商指南链接
	const apiGuideLink = document.getElementById("api-guide-link");
	if (apiGuideLink) {
		apiGuideLink.href = `chrome-extension://${chrome.runtime.id}/api-guide/api-guide.html`;
		apiGuideLink.setAttribute("target", "_blank");
	}

	initLocalOnboarding();
}

/**
 * 引导页「使用本机 Claude Code / Codex」：选中可用引擎即完成配置，无需 API Key
 */
function initLocalOnboarding() {
	const card = document.getElementById("choose-local-engine");
	const panel = document.getElementById("local-onboarding");
	const form = document.querySelector("#onboarding-view .setup-form");
	let setup = null;

	const show = (local) => {
		card.classList.toggle("hidden", local);
		form.classList.toggle("hidden", local);
		panel.classList.toggle("hidden", !local);
		if (!local) {
			setup?.destroy();
			setup = null;
		}
	};

	card.addEventListener("click", () => {
		show(true);
		setup = renderLocalSetup(document.getElementById("local-setup-onboarding"), {
			onReady: async (engineId) => {
				setup.destroy();
				await setEngine(engineId);
				AppState.apiKeyStatus = "valid"; // 已配置：本机引擎可用
				switchView("main");
				initMainView();
			},
		});
		setup.refresh();
	});
	document.getElementById("use-api-key-instead").addEventListener("click", () => show(false));
}

/**
 * 将选中服务商的地址和模型填入表单；自定义时展开高级设置让用户填写
 */
export function applyProviderPreset() {
	const preset = PROVIDER_PRESETS.find((p) => p.id === DOM.providerSelect.value);
	DOM.apiBaseInput.value = preset.apiBase;
	DOM.modelInput.value = preset.model;
	document.getElementById("advanced-settings").open = preset.id === "custom";

	const keyLink = document.getElementById("get-key-link");
	keyLink.href = preset.keyUrl;
	keyLink.classList.toggle("hidden", !preset.keyUrl);
}

/**
 * 验证引导页表单
 * 只有 API Key 非空时才启用开始按钮
 */
export function validateOnboardingForm() {
	const apiKey = DOM.apiKeyInput.value.trim();
	const isValid = apiKey.length > 0;

	DOM.startBtn.disabled = !isValid;

	// 清除之前的错误提示
	if (isValid) {
		hideSetupError();
	}
}

/**
 * 显示引导页错误
 * @param {string} message - 错误消息
 */
export function showSetupError(message) {
	DOM.setupError.textContent = message;
	DOM.setupError.classList.remove("hidden");
}

/**
 * 隐藏引导页错误
 */
export function hideSetupError() {
	DOM.setupError.classList.add("hidden");
}

/**
 * 处理开始按钮点击
 */
export async function handleStartClick() {
	const apiKey = DOM.apiKeyInput.value.trim();
	let apiBase = DOM.apiBaseInput.value.trim();
	let model = DOM.modelInput.value.trim();

	// 基本验证
	if (!apiKey) {
		showSetupError(getMessage("enterApiKey"));
		return;
	}

	// 如果 API 地址为空，使用默认值
	if (!apiBase) {
		apiBase = DEFAULT_API_BASE;
	}

	// 如果模型为空，使用默认值
	if (!model) {
		model = DEFAULT_MODEL;
	}

	// 规范化 API 地址（移除多余路径）
	apiBase = normalizeApiBase(apiBase);

	// 验证 URL 格式
	try {
		new URL(apiBase);
	} catch {
		showSetupError(getMessage("apiAddressFormatError"));
		return;
	}

	// 显示加载状态
	showLoading(true);
	DOM.startBtn.disabled = true;
	hideSetupError();

	try {
		// 验证连接
		const result = await validateConnection(apiKey, apiBase, model);

		if (!result.ok) {
			// 连接失败
			let errorMsg = getMessage("connectionVerifyFailed");

			if (result.error) {
				// 网络错误
				errorMsg = formatMessage("connectionFailedDetail", { error: result.error });
			} else if (result.status === 401) {
				errorMsg = getMessage("apiKeyInvalidPleaseCheck");
			} else if (result.status === 403) {
				errorMsg = getMessage("accessDeniedPleaseCheck");
			} else if (result.status === 404) {
				errorMsg = getMessage("errModelNotFound");
			} else if (result.status === 402) {
				errorMsg = getMessage("errInsufficientBalance");
			} else if (result.status) {
				errorMsg = formatMessage("connectionFailedHttp", { status: result.status });
			}

			showSetupError(errorMsg);
			AppState.apiKeyStatus = "invalid";
			return;
		}

		// 连接成功，保存设置
		await saveSettings({ apiKey, apiBase, model });
		AppState.apiKeyStatus = "valid";

		console.log("[Panel] API Key validated and saved");

		// 切换到主界面
		switchView("main");
		initMainView();
	} catch (err) {
		console.error("[Panel] Setup error:", err);
		showSetupError(formatMessage("saveSettingsFailedDetail", { error: err.message }));
	} finally {
		showLoading(false);
		DOM.startBtn.disabled = false;
	}
}

