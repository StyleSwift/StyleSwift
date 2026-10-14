/**
 * StyleSwift - Side Panel settings
 * 从 panel.js 拆分（行为不变）
 */

import { DEFAULT_API_BASE, DEFAULT_MODEL, getSettings, saveSettings, validateConnection } from "../api.js";
import { formatMessage, getMessage, getUILanguage } from "../i18n.js";
import { AppState, DOM, stateManager } from "../panel-state.js";
import { initMainView, showError, switchView } from "../panel.js";
import { runGetUserProfile, runUpdateUserProfile } from "../profile.js";
import { SkillLoader } from "../skill-loader.js";
import { MAX_SKILL_FILE_BYTES, StyleSkillStore, formatSkillFile, parseSkillFile } from "../style-skill.js";
import { escapeHtml, iconHtml } from "../ui/dom-utils.js";
import { needsOnboarding } from "./onboarding.js";
import { showConfirmModal } from "./session-list.js";
import { deleteSkillWithConfirmation, getDisabledSkills, getDisabledUserSkills, renderSkillChips, setSkillEnabled, setUserSkillEnabled, skillDisplayText } from "./skill-area.js";

// ============================================================================
// 设置页逻辑
// ============================================================================

/**
 * 初始化设置页
 */
export async function initSettingsView() {
	settingsDirty = false;
	settingsSaveFailed = false;
	profileDirty = false;
	document.getElementById("settings-save-hint")?.classList.add("hidden");

	// 获取设置页 DOM 元素
	DOM.settingsApiKey = document.getElementById("settings-api-key");
	DOM.settingsApiBase = document.getElementById("settings-api-base");
	DOM.settingsModel = document.getElementById("settings-model");
	DOM.settingsUserProfile = document.getElementById("settings-user-profile");
	DOM.profileCharCount = document.getElementById("profile-char-count");
	DOM.saveProfileBtn = document.getElementById("save-profile-btn");
	DOM.profileStatus = document.getElementById("profile-status");
	DOM.verifyConnectionBtn = document.getElementById("verify-connection-btn");
	DOM.connectionStatus = document.getElementById("connection-status");

	// 获取视觉模型设置 DOM 元素
	DOM.settingsVisionApiKey = document.getElementById("settings-vision-api-key");
	DOM.settingsVisionApiBase = document.getElementById(
		"settings-vision-api-base",
	);
	DOM.settingsVisionModel = document.getElementById("settings-vision-model");

	// 动态填充版本号
	const versionEl = document.getElementById("about-version");
	if (versionEl) {
		versionEl.textContent = `StyleSwift v${chrome.runtime.getManifest().version}`;
	}

	// 防止重复绑定事件监听器（使用 data 属性标记）
	const settingsView = document.getElementById("settings-view");
	if (settingsView && settingsView.dataset.listenersAttached === "true") {
		// 重新加载数据，不重复绑定事件
		await loadCurrentSettings();
		await loadUserProfile();
		await loadStorageUsage();
		await renderStaticSkillList();
		await renderUserSkillList();
		return;
	}
	if (settingsView) settingsView.dataset.listenersAttached = "true";

	// 返回按钮
	const backBtn = document.getElementById("settings-back-btn");
	if (backBtn) {
		backBtn.addEventListener("click", async () => {
			await handleSettingsBack();
		});
	}

	// 验证连接按钮
	if (DOM.verifyConnectionBtn) {
		DOM.verifyConnectionBtn.addEventListener("click", handleVerifyConnection);
	}

	// 切换 API Key 可见性
	const toggleKeyBtn = document.getElementById("toggle-key-visibility");
	if (toggleKeyBtn) {
		toggleKeyBtn.addEventListener("click", () => {
			const type = DOM.settingsApiKey.type;
			DOM.settingsApiKey.type = type === "password" ? "text" : "password";
			toggleKeyBtn.innerHTML =
				type === "password" ? iconHtml("eye-off", 16) : iconHtml("eye", 16);
		});
	}

	// 输入框变化时标记有未保存的更改
	const settingsInputs = [
		document.getElementById("settings-api-key"),
		document.getElementById("settings-api-base"),
		document.getElementById("settings-model"),
		document.getElementById("settings-vision-api-key"),
		document.getElementById("settings-vision-api-base"),
		document.getElementById("settings-vision-model"),
	];
	settingsInputs.forEach((input) => {
		if (input) {
			input.addEventListener("input", () => markSettingsDirty());
		}
	});

	// 用户画像编辑
	if (DOM.settingsUserProfile) {
		// 字数统计
		DOM.settingsUserProfile.addEventListener("input", () => {
			profileDirty = true;
			updateProfileCharCount();
		});
	}

	// 保存用户画像按钮
	if (DOM.saveProfileBtn) {
		DOM.saveProfileBtn.addEventListener("click", handleSaveUserProfile);
	}

	// 导入风格技能
	const importSkillInput = document.getElementById("import-skill-input");
	document
		.getElementById("import-skill-btn")
		?.addEventListener("click", () => importSkillInput?.click());
	importSkillInput?.addEventListener("change", handleImportSkills);

	// 清理历史数据按钮
	const clearStorageBtn = document.getElementById("clear-storage-btn");
	if (clearStorageBtn) {
		clearStorageBtn.addEventListener("click", handleClearStorage);
	}

	// 加载当前设置
	await loadCurrentSettings();

	// 加载用户画像
	await loadUserProfile();

	// 加载存储用量
	await loadStorageUsage();

	// 渲染静态技能列表
	await renderStaticSkillList();

	// 渲染用户风格技能列表
	await renderUserSkillList();
}

