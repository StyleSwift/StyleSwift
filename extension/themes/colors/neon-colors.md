---
name: neon-colors
type: css_theme
description: 霓虹色彩系统，赛博朋克/未来风格的色彩基础，强烈视觉冲击
category: colors
compatible_with: [dark-mode, cyberpunk]
variables: 15
tags: [neon, cyberpunk, futuristic, vibrant, glowing]
---

# Neon Colors

## 适用场景

- 用户请求"霓虹"、"赛博朋克"、"未来感"、"发光"
- 需要强烈的视觉冲击和科技感
- **必须配合深色背景使用**（dark-mode）

## CSS变量定义

```css
:root {
  /* 霓虹色板 - 核心颜色 */
  --neon-yellow: #fcee09;
  --neon-cyan: #00f0ff;
  --neon-magenta: #ff003c;
  --neon-purple: #9b00ff;
  --neon-green: #39ff14;
  --neon-orange: #ff6600;
  --neon-pink: #ff69b4;
  --neon-blue: #00b4ff;
  
  /* 霓虹色板 - 扩展颜色 */
  --neon-yellow-dim: rgba(252, 238, 9, 0.6);
  --neon-cyan-dim: rgba(0, 240, 255, 0.6);
  --neon-magenta-dim: rgba(255, 0, 60, 0.6);
  
  /* 语义映射 */
  --color-primary: var(--neon-yellow);
  --color-secondary: var(--neon-cyan);
  --color-accent: var(--neon-magenta);
  --color-success: var(--neon-green);
  --color-warning: var(--neon-orange);
  --color-error: var(--neon-magenta);
  --color-info: var(--neon-cyan);
  
  /* 发光效果 */
  --glow-sm: 0 0 4px currentColor;
  --glow-md: 0 0 12px currentColor, 0 0 24px rgba(currentColor, 0.3);
  --glow-lg: 0 0 20px currentColor, 0 0 40px rgba(currentColor, 0.4);
  --glow-xl: 0 0 30px currentColor, 0 0 60px rgba(currentColor, 0.5);
  
  /* 特定颜色发光 */
  --glow-yellow: 0 0 12px rgba(252, 238, 9, 0.5), 0 0 24px rgba(252, 238, 9, 0.2);
  --glow-cyan: 0 0 12px rgba(0, 240, 255, 0.5), 0 0 24px rgba(0, 240, 255, 0.2);
  --glow-magenta: 0 0 12px rgba(255, 0, 60, 0.5), 0 0 24px rgba(255, 0, 60, 0.2);
}

/* 霓虹文字效果 */
a, .link, .hyperlink {
  color: var(--neon-cyan);
  text-shadow: var(--glow-sm);
}

a:hover {
  text-shadow: var(--glow-md);
}

h1, h2, h3, .heading, .title {
  color: var(--neon-yellow);
  text-shadow: var(--glow-sm);
}

/* 霓虹按钮效果 */
button, .btn, .button {
  border: 1px solid var(--neon-yellow);
  color: var(--neon-yellow);
  background: transparent;
  box-shadow: var(--glow-sm);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

button:hover, .btn:hover {
  box-shadow: var(--glow-md);
  border-color: var(--neon-cyan);
}

button.primary, .btn-primary {
  background: var(--neon-yellow);
  color: #0a0a0a;
  box-shadow: var(--glow-md);
}

button.secondary, .btn-secondary {
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
}

/* 霓虹输入框效果 */
input:focus, textarea:focus, select:focus {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-sm);
  outline: none;
}

/* 霓虹卡片效果 */
.card, .panel, .box {
  border-color: var(--neon-yellow);
  box-shadow: var(--glow-sm);
}

.card:hover {
  box-shadow: var(--glow-md);
}

/* 强调元素 */
.highlight, .emphasis, strong {
  color: var(--neon-magenta);
}

/* 代码块 */
code, pre {
  color: var(--neon-green);
  border-color: var(--neon-green);
}
```

## 组合建议

**必须组合**：
- `dark-mode`: 霓虹需要深色背景才能突出效果

**推荐组合**：
- `cyberpunk`: 完整赛博朋克风格（包含字体、特效）
- `futuristic-typography`: 未来感字体系统

组合顺序：
1. dark-mode（深色背景）
2. neon-colors（霓虹色彩）
3. cyberpunk（完整风格）

## 应用效果

应用后页面呈现：
- 黄色 (#fcee09) 作为主要强调色
- 青色 (#00f0ff) 作为链接/次要强调
- 紫红 (#ff003c) 作为警告/危险提示
- 所有交互元素带有发光效果
- hover状态发光强度增加

## 注意事项

- **不适用于亮色背景**：霓虹在亮色背景上效果极差
- **可能过于刺激**：长时间观看可能造成视觉疲劳
- **打印效果差**：打印时发光效果会消失
- **性能考虑**：大量发光效果可能影响低端设备性能