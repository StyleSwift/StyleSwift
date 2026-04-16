// ============================================================
// API 供应商指南 - 国际化配置
// ============================================================

/**
 * 获取翻译文本
 * @param {string} key - i18n message key
 * @returns {string} 翻译后的文本
 */
function t(key) {
	return chrome.i18n.getMessage(key) || key;
}

/**
 * 获取当前语言环境
 * @returns {string} 'zh_CN' 或 'en'
 */
function getLocale() {
	const uiLang = chrome.i18n.getUILanguage();
	return uiLang.startsWith("zh") ? "zh_CN" : "en";
}

// 初始化国际化
function initI18n() {
	const locale = getLocale();

	// 更新 HTML lang 属性
	document.documentElement.lang = locale === "zh_CN" ? "zh-CN" : "en";

	// 更新所有带 data-i18n 属性的元素
	document.querySelectorAll("[data-i18n]").forEach((el) => {
		const key = el.getAttribute("data-i18n");
		const text = t(key);
		if (text && text !== key) {
			el.textContent = text;
		}
	});

	// 更新页面标题
	document.title = t("apiGuideTitle") + " - StyleSwift";
}

// DOM 加载完成后初始化
document.addEventListener("DOMContentLoaded", initI18n);