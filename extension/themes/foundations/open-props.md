---
name: open-props-foundation
type: css_theme
description: Open Props标准变量库，提供标准化设计tokens，作为其他主题的基础层
category: foundations
compatible_with: [all]
variables: 80
tags: [foundation, standard, tokens, open-props]
---

# Open Props Foundation

## 适用场景

- 作为所有主题的基础变量层
- 标准化变量命名规范
- 提供完整的设计tokens体系

## CSS变量定义

```css
:root {
  /* ===== 颜色系统 ===== */
  
  /* 灰度 */
  --gray-0: #f8f9fa;
  --gray-1: #f1f3f5;
  --gray-2: #e9ecef;
  --gray-3: #dee2e6;
  --gray-4: #ced4da;
  --gray-5: #adb5bd;
  --gray-6: #868e96;
  --gray-7: #495057;
  --gray-8: #343a40;
  --gray-9: #212529;
  
  /* 主色调（可被其他主题覆盖） */
  --color-brand: #007bff;
  --color-brand-light: #4dabff;
  --color-brand-dark: #0056b3;
  
  /* 状态色 */
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-error: #dc3545;
  --color-info: #17a2b8;
  
  /* ===== 字体系统 ===== */
  
  /* 字体栈 */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-serif: Georgia, 'Times New Roman', Times, serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  
  /* 字号 */
  --font-size-0: 0.75rem;    /* 12px */
  --font-size-1: 0.875rem;   /* 14px */
  --font-size-2: 1rem;       /* 16px - base */
  --font-size-3: 1.125rem;   /* 18px */
  --font-size-4: 1.25rem;    /* 20px */
  --font-size-5: 1.5rem;     /* 24px */
  --font-size-6: 1.875rem;   /* 30px */
  --font-size-7: 2.25rem;    /* 36px */
  --font-size-8: 3rem;       /* 48px */
  --font-size-9: 4rem;       /* 64px */
  
  /* 字重 */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 900;
  
  /* 行高 */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* 字间距 */
  --letter-spacing-tight: -0.05em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.05em;
  --letter-spacing-wider: 0.1em;
  
  /* ===== 间距系统 ===== */
  
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-7: 1.75rem;   /* 28px */
  --space-8: 2rem;      /* 32px */
  --space-9: 2.5rem;    /* 40px */
  --space-10: 3rem;     /* 48px */
  --space-11: 4rem;     /* 64px */
  --space-12: 5rem;     /* 80px */
  --space-13: 6rem;     /* 96px */
  --space-14: 8rem;     /* 128px */
  --space-15: 10rem;    /* 160px */
  --space-16: 12rem;    /* 192px */
  --space-17: 16rem;    /* 256px */
  --space-18: 20rem;    /* 320px */
  --space-19: 24rem;    /* 384px */
  --space-20: 32rem;    /* 512px */
  
  /* ===== 尺寸系统 ===== */
  
  --size-0: 0;
  --size-1: 0.25rem;
  --size-2: 0.5rem;
  --size-3: 1rem;
  --size-4: 1.25rem;
  --size-5: 1.5rem;
  --size-6: 2rem;
  --size-7: 2.5rem;
  --size-8: 3rem;
  --size-9: 4rem;
  --size-10: 5rem;
  --size-11: 7.5rem;
  --size-12: 10rem;
  --size-13: 15rem;
  --size-14: 20rem;
  --size-15: 30rem;
  
  /* ===== 边框系统 ===== */
  
  --border-width-0: 0;
  --border-width-1: 1px;
  --border-width-2: 2px;
  --border-width-3: 3px;
  --border-width-4: 4px;
  --border-width-5: 5px;
  
  --radius-0: 0;
  --radius-1: 0.125rem;  /* 2px */
  --radius-2: 0.25rem;   /* 4px */
  --radius-3: 0.5rem;    /* 8px */
  --radius-4: 0.75rem;   /* 12px */
  --radius-5: 1rem;      /* 16px */
  --radius-6: 1.5rem;    /* 24px */
  --radius-round: 50%;
  --radius-full: 9999px;
  
  /* ===== 阴影系统 ===== */
  
  --shadow-0: none;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-2: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-3: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-4: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-5: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
  --shadow-6: 0 25px 50px rgba(0, 0, 0, 0.25);
  
  /* ===== 动画系统 ===== */
  
  --ease-linear: linear;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6);
  
  --duration-instant: 0ms;
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
  --duration-slowest: 1000ms;
  
  /* ===== 模糊系统 ===== */
  
  --blur-0: 0;
  --blur-1: 0.25rem;
  --blur-2: 0.5rem;
  --blur-3: 1rem;
  --blur-4: 2rem;
  --blur-5: 4rem;
  
  /* ===== Z-index系统 ===== */
  
  --z-0: 0;
  --z-1: 10;
  --z-2: 20;
  --z-3: 30;
  --z-4: 40;
  --z-5: 50;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
}
```

## 组合建议

- **基础层**：作为所有主题的底层，提供标准变量
- **其他主题覆盖**：颜色/字体等变量由上层主题覆盖

组合顺序：
1. open-props-foundation（基础tokens）
2. 颜色主题（覆盖颜色变量）
3. 风格主题（覆盖完整变量组）

## 设计原则

参考 Open Props (https://open-props.style) 的设计理念：

1. **标准化命名**：使用数字层级而非语义名称
2. **渐进式尺度**：从小到大，便于选择
3. **语义化分组**：颜色/字体/间距/阴影等分组
4. **可组合性**：变量可自由组合使用