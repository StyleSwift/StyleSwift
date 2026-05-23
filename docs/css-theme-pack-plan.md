# 方案A：纯CSS主题包集成方案

## 一、方案概述

将开源CSS主题库转换为StyleSwift的Skill格式，通过CSS变量覆盖机制实现任意网站的主题风格转换。

### 核心优势

1. **零破坏性**：不修改DOM结构，仅注入CSS变量
2. **完美兼容**：复用现有CSS注入机制（`mergeCSS()`）
3. **AI友好**：主题库作为Skill，AI可智能选择
4. **跨站点复用**：同一主题包适用于多个网站

---

## 二、技术架构

### 2.1 CSS变量注入原理

现代网站普遍使用CSS变量定义主题：

```css
/* 网站原有样式 */
:root {
  --primary-color: #007bff;
  --text-color: #333;
  --font-family: Arial, sans-serif;
  --spacing: 16px;
}

/* StyleSwift注入覆盖 */
:root {
  --primary-color: #fcee09;  /* 覆盖为赛博朋克黄 */
  --text-color: #e0e0e0;     /* 覆盖为亮色文字 */
  --font-family: 'Rajdhani', sans-serif;
  --spacing: 8px;            /* 覆盖间距系统 */
}
```

### 2.2 三层主题架构

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: 基础变量库 (Foundation Variables)          │
│  - 定义标准变量命名规范                               │
│  - 提供语义化变量映射                                 │
│  - 适配任意网站                                       │
├─────────────────────────────────────────────────────┤
│  Layer 2: 风格主题包 (Style Theme Pack)              │
│  - 预设颜色/字体/间距值                               │
│  - 组件样式模板                                       │
│  - 特效CSS片段                                        │
├─────────────────────────────────────────────────────┤
│  Layer 3: 网站适配层 (Site Adaptation)               │
│  - 分析网站原有变量                                   │
│  - 生成变量映射规则                                   │
│  - 处理特殊情况（非变量样式）                         │
└─────────────────────────────────────────────────────┘
```

---

## 三、CSS主题库收集策略

### 3.1 推荐收集的开源主题库

| 主题库 | 类型 | 特点 | 收集方式 |
|--------|------|------|----------|
| **Open Props** | CSS变量库 | 标准化设计tokens | 直接提取变量定义 |
| **Tailwind CSS Colors** | 颜色系统 | 完整色彩体系 | 提取颜色变量 |
| **Bootstrap CSS Only** | 组件样式 | 经典组件模板 | 提取CSS片段 |
| **Normalize.css variants** | 基础样式 | 重置/基础样式 | 直接使用 |
| **Material Design Color** | 颜色系统 | Material色板 | 提取颜色定义 |
| **GitHub Primer** | 设计系统 | 企业级组件 | 提取变量+组件 |
| **Figma Design Tokens** | 变量标准 | 标准命名规范 | 作为参考规范 |

### 3.2 分类组织

```
themes/
├── foundations/
│   ├── open-props.md       # Open Props变量库
│   ├── normalize.md        # Normalize.css变体
│   └── tokens-standard.md  # 设计Tokens标准
├── colors/
│   ├── tailwind-colors.md  # Tailwind色彩系统
│   ├── material-colors.md  # Material Design色板
│   ├── github-colors.md    # GitHub Primer色彩
│   └── neon-colors.md      # 霓虹/赛博朋克色板
├── typography/
│   ├── system-fonts.md     # 系统字体栈
│   ├── web-fonts.md        # Web字体推荐
│   └── type-scales.md      # 字体尺寸体系
├── styles/
│   ├── minimal.md          # 极简风格
│   ├── dark-mode.md        # 深色模式
│   ├── brutalist.md        # 粗野主义
│   ├── retro.md            # 复古风格
│   ├── corporate.md        # 企业风格
│   ├── playful.md          # 活泼风格
└── complete-themes/
    ├── cyberpunk.md        # 完整赛博朋克主题
    ├── bauhaus.md          # 完整包豪斯主题
    ├── newspaper.md        # 完整报纸风格
    └── 9x-retro.md         # 完整复古主题
