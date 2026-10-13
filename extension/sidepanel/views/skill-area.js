/**
 * StyleSwift - Side Panel skill-area
 * 从 panel.js 拆分（行为不变）
 */

import { formatMessage, getLocale, getMessage } from "../i18n.js";
import { AppState, DOM, stateManager } from "../panel-state.js";
import { addMessageToContainer, completeToolCard, createStreamingRenderer, createSubAgentPanel, createToolCard, finalizeToolCardGroup, renderAssistantMessageContainer, renderUserMessage, setHasActiveStyles, setProcessingState, showAgentError, showConfirmationOverlay, showError, showTurnUsage, todoCardManager, toolCardManager } from "../panel.js";
import { StyleSkillStore } from "../style-skill.js";
import { escapeHtml, iconHtml } from "../ui/dom-utils.js";
import { renderUserSkillList } from "./settings.js";
import { handleUndoStyleClick, scopeHintText, scopeMismatch } from "./top-bar.js";

// ============================================================================
// 技能快捷区逻辑
// ============================================================================

/**
 * 静态技能的本地化显示名/描述（键名 skillName_<id>，非字母数字替换为 _）
 * @param {"Name"|"Desc"} kind
 * @param {string} id - 静态技能名
 * @returns {string|null} 无对应文案时返回 null
 */
export function skillDisplayText(kind, id) {
	const key = `skill${kind}_${id.replace(/[^A-Za-z0-9]/g, "_")}`;
	const text = getMessage(key);
	return text && text !== key ? text : null;
}

/**
 * Built-in skill definitions
 * These are static skills bundled with the extension
 */
export const BUILT_IN_SKILLS = [
	// 实用预设：仅提示词，无对应技能文件
	...["Dark", "Reading", "LargeText", "Focus"].map((key) => ({
		id: `preset-${key.toLowerCase()}`,
		name: getMessage(`preset${key}Name`),
		desc: getMessage(`preset${key}Desc`),
		icon: "",
		prompt: getMessage(`preset${key}Prompt`),
	})),
	// 风格预设：id 为静态技能名（存储与 load_skill 使用，不可改名）
	...[
		"Cozy style",
		"Windows 9x Retro",
		"BauhausStyle",
		"cyberpunk-2077",
		"MatrixTerminal",
		"Newspaper Style",
	].map((id) => ({
		id,
		name: skillDisplayText("Name", id),
		desc: skillDisplayText("Desc", id),
		icon: "",
		prompt: formatMessage("applyStyleSkillPrompt", { skill: id }),
	})),
];

/**
 * Initialize skill chips area
 */
export function initSkillArea() {
	// Bind toggle event
	if (DOM.skillAreaToggle) {
		DOM.skillAreaToggle.addEventListener("click", toggleSkillArea);
	}

	// Render skill chips
	renderSkillChips();
}

/**
 * Toggle skill area collapsed state
 */
export function toggleSkillArea() {
	if (DOM.skillArea) {
		DOM.skillArea.classList.toggle("collapsed");
	}
}

/**
 * Set skill area visibility
 * Design: Skills area is shown only for new/empty sessions, hidden when agent starts processing
 * @param {boolean} visible - Whether to show the skill area
 */
export function setSkillAreaVisible(visible) {
	if (!DOM.skillArea) return;

	if (visible) {
		DOM.skillArea.classList.remove("hidden");
	} else {
		DOM.skillArea.classList.add("hidden");
	}
	console.log(`[Panel] Skill area ${visible ? "shown" : "hidden"}`);
}

/**
 * Storage key for disabled static skills
 */
export const DISABLED_SKILLS_KEY = "settings:disabledSkills";

/**
 * Storage key for disabled user skills
 */
export const DISABLED_USER_SKILLS_KEY = "settings:disabledUserSkills";

/**
 * Default enabled static skills (all others are disabled by default)
 */
export const DEFAULT_ENABLED_SKILLS = [
	"frontend-design", "audit", "colorize",
	"Cozy style", "Windows 9x Retro", "BauhausStyle",
	"cyberpunk-2077", "MatrixTerminal", "Newspaper Style",
];

/**
 * All known static skill names (must match skill-loader.js knownFiles)
 */
export const ALL_STATIC_SKILLS = [
	"frontend-design",
	"audit",
	"colorize",
	"polish",
	"normalize",
	"distill",
	"delight",
	"critique",
	"animate",
	"adapt",
	"bolder",
	"Cozy style",
	"Windows 9x Retro",
	"BauhausStyle",
	"cyberpunk-2077",
	"MatrixTerminal",
	"Newspaper Style",
];

