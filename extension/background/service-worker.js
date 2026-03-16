// StyleSwift Service Worker
// 设置点击扩展图标自动打开 Side Panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

/**
 * Content Scripts 配置
 * 用于动态注入到已打开的标签页
 */
const CONTENT_SCRIPTS = [
  {
    id: 'early-inject',
    js: 'content/early-inject.js',
    runAt: 'document_start'
  },
  {
    id: 'content-script',
    js: 'content/content.js',
    runAt: 'document_idle'
  }
];

/**
 * 检查 URL 是否支持注入
 * @param {string} url - 标签页 URL
 * @returns {boolean} 是否支持注入
 */
function isInjectableUrl(url) {
  if (!url) return false;
  // 排除 chrome://、chrome-extension://、about:、edge:// 等内部页面
  const blockedProtocols = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'brave:', 'opera:', 'vivaldi:', 'file:'];
  return !blockedProtocols.some(protocol => url.startsWith(protocol));
}

/**
 * 向指定标签页注入 Content Scripts
 * @param {number} tabId - 标签页 ID
 */
async function injectContentScripts(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isInjectableUrl(tab.url)) {
      console.log(`[ServiceWorker] Tab ${tabId} has non-injectable URL: ${tab.url}`);
      return;
    }

    for (const script of CONTENT_SCRIPTS) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [script.js]
        });
        console.log(`[ServiceWorker] Injected ${script.js} into tab ${tabId}`);
      } catch (err) {
        // 忽略已注入的错误
        if (err.message?.includes('Cannot access')) {
          console.log(`[ServiceWorker] Cannot inject ${script.js} into tab ${tabId}: restricted page`);
        } else {
          console.warn(`[ServiceWorker] Failed to inject ${script.js} into tab ${tabId}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.warn(`[ServiceWorker] Error injecting content scripts into tab ${tabId}:`, err.message);
  }
}

/**
 * 向所有已打开的标签页注入 Content Scripts
 * 用于扩展安装/更新/重新加载时
 */
async function injectToAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    console.log(`[ServiceWorker] Injecting content scripts to ${tabs.length} tabs`);

    for (const tab of tabs) {
      if (tab.id && isInjectableUrl(tab.url)) {
        await injectContentScripts(tab.id);
      }
    }

    console.log('[ServiceWorker] Content scripts injection complete');
  } catch (err) {
    console.error('[ServiceWorker] Failed to inject to all tabs:', err);
  }
}

/**
 * 扩展安装/更新时重新注入 Content Scripts
 * 这是解决"刷新扩展后已打开页面无法使用"问题的关键
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[ServiceWorker] Extension ${details.reason}:`, details);

  if (details.reason === 'install' || details.reason === 'update') {
    // 延迟一小段时间确保扩展完全加载
    setTimeout(() => {
      injectToAllTabs();
    }, 100);
  }
});

/**
 * 扩展启动时也注入（处理 Service Worker 重启的情况）
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[ServiceWorker] Extension startup');
  injectToAllTabs();
});