```

---

## 四、Skill格式设计

### 4.1 新增Skill类型：`css_theme`

现有类型：
- `style_dna`: 设计DNA文档（指导原则）
- `css_snippet`: 即用型CSS代码

新增类型：
- `css_theme`: CSS变量主题包（可组合、可覆盖）

### 4.2 `css_theme` Skill格式规范

```markdown
---
name: theme-name
type: css_theme
description: 简短描述（用于AI选择）
category: colors | typography | spacing | complete
compatible_with: [dark-mode, minimal, brutalist]  # 可组合的其他主题
variables: 24  # 变量数量
tags: [dark, neon, futuristic, cyberpunk]
---

# [主题名称]

## 适用场景

描述何时使用此主题，AI根据此判断是否匹配用户意图。

## CSS变量定义

```css
:root {
  /* 颜色系统 */
  --color-primary: #fcee09;
  --color-secondary: #00f0ff;
  --color-background: #0a0a0a;
  --color-text: #e0e0e0;
  
  /* 字体系统 */
  --font-family-heading: 'Rajdhani', sans-serif;
  --font-family-body: 'Rajdhani', sans-serif;
  --font-size-base: 15px;
  
  /* 间距系统 */
  --spacing-unit: 8px;
  --spacing-sm: 4px;
  --spacing-md: 16px;
  
  /* 形状系统 */
  --radius: 0px;
  --border-width: 1px;
  
  /* 效果系统 */
  --shadow: none;
  --glow-primary: 0 0 12px rgba(252, 238, 9, 0.5);
}
```

## 组合建议

推荐与以下主题组合使用：
- `dark-mode`: 增强深色模式体验
- `neon-colors`: 强化霓虹效果

## 应用示例

展示主题应用后的效果描述。

## 特殊处理

针对特定网站类型的适配说明。
```

### 4.3 与现有Skill兼容性

现有`style_dna`（如bauhaus.md）包含：
- 设计DNA（定性指导）
- CSS变量定义（定量实现）

新增的`css_theme`更轻量，专注于CSS变量，可单独使用或与`style_dna`组合：

```
用户请求 → AI选择组合 → 应用顺序

style_dna (bauhaus.md) + css_theme (dark-mode.md)
├── 1. 注入bauhaus变量（主要风格）
├── 2. 注入dark-mode变量（色彩覆盖）
└── 3. mergeCSS()合并处理
```

---

## 五、AI系统集成

### 5.1 系统提示更新

在`system-prompt.js`中增加主题库引导：

```javascript
// 系统提示新增部分
const THEME_GUIDANCE = `
## CSS主题库使用指南

当用户请求风格转换时，优先使用已加载的主题Skill：

1. **选择主题**：根据用户描述匹配合适的css_theme
   - "赛博朋克" → cyberpunk, neon-colors
   - "简约" → minimal, clean-spacing
   - "复古" → retro, newspaper
   - "深色模式" → dark-mode

2. **组合主题**：可组合多个主题包
   - 基础主题 + 颜色主题 + 字体主题
   - mergeCSS会自动处理覆盖逻辑

3. **变量映射**：分析网站原有CSS变量
   - 使用get_page_structure获取网站变量
   - 生成映射规则覆盖原有变量

4. **特殊处理**：非变量样式需要额外CSS
   - 特定组件样式
   - 效果类CSS（动画、滤镜）
`;
```

### 5.2 主题选择工具

新增`select_theme`工具：

```javascript
// tools/theme-tools.js
export const themeTools = {
  select_theme: {
    description: '根据用户意图选择合适的CSS主题包',
    parameters: {
      type: 'object',
      properties: {
        intent: { type: 'string', description: '用户风格意图描述' },
        combine_with: { 
          type: 'array', 
          items: { type: 'string' },
          description: '要组合的其他主题名'
        }
      },
      required: ['intent']
    },
    execute: async ({ intent, combine_with = [] }) => {
      // 1. 搜索匹配的主题Skill
      const matches = await searchThemeSkills(intent);
      
      // 2. 返回推荐组合
      return {
        recommended: matches.primary,
        combinations: matches.compatible,
        reasoning: matches.reasoning
      };
    }
  },
  
  get_site_variables: {
    description: '获取网站当前使用的CSS变量',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      // 通过content script提取:root变量
      const variables = await extractCSSVariables();
      return { variables, count: variables.length };
    }
  },
  
  map_variables: {
    description: '生成变量映射规则',
    parameters: {
      type: 'object',
      properties: {
        source_vars: { type: 'object', description: '网站原有变量' },
        theme_vars: { type: 'object', description: '主题包变量' }
      },
      required: ['source_vars', 'theme_vars']
    },
    execute: async ({ source_vars, theme_vars }) => {
      // 智能映射：语义匹配 + 名称匹配
      const mapping = generateVariableMapping(source_vars, theme_vars);
      return { mapping, css: generateCSSFromMapping(mapping) };
    }
  }
};
```

### 5.3 智能变量映射算法

```javascript
// lib/variable-mapping.js

