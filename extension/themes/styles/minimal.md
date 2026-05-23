---
name: minimal
type: css_theme
description: 极简风格主题，去除装饰、减少视觉噪音，专注内容呈现
category: complete
compatible_with: [dark-mode, corporate]
variables: 25
tags: [minimal, clean, simple, zen, content-focused]
---

# Minimal Theme

## 适用场景

- 用户请求"极简"、"简约"、"干净"、"清爽"
- 内容为主的网站（博客、文档、阅读类）
- 需要减少视觉噪音、专注阅读

## CSS变量定义

```css
:root {
  /* 颜色 - 极简只用黑白灰 */
  --color-background: #ffffff;
  --color-text: #333333;
  --color-text-secondary: #666666;
  --color-text-muted: #999999;
  --color-border: #e0e0e0;
  --color-divider: #f0f0f0;
  
  /* 强调色 - 单一强调色 */
  --color-accent: #333333;
  
  /* 状态色 - 保持简单 */
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-error: #dc3545;
  
  /* 字体 - 系统字体，无装饰 */
  --font-family: system-ui, -apple-system, sans-serif;
  --font-family-mono: monospace;
  
  /* 字号 - 适度大小 */
  --font-size-base: 16px;
  --font-size-small: 14px;
  --font-size-large: 18px;
  --font-size-heading: 24px;
  --font-size-display: 32px;
  
  /* 字重 - 正常为主 */
  --font-weight-normal: 400;
  --font-weight-heading: 600;
  
  /* 间距 - 宽松舒适 */
  --spacing-unit: 24px;
  --spacing-sm: 12px;
  --spacing-md: 24px;
  --spacing-lg: 48px;
  --spacing-xl: 72px;
  
  /* 形状 - 无圆角，无装饰 */
  --radius: 0;
  --border-width: 1px;
  
  /* 阴影 - 无阴影 */
  --shadow: none;
  
  /* 动画 - 无动画 */
  --transition: none;
}

/* ===== 极简化规则 ===== */

/* 去除所有装饰 */
* {
  box-shadow: none !important;
  text-shadow: none !important;
}

/* 去除圆角 */
* {
  border-radius: 0 !important;
}

/* 去除渐变背景 */
* {
  background-image: none !important;
}

/* 去除多余边框 */
.card, .panel, .box, .container {
  border: 1px solid var(--color-border);
}

/* 简化按钮 */
button, .btn, .button, input[type="submit"], input[type="button"] {
  background: var(--color-text);
  color: var(--color-background);
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: var(--font-weight-normal);
  letter-spacing: normal;
}

button:hover {
  opacity: 0.8;
}

/* 简化链接 */
a {
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-color: var(--color-border);
}

a:hover {
  text-decoration-color: var(--color-text);
}

/* 简化输入 */
input, textarea, select {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  padding: var(--spacing-sm);
}

input:focus, textarea:focus {
  outline: 1px solid var(--color-text);
  outline-offset: 2px;
}

/* 简化图片 */
img {
  max-width: 100%;
  height: auto;
  border: none;
  filter: none;
}

/* 简化列表 */
ul, ol {
  padding-left: var(--spacing-md);
}

li {
  margin-bottom: var(--spacing-sm);
}

/* 简化表格 */
table {
  border-collapse: collapse;
  width: 100%;
}

th, td {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  text-align: left;
}

/* 简化标题 */
h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-weight-heading);
  margin: var(--spacing-lg) 0 var(--spacing-md);
  color: var(--color-text);
}

h1 { font-size: var(--font-size-display); }
h2 { font-size: var(--font-size-heading); }
h3 { font-size: var(--font-size-large); }

/* 简化段落 */
p {
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
}

/* 简化代码 */
code, pre {
  font-family: var(--font-family-mono);
  background: #f5f5f5;
  padding: 2px 6px;
  font-size: var(--font-size-small);
}

pre {
  padding: var(--spacing-md);
  overflow-x: auto;
}
```

## 组合建议

推荐组合：
- `dark-mode`: 极简深色模式（黑白翻转）
- `corporate`: 企业极简（增加专业感）

不推荐组合：
- `neon-colors`: 与极简理念冲突
- `cyberpunk`: 风格完全相反

## 应用效果

应用后页面呈现：
- 纯白背景 + 黑灰文字
- 无圆角、无阴影、无渐变
- 宽松间距，舒适阅读
- 所有交互元素简化为最基本形式
- 图片去除滤镜和装饰

## 极简设计原则

参考 Dieter Rams 的"好设计是尽可能少的设计"：

1. **去除装饰**：圆角、阴影、渐变、滤镜
2. **减少颜色**：只用黑白灰 + 单一强调色
3. **统一字体**：系统字体，无Web字体
4. **宽松间距**：足够呼吸空间
5. **简化交互**：hover效果最小化