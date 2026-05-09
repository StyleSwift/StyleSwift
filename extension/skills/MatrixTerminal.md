---
name: MatrixTerminal
description: 黑客帝国终端风格 - 深黑色背景、霓虹绿色文字、等宽字体、极简边框
---
# Matrix Terminal 风格指南

## 风格描述
灵感来源于《黑客帝国》电影中的终端界面。深黑色背景配合霓虹绿色文字，使用等宽字体营造出终端/黑客的氛围。风格克制而有力，避免过度装饰，专注于色彩对比和简洁的边框效果。

## 色彩方案

### 背景色
- 主背景: `#0d0d0d` (深黑色)
- 次背景: `#0a0a0a` (更深的黑色，用于卡片/面板)

### 文字色
- 主文字: `#00ff41` (霓虹绿)
- 强调文字: `#39ff14` (亮绿色，用于标题和链接)

### 边框色
- 边框: `#003300` (深绿色)

### 状态色
- 悬停: `rgba(0, 255, 65, 0.1)` (半透明绿色背景)
- 选中/焦点: `#00ff41` 边框

## 字体
- 主字体: `'Courier New', 'Lucida Console', monospace`
- 所有元素统一使用等宽字体

## 视觉效果

### 边框
- 使用 1px solid 边框
- 按钮使用 dashed 边框
- 悬停时切换为 solid 边框

### 背景
- 纯色背景，无渐变
- 无点阵或扫描线效果（保持简洁）

### 动画
- 无闪烁动画
- 无脉冲发光效果
- 简单的颜色过渡 (transition: all 0.2s ease)

### 阴影
- 最小化使用阴影
- 仅在必要时使用轻微的 box-shadow

## 设计意图
打造一个简洁、专业、具有黑客美学的界面。通过强烈的黑绿对比营造氛围，而非依赖复杂的装饰效果。适合开发者工具、技术文档、代码仓库等场景。

## 参考 CSS

```css
/* 全局基础 */
body {
  background-color: #0d0d0d;
  color: #00ff41;
  font-family: 'Courier New', 'Lucida Console', monospace;
}

/* 导航栏 */
header {
  background-color: #0a0a0a;
  border-bottom: none;
}

/* 内容区域 */
.main-content {
  background-color: #0d0d0d;
  color: #00ff41;
}

/* 链接 */
a {
  color: #39ff14;
  text-decoration: none;
}

a:hover {
  color: #00ff41;
}

/* 按钮 */
button, .btn {
  background-color: transparent;
  border: 1px dashed #003300;
  color: #00ff41;
}

button:hover, .btn:hover {
  border-color: #00ff41;
  border-style: solid;
  background-color: rgba(0, 255, 65, 0.1);
}

/* 主要按钮 */
.btn-primary {
  background-color: #003300;
  border: 1px solid #00ff41;
}

/* 输入框 */
input, textarea {
  background-color: #0a0a0a;
  border: 1px solid #003300;
  color: #00ff41;
}

input:focus, textarea:focus {
  border-color: #00ff41;
}

/* 表格 */
table {
  border-color: #003300;
}

th, td {
  border: 1px solid #003300;
  background-color: #0a0a0a;
}

/* 卡片/面板 */
.card, .panel, .box {
  background-color: #0d0d0d;
  border: 1px solid #003300;
}

/* 标题 */
h1, h2, h3, h4, h5, h6 {
  color: #39ff14;
}

/* 代码块 */
code, pre {
  background-color: #0a0a0a;
  border: 1px solid #003300;
  color: #00ff41;
}

/* 头像 */
.avatar {
  border: 1px solid #003300;
}

/* 标签 */
.label, .tag {
  background-color: rgba(0, 255, 65, 0.1);
  border: 1px solid #003300;
  color: #39ff14;
}

/* 计数器 */
.counter {
  background-color: rgba(0, 255, 65, 0.15);
  border: 1px solid #003300;
  color: #39ff14;
}

/* 隐藏装饰性分隔线 */
.horizontal-divider, .vertical-divider {
  height: 0;
  border: none;
  background: none;
}
```