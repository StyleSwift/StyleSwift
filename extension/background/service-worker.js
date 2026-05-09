// StyleSwift Service Worker

// 设置点击扩展图标自动打开 Side Panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

/**
 * 保存技能到本地存储，并可选地将 CSS Snippet 应用到目标域名
 */
function installSkill(slug, data, sourceDomain) {
	const id = slug || crypto.randomUUID().slice(0, 8);
	const name = data.name || data.title || slug;
	const mood = data.mood || data.description || "";
	const content = data.content || "";
	const cssContent = data.css_content || "";
	const contentType = data.content_type || "style_dna";
	const exampleUrl = data.example_url || null;
	const installDna = data.installDna !== false;  // default true
	const installCss = data.installCss !== false;   // default true

	console.log("[StyleSwift] Installing skill:", id, name, "type:", contentType, "dna:", installDna, "css:", installCss);

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
		if (installDna) {
			storageData[`skills:user:${id}`] = content;
		}
		if (installCss && cssContent) {
			storageData[`skills:user:${id}:css`] = cssContent;
		}

		return chrome.storage.local.set(storageData);
	}).then(async () => {
		console.log("[StyleSwift] Skill installed:", id);

		// If CSS snippet selected, apply to target domain
		if (installCss && cssContent && exampleUrl) {
			try {
				const targetDomain = new URL(exampleUrl).hostname;
				if (targetDomain) {
					await applyCssToDomain(targetDomain, cssContent);
					console.log("[StyleSwift] CSS applied to domain:", targetDomain);
				}
			} catch (err) {
				console.warn("[StyleSwift] Failed to apply CSS to domain:", err.message);
			}
		}

		return { success: true, id };
	}).catch((err) => {
		console.error("[StyleSwift] Install failed:", err);
		return { success: false, error: err.message };
	});
}

/**
 * 在目标域名下新建会话，通过 apply_styles 流程应用 CSS
 * 复刻 sidepanel runApplyStyles("save") 的核心逻辑
 */
async function applyCssToDomain(domain, css) {
	const sessionId = crypto.randomUUID();
	const now = Date.now();

	// 1. 创建新会话索引
	const indexKey = `sessions:${domain}:index`;
	const { [indexKey]: existingIndex = [] } = await chrome.storage.local.get(indexKey);
	const newIndex = [...existingIndex, { id: sessionId, created_at: now }];
	const activeKey = `sessions:${domain}:active`;
	const stylesKey = `sessions:${domain}:${sessionId}:styles`;
	const historyKey = `sessions:${domain}:${sessionId}:styles_history`;
	const metaKey = `sessions:${domain}:${sessionId}:meta`;
	const activeStylesKey = `active_styles:${domain}`;

	// 2. 写入会话数据：索引、激活、样式、历史、元数据
	await chrome.storage.local.set({
		[indexKey]: newIndex,
		[activeKey]: sessionId,
		[stylesKey]: css,
		[historyKey]: [css],
		[metaKey]: {
			created_at: now,
			updated_at: now,
			rule_count: (css.match(/\{/g) || []).length,
			source: "community-install",
		},
		[activeStylesKey]: css,
	});

	console.log("[StyleSwift] Session created:", sessionId, "for domain:", domain);

	// 3. 注入到已打开的目标域名标签页
	try {
		const tabs = await chrome.tabs.query({});
		for (const tab of tabs) {
			if (tab.url && new URL(tab.url).hostname === domain && tab.id) {
				try {
					await chrome.tabs.sendMessage(tab.id, {
						tool: "inject_css",
						args: { css },
					});
				} catch {
					// Content script may not be loaded on this tab
				}
			}
		}
	} catch (err) {
		console.warn("[StyleSwift] Failed to inject into open tabs:", err.message);
	}
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