/** API 配置有未保存改动 / 上次返回时验证失败（再次返回即放弃改动）/ 用户画像有改动 */
export let settingsDirty = false;
export let settingsSaveFailed = false;
export let profileDirty = false;

/**
 * 读取设置页 API 表单（空的视觉字段传 "" 以便清除已保存值）
 */
export function readSettingsForm() {
	return {
		apiKey: DOM.settingsApiKey?.value.trim() || "",
		apiBase: DOM.settingsApiBase?.value.trim() || DEFAULT_API_BASE,
		model: DOM.settingsModel?.value.trim() || DEFAULT_MODEL,
		visionApiKey: DOM.settingsVisionApiKey?.value.trim() || "",
		visionApiBase: DOM.settingsVisionApiBase?.value.trim() || "",
		visionModel: DOM.settingsVisionModel?.value.trim() || "",
	};
}

/**
 * 标记设置有未保存的更改
 */
export function markSettingsDirty() {
	settingsDirty = true;
	settingsSaveFailed = false;
	const saveHint = document.getElementById("settings-save-hint");
	if (saveHint) {
		saveHint.classList.remove("hidden");
	}
	if (DOM.connectionStatus) {
		DOM.connectionStatus.classList.add("hidden");
	}
}

/**
 * 处理设置页返回按钮
 * 自动保存有效的设置后返回
 */
export async function handleSettingsBack() {
	// API 配置有改动：先验证再保存；失败则停留，再次返回视为放弃改动
	if (settingsDirty && !settingsSaveFailed) {
		const ok = await handleVerifyConnection();
		if (!ok) {
			settingsSaveFailed = true;
			showConnectionStatus(
				`${DOM.connectionStatus.textContent} ${getMessage("backAgainToDiscard")}`,
				"error",
			);
			DOM.connectionStatus.scrollIntoView({ block: "center" });
			return;
		}
	}
	settingsDirty = false;
	settingsSaveFailed = false;

	if (profileDirty) {
		try {
			await runUpdateUserProfile(DOM.settingsUserProfile.value.trim());
			profileDirty = false;
		} catch (err) {
			console.warn("[Panel] Auto-save profile on back failed:", err);
		}
	}

	// 根据已保存的配置决定返回哪个视图
	if (await needsOnboarding()) {
		switchView("onboarding");
		return;
	}

	// 若之前是 missing 状态但现在已有 Key，需要初始化主界面
	if (AppState.apiKeyStatus === "missing") {
		AppState.apiKeyStatus = "valid";
		try {
			await initMainView();
		} catch (err) {
			console.warn("[Panel] initMainView on back failed:", err);
		}
	}
	switchView("main");
}

/**
 * 显示保存成功的简短提示（不跳转）
 */
export function showSaveSuccess(message = getMessage("saved")) {
	const saveHint = document.getElementById("settings-save-hint");
	if (saveHint) {
		saveHint.textContent = "✓ " + message;
		saveHint.classList.remove("hidden", "unsaved");
		saveHint.classList.add("saved");
		setTimeout(() => {
			saveHint.classList.add("hidden");
		}, 2000);
	}
}

/**
 * 加载当前设置到表单
 */
