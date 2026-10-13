/**
 * StyleSwift - StreamingTextRenderer
 * 从 panel.js 拆分（行为不变）
 */


/**
 * 流式文本渲染器类
 * 支持逐字追加、Markdown 基础渲染、打字机光标效果
 */
export class StreamingTextRenderer {
	/**
	 * @param {HTMLElement} container - 目标容器元素
	 * @param {Object} options - 配置选项
	 */
	constructor(container, options = {}) {
		this.container = container;
		this.buffer = ""; // 原始文本缓冲
		this.renderedHTML = ""; // 已渲染的 HTML
		this.cursor = null; // 光标元素
		this.isStreaming = false; // 是否正在流式输出

		// 配置选项
		this.options = {
			showCursor: options.showCursor !== false, // 默认显示光标
			autoScroll: options.autoScroll !== false, // 默认自动滚动
			scrollContainer: options.scrollContainer || null, // 滚动容器
		};

		// 初始化光标
		if (this.options.showCursor) {
			this._initCursor();
		}
	}

	/**
	 * 初始化光标元素
	 * @private
	 */
	_initCursor() {
		this.cursor = document.createElement("span");
		this.cursor.className = "typing-cursor";
		this.container.appendChild(this.cursor);
	}

	/**
	 * 追加文本（流式）
	 * @param {string} text - 要追加的文本
	 */
	appendText(text) {
		if (!text) return;

		this.buffer += text;
		this.isStreaming = true;

		// 渲染 Markdown 并更新 DOM
		const html = this._renderMarkdown(this.buffer);

		// 保留光标元素
		if (this.cursor && this.cursor.parentNode === this.container) {
			this.container.removeChild(this.cursor);
		}

		this.container.innerHTML = html;

		// 重新添加光标
		if (this.options.showCursor && this.isStreaming) {
			this.container.appendChild(this.cursor);
		}

		// 自动滚动
		if (this.options.autoScroll) {
			this._scrollToBottom();
		}
	}

	/**
	 * 完成流式输出
	 */
	finish() {
		this.isStreaming = false;

		// 移除光标
		if (this.cursor && this.cursor.parentNode === this.container) {
			this.container.removeChild(this.cursor);
		}

		// 最终渲染
		const html = this._renderMarkdown(this.buffer);
		this.container.innerHTML = html;

		// 确保滚动到底部
		if (this.options.autoScroll) {
			this._scrollToBottom();
		}
	}

	/**
	 * 清空内容
	 */
	clear() {
		this.buffer = "";
		this.renderedHTML = "";
		this.container.innerHTML = "";

		// 重新添加光标
		if (this.options.showCursor && this.cursor) {
			this.container.appendChild(this.cursor);
		}
	}

	/**
	 * 渲染基础 Markdown
	 * @param {string} text - 原始文本
	 * @returns {string} - 渲染后的 HTML
	 * @private
	 */
	_renderMarkdown(text) {
		if (!text) return "";

		// 将文本按代码块分割，直接处理而不使用占位符
		const parts = [];
		const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
		let lastIndex = 0;
		let match;

		while ((match = codeBlockRegex.exec(text)) !== null) {
			// 添加代码块之前的普通文本
			if (match.index > lastIndex) {
				parts.push({
					type: "text",
					content: text.slice(lastIndex, match.index),
				});
			}
			// 添加代码块
			const lang = match[1];
			const code = match[2].trim();
			const langAttr = lang ? ` class="language-${lang}"` : "";
			const escapedCode = this._escapeHtml(code);
			parts.push({
				type: "code",
				html: `<div class="code-block-wrapper"><pre><code${langAttr}>${escapedCode}</code></pre><button class="code-copy-btn" data-code="${encodeURIComponent(code)}">Copy</button></div>`,
			});
			lastIndex = match.index + match[0].length;
		}
		// 添加最后的普通文本
		if (lastIndex < text.length) {
			parts.push({
				type: "text",
				content: text.slice(lastIndex),
			});
		}

		// 处理每个普通文本片段
		const processedParts = parts.map((part) => {
			if (part.type === "code") {
				return part.html;
			}
			return this._renderMarkdownText(part.content);
		});

		// 合并所有片段
		let html = processedParts.join("");

		// 包裹段落（如果不是块级元素开头）
		const blockStart =
			html.startsWith("<pre>") ||
			html.startsWith("<h") ||
			html.startsWith("<ul>") ||
			html.startsWith("<ol>") ||
			html.startsWith("<blockquote>") ||
			html.startsWith("<hr>");
		if (!blockStart) {
			html = `<p>${html}</p>`;
		}

		return html;
	}

