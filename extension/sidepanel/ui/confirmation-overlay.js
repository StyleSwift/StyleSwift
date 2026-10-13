/**
 * StyleSwift - ConfirmationOverlay
 * 从 panel.js 拆分（行为不变）
 */

import { getMessage } from "../i18n.js";
import { escapeHtml } from "./dom-utils.js";

/**
 * 操作确认浮层管理类
 *
 * 负责：
 * - 显示确认/撤销按钮
 * - 处理单次/多次样式应用的确认
 * - 60秒超时自动消失
 * - 撤销操作触发
 *
 * 设计参考：§16.3 ④ 操作确认浮层
 */
export class ConfirmationOverlay {
	constructor() {
		/** @type {HTMLElement|null} 浮层 DOM 元素 */
		this.overlay = null;

		/** @type {number|null} 超时定时器 ID */
		this.timeoutId = null;

		/** @type {number|null} 进度条动画帧 ID */
		this.progressAnimationId = null;

		/** @type {number} 超时时长（毫秒） */
		this.timeoutDuration = 60000;

		/** @type {number} 样式应用次数 */
		this.applyCount = 0;

		/** @type {HTMLElement|null} 下拉菜单元素 */
		this.dropdown = null;

		/** @type {Function|null} 撤销回调 */
		this.onUndo = null;

		/** @type {Function|null} 全部撤销回调 */
		this.onUndoAll = null;

		/** @type {Function|null} 确认回调 */
		this.onConfirm = null;
	}

	/**
	 * 显示确认浮层
	 * @param {Object} options - 配置选项
	 * @param {number} options.applyCount - 样式应用次数
	 * @param {Function} options.onUndo - 撤销回调
	 * @param {Function} options.onUndoAll - 全部撤销回调
	 * @param {Function} options.onConfirm - 确认回调
	 */
	show(options = {}) {
		const { applyCount = 1, scopeText = "", onUndo, onUndoAll, onConfirm } = options;

		// 如果已有浮层，先移除（hide 会重置 applyCount，必须在赋值之前）
		this.hide(false);

		this.applyCount = applyCount;
		this.scopeText = scopeText;
		this.onUndo = onUndo;
		this.onUndoAll = onUndoAll;
		this.onConfirm = onConfirm;

		// 创建浮层
		this.overlay = this._createOverlayElement();

		// 插入到输入区之前
		const inputArea = document.getElementById("input-area");
		if (inputArea && inputArea.parentNode) {
			inputArea.parentNode.insertBefore(this.overlay, inputArea);
		}

		// 启动超时计时器
		this._startTimeout();

		console.log("[ConfirmationOverlay] 浮层已显示，样式应用次数:", applyCount);
	}

	/**
	 * 隐藏确认浮层
	 * @param {boolean} animate - 是否使用动画淡出
	 */
	hide(animate = true) {
		// 清除超时定时器
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		// 清除进度条动画
		if (this.progressAnimationId) {
			cancelAnimationFrame(this.progressAnimationId);
			this.progressAnimationId = null;
		}

		// 移除浮层
		if (this.overlay) {
			if (animate) {
				// 添加淡出动画
				this.overlay.classList.add("fade-out");

				// 动画结束后移除元素
				setTimeout(() => {
					if (this.overlay && this.overlay.parentNode) {
						this.overlay.parentNode.removeChild(this.overlay);
					}
					this.overlay = null;
				}, 200); // 动画时长
			} else {
				// 直接移除
				if (this.overlay.parentNode) {
					this.overlay.parentNode.removeChild(this.overlay);
				}
				this.overlay = null;
			}
		}

		// 重置状态
		this.dropdown = null;
		this.applyCount = 0;
	}