/**
 * 智能变量映射
 * 1. 语义匹配：--primary-color → --color-primary
 * 2. 名称匹配：--font-size → --font-size-base
 * 3. 值类型匹配：颜色值映射到颜色变量
 */
function generateVariableMapping(sourceVars, themeVars) {
  const mapping = {};
  
  // 语义映射表
  const semanticMap = {
    'primary': ['primary', 'accent', 'brand'],
    'secondary': ['secondary', 'accent-secondary'],
    'background': ['background', 'bg', 'surface'],
    'text': ['text', 'foreground', 'fg'],
    'font': ['font', 'typography', 'type'],
    'spacing': ['spacing', 'space', 'gap'],
    'border': ['border', 'stroke'],
    'shadow': ['shadow', 'elevation', 'glow']
  };
  
  for (const [sourceName, sourceValue] of Object.entries(sourceVars)) {
    // 1. 直接名称匹配
    if (themeVars[sourceName]) {
      mapping[sourceName] = themeVars[sourceName];
      continue;
    }
    
    // 2. 语义匹配
    const sourceKey = extractKey(sourceName); // --primary-color → primary
    const semanticGroup = semanticMap[sourceKey];
    if (semanticGroup) {
      for (const alias of semanticGroup) {
        const themeVar = findVarBySemantic(themeVars, alias);
        if (themeVar) {
          mapping[sourceName] = themeVar.value;
          break;
        }
      }
    }
    
    // 3. 值类型匹配
    const valueType = detectValueType(sourceValue);
    if (valueType === 'color') {
      mapping[sourceName] = findMatchingColorVar(themeVars, sourceValue);
    }
  }
  
  return mapping;
}

function extractKey(varName) {
  // --primary-color → primary
  // --bg-color → bg
  return varName.replace(/^--/, '').split('-')[0];
}

