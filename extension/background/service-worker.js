// StyleSwift Service Worker

// 设置点击扩展图标自动打开 Side Panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

/**
 * 保存技能到本地存储
 */
function installSkill(slug, data, sourceDomain) {
	const id = slug || crypto.randomUUID().slice(0, 8);
	const name = data.name || data.title || slug;
	const mood = data.mood || data.description || "";
	const content = data.content || "";
	const cssContent = data.css_content || "";
	const contentType = data.content_type || "style_dna";
	const exampleUrl = data.example_url || null;

	console.log("[StyleSwift] Installing skill:", id, name, "type:", contentType);

	const INDEX_KEY = "skills:user:index";
	return chrome.storage.local.get(INDEX_KEY).then((result) => {
		const index = result[INDEX_KEY] || [];
		const existingIndex = index.findIndex((s) => s.id === id);
		const entry = { id, name, mood, sourceDomain, contentType, cssContent: !!cssContent, exampleUrl, createdAt: Date.now() };

		if (existingIndex >= 0) {
			entry.createdAt = index[existingIndex].createdAt;
			index[existingIndex] = entry;
		} else {
			index.push(entry);
		}

		const storageData = { [INDEX_KEY]: index };
		storageData[`skills:user:${id}`] = content;
		if (cssContent) {
			storageData[`skills:user:${id}:css`] = cssContent;
		}

		return chrome.storage.local.set(storageData);
	}).then(() => {
		console.log("[StyleSwift] Skill installed:", id);
		return { success: true, id };
	}).catch((err) => {
		console.error("[StyleSwift] Install failed:", err);
		return { success: false, error: err.message };
	});
}

/**
 * 处理来自 content script 的消息（网页→content script→service worker）
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action !== "installSkillFromWeb") return;

	if (message.installAction === "ping") {
		sendResponse({ success: true });
		return false;
	}

	if (message.installAction === "installSkill") {
		const sourceDomain = sender.tab?.url ? new URL(sender.tab.url).hostname : "";
		installSkill(message.slug, message.data, sourceDomain).then(sendResponse);
		return true;
	}
});

/**
 * 处理来自外部网页的消息（externally_connectable，生产环境使用）
 */
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
	console.log("[StyleSwift] onMessageExternal:", message.action, "from:", sender.url);

	if (message.action === "ping") {
		sendResponse({ success: true });
		return true;
	}

	if (message.action === "installSkill") {
		const sourceDomain = sender.url ? new URL(sender.url).hostname : "";
		installSkill(message.slug, message.data, sourceDomain).then(sendResponse);
		return true;
	}

	sendResponse({ success: false, error: "Unknown action" });
	return true;
});

/**
 * Content Scripts 配置
 * 用于动态注入到已打开的标签页
 */
const CONTENT_SCRIPTS = [
	{
		id: "early-inject",
		js: "content/early-inject.js",
		runAt: "document_start",
	},
	{
		id: "content-script",
		js: "content/content.js",
		runAt: "document_idle",
	},
];

/**
 * 检查 URL 是否支持注入
 * @param {string} url - 标签页 URL
 * @returns {boolean} 是否支持注入
 */
function isInjectableUrl(url) {
	if (!url) return false;
	const blockedProtocols = [
		"chrome:",
		"chrome-extension:",
		"about:",
		"edge:",
		"brave:",
		"opera:",
		"vivaldi:",
		"file:",
	];
	return !blockedProtocols.some((protocol) => url.startsWith(protocol));
}

/**
 * 向指定标签页注入 Content Scripts
 * @param {number} tabId - 标签页 ID
 */
async function injectContentScripts(tabId) {
	try {
		const tab = await chrome.tabs.get(tabId);
		if (!isInjectableUrl(tab.url)) {
			console.log(
				`[ServiceWorker] Tab ${tabId} has non-injectable URL: ${tab.url}`,
			);
			return;
		}

		for (const script of CONTENT_SCRIPTS) {
			try {
				await chrome.scripting.executeScript({
					target: { tabId },
					files: [script.js],
				});
				console.log(`[ServiceWorker] Injected ${script.js} into tab ${tabId}`);
			} catch (err) {
				if (err.message?.includes("Cannot access")) {
					console.log(
						`[ServiceWorker] Cannot inject ${script.js} into tab ${tabId}: restricted page`,
					);
				} else {
					console.warn(
						`[ServiceWorker] Failed to inject ${script.js} into tab ${tabId}:`,
						err.message,
					);
				}
			}
		}
	} catch (err) {
		console.warn(
			`[ServiceWorker] Error injecting content scripts into tab ${tabId}:`,
			err.message,
		);
	}
}

/**
 * 向所有已打开的标签页注入 Content Scripts
 */
async function injectToAllTabs() {
	try {
		const tabs = await chrome.tabs.query({});
		console.log(
			`[ServiceWorker] Injecting content scripts to ${tabs.length} tabs`,
		);

		for (const tab of tabs) {
			if (tab.id && isInjectableUrl(tab.url)) {
				await injectContentScripts(tab.id);
			}
		}

		console.log("[ServiceWorker] Content scripts injection complete");
	} catch (err) {
		console.error("[ServiceWorker] Failed to inject to all tabs:", err);
	}
}

/**
 * 扩展安装/更新时重新注入 Content Scripts
 */
chrome.runtime.onInstalled.addListener((details) => {
	console.log(`[ServiceWorker] Extension ${details.reason}:`, details);

	if (details.reason === "install") {
		chrome.tabs.create({
			url: chrome.runtime.getURL("welcome/welcome.html"),
		});
		setTimeout(() => {
			injectToAllTabs();
		}, 100);
	} else if (details.reason === "update") {
		setTimeout(() => {
			injectToAllTabs();
		}, 100);
	}
});

/**
 * 扩展启动时也注入
 */
chrome.runtime.onStartup.addListener(() => {
	console.log("[ServiceWorker] Extension startup");
	injectToAllTabs();
});