/**
 * Get list of disabled static skill IDs
 * Returns a default disabled list when no user preference is stored yet
 * @returns {Promise<string[]>}
 */
export async function getDisabledSkills() {
	const INIT_KEY = "settings:disabledSkillsInitialized";
	const { [DISABLED_SKILLS_KEY]: disabled, [INIT_KEY]: initialized } =
		await chrome.storage.local.get([DISABLED_SKILLS_KEY, INIT_KEY]);

	// First time or migrated from old code (no init flag yet) — apply defaults
	if (!initialized) {
		const defaultDisabled = ALL_STATIC_SKILLS.filter(
			(name) => !DEFAULT_ENABLED_SKILLS.includes(name),
		);
		await chrome.storage.local.set({
			[DISABLED_SKILLS_KEY]: defaultDisabled,
			[INIT_KEY]: true,
		});
		return defaultDisabled;
	}
	return disabled;
}

/**
 * Get list of disabled user skill IDs
 * @returns {Promise<string[]>}
 */
export async function getDisabledUserSkills() {
	const { [DISABLED_USER_SKILLS_KEY]: disabled = [] } =
		await chrome.storage.local.get(DISABLED_USER_SKILLS_KEY);
	return disabled;
}

/**
 * Toggle a static skill's enabled state
 * @param {string} skillId - Skill ID to toggle
 * @param {boolean} enabled - Whether to enable the skill
 */
export async function setSkillEnabled(skillId, enabled) {
	const disabled = await getDisabledSkills();
	if (enabled) {
		// Remove from disabled list
		const filtered = disabled.filter((id) => id !== skillId);
		await chrome.storage.local.set({ [DISABLED_SKILLS_KEY]: filtered });
	} else {
		// Add to disabled list
		if (!disabled.includes(skillId)) {
			disabled.push(skillId);
			await chrome.storage.local.set({ [DISABLED_SKILLS_KEY]: disabled });
		}
	}
}

/**
 * Toggle a user skill's enabled state
 * @param {string} skillId - User skill ID to toggle
 * @param {boolean} enabled - Whether to enable the skill
 */
export async function setUserSkillEnabled(skillId, enabled) {
	const disabled = await getDisabledUserSkills();
	if (enabled) {
		// Remove from disabled list
		const filtered = disabled.filter((id) => id !== skillId);
		await chrome.storage.local.set({ [DISABLED_USER_SKILLS_KEY]: filtered });
	} else {
		// Add to disabled list
		if (!disabled.includes(skillId)) {
			disabled.push(skillId);
			await chrome.storage.local.set({ [DISABLED_USER_SKILLS_KEY]: disabled });
		}
	}
}

/**
 * Render skill chips (built-in + user skills)
 * Respects disabled skills setting
 * Recently used skills are shown first
 */
export async function renderSkillChips() {
	if (!DOM.skillChips) return;

	// Clear existing chips
	DOM.skillChips.innerHTML = "";

	// Get disabled skills
	const disabledSkills = await getDisabledSkills();
	const disabledUserSkills = await getDisabledUserSkills();

	// Get recently used skills
	const recentSkills = await StyleSkillStore.getRecent();
	// 用于排序：所有最近使用的技能（最多5个）
	const allRecentIds = new Set(recentSkills.map((r) => r.id));
	// 用于显示标签：只最近一个使用的技能
	const mostRecentId = recentSkills.length > 0 ? recentSkills[0].id : null;

	// Collect all skills with their recency info
	const allSkillData = [];

	// 1. Collect built-in skills (filter out disabled)
	for (const skill of BUILT_IN_SKILLS) {
		if (disabledSkills.includes(skill.id)) continue;
		const recentInfo = recentSkills.find(
			(r) => r.id === skill.id && r.type === "built-in",
		);
		allSkillData.push({
			skill,
			type: "built-in",
			isRecent: mostRecentId === skill.id,
			isInRecentList: allRecentIds.has(skill.id),
			timestamp: recentInfo?.timestamp || 0,
		});
	}

	// 2. Collect user skills (filter out disabled)
	try {
		const userSkills = await StyleSkillStore.list();

		for (const skill of userSkills) {
			if (disabledUserSkills.includes(skill.id)) continue;
			const recentInfo = recentSkills.find(
				(r) => r.id === skill.id && r.type === "user",
			);
			allSkillData.push({
				skill,
				type: "user",
				isRecent: mostRecentId === skill.id,
				isInRecentList: allRecentIds.has(skill.id),
				timestamp: recentInfo?.timestamp || 0,
			});
		}
	} catch (err) {
		console.warn("[Panel] Failed to load user skills:", err);
	}

	// If no skills at all, hide the skill area
	if (allSkillData.length === 0) {
		setSkillAreaVisible(false);
		return;
	}

	// 3. Sort: recently used first (by timestamp desc), then others
	allSkillData.sort((a, b) => {
		// Recent skills first (检查是否在最近列表中，用于排序)
		if (a.isInRecentList !== b.isInRecentList) {
			return a.isInRecentList ? -1 : 1;
		}
		// Among recent, sort by timestamp desc
		if (a.isInRecentList && b.isInRecentList) {
			return b.timestamp - a.timestamp;
		}
		// Non-recent skills: keep original order
		return 0;
	});

	// 4. Render sorted skills
	for (const data of allSkillData) {
		let chip;
		if (data.type === "built-in") {
			chip = createBuiltInChip(data.skill, data.isRecent);
		} else {
			chip = createUserSkillChip(data.skill, data.isRecent);
		}
		DOM.skillChips.appendChild(chip);
	}
}

