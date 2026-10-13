/**
 * StyleSwift - TodoCardManager
 * 从 panel.js 拆分（行为不变）
 */

import { getMessage, formatMessage } from "../i18n.js";
import { iconHtml } from "./dom-utils.js";

/**
 * 任务状态图标映射
 */
const TODO_STATUS_ICONS = {
	pending: iconHtml("clock", 13),
	in_progress: iconHtml("refresh", 13, "spin"),
	completed: iconHtml("check-circle", 13),
};

/**
 * 任务卡片管理器
 * 用于管理悬浮在输入框上方的任务列表显示
 * 支持两种模式：
 * - 确认模式：用户可编辑、增删步骤后确认执行
 * - 进度模式：只读显示任务执行进度
 */
export class TodoCardManager {
	constructor() {
		/** @type {HTMLElement|null} 当前任务卡片容器 */
		this.todoContainer = null;
		/** @type {HTMLElement|null} 输入框区域引用 */
		this.inputArea = null;
	}

	/**
	 * 获取输入框区域元素
	 * @returns {HTMLElement|null}
	 */
	getInputArea() {
		if (!this.inputArea) {
			this.inputArea = document.getElementById("input-area");
		}
		return this.inputArea;
	}

	/**
	 * 创建任务列表容器并插入到输入框上方
	 * @returns {HTMLElement} 任务卡片容器
	 */
	createTodoContainer() {
		if (this.todoContainer) {
			this.todoContainer.remove();
		}

		const container = document.createElement("div");
		container.className = "todo-floating-container";

		const inputArea = this.getInputArea();
		if (inputArea && inputArea.parentNode) {
			inputArea.parentNode.insertBefore(container, inputArea);
		}

		this.todoContainer = container;
		return container;
	}

	/**
	 * 更新任务列表显示
	 * @param {Array<{id: string, content: string, status: string}>} todos - 任务列表
	 * @param {boolean} [awaitingConfirmation=false] - 是否处于等待确认状态
	 */
	updateTodos(todos, awaitingConfirmation = false) {
		if (!todos || todos.length === 0) {
			this.hide();
			return;
		}

		if (!this.todoContainer) {
			this.createTodoContainer();
		}

		if (awaitingConfirmation) {
			this._renderConfirmationMode(todos);
		} else {
			this._renderProgressMode(todos);
		}
	}

	/**
	 * 渲染确认模式：可编辑的任务计划
	 * @param {Array} todos
	 * @private
	 */
	_renderConfirmationMode(todos) {
		const todosHtml = todos
			.map(
				(todo, index) => `
      <div class="todo-item todo-item-editable" data-index="${index}">
        <span class="todo-drag-handle">⠿</span>
        <input type="text" class="todo-edit-input" value="${this._escapeAttr(todo.content)}" />
        <button class="todo-delete-btn" data-index="${index}" title="${getMessage("todoDeleteStep")}">×</button>
      </div>
    `,
			)
			.join("");

		this.todoContainer.innerHTML = `
      <div class="todo-card-header">
        <span class="todo-card-title">${getMessage("todoConfirmTitle")}</span>
        <span class="todo-step-count">${formatMessage("todoStepCount", { count: todos.length })}</span>
      </div>
      <div class="todo-hint">${getMessage("todoHint")}</div>
      <div class="todo-list todo-list-editable">
        ${todosHtml}
      </div>
      <button class="todo-add-btn">${getMessage("todoAddStep")}</button>
      <div class="todo-confirm-actions">
        <button class="todo-cancel-btn">${getMessage("cancel")}</button>
        <button class="todo-confirm-btn">${getMessage("todoConfirm")}</button>
      </div>
    `;

		this.todoContainer.classList.add("todo-confirmation-mode");
		this._wireConfirmationEvents();
	}

