---
name: dark-mode
type: css_theme
description: 标准深色模式主题，适用于大多数网站的暗色转换，保护眼睛、降低亮度
category: complete
compatible_with: [minimal, corporate, neon-colors]
variables: 20
tags: [dark, night, accessibility, eye-care]
---

# Dark Mode Theme

## 适用场景

- 用户请求"深色模式"、"夜间模式"、"暗色"
- 网站需要降低亮度、减少眼疲劳
- 配合其他风格主题作为基础层

## CSS变量定义

```css
:root {
  /* 背景色系 */
  --color-background: #0d0d0d;
  --color-background-alt: #1a1a1a;
  --color-surface: #242424;
  --color-surface-alt: #2d2d2d;
  --color-card: #1f1f1f;
  --color-modal: #2a2a2a;
  
  /* 文字色系 */
  --color-text: #e4e4e4;
  --color-text-muted: #a0a0a0;
  --color-text-secondary: #888888;
  --color-text-disabled: #666666;
  
  /* 边框与分割 */
  --color-border: #333333;
  --color-border-light: #404040;
  --color-divider: #404040;
  
  /* 状态色 */
  --color-success: #2ecc71;
  --color-warning: #f39c12;
  --color-error: #e74c3c;
  --color-info: #3498db;
  
  /* 阴影（深色模式阴影更柔和） */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
  
  /* 对比度调整 */
  --contrast-multiplier: 1.2;
}

/* 图片/图标亮度调整 */
img:not([src*="logo"]):not([src*="icon"]) {
  filter: brightness(0.85) contrast(1.1);
}

/* 代码块深色处理 */
pre, code, .code-block {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

/* 输入框深色处理 */
input, textarea, select {
  background-color: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

/* 表格深色处理 */
table, th, td {
  border-color: var(--color-border);
}

th {
  background-color: var(--color-surface);
}

/* 链接保持可见性 */
a {
  color: var(--color-info);
}

a:hover {
  color: var(--color-text);
}
```

## 组合建议

推荐组合使用：
- `minimal`: 极简深色模式（去掉多余装饰）
- `corporate`: 企业深色风格（专业感）
- `neon-colors`: 霓虹深色（赛博朋克风格）

组合顺序建议：
1. 先应用 dark-mode（基础层）
2. 再应用颜色/风格主题（覆盖层）

## 应用效果

应用后页面呈现：
- 纯黑背景 (#0d0d0d)
- 柔和亮灰文字 (#e4e4e4)
- 低对比度边框和分割线
- 图片自动降低亮度
- 输入框、表格等元素自动适配

## 特殊处理

- 原有强调色（primary/accent）保持不变，避免品牌色丢失
- Logo和图标保持原有亮度
- 阴影使用透明度而非灰色，更自然
- 链接使用蓝色保持可识别性

## 注意事项

- 可能与部分网站的透明元素冲突，需手动调整
- 某些嵌入式iframe可能不生效
- 动态加载内容需要重新注入