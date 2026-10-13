/**
 * StyleSwift - ToolCardManager
 * 从 panel.js 拆分（行为不变）
 */

import { getMessage } from "../i18n.js";
import { iconHtml } from "./dom-utils.js";

/**
 * 工具名称映射表（友好的显示名称）
 */
/**
 * 工具标识符到 i18n 消息键的映射
 * 用于将工具内部名称转换为用户友好的本地化显示名称
 */
const TOOL_I18N_KEYS = {
	think: "toolNameThink",
	get_page_structure: "toolNameGetPageStructure",
	grep: "toolNameGrep",
	apply_styles: "toolNameApplyStyles",
	get_user_profile: "toolNameGetUserProfile",
	update_user_profile: "toolNameUpdateUserProfile",
	load_skill: "toolNameLoadSkill",
	save_style_skill: "toolNameSaveStyleSkill",
	list_style_skills: "toolNameListStyleSkills",
	delete_style_skill: "toolNameDeleteStyleSkill",
	TodoWrite: "toolNameTodoWrite",
	Task: "toolNameTask",
};

/**
 * Task 子智能体类型到 i18n 消息键的映射
 * 用于将 agent_type 枚举值转换为本地化显示名称
 */
const AGENT_TYPE_I18N_KEYS = {
	QualityAudit: "taskAgentQualityAudit",
};

/**
 * 获取子智能体类型的本地化显示名称
 * @param {string} agentType - 子智能体类型（如 "QualityAudit"）
 * @returns {string} - 本地化的显示名称，未知类型返回原始值
 */
function getAgentTypeDisplayName(agentType) {
	if (!agentType) return "";
	const i18nKey = AGENT_TYPE_I18N_KEYS[agentType];
	if (i18nKey) {
		const localized = getMessage(i18nKey);
		if (localized !== i18nKey) return localized;
	}
	return agentType;
}

/**
 * 获取工具友好显示名称（国际化）
 * @param {string} toolName - 工具名称
 * @returns {string} - 本地化的友好显示名称
 */
export function getToolDisplayName(toolName) {
	const i18nKey = TOOL_I18N_KEYS[toolName];
	if (i18nKey) {
		const localized = getMessage(i18nKey);
		// 如果 i18n 未找到则回退到 key 本身，再回退到原始 toolName
		if (localized !== i18nKey) return localized;
	}
	return toolName;
}

/**
 * 工具调用卡片管理器
 * 用于管理当前消息中的工具调用卡片组
 */
export class ToolCardManager {
	/**
	 * @param {Function} [scrollToBottom] - 新卡片加入后滚动对话区
	 */
	constructor(scrollToBottom = () => {}) {
		this.scrollToBottom = scrollToBottom;
		/** @type {HTMLElement|null} 当前卡片组容器 */
		this.currentCardGroup = null;
		/** @type {Map<string, HTMLElement>} 工具调用ID到卡片元素的映射 */
		this.cardMap = new Map();
	}

	/**
	 * 创建新的工具卡片组
	 * @returns {HTMLElement} 卡片组容器
	 */
	createCardGroup() {
		// 如果已有卡片组，先结束它
		if (this.currentCardGroup) {
			this.finalizeCardGroup();
		}

		const group = document.createElement("div");
		group.className = "tool-card-group";

		this.currentCardGroup = group;
		this.cardMap.clear();

		return group;
	}

	/**
	 * 添加工具调用卡片（处理中状态）
	 * @param {string} toolId - 工具调用ID
	 * @param {string} toolName - 工具名称
	 * @returns {HTMLElement} 卡片元素
	 */
	addToolCard(toolId, toolName) {
		if (!this.currentCardGroup) {
			this.createCardGroup();
		}

		const card = document.createElement("div");
		card.className = "tool-card processing";
		card.dataset.toolId = toolId;
		card.dataset.toolName = toolName;

		const displayName = getToolDisplayName(toolName);
		const isTask = toolName === "Task";

		card.innerHTML = `
      <div class="tool-card-header">
        <div class="tool-card-title">
          <span class="tool-card-icon">${isTask ? iconHtml("bot", 14) : iconHtml("wrench", 14)}</span>
          <span class="tool-card-name">${displayName}</span>
        </div>
        <div class="tool-card-status processing">
          <span class="status-indicator">${isTask ? "" : iconHtml("loader", 12, "spin")}</span>
          <span class="status-text">${isTask ? getMessage("toolStatusSubAgentRunning") : getMessage("toolStatusProcessing")}</span>
        </div>
      </div>
    `;

		this.currentCardGroup.appendChild(card);
		this.cardMap.set(toolId, card);

		// 滚动到底部
		this.scrollToBottom();

		return card;
	}

