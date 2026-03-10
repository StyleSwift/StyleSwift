/**
 * early-inject.js —— 当前会话样式自动注入
 * 
 * 在 document_start 阶段执行，在页面渲染之前注入当前活跃会话的样式，防止闪烁（FOUC）。
 * 读取 chrome.storage.local 中的 active_styles:{domain} 并注入到页面。
 */

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
