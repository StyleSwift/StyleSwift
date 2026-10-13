/**
 * StyleSwift - TypewriterEffect
 * 从 panel.js 拆分（行为不变）
 */

import { getMessage } from "../i18n.js";

/**
 * 打字机效果管理器
 * 在输入框中显示循环滚动的示例文本
 */
export class TypewriterEffect {
	constructor() {
		this.textElement = null;
		this.placeholderElement = null;
		this.inputElement = null;
		// Typewriter examples - localizedi18n
		this.examples = this.getLocalizedExamples();
		this.currentIndex = 0;
		this.currentText = "";
		this.isTyping = false;
		this.isDeleting = false;
		this.isPaused = false;
		this.timeoutId = null;
		this.typeSpeed = 120; // 打字速度 (ms)
		this.deleteSpeed = 60; // 删除速度 (ms)
		this.pauseDelay = 2000; // 完成后暂停时间 (ms)
		this.switchDelay = 500; // 切换示例前的暂停时间 (ms)
	}

	/**
	 * Get localized typewriter examples
	 * @returns {string[]}
	 */
	getLocalizedExamples() {
		return [
			getMessage("typingExample1"),
			getMessage("typingExample2"),
			getMessage("typingExample3"),
			getMessage("typingExample4"),
		];
	}

	/**
	 * 初始化打字机效果
	 * @param {HTMLElement} textElement - 显示文本的元素
	 * @param {HTMLElement} placeholderElement - 占位符容器元素
	 * @param {HTMLTextAreaElement} inputElement - 输入框元素
	 */
	init(textElement, placeholderElement, inputElement) {
		this.textElement = textElement;
		this.placeholderElement = placeholderElement;
		this.inputElement = inputElement;

		if (!this.textElement || !this.placeholderElement || !this.inputElement) {
			console.warn("[TypewriterEffect] " + getMessage("typewriterNothing"));
			return;
		}

		// 监听输入框的 focus/blur 事件
		this.inputElement.addEventListener("focus", () => this.hide());
		this.inputElement.addEventListener("blur", () => this.checkShow());

		// 监听输入框的内容变化
		this.inputElement.addEventListener("input", () => this.checkShow());

		// 开始打字机效果
		this.start();
	}

	/**
	 * 开始打字机效果
	 */
	start() {
		if (!this.textElement || this.isPaused) return;
		// 用户偏好减少动态效果：静态显示第一个示例
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			this.textElement.textContent = this.examples[0];
			return;
		}
		this.isTyping = true;
		this.type();
	}

	/**
	 * 停止打字机效果
	 */
	stop() {
		this.isTyping = false;
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}

	/**
	 * 显示打字机效果
	 */
	show() {
		if (this.placeholderElement) {
			this.placeholderElement.classList.remove("hidden");
		}
		this.isPaused = false;
		this.start();
	}

	/**
	 * 隐藏打字机效果
	 */
	hide() {
		if (this.placeholderElement) {
			this.placeholderElement.classList.add("hidden");
		}
		this.stop();
	}

	/**
	 * 检查是否应该显示打字机效果
	 */
	checkShow() {
		const shouldShow = !this.isFocused() && this.isEmpty();
		if (shouldShow) {
			this.show();
		} else {
			this.hide();
		}
	}

	/**
	 * 检查输入框是否聚焦
	 */
	isFocused() {
		return document.activeElement === this.inputElement;
	}

	/**
	 * 检查输入框是否为空
	 */
	isEmpty() {
		return this.inputElement && this.inputElement.value.trim() === "";
	}

	/**
	 * 打字动画核心逻辑
	 */
	type() {
		if (!this.isTyping || this.isPaused) return;

		const currentExample = this.examples[this.currentIndex];

		if (this.isDeleting) {
			// 删除模式：从后向前逐字删除
			this.currentText = currentExample.substring(
				0,
				this.currentText.length - 1,
			);
			this.textElement.textContent = this.currentText;

			if (this.currentText === "") {
				// 删除完成，切换到下一个示例
				this.isDeleting = false;
				this.currentIndex = (this.currentIndex + 1) % this.examples.length;
				this.timeoutId = setTimeout(() => this.type(), this.switchDelay);
			} else {
				this.timeoutId = setTimeout(() => this.type(), this.deleteSpeed);
			}
		} else {
			// 打字模式：从前向后逐字添加
			this.currentText = currentExample.substring(
				0,
				this.currentText.length + 1,
			);
			this.textElement.textContent = this.currentText;

			if (this.currentText === currentExample) {
				// 当前示例打字完成，暂停后开始删除
				this.timeoutId = setTimeout(() => {
					this.isDeleting = true;
					this.type();
				}, this.pauseDelay);
			} else {
				this.timeoutId = setTimeout(() => this.type(), this.typeSpeed);
			}
		}
	}
}