/**
 * Handle skill chip click - send skill prompt to agent
 * @param {Object} skill - Skill object with id, name, type (built-in/user), prompt
 */
export async function handleSkillChipClick(skill) {
	console.log("[Panel] Skill chip clicked:", skill.name);

	// Prevent if agent is already running - queue the skill prompt instead
	if (AppState.agentStatus === "running") {
		console.log("[Panel] Agent is running, queuing skill prompt for next iteration");
		const prompt = skill.prompt || `Apply my "${skill.name}" style`;

		// Queue the skill prompt
		(async () => {
			try {
				const { queueUserMessage } = await import("../agent/agent-loop.js");
				queueUserMessage(prompt);

				// Render user message showing skill name (silently queued)
				const userMessageEl = renderUserMessage(`✨ ${skill.name}`, {
					turn: 0,
					showRewind: false,
				});
				addMessageToContainer(userMessageEl);
			} catch (err) {
				console.error("[Panel] Failed to queue skill:", err);
			}
		})();
		return;
	}

	// Prevent on restricted pages
	if (AppState.pageStatus === "restricted") {
		console.warn("[Panel] Page is restricted, cannot apply skill");
		return;
	}
	if (scopeMismatch) {
		showError(getMessage("scopeMismatchBlocked"));
		return;
	}

	const prompt = skill.prompt || `Apply my "${skill.name}" style`;

	// Mark conversation as started
	stateManager.set("hasConversationStarted", true);

	// Hide skill area
	setSkillAreaVisible(false);

	// Remove empty state if exists
	const emptyState = DOM.messagesContainer?.querySelector(".chat-area-empty");
	if (emptyState) {
		emptyState.remove();
	}

	// Render user message showing skill name
	const displayMessage = `✨ ${skill.name}`;
	const userMessageEl = renderUserMessage(displayMessage, {
		turn: 1,
		showRewind: false,
	});
	addMessageToContainer(userMessageEl);

	// Set processing state
	setProcessingState(true);

	// Clear previous todo display
	todoCardManager.clear();

	// Create assistant message bubble for streaming
	let curAssistantEl = renderAssistantMessageContainer();
	let curBubble = curAssistantEl.querySelector(".message-bubble");
	let curReasoningBlock = curAssistantEl.querySelector(".reasoning-block");
	let curReasoningContentEl =
		curAssistantEl.querySelector(".reasoning-content");
	let curReasoningHeader = curAssistantEl.querySelector(".reasoning-header");
	let curReasoningTitleEl = curAssistantEl.querySelector(".reasoning-title");
	addMessageToContainer(curAssistantEl);

	// Create streaming renderer
	let streamingRenderer = createStreamingRenderer(curBubble);
	let reasoningRenderer = createStreamingRenderer(curReasoningContentEl, {
		showCursor: true,
		autoScroll: true,
	});
	let reasoningCharCount = 0;

	// Tool input map for tool cards
	const toolInputMap = new Map();
	const subAgentPanelMap = new Map();
	let applyStylesCount = 0;

	function finalizeCurrentBubble() {
		if (reasoningCharCount > 0) {
			reasoningRenderer.finish();
			curReasoningBlock.classList.add("finished", "collapsed");
			curReasoningHeader.setAttribute("aria-expanded", "false");
			if (curReasoningTitleEl) {
				curReasoningTitleEl.textContent = formatMessage("thinkingProcess", {
					count: reasoningCharCount,
				});
			}
		}
		streamingRenderer.finish();
		finalizeToolCardGroup();
	}

	function createNewAssistantBubble() {
		finalizeCurrentBubble();
		curAssistantEl = renderAssistantMessageContainer();
		curBubble = curAssistantEl.querySelector(".message-bubble");
		curReasoningBlock = curAssistantEl.querySelector(".reasoning-block");
		curReasoningContentEl = curAssistantEl.querySelector(".reasoning-content");
		curReasoningHeader = curAssistantEl.querySelector(".reasoning-header");
		curReasoningTitleEl = curAssistantEl.querySelector(".reasoning-title");
		addMessageToContainer(curAssistantEl);
		streamingRenderer = createStreamingRenderer(curBubble);
		reasoningRenderer = createStreamingRenderer(curReasoningContentEl, {
			showCursor: true,
			autoScroll: true,
		});
		reasoningCharCount = 0;
	}

	try {
		const { agentLoop } = await import("../agent/agent-loop.js");

		// Record skill as recently used
		await StyleSkillStore.recordUsage(skill.id, skill.type);

		const uiCallbacks = {
			onNewIteration: () => {
				createNewAssistantBubble();
			},
			appendReasoning: (delta) => {
				if (!delta) return;
				if (reasoningCharCount === 0) {
					curReasoningBlock.classList.add("visible");
				}
				reasoningCharCount += delta.length;
				reasoningRenderer.appendText(delta);
			},
			appendText: (delta) => {
				streamingRenderer.appendText(delta);
			},
			showToolCall: (block) => {
				if (block.type === "tool_use") {
					toolInputMap.set(block.id, block.input);
					createToolCard(block.id, block.name);
					if (block.name === "apply_styles" && block.input?.mode === "save") {
						applyStylesCount++;
					}
				}
			},

			/**
			 * 子智能体开始执行时创建内嵌活动面板，返回子 uiCallbacks
			 */
			onTaskStart: (taskId, input) => {
				const panel = createSubAgentPanel(taskId, input);
				subAgentPanelMap.set(taskId, panel);
				return panel.uiCallbacks;
			},

			/**
			 * 显示工具执行中状态
			 */
			showToolExecuting: (toolName) => {
				console.log("[Panel] Tool executing:", toolName);
			},

			/**
			 * 显示工具执行结果
			 */
			showToolResult: (toolId, output) => {
				// 如果有对应的子智能体面板，先完成它
				const subPanel = subAgentPanelMap.get(toolId);
				if (subPanel) {
					subPanel.uiCallbacks.finalize();
					subAgentPanelMap.delete(toolId);
				}
				const card = toolCardManager.cardMap.get(toolId);
				const toolName = card?.dataset.toolName || null;
				const toolInput = toolInputMap.get(toolId) ?? null;
				completeToolCard(toolId, toolName, toolInput, output);
			},

			onTodoUpdate: (todos, meta) => {
				todoCardManager.updateTodos(todos, meta?.awaitingConfirmation);
			},
		};

		const response = await agentLoop(prompt, uiCallbacks);

		// Finalize reasoning display
		if (reasoningCharCount > 0) {
			reasoningRenderer.finish();
			curReasoningBlock.classList.add("finished");
			curReasoningBlock.classList.add("collapsed");
			curReasoningHeader.setAttribute("aria-expanded", "false");
			if (curReasoningTitleEl) {
				curReasoningTitleEl.textContent = formatMessage("thinkingProcess", {
					count: reasoningCharCount,
				});
			}
		}

		streamingRenderer.finish();
		finalizeToolCardGroup();
		setProcessingState(false);
		showTurnUsage();

		if (applyStylesCount > 0) {
			showConfirmationOverlay({
				applyCount: applyStylesCount,
				scopeText: scopeHintText(),
				onConfirm: () => {
					console.log("[Panel] Styles confirmed from skill");
				},
				onUndo: handleUndoStyleClick,
				onUndoAll: async () => {
					try {
						const { executeTool } = await import("../tools.js");
						await executeTool("apply_styles", { mode: "rollback_all" });
						setHasActiveStyles(false);
						console.log("[Panel] Rolled back all styles");
					} catch (error) {
						console.error("[Panel] Rollback all failed:", error);
						showError(getMessage("undoStyleFailed"));
					}
				},
			});
		}

		console.log("[Panel] Skill applied, agent response:", response);
	} catch (error) {
		console.error("[Panel] Skill application error:", error);
		streamingRenderer.finish();
		finalizeToolCardGroup();
		setProcessingState(false);
		showTurnUsage();

		showAgentError(error, () => handleSkillChipClick(skill));
	}
}

