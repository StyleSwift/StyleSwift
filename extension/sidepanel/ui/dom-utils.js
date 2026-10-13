/**
 * StyleSwift - 侧边栏 DOM 辅助函数
 */

/**
 * 生成 Iconify 图标的 HTML 字符串
 * 使用 CSS mask-image 方案，颜色继承 currentColor
 * @param {string} name - 图标名称，对应 CSS 类 .icon-{name}
 * @param {number} size - 图标尺寸（px）
 * @param {string} [extraClass] - 额外的 CSS 类名
 * @returns {string} 图标 HTML 字符串
 */
export function iconHtml(name, size, extraClass = "") {
	const cls = extraClass ? ` ${extraClass}` : "";
	return `<span class="icon icon-${name}${cls}" style="width:${size}px;height:${size}px" aria-hidden="true"></span>`;
}

/**
 * 转义 HTML 特殊字符
 * @param {string} text - 原始文本
 * @returns {string} - 转义后的文本
 */
export function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}