export async function loadCurrentSettings() {
	try {
		const settings = await getSettings();
		if (DOM.settingsApiKey) {
			DOM.settingsApiKey.value = settings.apiKey || "";
		}
		if (DOM.settingsApiBase) {
			DOM.settingsApiBase.value = settings.apiBase || DEFAULT_API_BASE;
		}
		if (DOM.settingsModel) {
			DOM.settingsModel.value = settings.model || DEFAULT_MODEL;
		}
		// 加载视觉模型设置
		if (DOM.settingsVisionApiKey) {
			DOM.settingsVisionApiKey.value = settings.visionApiKey || "";
		}
		if (DOM.settingsVisionApiBase) {
			DOM.settingsVisionApiBase.value = settings.visionApiBase || "";
		}
		if (DOM.settingsVisionModel) {
			DOM.settingsVisionModel.value = settings.visionModel || "";
		}
	} catch (err) {
		console.warn("[Panel] No existing settings");
	}
}

/**
 * 加载用户画像到表单
 */
export async function loadUserProfile() {
	try {
		const { isDefaultProfile } = await import("../profile.js");
		const profile = await runGetUserProfile();
		if (DOM.settingsUserProfile) {
			// 如果是默认提示，显示空
			if (isDefaultProfile(profile)) {
				DOM.settingsUserProfile.value = "";
			} else {
				DOM.settingsUserProfile.value = profile;
			}
			updateProfileCharCount();
		}
	} catch (err) {
		console.warn("[Panel] Failed to load user profile:", err);
	}
}

// ============================================================================
// 静态技能列表渲染
// ============================================================================

/**
 * 全局 SkillLoader 实例（延迟初始化）
 * @type {SkillLoader|null}
 */
export let staticSkillLoader = null;

/**
 * 获取或初始化 SkillLoader
 * @returns {Promise<SkillLoader>}
 */
export async function getStaticSkillLoader() {
	if (!staticSkillLoader) {
		const baseUrl = `chrome-extension://${chrome.runtime.id}`;
		staticSkillLoader = new SkillLoader(baseUrl);
		await staticSkillLoader.init();
	}
	return staticSkillLoader;
}

/**
 * 渲染静态技能列表（带启用/禁用开关）
 * 从 SkillLoader 获取所有静态技能
 */
export async function renderStaticSkillList() {
	const container = document.getElementById("static-skill-list");
	if (!container) return;

	container.innerHTML = "";

	try {
		// 从 SkillLoader 获取所有静态技能
		const loader = await getStaticSkillLoader();
		const allSkills = loader.list();

		// 获取禁用的技能列表
		const disabledSkills = await getDisabledSkills();

		if (allSkills.length === 0) {
			container.innerHTML =
				'<p class="hint">' + getMessage("noStaticSkills") + "</p>";
			return;
		}

		const MAX_VISIBLE = 5;
		const shouldCollapse = allSkills.length > MAX_VISIBLE;

		allSkills.forEach((skill, index) => {
			const isEnabled = !disabledSkills.includes(skill.name);
			const item = createStaticSkillItem(skill, isEnabled);

			if (shouldCollapse && index >= MAX_VISIBLE) {
				item.classList.add("static-skill-item-collapsible");
				item.style.display = "none";
			}

			container.appendChild(item);
		});

		if (shouldCollapse) {
			const toggleBtn = document.createElement("button");
			toggleBtn.className = "btn-expand-collapse";
			toggleBtn.dataset.expanded = "false";
			toggleBtn.innerHTML = `
				<span class="expand-text">${getMessage("showMore") || "展开更多"}</span>
				<span class="expand-count">(${allSkills.length - MAX_VISIBLE} ${getMessage("items") || "个"})</span>
				<span class="expand-icon">▼</span>
			`;

			toggleBtn.addEventListener("click", () => {
				const isExpanded = toggleBtn.dataset.expanded === "true";
				const collapsibleItems = container.querySelectorAll(
					".static-skill-item-collapsible",
				);
				const expandText = toggleBtn.querySelector(".expand-text");
				const expandIcon = toggleBtn.querySelector(".expand-icon");
				const expandCount = toggleBtn.querySelector(".expand-count");

				collapsibleItems.forEach((item) => {
					item.style.display = isExpanded ? "none" : "flex";
				});

				toggleBtn.dataset.expanded = isExpanded ? "false" : "true";
				expandText.textContent = isExpanded
					? getMessage("showMore") || "展开更多"
					: getMessage("showLess") || "收起";
				expandIcon.textContent = isExpanded ? "▼" : "▲";

				if (!isExpanded) {
					expandCount.style.display = "none";
				} else {
					expandCount.style.display = "inline";
				}
			});

			container.appendChild(toggleBtn);
		}
	} catch (err) {
		console.error("[Panel] Failed to load static skills:", err);
		container.innerHTML = `<p class="hint error">${getMessage("loadSkillError")}</p>`;
	}
}

/**
 * 创建静态技能列表项
 * @param {Object} skill - 技能对象 {name, description, tags}
 * @param {boolean} isEnabled - 是否启用
 * @returns {HTMLElement}
 */