/**
 * Create a built-in skill chip (filled style)
 * @param {Object} skill - Skill object with id, name, icon, prompt
 * @param {boolean} isRecent - Whether this skill was recently used
 * @returns {HTMLElement}
 */
export function createBuiltInChip(skill, isRecent = false) {
	const chip = document.createElement("div");
	chip.className = "skill-chip built-in" + (isRecent ? " recent" : "");
	chip.dataset.skillId = skill.id;
	chip.dataset.skillType = "built-in";
	chip.dataset.prompt = skill.prompt;

	chip.innerHTML = `
    ${isRecent ? '<span class="skill-recent-badge">' + getMessage("recentBadge") + "</span>" : ""}
    ${skill.icon ? `<span class="skill-icon">${skill.icon}</span>` : ""}
    <span class="skill-name">${skill.name}</span>
  `;

	chip.addEventListener("click", () =>
		handleSkillChipClick({ ...skill, type: "built-in" }),
	);

	return chip;
}

/**
 * Create a user skill chip (outlined style with source domain)
 * Design ref: §16.3 ② - 用户技能支持长按弹出菜单：应用 / 查看详情 / 删除
 * @param {Object} skill - Skill object from StyleSkillStore
 * @param {boolean} isRecent - Whether this skill was recently used
 * @returns {HTMLElement}
 */