function detectValueType(value) {
  if (/^(#|rgb|hsl|color)/.test(value)) return 'color';
  if (/^\d+px/.test(value)) return 'size';
  if (/^['"].*['"]/.test(value)) return 'font';
  return 'unknown';
}
```

---

## 六、实现步骤

### 6.1 Phase 1: 基础设施（预计2-3天）

1. **创建主题库目录结构**
   ```
   extension/themes/
   ├── foundations/
   ├── colors/
   ├── typography/
   ├── styles/
   └── complete-themes/
   ```

2. **扩展Skill加载器**
   - 修改`skill-loader.js`支持`css_theme`类型
   - 增加主题组合加载逻辑
   - 支持主题依赖解析

3. **更新skill-tools.js**
   - 新增`load_theme`工具
   - 新增`combine_themes`工具

### 6.2 Phase 2: 主题库创建（预计3-5天）

1. **从开源库提取变量**
   - Open Props: ~200个标准变量
   - Tailwind Colors: ~300个颜色变量
   - Material Colors: ~100个颜色变量

2. **转换为Skill格式**
   - 编写转换脚本
   - 生成标准化markdown文件

3. **创建基础主题包**
   - dark-mode（深色模式）
   - minimal（极简风格）
   - corporate（企业风格）

### 6.3 Phase 3: AI集成（预计2-3天）

1. **更新系统提示**
   - 添加主题库使用指南
   - 定义选择优先级

2. **新增主题工具**
   - `select_theme`: 智能主题选择
   - `get_site_variables`: 提取网站变量
   - `map_variables`: 生成映射规则

3. **优化CSS注入**
   - 支持变量优先级处理
   - 支持渐进式覆盖

### 6.4 Phase 4: 测试与优化（预计2天）

1. **测试用例**
   - 无CSS变量网站（如纯内联样式）
   - 标准CSS变量网站（如React应用）
   - 复杂变量网站（如多主题切换）

2. **性能优化**
   - 主题包懒加载
   - 变量映射缓存

---

## 七、代码修改清单

### 7.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `extension/themes/foundations/open-props.md` | Open Props变量库 |
| `extension/themes/colors/tailwind-colors.md` | Tailwind颜色系统 |
| `extension/themes/colors/neon-colors.md` | 霓虹色板 |
| `extension/themes/typography/system-fonts.md` | 系统字体栈 |
| `extension/themes/styles/dark-mode.md` | 深色模式主题 |
| `extension/themes/styles/minimal.md` | 极简风格主题 |
| `extension/sidepanel/tools/theme-tools.js` | 主题工具集 |
| `extension/sidepanel/lib/variable-mapping.js` | 变量映射算法 |

### 7.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `extension/sidepanel/skill-loader.js` | 支持css_theme类型加载 |
| `extension/sidepanel/tools/skill-tools.js` | 新增主题组合工具 |
| `extension/sidepanel/agent/system-prompt.js` | 添加主题库指南 |
| `extension/sidepanel/css-merge.js` | 支持变量优先级处理 |
| `extension/content/content.js` | 新增CSS变量提取函数 |

---

## 八、示例主题Skill

### 8.1 深色模式主题示例

```markdown
---
name: dark-mode
type: css_theme
description: 标准深色模式主题，适用于大多数网站的暗色转换
category: complete
compatible_with: [minimal, corporate]
variables: 20
tags: [dark, night, accessibility]
---

# Dark Mode Theme

## 适用场景

- 用户请求"深色模式"、"夜间模式"
- 网站需要降低亮度、减少眼疲劳
- 配合其他风格主题作为基础

## CSS变量定义

```css
:root {
  /* 背景色系 */
  --color-background: #0d0d0d;
  --color-background-alt: #1a1a1a;
  --color-surface: #242424;
  --color-surface-alt: #2d2d2d;
  
  /* 文字色系 */
  --color-text: #e4e4e4;
  --color-text-muted: #a0a0a0;
  --color-text-secondary: #808080;
  
  /* 强调色（适配原有强调色） */
  --color-primary: inherit;     /* 保持原有 */
  --color-accent: inherit;      /* 保持原有 */
  
  /* 边框与分割 */
  --color-border: #333333;
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
img, svg {
  filter: brightness(0.85) contrast(1.1);
}

/* 代码块深色处理 */
pre, code {
  background-color: var(--color-surface);
  color: var(--color-text);
}
```

## 组合建议

推荐组合：
- `minimal`: 极简深色模式
- `corporate`: 企业深色风格
- `neon-colors`: 霓虹深色（赛博朋克）

## 特殊处理

- 原有强调色保持不变（`inherit`）
- 图片自动降低亮度
- 阴影使用透明度而非灰色
```

### 8.2 霓虹色板示例

```markdown
---
name: neon-colors
type: css_theme
description: 霓虹色彩系统，赛博朋克/未来风格的色彩基础
category: colors
compatible_with: [dark-mode, cyberpunk]
variables: 15
tags: [neon, cyberpunk, futuristic, vibrant]
---

# Neon Colors

## 适用场景

- 用户请求"霓虹"、"赛博朋克"、"未来感"
- 需要强烈的视觉冲击
- 配合深色背景使用

## CSS变量定义

```css
:root {
  /* 霓虹色板 */
  --neon-yellow: #fcee09;
  --neon-cyan: #00f0ff;
  --neon-magenta: #ff003c;
  --neon-purple: #9b00ff;
  --neon-green: #39ff14;
  --neon-orange: #ff6600;
  --neon-pink: #ff69b4;
  
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
  --glow-md: 0 0 12px currentColor, 0 0 24px currentColor;
  --glow-lg: 0 0 20px currentColor, 0 0 40px currentColor;
}

/* 霓虹文字效果 */
.neon-text {
  color: var(--neon-yellow);
  text-shadow: var(--glow-md);
}

/* 霓虹按钮效果 */
.neon-button {
  border: 1px solid var(--neon-yellow);
  box-shadow: var(--glow-sm);
  transition: box-shadow 0.2s ease;
}

.neon-button:hover {
  box-shadow: var(--glow-md);
}
```

## 组合建议

必须组合：
- `dark-mode`: 霓虹需要深色背景才能突出

可选组合：
- `cyberpunk`: 完整赛博朋克风格
```

---

## 九、预期效果

### 9.1 用户使用流程

```
用户: "把这个网站改成赛博朋克风格"
  ↓
AI分析:
  - 搜索匹配主题 → cyberpunk, neon-colors, dark-mode
  - 获取网站变量 → { --primary: #007bff, --bg: #fff, ... }
  - 生成映射 → { --primary: #fcee09, --bg: #0a0a0a, ... }
  ↓
注入CSS:
  1. dark-mode变量（基础）
  2. neon-colors变量（色彩）
  3. cyberpunk特效CSS
  ↓
页面转换完成
```

### 9.2 兼容性矩阵

| 网站类型 | CSS变量支持 | 预期效果 | 处理策略 |
|----------|-------------|----------|----------|
| React/Vue SPA | ✅ 高 | 完美转换 | 直接变量覆盖 |
| 传统HTML站点 | ⚠️ 低 | 部分转换 | 生成额外CSS选择器 |
| Bootstrap站点 | ✅ 中 | 大部分转换 | 变量+类名覆盖 |
| WordPress站点 | ⚠️ 中 | 中等转换 | 变量+特定元素CSS |
| 纯内联样式 | ❌ 无 | 有限转换 | 元素级样式覆盖 |

---

## 十、风险与应对

### 10.1 潜在风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 网站无CSS变量 | 转换效果受限 | 生成特定元素CSS选择器 |
| 变量命名不规范 | 映射失败 | 智能语义匹配算法 |
| CSP限制 | 注入失败 | 已有fallback机制 |
| 主题包冲突 | 显示异常 | mergeCSS优先级处理 |
| 性能影响 | 页面加载慢 | 主题懒加载+缓存 |

### 10.2 fallback策略

```javascript
// 无CSS变量网站的fallback
if (siteVariables.length === 0) {
  // 1. 使用通用选择器覆盖
  applyGenericTheme(themeVars);
  
  // 2. 根据元素类型推断
  inferAndApply(elementAnalysis, themeVars);
}

// 通用选择器覆盖示例
function applyGenericTheme(vars) {
  const genericCSS = `
    body { 
      background-color: ${vars['--color-background']};
      color: ${vars['--color-text']};
    }
    a { color: ${vars['--color-primary']}; }
    h1, h2, h3 { 
      font-family: ${vars['--font-family-heading']};
    }
    button {
      background-color: ${vars['--color-primary']};
      color: ${vars['--color-background']};
    }
  `;
  injectCSS(genericCSS);
}
```

---

## 十一、后续扩展

### 11.1 Phase 5: 社区主题分享

- 在社区网站增加主题包分类
- 用户可上传自定义主题
- 支持主题评分和推荐

### 11.2 Phase 6: 动态主题生成

- AI根据网站特征自动生成适配变量
- 学习用户偏好，优化映射规则
- 支持主题微调（如调整亮度、饱和度）

---

## 十二、参考资料

### 开源CSS变量库

1. **Open Props**: https://open-props.style/
   - 标准化设计tokens
   - 200+个预定义变量

2. **Tailwind CSS**: https://tailwindcss.com/docs/customizing-colors
   - 完整色彩系统
   - 间距/字体体系

3. **GitHub Primer**: https://primer.style/
   - 企业级设计系统
   - CSS变量定义

4. **Material Design**: https://material.io/design/color/
   - Material色板
   - 颜色使用指南

### 技术参考

- CSS Variables (Custom Properties): MDN文档
- CSS `:root` 和 `var()` 函数
- `mergeCSS()` 算法设计（现有实现）