export function createStaticSkillItem(skill, isEnabled) {
	const item = document.createElement("div");
	item.className = "static-skill-item";
	item.dataset.skillId = skill.name;

	item.innerHTML = `
    <div class="static-skill-info">
      <span class="static-skill-icon">${iconHtml("file-text", 16)}</span>
      <div class="static-skill-text">
        <span class="static-skill-name">${escapeHtml(skillDisplayText("Name", skill.name) || skill.name)}</span>
        <span class="static-skill-desc">${escapeHtml(skillDisplayText("Desc", skill.name) || skill.description || getMessage("noDesc"))}</span>
      </div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" ${isEnabled ? "checked" : ""}>
      <span class="toggle-slider"></span>
    </label>
  `;

	// 绑定开关事件
	const toggle = item.querySelector('input[type="checkbox"]');
	toggle.addEventListener("change", async (e) => {
		const enabled = e.target.checked;
		await setSkillEnabled(skill.name, enabled);
		// 刷新主界面的技能 chips
		await renderSkillChips();
		console.log(
			`[Panel] Static skill ${skill.name} ${enabled ? "enabled" : "disabled"}`,
		);
	});

	return item;
}

// ============================================================================
// 用户风格技能列表渲染
// ============================================================================

/**
 * 渲染用户风格技能列表
 */
export async function renderUserSkillList() {
	const container = document.getElementById("skill-list");
	if (!container) return;

	container.innerHTML = "";

	try {
		// 添加"添加新技能"按钮
		const addBtn = document.createElement("button");
		addBtn.className = "btn-secondary btn-add-skill";
		addBtn.innerHTML = `
			<span class="icon icon-plus" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px" aria-hidden="true"></span>
			<span>${getMessage("addNewSkill") || "添加新技能"}</span>
		`;
		addBtn.addEventListener("click", openNewSkillEditor);
		container.appendChild(addBtn);

		const userSkills = await StyleSkillStore.list();
		const disabledUserSkills = await getDisabledUserSkills();

		if (userSkills.length === 0) {
			const emptyHint = document.createElement("p");
			emptyHint.className = "hint";
			emptyHint.textContent = getMessage("noStyleSkills");
			container.appendChild(emptyHint);
			return;
		}

		const MAX_VISIBLE = 5;
		const shouldCollapse = userSkills.length > MAX_VISIBLE;

		userSkills.forEach((skill, index) => {
			const isEnabled = !disabledUserSkills.includes(skill.id);
			const item = createUserSkillItem(skill, isEnabled);

			if (shouldCollapse && index >= MAX_VISIBLE) {
				item.classList.add("user-skill-item-collapsible");
				item.style.display = "none";
			}

			container.appendChild(item);
		});

		if (shouldCollapse) {
			const toggleBtn = document.createElement("button");
			toggleBtn.className = "btn-expand-collapse";
			toggleBtn.dataset.expanded = "false";
			toggleBtn.innerHTML = `
				<span class="expand-text">${getMessage("showMore") || "展开更多"}</span>
				<span class="expand-count">(${userSkills.length - MAX_VISIBLE} ${getMessage("items") || "个"})</span>
				<span class="expand-icon">▼</span>
			`;

			toggleBtn.addEventListener("click", () => {
				const isExpanded = toggleBtn.dataset.expanded === "true";
				const collapsibleItems = container.querySelectorAll(
					".user-skill-item-collapsible",
				);
				const expandText = toggleBtn.querySelector(".expand-text");
				const expandIcon = toggleBtn.querySelector(".expand-icon");
				const expandCount = toggleBtn.querySelector(".expand-count");

				collapsibleItems.forEach((item) => {
					item.style.display = isExpanded ? "none" : "flex";
				});

				toggleBtn.dataset.expanded = isExpanded ? "false" : "true";
				expandText.textContent = isExpanded
					? getMessage("showMore") || "展开更多"
					: getMessage("showLess") || "收起";
				expandIcon.textContent = isExpanded ? "▼" : "▲";

				if (!isExpanded) {
					expandCount.style.display = "none";
				} else {
					expandCount.style.display = "inline";
				}
			});

			container.appendChild(toggleBtn);
		}
	} catch (err) {
		console.error("[Panel] Failed to render user skill list:", err);
		container.innerHTML =
			'<p class="hint error">' + getMessage("loadSkillError") + "</p>";
	}
}

/**
 * 创建用户风格技能列表项
 * @param {Object} skill - 技能对象
 * @param {boolean} isEnabled - 是否启用
 * @returns {HTMLElement}
 */