	/**
	 * 完成工具调用卡片（显示结果）
	 * @param {string} toolId - 工具调用ID
	 * @param {string} toolName - 工具名称
	 * @param {Object|null} input - 工具输入参数
	 * @param {string} output - 工具输出结果
	 */
	completeToolCard(toolId, toolName, input, output) {
		const card = this.cardMap.get(toolId);
		if (!card) return;

		const displayName = getToolDisplayName(toolName);
		const isTask = toolName === "Task";
		const isThink = toolName === "think";

		// 更新卡片状态
		card.classList.remove("processing");
		card.classList.add("completed", "collapsed");

		if (isTask) {
			// Task 子任务专属渲染
			card.classList.add("task-card");
			const taskTitle = input?.description
				? this.escapeHtml(input.description)
				: displayName;
			const agentType = input?.agent_type || "";
			const agentBadge = agentType
				? `<span class="task-card-badge">${this.escapeHtml(getAgentTypeDisplayName(agentType))}</span>`
				: "";

			const summaryHtml = this.formatTaskOutput(output);

			card.innerHTML = `
        <div class="tool-card-header">
          <div class="tool-card-title">
            <span class="tool-card-icon">${iconHtml("bot", 14)}</span>
            <span class="tool-card-name">${taskTitle}</span>
            ${agentBadge}
          </div>
          <div class="tool-card-expand">${iconHtml("chevron-right", 12)}</div>
        </div>
        <div class="tool-card-body">
          ${summaryHtml}
        </div>
      `;
		} else if (isThink) {
			// Think 工具专属渲染 - 显示思考内容摘要
			card.classList.add("think-card");
			const thoughtContent = input?.thought || "";
			const thoughtPreview = this.formatThinkOutput(thoughtContent);

			card.innerHTML = `
        <div class="tool-card-header">
          <div class="tool-card-title">
            <span class="tool-card-icon">${iconHtml("sparkles", 14)}</span>
            <span class="tool-card-name">${displayName}</span>
          </div>
          <div class="tool-card-expand">${iconHtml("chevron-right", 12)}</div>
        </div>
        <div class="tool-card-body">
          ${thoughtPreview}
        </div>
      `;
		} else {
			// 普通工具默认渲染
			const inputDisplay = this.formatInput(input);
			const outputDisplay = this.formatOutput(output);

			card.innerHTML = `
        <div class="tool-card-header">
          <div class="tool-card-title">
            <span class="tool-card-icon">${iconHtml("check-circle", 14)}</span>
            <span class="tool-card-name">${displayName}</span>
          </div>
          <div class="tool-card-expand">${iconHtml("chevron-right", 12)}</div>
        </div>
        <div class="tool-card-body">
          <div class="tool-card-section">
            <div class="tool-card-label">${getMessage("toolLabelInput")}</div>
            <div class="tool-card-content">${inputDisplay}</div>
          </div>
          <div class="tool-card-section">
            <div class="tool-card-label">${getMessage("toolLabelOutput")}</div>
            <div class="tool-card-content tool-card-output">${outputDisplay}</div>
          </div>
        </div>
      `;
		}

		// 绑定展开/折叠事件
		const header = card.querySelector(".tool-card-header");
		header.addEventListener("click", () => this.toggleCard(card));

		// 更新映射
		this.cardMap.set(toolId, card);
	}

