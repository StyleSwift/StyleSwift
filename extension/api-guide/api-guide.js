// ============================================================
// API 供应商指南 - 国际化配置
// ============================================================

const i18n = {
  zh_CN: {
    apiGuideTitle: "API 供应商指南",
    apiGuideSubtitle: "选择适合你的 API 方案",
    domesticProviders: "国内主流 API",
    internationalProviders: "国际主流 API",
    ppioDesc: "多模型聚合，开发者友好",
    zhipuDesc: "GLM-4 系列模型，Coding Plan 性价比高",
    bailianDesc: "通义千问系列，免费额度大",
    deepseekDesc: "DeepSeek-R1/V3，价格极具竞争力",
    siliconflowDesc: "多模型代理，免费额度丰富",
    doubaoDesc: "豆包系列，响应速度快",
    anthropicDesc: "Claude 系列原厂，能力最强",
    openaiDesc: "GPT-4 系列原厂，生态完善",
    googleDesc: "Gemini 系列，免费额度大",
    azureDesc: "企业级 GPT 服务，合规性强",
    compatibilityTitle: "兼容性说明",
    compatibilityDesc: "本扩展兼容 Anthropic Claude 和 OpenAI 两种 API 格式，支持上述所有供应商及任意第三方 API 平台。填写 API Key 和对应地址即可开始使用。",
    securityTitle: "安全保障",
    openSourceBadge: "开源",
    openSourceDesc: "完全开源，代码可审计",
    verifiedBadge: "已验证",
    verifiedDesc: "隐私政策已通过 Chrome 官方审核",
    localBadge: "本地",
    localDesc: "API Key 仅存储于本地浏览器，不上传任何服务器",
    guideFooter: "StyleSwift - 一句话，给常逛的网页换皮肤"
  },
  en: {
    apiGuideTitle: "API Provider Guide",
    apiGuideSubtitle: "Choose the right API for you",
    domesticProviders: "Domestic Providers (China)",
    internationalProviders: "International Providers",
    ppioDesc: "Multi-model aggregation, developer-friendly",
    zhipuDesc: "GLM-4 series, cost-effective Coding Plan",
    bailianDesc: "Qwen series, generous free tier",
    deepseekDesc: "DeepSeek-R1/V3, highly competitive pricing",
    siliconflowDesc: "Multi-model proxy, rich free tier",
    doubaoDesc: "Doubao series, fast response",
    anthropicDesc: "Claude series original, most capable",
    openaiDesc: "GPT-4 series original, rich ecosystem",
    googleDesc: "Gemini series, generous free tier",
    azureDesc: "Enterprise GPT service, strong compliance",
    compatibilityTitle: "Compatibility Note",
    compatibilityDesc: "This extension is compatible with both Anthropic Claude and OpenAI API formats, supporting all providers above and any third-party API platforms. Just enter your API Key and endpoint URL to get started.",
    securityTitle: "Security Assurance",
    openSourceBadge: "Open Source",
    openSourceDesc: "Fully open source, code auditable",
    verifiedBadge: "Verified",
    verifiedDesc: "Privacy policy approved by Chrome Web Store",
    localBadge: "Local",
    localDesc: "API Key stored locally in browser, never uploaded to any server",
    guideFooter: "StyleSwift - Transform any webpage with a single sentence"
  }
};

// 获取当前语言（优先用户偏好语言）
function getLocale() {
  const browserLang = navigator.languages?.[0] || navigator.language || "en";
  return browserLang.startsWith("zh") ? "zh_CN" : "en";
}

// 获取翻译文本
function t(key) {
  const locale = getLocale();
  return i18n[locale]?.[key] || i18n.en[key] || key;
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