export function createUserSkillItem(skill, isEnabled) {
	const item = document.createElement("div");
	item.className = "user-skill-item";
	item.dataset.skillId = skill.id;

	const createdDate = new Date(skill.createdAt).toLocaleDateString(getUILanguage());

	item.innerHTML = `
    <div class="user-skill-info">
      <span class="user-skill-name">${escapeHtml(skill.name)}</span>
      <span class="user-skill-mood">${escapeHtml(skill.mood || getMessage("noDesc"))}</span>
      <div class="user-skill-meta">
        <span class="user-skill-domain">${escapeHtml(skill.sourceDomain || "unknown")}</span>
        <span class="user-skill-date">${createdDate}</span>
      </div>
    </div>
    <div class="user-skill-actions">
      <label class="toggle-switch toggle-switch-small" title="${isEnabled ? getMessage("enabled") : getMessage("disabled")}">
        <input type="checkbox" ${isEnabled ? "checked" : ""}>
        <span class="toggle-slider"></span>
      </label>
      <button class="btn-icon-small" data-action="export" title="${getMessage("exportSkill")}">${iconHtml("download", 13)}</button>
      <button class="btn-icon-small" data-action="edit" title="${getMessage("edit")}">${iconHtml("pencil", 13)}</button>
      <button class="btn-icon-small" data-action="delete" title="${getMessage("delete")}">${iconHtml("trash", 13)}</button>
    </div>
  `;

	// 绑定开关事件
	const toggle = item.querySelector('input[type="checkbox"]');
	toggle.addEventListener("change", async (e) => {
		const enabled = e.target.checked;
		await setUserSkillEnabled(skill.id, enabled);
		// 更新 tooltip
		toggle.parentElement.title = enabled
			? getMessage("enabled")
			: getMessage("disabled");
		// 刷新主界面的技能 chips
		await renderSkillChips();
		console.log(
			`[Panel] User skill ${skill.id} ${enabled ? "enabled" : "disabled"}`,
		);
	});

	// 绑定按钮事件
	const editBtn = item.querySelector('[data-action="edit"]');
	const deleteBtn = item.querySelector('[data-action="delete"]');

	editBtn.addEventListener("click", () => openSkillEditor(skill));
	item
		.querySelector('[data-action="export"]')
		.addEventListener("click", () => exportUserSkill(skill));
	deleteBtn.addEventListener("click", () => deleteSkillWithConfirmation(skill));

	// 点击整个项目也可以编辑
	item
		.querySelector(".user-skill-info")
		.addEventListener("click", () => openSkillEditor(skill));

	return item;
}

/**
 * 导出用户风格技能为 .md 文件
 * @param {Object} skill - 技能索引条目
 */
