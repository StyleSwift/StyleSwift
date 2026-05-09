---
name: Cozy style
description: 温馨可爱、童趣十足，柔和粉嫩配色，圆润边角，温暖色调
---
# 樱桃小丸子温馨风格

## 风格描述

樱桃小丸子风格是一个充满童趣和温馨感的视觉主题，灵感来源于经典动漫樱桃小丸子的视觉元素。整体风格以柔和的粉嫩配色为主，搭配温暖的奶油色背景，圆润的边角设计，营造出一种充满童趣、温馨可爱的视觉体验。

**核心特点：**
- 柔和粉嫩的配色方案
- 温暖的奶油色系背景
- 大量圆润的边角设计（12-20px）
- 温暖的棕色调文字，避免冷色调
- 柔和的阴影效果，粉色调
- hover 时的颜色渐变和微妙动画
- 简洁无多余装饰，注重功能性

## 配色方案

### 主要颜色
- **主背景色**：`#fffbf0`（温暖浅黄）
- **次背景色**：`#fff9e6`（奶油色）
- **卡片背景**：`#fff9e6`（奶油色）

### 主题色
- **主色调（粉色）**：`#ffb7c5`（小丸子毛衣色）
- **强调色（橙红）**：`#ff6b6b`（腮红色）
- **深粉色**：`#d81b60`

### 辅助色
- **天蓝色**：`#87ceeb`（链接、图标）
- **薄荷绿**：`#98d8c8`（成功状态）
- **橙色**：`#ffb74d`（文件图标、警告）

### 文字颜色
- **主文字**：`#5d4037`（深棕色，温暖）
- **次要文字**：`#8d6e63`（浅棕色）
- **避免使用纯黑色或灰色**

### 边框颜色
- **主边框**：`#ffe0b2`（柔和橙色）
- **粉色边框**：`#ffb7c5`
- **避免冷色调边框**

### 阴影颜色
- **柔和阴影**：使用 rgba 粉色调，如 `rgba(255, 183, 197, 0.2)`、`rgba(255, 224, 178, 0.3)`
- **避免使用灰色阴影**

## 字体排版

- **适当采用圆润字体**：Comic Sans MS、Chalkboard SE
- **行高适中**：保持原有 line-height
- **字体权重**：标题使用 600，正文使用 400-500
- **避免过于紧凑的排版**

## 视觉效果

### 边角设计
- **卡片容器**：`border-radius: 16-20px`
- **按钮**：`border-radius: 12px`
- **输入框**：`border-radius: 12px`
- **小元素（标签、徽章）**：`border-radius: 6-8px`
- **图标容器**：`border-radius: 6px`

### 边框
- **主要边框宽度**：`2px`（比常规稍宽）
- **次要边框宽度**：`1px`
- **避免过多装饰性边框**

### 阴影
- **卡片阴影**：`0 4px 12px rgba(255, 224, 178, 0.2)`
- **按钮阴影**：`0 2px 8px rgba(255, 183, 197, 0.3)`
- **hover 阴影**：`0 4px 12px rgba(255, 183, 197, 0.4)`
- **模态框阴影**：`0 12px 48px rgba(255, 183, 197, 0.5)`

### 过渡动画
- **过渡时间**：`0.3s ease`
- **hover 效果**：颜色变化、轻微位移（如 `translateY(-2px)`）
- **保持微妙，避免过度动画**

## 设计意图

### 目标效果
创造一个温馨、可爱、充满童趣的视觉体验，让用户在使用过程中感受到愉悦和温暖。通过柔和的配色、圆润的设计、温暖的色调，营造出樱桃小丸子式的温馨氛围。

### 适用场景
- 个人项目、博客、作品集
- 儿童教育相关网站
- 生活类、休闲类应用
- 需要温馨氛围的社区论坛
- 女性用户为主的平台

### 不适用场景
- 商业严肃的企业网站
- 技术密集的开发者平台
- 需要冷色调的专业场景

## 参考 CSS（注意：选择器需根据具体页面调整）

### 全局背景和文字
```css
body {
  background-color: #fffbf0 !important;
  color: #5d4037 !important;
}

/* 主容器背景 */
.application-main,
.main-container {
  background-color: #fffbf0 !important;
}
```

### 卡片和面板
```css
/* 卡片容器 */
.card,
.panel,
.box {
  background-color: #fff9e6 !important;
  border: 2px solid #ffe0b2 !important;
  border-radius: 16px !important;
  box-shadow: 0 4px 12px rgba(255, 224, 178, 0.2) !important;
}
```

### 按钮
```css
/* 主按钮 */
.btn-primary {
  background-color: #ffb7c5 !important;
  border: 2px solid #ff8fa3 !important;
  border-radius: 12px !important;
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(255, 183, 197, 0.4) !important;
}

.btn-primary:hover {
  background-color: #ff8fa3 !important;
  border-color: #ff6b6b !important;
  box-shadow: 0 6px 16px rgba(255, 183, 197, 0.5) !important;
}

/* 次按钮 */
.btn-secondary {
  background-color: #fff9e6 !important;
  border: 2px solid #ffe0b2 !important;
  border-radius: 12px !important;
  color: #5d4037 !important;
}

.btn-secondary:hover {
  background-color: #ffe8ec !important;
  border-color: #ffb7c5 !important;
}
```

### 链接
```css
a {
  color: #ffb7c5 !important;
  transition: all 0.3s ease !important;
}

a:hover {
  color: #ff6b6b !important;
  background-color: rgba(255, 183, 197, 0.1) !important;
  border-radius: 6px !important;
}
```

### 输入框
```css
input,
textarea {
  background-color: #fff9e6 !important;
  border: 2px solid #ffe0b2 !important;
  border-radius: 12px !important;
  color: #5d4037 !important;
  padding: 8px 12px !important;
  box-shadow: 0 2px 8px rgba(255, 224, 178, 0.2) !important;
}

input:focus,
textarea:focus {
  border-color: #ffb7c5 !important;
  box-shadow: 0 0 0 3px rgba(255, 183, 197, 0.3) !important;
}
```

### 标签和徽章
```css
.tag,
.badge {
  background-color: #ffe8ec !important;
  border: 1px solid #ffb7c5 !important;
  border-radius: 12px !important;
  color: #d81b60 !important;
  padding: 4px 12px !important;
  font-weight: 600 !important;
}
```

### 图标
```css
/* 图标颜色 */
svg.icon {
  color: #ffb7c5 !important;
  transition: all 0.3s ease !important;
}

svg.icon:hover {
  color: #ff6b6b !important;
  transform: scale(1.1) !important;
}
```

## 关键要点

1. **配色优先级**：粉色系 > 橙色系 > 天蓝色 > 薄荷绿
2. **温暖色调**：所有颜色都偏向温暖，避免冷色调
3. **圆润设计**：大量使用 border-radius，营造柔和感
4. **微妙阴影**：使用粉色调阴影，不要用灰色
5. **功能优先**：保持可用性，不牺牲功能性
6. **一致性**：确保所有元素风格统一
7. **避免过度**：保持简洁，不要过度装饰

## 使用建议

- 优先使用 CSS 变量定义颜色，便于主题切换
- 保持 WCAG AA 对比度标准（4.5:1）
- 注意文字在粉色背景上的可读性
- hover 效果要微妙，不要过于夸张
- 测试在不同屏幕尺寸下的表现
- 确保触摸目标至少 44x44px