export function createUserSkillChip(skill, isRecent = false) {
	const chip = document.createElement("div");
	chip.className = "skill-chip user-skill" + (isRecent ? " recent" : "");
	chip.dataset.skillId = skill.id;
	chip.dataset.skillType = "user";

	// Generate prompt text
	const prompt = `Apply my "${skill.name}" style`;
	chip.dataset.prompt = prompt;

	chip.innerHTML = `
    ${isRecent ? '<span class="skill-recent-badge">' + getMessage("recentBadge") + "</span>" : ""}
    <span class="skill-name">${skill.name}</span>
  `;

	// Click handler (short tap)
	chip.addEventListener("click", () =>
		handleSkillChipClick({
			id: skill.id,
			name: skill.name,
			type: "user",
			prompt,
		}),
	);

	// Long press handler for context menu
	let longPressTimer = null;

	chip.addEventListener("mousedown", (e) => {
		longPressTimer = setTimeout(() => {
			showSkillContextMenu(e, skill);
		}, 500); // 500ms threshold for long press
	});

	chip.addEventListener("mouseup", () => {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	});

	chip.addEventListener("mouseleave", () => {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	});

	// Context menu (right-click)
	chip.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		showSkillContextMenu(e, skill);
	});

	return chip;
}

// ============================================================================
// 技能上下文菜单
// ============================================================================

/**
 * Context menu instance for user skills
 */
export let skillContextMenu = null;

/**
 * Show context menu for user skill
 * Design ref: §16.3 ② - 长按/右键弹出菜单：应用 / 查看详情 / 删除
 * @param {Event} e - Mouse event
 * @param {Object} skill - Skill object
 */
export function showSkillContextMenu(e, skill) {
	// Remove existing menu if any
	hideSkillContextMenu();

	// Create context menu
	const menu = document.createElement("div");
	menu.className = "skill-context-menu";
	menu.innerHTML = `
    <div class="context-menu-item" data-action="apply">
      <span class="menu-icon">${iconHtml("sparkles", 14)}</span>
      <span>${getMessage("apply")}</span>
    </div>
    <div class="context-menu-item" data-action="view">
      <span class="menu-icon">${iconHtml("file-text", 14)}</span>
      <span>${getMessage("viewDetails")}</span>
    </div>
    <div class="context-menu-item danger" data-action="delete">
      <span class="menu-icon">${iconHtml("trash", 14)}</span>
      <span>${getMessage("delete")}</span>
    </div>
  `;

	// Position the menu
	const rect = e.target.getBoundingClientRect();
	menu.style.position = "fixed";
	menu.style.left = `${rect.left}px`;
	menu.style.top = `${rect.bottom + 4}px`;
	menu.style.zIndex = "1000";

	// Add event listeners for menu items
	menu.querySelectorAll(".context-menu-item").forEach((item) => {
		item.addEventListener("click", (event) => {
			event.stopPropagation();
			const action = item.dataset.action;
			handleContextMenuAction(action, skill);
			hideSkillContextMenu();
		});
	});

	// Append to body
	document.body.appendChild(menu);
	skillContextMenu = menu;

	// Close menu when clicking outside
	setTimeout(() => {
		document.addEventListener("click", handleContextMenuOutsideClick);
	}, 0);
}