export async function exportUserSkill(skill) {
	try {
		const content = (await StyleSkillStore.load(skill.id)) || "";
		const css = await StyleSkillStore.loadCss(skill.id);
		const blob = new Blob([formatSkillFile(skill, content, css)], {
			type: "text/markdown",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${skill.name.replace(/[\\/:*?"<>|]/g, "_")}.md`;
		link.click();
		URL.revokeObjectURL(url);
	} catch (err) {
		console.error("[Panel] Failed to export skill:", err);
		showError(getMessage("exportSkillFailed"));
	}
}

/**
 * 导入 .md 技能文件（可多选），每个文件作为新技能保存
 * @param {Event} event - 文件选择事件
 */
export async function handleImportSkills(event) {
	const files = [...event.target.files];
	event.target.value = "";
	const status = document.getElementById("skill-import-status");
	let imported = 0;
	const failed = [];

	for (const file of files) {
		try {
			if (file.size > MAX_SKILL_FILE_BYTES) throw new Error("too large");
			const skill = parseSkillFile(
				await file.text(),
				file.name.replace(/\.(md|txt)$/i, ""),
			);
			await StyleSkillStore.save(
				crypto.randomUUID().slice(0, 8),
				skill.name,
				skill.mood,
				skill.sourceDomain || "import",
				skill.content,
				skill.cssContent
					? { contentType: "mixed", cssContent: skill.cssContent }
					: {},
			);
			imported++;
		} catch (err) {
			console.warn("[Panel] Skill import failed:", file.name, err);
			failed.push(file.name);
		}
	}

	status.textContent = [
		imported ? formatMessage("importSkillsDone", { count: imported }) : "",
		failed.length
			? formatMessage("importSkillsFailed", { files: failed.join(", ") })
			: "",
	]
		.filter(Boolean)
		.join(" ");
	status.classList.remove("hidden", "success", "error");
	status.classList.add(failed.length ? "error" : "success");

	await renderUserSkillList();
	await renderSkillChips();
}

/**
 * 打开技能编辑器模态框
 * @param {Object} skill - 技能对象
 */
export async function openSkillEditor(skill) {
	// 加载技能内容
	const content = await StyleSkillStore.load(skill.id);

	// 创建模态框
	const modal = document.createElement("div");
	modal.className = "skill-editor-modal";
	modal.innerHTML = `
    <div class="modal-content skill-editor-content">
      <div class="modal-header">
        <h3>${getMessage("editStyleSkill")}</h3>
        <button class="modal-close-btn" title="${getMessage("close")}">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="edit-skill-name">${getMessage("name")}</label>
          <input type="text" id="edit-skill-name" value="${escapeHtml(skill.name)}" data-i18n-placeholder="styleNamePlaceholder">
        </div>
        <div class="form-group">
          <label for="edit-skill-mood">${getMessage("desc")}</label>
          <input type="text" id="edit-skill-mood" value="${escapeHtml(skill.mood || "")}" data-i18n-placeholder="styleDescPlaceholder">
        </div>
        <div class="form-group">
          <label for="edit-skill-content">${getMessage("content")}</label>
          <textarea id="edit-skill-content" class="settings-textarea skill-editor-textarea" data-i18n-placeholder="skillContentPlaceholder">${escapeHtml(content || "")}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-cancel">${getMessage("cancel")}</button>
        <button class="btn btn-primary">${getMessage("save")}</button>
      </div>
    </div>
  `;

	// 绑定事件
	const closeBtn = modal.querySelector(".modal-close-btn");
	const cancelBtn = modal.querySelector(".btn-cancel");
	const saveBtn = modal.querySelector(".btn-primary");

	const closeModal = () => modal.remove();

	closeBtn.addEventListener("click", closeModal);
	cancelBtn.addEventListener("click", closeModal);
	modal.addEventListener("click", (e) => {
		if (e.target === modal) closeModal();
	});

	saveBtn.addEventListener("click", async () => {
		const nameInput = modal.querySelector("#edit-skill-name");
		const moodInput = modal.querySelector("#edit-skill-mood");
		const contentInput = modal.querySelector("#edit-skill-content");

		const name = nameInput.value.trim();
		const mood = moodInput.value.trim();
		const newContent = contentInput.value.trim();

		if (!name) {
			nameInput.focus();
			return;
		}

		try {
			saveBtn.disabled = true;
			saveBtn.textContent = getMessage("saving");

			await StyleSkillStore.save(
				skill.id,
				name,
				mood,
				skill.sourceDomain,
				newContent,
			);

			closeModal();
			await renderUserSkillList();
			await renderSkillChips();
			console.log("[Panel] Skill updated:", name);
		} catch (err) {
			console.error("[Panel] Failed to save skill:", err);
			saveBtn.disabled = false;
			saveBtn.textContent = getMessage("save");
			showError(`${getMessage("saveFailed")}: ${err.message}`);
		}
	});

	document.body.appendChild(modal);
}

/**
 * 打开新建技能编辑器模态框
 */
export function openNewSkillEditor() {
	// 创建模态框
	const modal = document.createElement("div");
	modal.className = "skill-editor-modal";
	modal.innerHTML = `
    <div class="modal-content skill-editor-content">
      <div class="modal-header">
        <h3>${getMessage("newStyleSkill") || "新建风格技能"}</h3>
        <button class="modal-close-btn" title="${getMessage("close")}">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="new-skill-name">${getMessage("name")}</label>
          <input type="text" id="new-skill-name" data-i18n-placeholder="styleNamePlaceholder">
        </div>
        <div class="form-group">
          <label for="new-skill-mood">${getMessage("desc")}</label>
          <input type="text" id="new-skill-mood" data-i18n-placeholder="styleDescPlaceholder">
        </div>
        <div class="form-group">
          <label for="new-skill-content">${getMessage("content")}</label>
          <textarea id="new-skill-content" class="settings-textarea skill-editor-textarea" data-i18n-placeholder="skillContentPlaceholder"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-cancel">${getMessage("cancel")}</button>
        <button class="btn btn-primary">${getMessage("save")}</button>
      </div>
    </div>
  `;

	// 绑定事件
	const closeBtn = modal.querySelector(".modal-close-btn");
	const cancelBtn = modal.querySelector(".btn-cancel");
	const saveBtn = modal.querySelector(".btn-primary");

	const closeModal = () => modal.remove();

	closeBtn.addEventListener("click", closeModal);
	cancelBtn.addEventListener("click", closeModal);
	modal.addEventListener("click", (e) => {
		if (e.target === modal) closeModal();
	});

	saveBtn.addEventListener("click", async () => {
		const nameInput = modal.querySelector("#new-skill-name");
		const moodInput = modal.querySelector("#new-skill-mood");
		const contentInput = modal.querySelector("#new-skill-content");

		const name = nameInput.value.trim();
		const mood = moodInput.value.trim();
		const newContent = contentInput.value.trim();

		if (!name) {
			nameInput.focus();
			return;
		}

		try {
			saveBtn.disabled = true;
			saveBtn.textContent = getMessage("saving");

			// 生成新的技能 ID
			const newId = crypto.randomUUID().slice(0, 8);
			const currentDomain = stateManager.get("currentDomain") || "manual";

			await StyleSkillStore.save(
				newId,
				name,
				mood,
				currentDomain,
				newContent,
			);

			closeModal();
			await renderUserSkillList();
			await renderSkillChips();
			console.log("[Panel] New skill created:", name);
		} catch (err) {
			console.error("[Panel] Failed to create skill:", err);
			saveBtn.disabled = false;
			saveBtn.textContent = getMessage("save");
			showError(`${getMessage("saveFailed")}: ${err.message}`);
		}
	});

	document.body.appendChild(modal);

	// 自动聚焦到名称输入框
	const nameInput = modal.querySelector("#new-skill-name");
	if (nameInput) {
		nameInput.focus();
	}
}

/**
 * 更新用户画像字数统计
 */
export function updateProfileCharCount() {
	if (DOM.settingsUserProfile && DOM.profileCharCount) {
		const count = DOM.settingsUserProfile.value.length;
		DOM.profileCharCount.textContent = formatMessage("charCount", { count });
	}
}

/**
 * 处理保存用户画像
 */
export async function handleSaveUserProfile() {
	if (!DOM.settingsUserProfile) return;

	const content = DOM.settingsUserProfile.value.trim();

	if (!DOM.saveProfileBtn) return;
	DOM.saveProfileBtn.disabled = true;
	showProfileStatus(getMessage("saving"), "loading");

	try {
		await runUpdateUserProfile(content);
		showProfileStatus("✓ " + getMessage("profileSaved"), "success");
	} catch (err) {
		console.error("[Panel] Failed to save user profile:", err);
		showProfileStatus(formatMessage("profileSaveFailed", { error: err.message }), "error");
	} finally {
		DOM.saveProfileBtn.disabled = false;
	}
}

/**
 * 显示用户画像状态消息
 * @param {string} message - 状态消息
 * @param {string} type - 消息类型: 'success' | 'error' | 'loading'
 */
export function showProfileStatus(message, type) {
	if (!DOM.profileStatus) return;

	DOM.profileStatus.textContent = message;
	// 移除所有状态类
	DOM.profileStatus.classList.remove("hidden", "success", "error", "loading");
	// 添加当前状态类
	DOM.profileStatus.classList.add(type, "status-message");

	// 成功消息 2 秒后自动淡出
	if (type === "success") {
		setTimeout(() => {
			DOM.profileStatus.classList.add("fade-out");
			setTimeout(() => {
				DOM.profileStatus.classList.add("hidden");
				DOM.profileStatus.classList.remove("fade-out", "success");
			}, 300);
		}, 2000);
	}
}

/**
 * 处理验证连接按钮点击
 */
export async function handleVerifyConnection() {
	const settings = readSettingsForm();

	if (!settings.apiKey) {
		showConnectionStatus(getMessage("enterApiKey"), "error");
		return false;
	}

	DOM.verifyConnectionBtn.disabled = true;
	DOM.verifyConnectionBtn.classList.add("loading");
	showConnectionStatus(getMessage("verifyingConnection"), "loading");

	try {
		const result = await validateConnection(
			settings.apiKey,
			settings.apiBase,
			settings.model,
		);

		if (!result.ok) {
			let msg = getMessage("connectionFailed");
			if (result.status === 401) msg = getMessage("apiKeyInvalid");
			else if (result.status === 403) msg = getMessage("accessDenied");
			else if (result.status === 404) msg = getMessage("errModelNotFound");
			else if (result.status === 402) msg = getMessage("errInsufficientBalance");
			else if (result.error) msg = result.error;

			showConnectionStatus(`✗ ${msg}`, "error");
			AppState.apiKeyStatus = "invalid";
			return false;
		}

		// 填写了视觉模型时一并验证
		if (settings.visionModel) {
			const vision = await validateConnection(
				settings.visionApiKey || settings.apiKey,
				settings.visionApiBase || settings.apiBase,
				settings.visionModel,
			);
			if (!vision.ok) {
				showConnectionStatus(`✗ ${getMessage("visionVerifyFailed")}`, "error");
				return false;
			}
		}

		// 保存所有设置（含视觉模型）
		await saveSettings(settings);
		AppState.apiKeyStatus = "valid";
		settingsDirty = false;
		showConnectionStatus("✓ " + getMessage("connectionSuccess"), "success");
		showSaveSuccess();
		return true;
	} catch (err) {
		showConnectionStatus(`✗ ${getMessage("connectionError")}: ${err.message}`, "error");
		return false;
	} finally {
		DOM.verifyConnectionBtn.disabled = false;
		DOM.verifyConnectionBtn.classList.remove("loading");
	}
}

/**
 * 显示连接状态
 * @param {string} message - 状态消息
 * @param {'success' | 'error' | 'loading'} type - 状态类型
 */
export function showConnectionStatus(message, type) {
	if (!DOM.connectionStatus) return;

	DOM.connectionStatus.textContent = message;
	// 移除所有状态类
	DOM.connectionStatus.classList.remove(
		"hidden",
		"success",
		"error",
		"loading",
	);
	// 添加当前状态类
	DOM.connectionStatus.classList.add(type, "status-message");

	// 移除内联样式 - CSS 已处理样式
	DOM.connectionStatus.style.color = "";
	DOM.connectionStatus.style.backgroundColor = "";

	// 成功消息 2 秒后自动淡出
	if (type === "success") {
		DOM.connectionStatus.classList.add("success");
		setTimeout(() => {
			DOM.connectionStatus.classList.add("fade-out");
			setTimeout(() => {
				DOM.connectionStatus.classList.add("hidden");
				DOM.connectionStatus.classList.remove("fade-out", "success");
			}, 300);
		}, 2000);
	}
}

/**
 * 加载存储用量
 */
export async function loadStorageUsage() {
	try {
		// 动态导入 session 模块
		const session = await import("../session.js");

		// 获取存储用量
		const usage = await session.getStorageUsage();

		// 更新进度条
		const progressBar = document.getElementById("storage-progress");
		if (progressBar) {
			progressBar.style.width = `${usage.percent}%`;

			// 根据使用率设置颜色
			if (usage.percent >= 90) {
				progressBar.style.backgroundColor = "var(--color-error)";
			} else if (usage.percent >= 70) {
				progressBar.style.backgroundColor = "var(--color-warning)";
			} else {
				progressBar.style.backgroundColor = "var(--color-primary)";
			}
		}

		// 更新百分比文本
		const percentText = document.getElementById("storage-percent");
		if (percentText) {
			percentText.textContent = `${usage.percent}%`;
		}

		// 更新详细文本
		const detailText = document.getElementById("storage-detail");
		if (detailText) {
			const usedMB = (usage.bytes / (1024 * 1024)).toFixed(2);
			const maxMB = (usage.maxBytes / (1024 * 1024)).toFixed(0);
			detailText.textContent = `${usedMB} MB / ${maxMB} MB`;
		}
	} catch (error) {
		console.error("[Panel] Failed to load storage usage:", error);

		// 显示错误状态
		const percentText = document.getElementById("storage-percent");
		if (percentText) {
			percentText.textContent = "--";
		}

		const detailText = document.getElementById("storage-detail");
		if (detailText) {
			detailText.textContent = getMessage("getStorageFailed");
		}
	}
}

/**
 * 处理清理历史数据按钮点击
 */
export async function handleClearStorage() {
	// 确认对话框
	const confirmed = await showConfirmModal({
		title: getMessage("clearHistory"),
		message: getMessage("clearHistoryConfirm"),
		confirmText: getMessage("clearHistory"),
	});

	if (!confirmed) return;

	try {
		// 动态导入 session 模块
		const session = await import("../session.js");

		// 显示加载状态
		const clearBtn = document.getElementById("clear-storage-btn");
		if (clearBtn) {
			clearBtn.disabled = true;
			clearBtn.textContent = getMessage("clearing");
		}

		// 执行清理
		await session.cleanupStorage();

		// 刷新存储用量显示
		await loadStorageUsage();

		// 显示成功提示
		showSaveSuccess(getMessage("clearHistorySuccess"));
	} catch (error) {
		console.error("[Panel] Failed to clear storage:", error);
		showError(formatMessage("clearStorageFailed", { error: error.message }));
	} finally {
		// 恢复按钮状态
		const clearBtn = document.getElementById("clear-storage-btn");
		if (clearBtn) {
			clearBtn.disabled = false;
			clearBtn.textContent = getMessage("clearHistory");
		}
	}
}

