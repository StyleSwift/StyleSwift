/**
 * StyleSwift - Side Panel 共享状态（DOM 缓存、全局状态管理器）
 * 从 panel.js 拆分（行为不变）
 */

import { GlobalStateManager } from "./ui/state-manager.js";

/**
 * DOM element cache
 * Initialized after DOMContentLoaded
 */
export const DOM = {
	// View containers
	onboardingView: null,
	mainView: null,
	settingsView: null,

	// Onboarding elements
	apiKeyInput: null,
	apiBaseInput: null,
	modelInput: null,
	startBtn: null,
	setupError: null,

	// Main view elements
	statusDot: null,
	currentDomain: null,
	sessionTitle: null,
	chatArea: null, // 滚动容器（实际可滚动区域）
	messagesContainer: null, // 消息内容容器
	messageInput: null,
	sendBtn: null,
	stopBtn: null,
	inputArea: null,
	inputWrapper: null,
	typewriterPlaceholder: null,
	typewriterText: null,

	// Error banner elements
	errorBanner: null,
	errorBannerMessage: null,
	errorBannerAction: null,
	errorBannerClose: null,

	// Skill area elements
	skillArea: null,
	skillChips: null,
	skillAreaToggle: null,

	// Settings elements
	settingsApiKey: null,
	settingsApiBase: null,
	settingsModel: null,
	settingsVisionApiKey: null,
	settingsVisionApiBase: null,
	settingsVisionModel: null,
	settingsUserProfile: null,
	profileCharCount: null,
	saveProfileBtn: null,
	profileStatus: null,
	verifyConnectionBtn: null,
	connectionStatus: null,

	// Element picker
	pickerBtn: null,
	pickedElementBar: null,
	// Note: 元素标签现在是动态生成的，元素信息存储在 _pickedElementInfo 数组中

	// Image upload
	imageUploadBtn: null,
	imageUploadInput: null,
	attachedImagesBar: null,
	attachedImagesContainer: null,
	attachedImagesClear: null,

	// 其他
	loadingOverlay: null,
	errorToast: null,
	errorMessage: null,

	// 滚动到底部按钮
	scrollToBottomBtn: null,
};

/**
 * 全局状态管理器实例
 */
export const stateManager = new GlobalStateManager();

/**
 * 兼容旧代码的 AppState 对象
 * 通过 Proxy 实现与 stateManager 的双向同步
 */
export const AppState = new Proxy(
	{},
	{
		get(target, prop) {
			return stateManager.get(prop);
		},
		set(target, prop, value) {
			stateManager.set(prop, value);
			return true;
		},
	},
);