	/**
	 * 绑定确认模式的交互事件
	 * @private
	 */
	_wireConfirmationEvents() {
		const container = this.todoContainer;
		if (!container) return;

		// 删除按钮
		container.querySelectorAll(".todo-delete-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const item = e.target.closest(".todo-item");
				if (item) {
					item.remove();
					this._updateStepCount();
				}
			});
		});

		// 添加步骤按钮
		const addBtn = container.querySelector(".todo-add-btn");
		if (addBtn) {
			addBtn.addEventListener("click", () => {
				const list = container.querySelector(".todo-list");
				if (!list) return;
				const newItem = document.createElement("div");
				newItem.className = "todo-item todo-item-editable";
				newItem.innerHTML = `
          <span class="todo-drag-handle">⠿</span>
          <input type="text" class="todo-edit-input" value="" placeholder="${getMessage("todoStepPlaceholder")}" />
          <button class="todo-delete-btn" title="${getMessage("todoDeleteStep")}">×</button>
        `;
				newItem
					.querySelector(".todo-delete-btn")
					.addEventListener("click", () => {
						newItem.remove();
						this._updateStepCount();
					});
				list.appendChild(newItem);
				newItem.querySelector(".todo-edit-input").focus();
				this._updateStepCount();
			});
		}

		// 确认按钮
		const confirmBtn = container.querySelector(".todo-confirm-btn");
		if (confirmBtn) {
			confirmBtn.addEventListener("click", async () => {
				const inputs = container.querySelectorAll(".todo-edit-input");
				const editedTodos = [];
				inputs.forEach((input) => {
					const content = input.value.trim();
					if (content) {
						editedTodos.push({ content, status: "pending" });
					}
				});

				if (editedTodos.length === 0) {
					const { rejectPlan } = await import("../agent/todo-manager.js");
					rejectPlan();
					return;
				}

				const { confirmPlan } = await import("../agent/todo-manager.js");
				confirmPlan(editedTodos);
			});
		}

		// 取消按钮
		const cancelBtn = container.querySelector(".todo-cancel-btn");
		if (cancelBtn) {
			cancelBtn.addEventListener("click", async () => {
				const { rejectPlan } = await import("../agent/todo-manager.js");
				rejectPlan();
			});
		}

		// Enter 键在输入框中按下时移动到下一个
		container.querySelectorAll(".todo-edit-input").forEach((input) => {
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					const nextItem = input.closest(".todo-item")?.nextElementSibling;
					if (nextItem) {
						nextItem.querySelector(".todo-edit-input")?.focus();
					} else {
						container.querySelector(".todo-add-btn")?.click();
					}
				}
			});
		});
	}

	/**
	 * 更新步骤计数显示
	 * @private
	 */
	_updateStepCount() {
		const countEl = this.todoContainer?.querySelector(".todo-step-count");
		const itemCount =
			this.todoContainer?.querySelectorAll(".todo-item").length || 0;
		if (countEl) {
			countEl.textContent = formatMessage("todoStepCount", { count: itemCount });
		}
	}

	/**
	 * 渲染进度模式：只读显示执行进度
	 * @param {Array} todos
	 * @private
	 */
	_renderProgressMode(todos) {
		const allCompleted = todos.every((t) => t.status === "completed");
		const completed = todos.filter((t) => t.status === "completed").length;
		const total = todos.length;
		const progressPercent =
			total > 0 ? Math.round((completed / total) * 100) : 0;

		const todosHtml = todos
			.map((todo) => {
				const icon = TODO_STATUS_ICONS[todo.status] || iconHtml("clock", 13);
				const statusClass = `todo-item-${todo.status}`;
				return `
        <div class="todo-item ${statusClass}">
          <span class="todo-icon">${icon}</span>
          <span class="todo-content">${this.escapeHtml(todo.content)}</span>
        </div>
      `;
			})
			.join("");

		this.todoContainer.innerHTML = `
      <div class="todo-card-header">
        <span class="todo-card-title">${getMessage("todoProgressTitle")}</span>
        <span class="todo-progress">${completed}/${total}</span>
      </div>
      <div class="todo-progress-bar">
        <div class="todo-progress-fill" style="width: ${progressPercent}%"></div>
      </div>
      <div class="todo-list">
        ${todosHtml}
      </div>
    `;

		this.todoContainer.classList.remove("todo-confirmation-mode");

		if (allCompleted) {
			this.todoContainer.classList.add("all-completed");
			setTimeout(() => {
				this.hide();
			}, 1500);
		}
	}

	/**
	 * 隐藏任务列表
	 */
	hide() {
		if (this.todoContainer) {
			this.todoContainer.remove();
			this.todoContainer = null;
		}
	}

	/**
	 * 清除任务列表（别名）
	 */
	clear() {
		this.hide();
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
	 * 转义 HTML 属性值
	 * @param {string} text
	 * @returns {string}
	 * @private
	 */
	_escapeAttr(text) {
		return text
			.replace(/&/g, "&amp;")
			.replace(/"/g, "&quot;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}
}
