---
name: Newspaper Style
description: 经典英式报纸排版风格，严肃典雅，墨色浓重，金色点缀，衬线字体主导，强调层次分明的版面感。
---

# 英伦报刊风格 (British Broadsheet)

## 风格描述

模拟英国传统大报（如 The Times、The Telegraph、The Guardian）的印刷排版美学。整体色调以羊皮纸暖黄为底，深墨色文字为主体，古铜金作为装饰性点缀，勃艮第深红用于强调与链接。排版密集但层次分明，大量使用双线、细线作为版块分隔，导航与侧栏标签全大写处理，追求庄重、典雅、可读性极强的编辑部质感。

## 配色方案

- 纸张底色: #f5f0e6 (羊皮纸) / #faf6ee (正文区浅象牙)
- 墨色: #1a1a18 (深墨黑，替代纯黑，更温润)
- 强调色/链接: #8b1a1a (勃艮第深红)
- 装饰线/描边: #c4a35a (古铜金)
- 辅助文字: #6b5b3e (暖褐)
- 正文文字: #2c2c28 / #4a4a42 (深灰褐)
- 交互提示: #9e9478 (淡褐，placeholder)

## 字体方案

- 标题/导航: Playfair Display (经典英式衬线)
- 中文正文: Noto Serif SC (宋体风格)
- 西文正文: Source Serif 4 (优雅衬线)
- 备选: Georgia, serif

## 排版特征

- 导航标签、侧栏分区标题: 全大写 (text-transform: uppercase) + 宽字距 (letter-spacing: 2-2.5px)
- 摘要/引用文字: 斜体 (font-style: italic)
- 版块分隔: 双线 (3px double) 或细实线 (1px solid)
- 分类标签: 全大写 + 勃艮第红文字，无背景色，仅保留语义
- 文章标签: 左侧金色竖线标记，无背景色
- 统计数字: Playfair Display 粗体

## 视觉效果

- 圆角: 全部移除 (border-radius: 0)，直角为主
- 阴影: 无，用线条和背景色差异区分层次
- 背景: 无渐变，无玻璃态，纯色为主
- 按钮: 直角，活跃状态为墨底浅字反色
- 选中文字: 金色背景 + 墨色文字
- 滚动条: 金色滑块 + 纸张色轨道，悬停转深红

## 设计意图

将现代论坛界面转化为英伦报刊的版面质感。通过衬线字体体系、暖色调纸张背景、精致的线条分隔和克制的色彩运用，营造出沉稳、权威、有文化底蕴的阅读氛围。金色仅用于装饰性描边和分隔线，勃艮第红用于可交互元素的强调，两者用量极少，避免华而不实。

## 参考 CSS

```css
/* 基础配色与字体 */
body {
  background-color: #f5f0e6;
  color: #1a1a1a;
  font-family: 'Noto Serif SC', 'Source Serif 4', 'Georgia', serif;
}

/* 主内容区：浅象牙底 + 左侧细线分隔 */
#main-outlet {
  background-color: #faf6ee;
  border-left: 1px solid #d4c9b0;
}

/* 顶部导航：深墨底 + 金色双线 */
header {
  background-color: #1a1a18;
  color: #f5f0e6;
  border-bottom: 3px double #c4a35a;
}

/* 侧栏分区标题：全大写 + 底部粗线 */
.sidebar-section-header-text {
  font-family: 'Playfair Display', serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #1a1a18;
  border-bottom: 2px solid #1a1a18;
  padding-bottom: 6px;
  margin-bottom: 8px;
}

/* 话题列表：双线表头 + 细线行分隔 */
thead { border-bottom: 3px double #1a1a18; }
tbody tr { border-bottom: 1px solid #d4c9b0; }

/* 话题标题 */
td a.title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a18;
}

/* 分类标签：全大写 + 勃艮第红 */
.badge-category__name {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #8b1a1a;
  background: none;
  padding: 0;
  border: none;
}

/* 文章标签：左侧金色竖线 */
.discourse-tag {
  border: none;
  border-left: 2px solid #c4a35a;
  padding-left: 8px;
  margin-left: 8px;
  color: #6b5b3e;
  background: none;
}

/* 摘要：斜体 */
.topic-excerpt {
  font-style: italic;
  color: #4a4a42;
}

/* 导航标签：全大写 + 宽字距 */
.nav-link {
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #6b5b3e;
}

/* 活跃导航：墨底浅字反色 */
.nav-link.active {
  color: #f5f0e6;
  background-color: #1a1a18;
  font-weight: 700;
}

/* 主按钮：勃艮第红底 */
.btn-primary {
  background-color: #8b1a1a;
  color: #f5f0e6;
  border: 1px solid #8b1a1a;
  border-radius: 0;
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* 搜索框：金色描边 + 直角 */
.search-input {
  border: 1px solid #c4a35a;
  border-radius: 0;
  background-color: #faf6ee;
}

/* 筛选下拉框 */
.select-kit-header {
  background: transparent;
  border: 1px solid #c4a35a;
  border-radius: 0;
  font-family: 'Playfair Display', serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 文字选中 */
::selection {
  background-color: #c4a35a;
  color: #1a1a18;
}

/* 滚动条 */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background-color: #f5f0e6; }
::-webkit-scrollbar-thumb { background-color: #c4a35a; }
::-webkit-scrollbar-thumb:hover { background-color: #8b1a1a; }
```