	/**
	 * 切换卡片展开/折叠状态
	 * @param {HTMLElement} card - 卡片元素
	 */
	toggleCard(card) {
		const isCollapsed = card.classList.contains("collapsed");

		if (isCollapsed) {
			// 展开前，折叠同组的其他卡片
			if (this.currentCardGroup) {
				const allCards = this.currentCardGroup.querySelectorAll(".tool-card");
				allCards.forEach((c) => c.classList.add("collapsed"));
			}
			card.classList.remove("collapsed");
			card.classList.add("expanded");
		} else {
			card.classList.remove("expanded");
			card.classList.add("collapsed");
		}
	}

	/**
	 * 完成当前卡片组
	 */
	finalizeCardGroup() {
		if (this.currentCardGroup) {
			// 检查卡片组内是否有卡片
			const cards = this.currentCardGroup.querySelectorAll(".tool-card");
			if (cards.length === 0) {
				this.currentCardGroup.remove();
			}
		}
		this.currentCardGroup = null;
		this.cardMap.clear();
	}

	/**
	 * 格式化输入参数显示
	 * @param {Object|null} input - 输入参数
	 * @returns {string} - 格式化后的HTML
	 */
	formatInput(input) {
		if (!input || Object.keys(input).length === 0) {
			return `<span class="tool-card-empty">${getMessage("toolNoParams")}</span>`;
		}

		// 特殊处理：显示关键参数
		const keyParams = [];

		// 常见参数处理
		if (input.query) {
			keyParams.push(`query: "${input.query}"`);
		}
		if (input.mode) {
			keyParams.push(`mode: ${input.mode}`);
		}
		if (input.skill_name) {
			keyParams.push(`skill: ${input.skill_name}`);
		}
		if (input.name) {
			keyParams.push(`name: ${input.name}`);
		}
		if (input.css) {
			// CSS 截断显示
			const cssPreview =
				input.css.length > 50 ? input.css.substring(0, 50) + "..." : input.css;
			keyParams.push(`css: "${cssPreview}"`);
		}

		if (keyParams.length > 0) {
			return `<code>${keyParams.join(", ")}</code>`;
		}

		// 默认：JSON 格式
		try {
			const json = JSON.stringify(input, null, 2);
			if (json.length > 200) {
				return `<code>${json.substring(0, 200)}...</code>`;
			}
			return `<code>${json}</code>`;
		} catch {
			return '<span class="tool-card-empty">' + getMessage("toolEmptyCannotDisplay") + '</span>';
		}
	}

	/**
	 * 格式化输出结果显示
	 * @param {string} output - 输出结果
	 * @returns {string} - 格式化后的HTML
	 */
	formatOutput(output) {
		if (!output) {
			return '<span class="tool-card-empty">' + getMessage("toolEmptyNoOutput") + '</span>';
		}

		// 转义HTML
		const escaped = this.escapeHtml(output);

		// 保留换行
		const formatted = escaped.replace(/\n/g, "<br>");

		return `<span class="tool-card-text">${formatted}</span>`;
	}

	/**
	 * 格式化 think 工具的思考内容显示
	 * @param {string} thought - 思考内容
	 * @returns {string} - 格式化后的HTML
	 */
	formatThinkOutput(thought) {
		if (!thought) {
			return '<span class="tool-card-empty">' + getMessage("toolEmptyNoThought") + '</span>';
		}

		// 转义 HTML 并将换行转换为 <br>
		const escaped = this.escapeHtml(thought);
		// 将换行符转为 <br> 以保持格式（完整显示，不截断）
		const formatted = escaped.replace(/\n/g, '<br>');

		return `<div class="think-content-preview">${formatted}</div>`;
	}