/**
 * Hide context menu
 */
export function hideSkillContextMenu() {
	if (skillContextMenu) {
		skillContextMenu.remove();
		skillContextMenu = null;
		document.removeEventListener("click", handleContextMenuOutsideClick);
	}
}

/**
 * Handle click outside context menu
 * @param {Event} e - Mouse event
 */
export function handleContextMenuOutsideClick(e) {
	if (skillContextMenu && !skillContextMenu.contains(e.target)) {
		hideSkillContextMenu();
	}
}

/**
 * Handle context menu action
 * @param {string} action - Action name: 'apply' | 'view' | 'delete'
 * @param {Object} skill - Skill object
 */
export async function handleContextMenuAction(action, skill) {
	switch (action) {
		case "apply":
			// Apply the skill
			handleSkillChipClick({
				id: skill.id,
				name: skill.name,
				type: "user",
				prompt: `Apply my "${skill.name}" style`,
			});
			break;

		case "view":
			// View skill details in a modal
			await viewSkillDetails(skill);
			break;

		case "delete":
			// Delete skill with confirmation
			await deleteSkillWithConfirmation(skill);
			break;
	}
}

/**
 * View skill details
 * @param {Object} skill - Skill object
 */
export async function viewSkillDetails(skill) {
	try {
		// Load skill content
		const content = await StyleSkillStore.load(skill.id);

		if (!content) {
			showError(getMessage("loadSkillDetailsError"));
			return;
		}

		// Create modal
		const modal = document.createElement("div");
		modal.className = "skill-detail-modal";
		modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${escapeHtml(skill.name)}</h3>
          <button class="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="skill-meta">
            <span class="skill-source">${getMessage("source")}: ${escapeHtml(skill.sourceDomain || "unknown")}</span>
            <span class="skill-date">${getMessage("createdAt")}: ${new Date(skill.createdAt).toLocaleDateString(getLocale())}</span>
          </div>
          ${skill.mood ? `<div class="skill-mood">${getMessage("style")}: ${escapeHtml(skill.mood)}</div>` : ""}
          <div class="skill-content">
            <pre>${escapeHtml(content)}</pre>
          </div>
        </div>
      </div>
    `;

		// Add event listeners
		const closeBtn = modal.querySelector(".modal-close-btn");

		const closeModal = () => {
			modal.remove();
		};

		closeBtn.addEventListener("click", closeModal);
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeModal();
		});

		// Append to body
		document.body.appendChild(modal);
	} catch (err) {
		console.error("[Panel] Failed to view skill details:", err);
		showError(getMessage("loadSkillDetailsError"));
	}
}

/**
 * Delete skill with confirmation
 * @param {Object} skill - Skill object
 */
export async function deleteSkillWithConfirmation(skill) {
	// Create confirmation modal
	const modal = document.createElement("div");
	modal.className = "skill-delete-modal";
	modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${getMessage("confirmDelete")}</h3>
      </div>
      <div class="modal-body">
        <p>${formatMessage("confirmDeleteDesc", { name: escapeHtml(skill.name) })}</p>
        <p class="hint">${getMessage("cannotRecover")}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-cancel">${getMessage("cancel")}</button>
        <button class="btn btn-danger">${getMessage("delete")}</button>
      </div>
    </div>
  `;

	// Add event listeners
	const cancelBtn = modal.querySelector(".btn-cancel");
	const deleteBtn = modal.querySelector(".btn-danger");

	const closeModal = () => {
		modal.remove();
	};

	cancelBtn.addEventListener("click", closeModal);
	modal.addEventListener("click", (e) => {
		if (e.target === modal) closeModal();
	});

	deleteBtn.addEventListener("click", async () => {
		try {
			// Delete skill
			await StyleSkillStore.remove(skill.id);

			// Close modal
			closeModal();

			// Refresh skill chips and settings list
			await renderSkillChips();
			await renderUserSkillList();

			// Show success message
			console.log("[Panel] Skill deleted:", skill.name);
		} catch (err) {
			console.error("[Panel] Failed to delete skill:", err);
			showError(getMessage("deleteSkillError"));
		}
	});

	// Append to body
	document.body.appendChild(modal);
}

