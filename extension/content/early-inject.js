/**
 * early-inject.js —— 当前会话样式自动注入 + 基础消息响应
 * 
 * 在 document_start 阶段执行，在页面渲染之前注入当前活跃会话的样式，防止闪烁（FOUC）。
 * 同时提供基础消息响应，确保在 content.js 加载前 Side Panel 能够获取域名。
 * 
 * 修复：刷新页面后立即打开 Side Panel 时，content.js 可能还未注入，
 *       导致 sendToContentScript 失败，页面被错误标记为受限页面。
 */

// 样式注入
(async () => {
  const domain = location.hostname;
  const key = `active_styles:${domain}`;
  const result = await chrome.storage.local.get(key);

  if (!result[key]) return;

  const style = document.createElement('style');
  style.id = 'styleswift-active-persistent';
  style.textContent = result[key];

  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.documentElement.appendChild(style);
  }
})();

/**
 * 基础消息监听器
 * 在 document_start 阶段就注册，确保 Side Panel 在 content.js 加载前也能获取基础信息。
 * content.js 加载后会注册完整的消息处理器，此监听器作为早期响应。
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { tool } = message;

  // 只响应基础工具请求，复杂操作等待 content.js 处理
  if (tool === 'get_domain') {
    sendResponse(location.hostname || 'unknown');
    return true; // 保持消息通道开放
  }

  // 其他请求不处理，让 content.js 的监听器响应
  return false;
});