	/**
	 * 创建浮层 DOM 元素
	 * @private
	 * @returns {HTMLElement}
	 */
	_createOverlayElement() {
		const overlay = document.createElement("div");
		overlay.className = "confirmation-overlay";

		if (this.applyCount === 1) {
			// 单次样式应用
			overlay.innerHTML = `
        <div class="confirmation-content">
          <div class="confirmation-buttons">
            <button class="confirmation-btn primary" data-action="confirm">
              ${getMessage("confirmEffect")}
            </button>
            <button class="confirmation-btn secondary" data-action="undo">
              ${getMessage("undoShort")}
            </button>
          </div>
          <span class="confirmation-hint" title="${escapeHtml(this.scopeText)}">${escapeHtml(this.scopeText)} · ${getMessage("orKeepTyping")}</span>
        </div>
      `;
		} else {
			// 多次样式应用
			overlay.innerHTML = `
        <div class="confirmation-content">
          <div class="confirmation-buttons">
            <button class="confirmation-btn primary" data-action="confirm-all">
              ${getMessage("confirmAll")}
            </button>
            <div class="confirmation-dropdown-wrapper" style="position: relative;">
              <button class="confirmation-dropdown-trigger" data-action="dropdown">
                ${getMessage("undoLastStep")}
                <span class="icon icon-chevron-down arrow" style="width:10px;height:10px" aria-hidden="true"></span>
              </button>
              <div class="confirmation-dropdown hidden">
                <button class="confirmation-dropdown-item" data-action="undo-last">
                  ${getMessage("undoLastStep")}
                </button>
                <button class="confirmation-dropdown-item danger" data-action="undo-all">
                  ${getMessage("undoAllSteps")}
                </button>
              </div>
            </div>
          </div>
          <span class="confirmation-hint" title="${escapeHtml(this.scopeText)}">${escapeHtml(this.scopeText)} · ${getMessage("orKeepTyping")}</span>
        </div>
        <div class="confirmation-timeout">
          <div class="confirmation-timeout-bar" style="width: 100%"></div>
        </div>
      `;

			// 保存下拉菜单引用
			this.dropdown = overlay.querySelector(".confirmation-dropdown");
		}

		// 绑定事件
		this._bindEvents(overlay);

		return overlay;
	}

	/**
	 * 绑定浮层事件
	 * @private
	 * @param {HTMLElement} overlay - 浮层元素
	 */
	_bindEvents(overlay) {
		overlay.addEventListener("click", (e) => {
			const target = e.target.closest("[data-action]");
			if (!target) return;

			const action = target.dataset.action;

			switch (action) {
				case "confirm":
				case "confirm-all":
					// 确认 - 隐藏浮层
					this.hide(true);
					if (this.onConfirm) {
						this.onConfirm();
					}
					break;

				case "undo":
				case "undo-last":
					// 撤销最后一步
					this.hide(false);
					if (this.onUndo) {
						this.onUndo();
					}
					break;

				case "undo-all":
					// 全部撤销
					this.hide(false);
					if (this.onUndoAll) {
						this.onUndoAll();
					}
					break;

				case "dropdown":
					// 切换下拉菜单
					this._toggleDropdown();
					break;
			}
		});

		// 点击外部关闭下拉菜单
		document.addEventListener("click", (e) => {
			if (this.dropdown && !this.overlay.contains(e.target)) {
				this._closeDropdown();
			}
		});
	}

	/**
	 * 切换下拉菜单显示/隐藏
	 * @private
	 */
	_toggleDropdown() {
		if (!this.dropdown) return;

		const isHidden = this.dropdown.classList.contains("hidden");

		if (isHidden) {
			this._openDropdown();
		} else {
			this._closeDropdown();
		}
	}

	/**
	 * 打开下拉菜单
	 * @private
	 */
	_openDropdown() {
		if (!this.dropdown) return;

		this.dropdown.classList.remove("hidden");

		// 更新触发按钮状态
		const trigger = this.overlay.querySelector(
			".confirmation-dropdown-trigger",
		);
		if (trigger) {
			trigger.classList.add("open");
		}
	}

	/**
	 * 关闭下拉菜单
	 * @private
	 */
	_closeDropdown() {
		if (!this.dropdown) return;

		this.dropdown.classList.add("hidden");

		// 更新触发按钮状态
		const trigger = this.overlay.querySelector(
			".confirmation-dropdown-trigger",
		);
		if (trigger) {
			trigger.classList.remove("open");
		}
	}

	/**
	 * 启动超时计时器
	 * @private
	 */
	_startTimeout() {
		const startTime = Date.now();
		const progressBar = this.overlay?.querySelector(
			".confirmation-timeout-bar",
		);

		// 进度条动画
		const updateProgress = () => {
			if (!this.overlay) return;

			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, this.timeoutDuration - elapsed);
			const percent = (remaining / this.timeoutDuration) * 100;

			if (progressBar) {
				progressBar.style.width = `${percent}%`;
			}

			if (remaining > 0) {
				this.progressAnimationId = requestAnimationFrame(updateProgress);
			}
		};

		// 启动进度条动画
		if (progressBar) {
			updateProgress();
		}

		// 超时自动隐藏
		this.timeoutId = setTimeout(() => {
			console.log("[ConfirmationOverlay] 超时自动隐藏");
			this.hide(true);
			if (this.onConfirm) {
				this.onConfirm();
			}
		}, this.timeoutDuration);
	}

	/**
	 * 检查浮层是否显示
	 * @returns {boolean}
	 */
	isVisible() {
		return this.overlay !== null && this.overlay.parentNode !== null;
	}
}