	/**
	 * 渲染普通 Markdown 文本（不含代码块）
	 * @param {string} text - 原始文本
	 * @returns {string} - 渲染后的 HTML
	 * @private
	 */
	_renderMarkdownText(text) {
		let html = this._escapeHtml(text);

		// 水平线（--- 或 ***）
		html = html.replace(/^[-]{3,}$/gm, "<hr>");
		html = html.replace(/^[*]{3,}$/gm, "<hr>");

		// 标题（# ## ### #### ##### ######）
		html = html.replace(/^#{6}\s+(.+)$/gm, "<h6>$1</h6>");
		html = html.replace(/^#{5}\s+(.+)$/gm, "<h5>$1</h5>");
		html = html.replace(/^#{4}\s+(.+)$/gm, "<h4>$1</h4>");
		html = html.replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>");
		html = html.replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>");
		html = html.replace(/^#{1}\s+(.+)$/gm, "<h1>$1</h1>");

		// 引用块（> quote）
		html = html.replace(/^(?:&gt;|>)\s+(.+)$/gm, "<blockquote>$1</blockquote>");

		// 处理列表 - 使用占位符来分隔无序和有序列表
		// 无序列表（- 或 *）
		html = html.replace(/^[*-]\s+(.+)$/gm, "<li data-type='ul'>$1</li>");
		// 有序列表（1. 2. 等）
		html = html.replace(/^\d+\.\s+(.+)$/gm, "<li data-type='ol'>$1</li>");

		// 将连续的同类型列表项合并为列表
		// 先处理无序列表
		html = html.replace(/(<li data-type='ul'>[\s\S]*?<\/li>\n?)+/g, (match) => {
			const items = match.replace(/ data-type='ul'/g, "");
			return `<ul>${items}</ul>`;
		});
		// 再处理有序列表
		html = html.replace(/(<li data-type='ol'>[\s\S]*?<\/li>\n?)+/g, (match) => {
			const items = match.replace(/ data-type='ol'/g, "");
			return `<ol>${items}</ol>`;
		});

		// 行内代码（`code`）
		html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

		// 加粗（**text** 或 __text__）
		html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
		html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

		// 斜体（*text* 或 _text_）- 注意放在加粗之后
		html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
		html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

		// 删除线（~~text~~）
		html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

		// 链接（[text](url)）
		html = html.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener">$1</a>',
		);

		// 换行处理
		html = html.replace(/\n\n/g, "</p><p>");
		html = html.replace(/\n/g, "<br>");

		return html;
	}

	/**
	 * 转义 HTML 特殊字符
	 * @param {string} text - 原始文本
	 * @returns {string} - 转义后的文本
	 * @private
	 */
	_escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * 滚动到底部（仅在用户位于底部附近时）
	 * @private
	 */
	_scrollToBottom() {
		// 默认使用 chatArea 作为滚动容器
		const scrollContainer = this.options.scrollContainer;
		if (scrollContainer) {
			// 只有当用户已经在底部附近时才自动滚动
			// 否则让用户继续阅读历史内容
			if (this.options.isNearBottom?.() ?? true) {
				requestAnimationFrame(() => {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				});
			}
		}
	}
}