	/**
	 * 格式化子任务（Task）输出，尝试解析 JSON 以生成结构化摘要
	 * @param {string} output - 子任务输出文本
	 * @returns {string} - 格式化后的HTML
	 */
	formatTaskOutput(output) {
		if (!output) {
			return '<span class="tool-card-empty">' + getMessage("toolEmptyNoOutput") + '</span>';
		}

		// 尝试提取并解析 JSON（支持被 markdown 代码块包裹的情况）
		let parsed = null;
		try {
			const jsonMatch =
				output.match(/```(?:json)?\s*([\s\S]*?)```/) ||
				output.match(/(\{[\s\S]*\})/);
			if (jsonMatch) {
				parsed = JSON.parse(jsonMatch[1].trim());
			} else {
				parsed = JSON.parse(output.trim());
			}
		} catch (_) {
			// 非 JSON，退回纯文本显示
		}

		if (parsed && typeof parsed === "object") {
			// 结构化渲染（QualityAudit 格式）
			const parts = [];

			// 通过/失败 + 评分
			if ("passed" in parsed || "score" in parsed) {
				const passed = parsed.passed;
				const score = parsed.score;
				const passedHtml =
					passed !== undefined
						? `<span class="task-result-badge ${passed ? "pass" : "fail"}">${passed ? getMessage("taskResultPassed") : getMessage("taskResultFailed")}</span>`
						: "";
				const scoreHtml =
					score !== undefined
						? `<span class="task-result-score">${getMessage("taskResultScore")} <strong>${score}</strong>/10</span>`
						: "";
				if (passedHtml || scoreHtml) {
					parts.push(
						`<div class="task-result-row">${passedHtml}${scoreHtml}</div>`,
					);
				}
			}

			// 摘要
			if (parsed.summary) {
				parts.push(
					`<div class="task-result-summary">${this.escapeHtml(parsed.summary)}</div>`,
				);
			}

			// issues 统计
			if (Array.isArray(parsed.issues) && parsed.issues.length > 0) {
				const high = parsed.issues.filter((i) => i.severity === "high").length;
				const medium = parsed.issues.filter(
					(i) => i.severity === "medium",
				).length;
				const low = parsed.issues.filter((i) => i.severity === "low").length;
				const issueChips = [];
				if (high > 0)
					issueChips.push(
						`<span class="task-issue-chip high">${getMessage("taskIssueHigh").replace("{count}", high)}</span>`,
					);
				if (medium > 0)
					issueChips.push(
						`<span class="task-issue-chip medium">${getMessage("taskIssueMedium").replace("{count}", medium)}</span>`,
					);
				if (low > 0)
					issueChips.push(
						`<span class="task-issue-chip low">${getMessage("taskIssueLow").replace("{count}", low)}</span>`,
					);
				if (issueChips.length > 0) {
					parts.push(
						`<div class="task-issue-chips">${issueChips.join("")}</div>`,
					);
				}
			}

			// 折叠的原始输出
			const rawEscaped = this.escapeHtml(output);
			parts.push(`
        <details class="task-raw-details">
          <summary>${getMessage("taskViewFullReport")}</summary>
          <pre class="task-raw-output">${rawEscaped}</pre>
        </details>
      `);

			return parts.join("");
		}

		// 纯文本：超过 300 字时截断 + 折叠展开
		const escaped = this.escapeHtml(output);
		if (output.length > 300) {
			const preview = this.escapeHtml(output.substring(0, 300));
			return `
        <div class="task-text-preview">${preview.replace(/\n/g, "<br>")}…</div>
        <details class="task-raw-details">
          <summary>${getMessage("taskViewFullOutput")}</summary>
          <pre class="task-raw-output">${escaped}</pre>
        </details>
      `;
		}

		return `<div class="task-text-preview">${escaped.replace(/\n/g, "<br>")}</div>`;
	}

	/**
	 * 转义HTML特殊字符
	 * @param {string} text - 原始文本
	 * @returns {string} - 转义后的文本
	 */
	escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * 获取当前卡片组（用于添加到消息容器）
	 * @returns {HTMLElement|null}
	 */
	getCurrentCardGroup() {
		return this.currentCardGroup;
	}

	/**
	 * 是否有活跃的卡片组
	 * @returns {boolean}
	 */
	hasActiveCardGroup() {
		return (
			this.currentCardGroup !== null &&
			this.currentCardGroup.querySelectorAll(".tool-card").length > 0
		);
	}
}
