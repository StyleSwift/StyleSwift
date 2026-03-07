/**
 * Content Script 纯函数单元测试
 * 
 * 覆盖函数：
 * - shortSelector
 * - getDirectText
 * - sameSignature
 * - groupSimilar
 * - summarizeChildren
 * - estimateTokens
 * - formatTree / formatTreeNode / formatNodeDecoration
 * - elementSignature
 * 
 * 测试标准：
 * - 所有测试用例通过
 */

import { describe, test, expect } from 'vitest';

// === 模拟 DOM 元素 ===

/**
 * 创建模拟 DOM 元素
 * @param {Object} options - 元素配置
 * @returns {Object} 模拟元素对象
 */
function createMockElement({ tagName = 'div', id = '', className = '', childNodes = [], children = [] } = {}) {
  return {
    tagName: tagName.toUpperCase(),
    id,
    className,
    childNodes,
    children
  };
}

/**
 * 创建模拟文本节点
 * @param {string} content - 文本内容
 * @returns {Object} 模拟文本节点
 */
function createMockTextNode(content) {
  return {
    nodeType: 3, // Node.TEXT_NODE
    textContent: content
  };
}

// === 从 content.js 提取待测试函数 ===

/**
 * 生成元素的最短选择器
 */
function shortSelector(el) {
  const tag = el.tagName.toLowerCase();
  
  if (el.id) {
    return `${tag}#${el.id}`;
  }
  
  if (el.className && typeof el.className === 'string') {
    // 过滤空字符串（处理多余空格的情况）
    const classes = el.className.split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      return `${tag}.${classes[0]}`;
    }
  }
  
  return tag;
}

/**
 * 获取元素的直接文本内容（不含子元素文本）
 */
function getDirectText(el) {
  return Array.from(el.childNodes)
    .filter(n => n.nodeType === 3) // Node.TEXT_NODE
    .map(n => n.textContent.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * 判断两个元素是否具有相同签名（tagName + className）
 */
function sameSignature(a, b) {
  return a.tagName === b.tagName && a.className === b.className;
}

/**
 * 估算文本的 token 数量
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 3.5);
}

/**
 * 格式化树节点装饰信息
 */
function formatNodeDecoration(node, compact = false) {
  let deco = '';
  
  if (!compact && node.styles?.length) {
    deco += ` [${node.styles.map(([p, v]) => `${p}:${v}`).join('; ')}]`;
  }
  
  if (node.count) {
    deco += ` × ${node.count}`;
  }
  
  if (node.text) {
    deco += ` "${node.text}"`;
  }
  
  if (node.summary) {
    deco += ` — ${node.summary}`;
  }
  
  return deco;
}

/**
 * 格式化树节点（子节点）
 */
function formatTreeNode(node, indent, isLast, maxDepth, compact = false) {
  if (!node) return '';
  // maxDepth <= 0 时不再渲染子节点
  if (maxDepth <= 0) return '';
  
  const prefix = isLast ? '└── ' : '├── ';
  const childIndent = indent + (isLast ? '    ' : '│   ');
  
  let line = indent + prefix + node.selector;
  line += formatNodeDecoration(node, compact);
  let result = line + '\n';
  
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      result += formatTreeNode(
        node.children[i],
        childIndent,
        i === node.children.length - 1,
        maxDepth - 1,
        compact
      );
    }
  }
  
  return result;
}

/**
 * 格式化树结构（根节点）
 */
function formatTree(node, indent, isLast, maxDepth, compact = false) {
  if (!node) return '';
  
  let line = node.selector;
  line += formatNodeDecoration(node, compact);
  let result = line + '\n';
  
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      result += formatTreeNode(
        node.children[i],
        indent,
        i === node.children.length - 1,
        maxDepth - 1,
        compact
      );
    }
  }
  
  return result;
}

/**
 * 生成元素的签名
 */
function elementSignature(el) {
  const childSig = Array.from(el.children)
    .map(c => `${c.tagName.toLowerCase()}.${c.className || ''}`)
    .join('|');
  return `${el.tagName.toLowerCase()}.${el.className || ''}[${childSig}]`;
}

/**
 * 将连续相同签名的子元素分组
 */
function groupSimilar(children) {
  if (children.length === 0) return [];
  
  const groups = [[children[0]]];
  
  for (let i = 1; i < children.length; i++) {
    const lastGroup = groups[groups.length - 1];
    
    if (sameSignature(children[i], lastGroup[0])) {
      lastGroup.push(children[i]);
    } else {
      groups.push([children[i]]);
    }
  }
  
  return groups;
}

/**
 * 生成子元素摘要统计
 */
function summarizeChildren(childEls) {
  if (childEls.length === 0) return null;
  
  const counts = {};
  
  for (const c of childEls) {
    const key = shortSelector(c);
    counts[key] = (counts[key] || 0) + 1;
  }
  
  return Object.entries(counts)
    .map(([k, v]) => v > 1 ? `${k}×${v}` : k)
    .join(', ');
}

// === 测试套件 ===

// ===== shortSelector 测试 =====

describe('shortSelector', () => {
  describe('ID 选择器', () => {
    test('有 ID 时返回 tag#id 格式', () => {
      const el = createMockElement({ tagName: 'div', id: 'header' });
      expect(shortSelector(el)).toBe('div#header');
    });

    test('ID 优先于 className', () => {
      const el = createMockElement({ tagName: 'nav', id: 'main-nav', className: 'navigation' });
      expect(shortSelector(el)).toBe('nav#main-nav');
    });

    test('特殊字符 ID 也能正确处理', () => {
      const el = createMockElement({ tagName: 'section', id: 'main-content' });
      expect(shortSelector(el)).toBe('section#main-content');
    });
  });

  describe('className 选择器', () => {
    test('无 ID 有 className 时返回 tag.className 格式', () => {
      const el = createMockElement({ tagName: 'div', className: 'container' });
      expect(shortSelector(el)).toBe('div.container');
    });

    test('多 class 时只取第一个', () => {
      const el = createMockElement({ tagName: 'div', className: 'item active selected' });
      expect(shortSelector(el)).toBe('div.item');
    });

    test('className 有多余空格时正确处理', () => {
      const el = createMockElement({ tagName: 'span', className: '  text  bold  ' });
      expect(shortSelector(el)).toBe('span.text');
    });
  });

  describe('纯标签选择器', () => {
    test('无 ID 无 className 时返回纯标签名', () => {
      const el = createMockElement({ tagName: 'article' });
      expect(shortSelector(el)).toBe('article');
    });

    test('空字符串 className 时返回纯标签名', () => {
      const el = createMockElement({ tagName: 'p', className: '' });
      expect(shortSelector(el)).toBe('p');
    });

    test('className 为空白时返回纯标签名', () => {
      const el = createMockElement({ tagName: 'div', className: '   ' });
      expect(shortSelector(el)).toBe('div');
    });
  });

  describe('标签名小写转换', () => {
    test('tagName 自动转为小写', () => {
      const el = createMockElement({ tagName: 'HEADER' });
      expect(shortSelector(el)).toBe('header');
    });

    test('NAV 标签也能正确处理', () => {
      const el = createMockElement({ tagName: 'NAV', id: 'top' });
      expect(shortSelector(el)).toBe('nav#top');
    });
  });
});

// ===== getDirectText 测试 =====

describe('getDirectText', () => {
  describe('基本文本提取', () => {
    test('提取单个文本节点', () => {
      const el = createMockElement({
        tagName: 'p',
        childNodes: [createMockTextNode('Hello World')]
      });
      expect(getDirectText(el)).toBe('Hello World');
    });

    test('提取多个文本节点并用空格连接', () => {
      const el = createMockElement({
        tagName: 'p',
        childNodes: [
          createMockTextNode('Hello'),
          createMockTextNode('World')
        ]
      });
      expect(getDirectText(el)).toBe('Hello World');
    });

    test('自动 trim 文本内容', () => {
      const el = createMockElement({
        tagName: 'div',
        childNodes: [createMockTextNode('  spaced text  ')]
      });
      expect(getDirectText(el)).toBe('spaced text');
    });
  });

  describe('空内容处理', () => {
    test('无子节点时返回空字符串', () => {
      const el = createMockElement({ tagName: 'div', childNodes: [] });
      expect(getDirectText(el)).toBe('');
    });

    test('只有元素节点时返回空字符串', () => {
      const el = createMockElement({
        tagName: 'div',
        childNodes: [{ nodeType: 1 }] // 元素节点
      });
      expect(getDirectText(el)).toBe('');
    });

    test('空白文本节点被过滤', () => {
      const el = createMockElement({
        tagName: 'div',
        childNodes: [
          createMockTextNode('   '),
          createMockTextNode(''),
          createMockTextNode('text')
        ]
      });
      expect(getDirectText(el)).toBe('text');
    });
  });

  describe('混合节点类型', () => {
    test('只提取文本节点，忽略其他类型', () => {
      const el = createMockElement({
        tagName: 'div',
        childNodes: [
          createMockTextNode('Before'),
          { nodeType: 1, tagName: 'SPAN' }, // 元素节点
          createMockTextNode('After')
        ]
      });
      expect(getDirectText(el)).toBe('Before After');
    });
  });

  describe('长度限制场景', () => {
    test('长文本可以完整返回（调用方负责截断）', () => {
      const longText = 'a'.repeat(100);
      const el = createMockElement({
        tagName: 'p',
        childNodes: [createMockTextNode(longText)]
      });
      expect(getDirectText(el)).toBe(longText);
    });
  });
});

// ===== sameSignature 测试 =====

describe('sameSignature', () => {
  describe('相同签名', () => {
    test('相同 tagName 和 className 返回 true', () => {
      const a = createMockElement({ tagName: 'div', className: 'item' });
      const b = createMockElement({ tagName: 'div', className: 'item' });
      expect(sameSignature(a, b)).toBe(true);
    });

    test('同为空 className 返回 true', () => {
      const a = createMockElement({ tagName: 'span', className: '' });
      const b = createMockElement({ tagName: 'span', className: '' });
      expect(sameSignature(a, b)).toBe(true);
    });

    test('tagName 大小写相同（已大写化）', () => {
      const a = { tagName: 'DIV', className: 'item' };
      const b = { tagName: 'DIV', className: 'item' };
      expect(sameSignature(a, b)).toBe(true);
    });
  });

  describe('不同签名', () => {
    test('不同 tagName 返回 false', () => {
      const a = createMockElement({ tagName: 'div' });
      const b = createMockElement({ tagName: 'span' });
      expect(sameSignature(a, b)).toBe(false);
    });

    test('不同 className 返回 false', () => {
      const a = createMockElement({ tagName: 'div', className: 'a' });
      const b = createMockElement({ tagName: 'div', className: 'b' });
      expect(sameSignature(a, b)).toBe(false);
    });

    test('className 大小写敏感', () => {
      const a = createMockElement({ tagName: 'div', className: 'Item' });
      const b = createMockElement({ tagName: 'div', className: 'item' });
      expect(sameSignature(a, b)).toBe(false);
    });
  });

  describe('边界情况', () => {
    test('ID 不参与签名比较', () => {
      const a = createMockElement({ tagName: 'div', id: 'a', className: 'item' });
      const b = createMockElement({ tagName: 'div', id: 'b', className: 'item' });
      expect(sameSignature(a, b)).toBe(true);
    });

    test('完整 className 比较（不分割）', () => {
      const a = createMockElement({ tagName: 'div', className: 'item active' });
      const b = createMockElement({ tagName: 'div', className: 'item active' });
      expect(sameSignature(a, b)).toBe(true);
    });

    test('className 顺序不同视为不同', () => {
      const a = createMockElement({ tagName: 'div', className: 'item active' });
      const b = createMockElement({ tagName: 'div', className: 'active item' });
      expect(sameSignature(a, b)).toBe(false);
    });
  });
});

// ===== estimateTokens 测试 =====

describe('estimateTokens', () => {
  describe('基本估算', () => {
    test('空字符串返回 0', () => {
      expect(estimateTokens('')).toBe(0);
    });

    test('短文本估算', () => {
      // 3.5 字符/token
      expect(estimateTokens('abc')).toBe(1); // 3 / 3.5 ≈ 0.86 → ceil → 1
      expect(estimateTokens('abcd')).toBe(2); // 4 / 3.5 ≈ 1.14 → ceil → 2
    });

    test('中等长度文本估算', () => {
      const text = 'Hello World!'; // 12 字符
      expect(estimateTokens(text)).toBe(4); // 12 / 3.5 ≈ 3.43 → ceil → 4
    });
  });

  describe('长文本估算', () => {
    test('100 字符文本估算', () => {
      const text = 'a'.repeat(100);
      expect(estimateTokens(text)).toBe(29); // 100 / 3.5 ≈ 28.57 → ceil → 29
    });

    test('1000 字符文本估算', () => {
      const text = 'a'.repeat(1000);
      expect(estimateTokens(text)).toBe(286); // 1000 / 3.5 ≈ 285.7 → ceil → 286
    });
  });

  describe('特殊字符处理', () => {
    test('中文字符估算', () => {
      const text = '中文测试'; // 4 个中文字符
      expect(estimateTokens(text)).toBe(2); // 4 / 3.5 ≈ 1.14 → ceil → 2
    });

    test('混合字符估算', () => {
      const text = 'Hello世界123'; // 10 字符
      expect(estimateTokens(text)).toBe(3); // 10 / 3.5 ≈ 2.86 → ceil → 3
    });
  });
});

// ===== formatNodeDecoration 测试 =====

describe('formatNodeDecoration', () => {
  describe('空节点', () => {
    test('无任何属性返回空字符串', () => {
      expect(formatNodeDecoration({})).toBe('');
    });

    test('只有 selector 不影响装饰', () => {
      expect(formatNodeDecoration({ selector: 'div' })).toBe('');
    });
  });

  describe('样式装饰', () => {
    test('显示样式（非紧凑模式）', () => {
      const node = { styles: [['color', 'red'], ['font-size', '16px']] };
      expect(formatNodeDecoration(node)).toBe(' [color:red; font-size:16px]');
    });

    test('紧凑模式隐藏样式', () => {
      const node = { styles: [['color', 'red']] };
      expect(formatNodeDecoration(node, true)).toBe('');
    });

    test('空样式数组不显示', () => {
      expect(formatNodeDecoration({ styles: [] })).toBe('');
    });
  });

  describe('计数装饰', () => {
    test('显示折叠计数', () => {
      expect(formatNodeDecoration({ count: 5 })).toBe(' × 5');
    });

    test('计数为 0 不显示', () => {
      expect(formatNodeDecoration({ count: 0 })).toBe('');
    });
  });

  describe('文本装饰', () => {
    test('显示文本内容', () => {
      expect(formatNodeDecoration({ text: 'Hello' })).toBe(' "Hello"');
    });

    test('空字符串文本不显示', () => {
      expect(formatNodeDecoration({ text: '' })).toBe('');
    });
  });

  describe('摘要装饰', () => {
    test('显示子元素摘要', () => {
      expect(formatNodeDecoration({ summary: 'div×3, span' })).toBe(' — div×3, span');
    });
  });

  describe('组合装饰', () => {
    test('多种装饰按顺序组合', () => {
      const node = {
        styles: [['color', 'red']],
        count: 3,
        text: 'Test',
        summary: 'span×2'
      };
      expect(formatNodeDecoration(node)).toBe(' [color:red] × 3 "Test" — span×2');
    });

    test('紧凑模式下样式隐藏，其他正常', () => {
      const node = {
        styles: [['color', 'red']],
        count: 3,
        text: 'Test'
      };
      expect(formatNodeDecoration(node, true)).toBe(' × 3 "Test"');
    });
  });
});

// ===== formatTreeNode 测试 =====

describe('formatTreeNode', () => {
  describe('边界情况', () => {
    test('null 节点返回空字符串', () => {
      expect(formatTreeNode(null, '', true, 3)).toBe('');
    });

    test('maxDepth < 0 返回空字符串', () => {
      const node = { selector: 'div' };
      expect(formatTreeNode(node, '', true, -1)).toBe('');
    });
  });

  describe('单节点格式化', () => {
    test('最后一个节点使用 └── 前缀', () => {
      const node = { selector: 'div' };
      const result = formatTreeNode(node, '', true, 3);
      expect(result).toBe('└── div\n');
    });

    test('非最后一个节点使用 ├── 前缀', () => {
      const node = { selector: 'span' };
      const result = formatTreeNode(node, '', false, 3);
      expect(result).toBe('├── span\n');
    });
  });

  describe('缩进处理', () => {
    test('正确处理子节点缩进（最后一个节点）', () => {
      const node = {
        selector: 'div',
        children: [{ selector: 'span' }]
      };
      const result = formatTreeNode(node, '', true, 3);
      expect(result).toContain('└── span');
      expect(result).not.toContain('│');
    });

    test('正确处理子节点缩进（非最后一个节点）', () => {
      const node = {
        selector: 'div',
        children: [{ selector: 'span' }]
      };
      const result = formatTreeNode(node, '', false, 3);
      expect(result).toContain('└── span');
      expect(result).toContain('│');
    });
  });

  describe('多层嵌套', () => {
    test('正确格式化嵌套结构', () => {
      const node = {
        selector: 'div',
        children: [
          { selector: 'header' },
          {
            selector: 'main',
            children: [{ selector: 'article' }]
          }
        ]
      };
      const result = formatTreeNode(node, '', false, 5);
      expect(result).toContain('div');
      expect(result).toContain('├── header');
      expect(result).toContain('└── main');
      expect(result).toContain('article');
    });
  });
});

// ===== formatTree 测试 =====

describe('formatTree', () => {
  describe('边界情况', () => {
    test('null 节点返回空字符串', () => {
      expect(formatTree(null, '', true, 3)).toBe('');
    });
  });

  describe('根节点格式化', () => {
    test('根节点无前缀', () => {
      const node = { selector: 'body' };
      const result = formatTree(node, '', true, 3);
      expect(result).toBe('body\n');
    });

    test('根节点带装饰', () => {
      const node = { selector: 'body', styles: [['background', '#fff']] };
      const result = formatTree(node, '', true, 3);
      expect(result).toContain('body [background:#fff]');
    });
  });

  describe('子节点处理', () => {
    test('正确格式化子节点', () => {
      const node = {
        selector: 'body',
        children: [
          { selector: 'header' },
          { selector: 'main' },
          { selector: 'footer' }
        ]
      };
      const result = formatTree(node, '', true, 3);
      expect(result).toContain('body');
      expect(result).toContain('├── header');
      expect(result).toContain('├── main');
      expect(result).toContain('└── footer');
    });
  });

  describe('maxDepth 控制', () => {
    test('maxDepth 限制递归深度', () => {
      const node = {
        selector: 'root',
        children: [{
          selector: 'level1',
          children: [{
            selector: 'level2',
            children: [{ selector: 'level3' }]
          }]
        }]
      };
      // maxDepth = 2，应该只到 level1
      const result = formatTree(node, '', true, 2);
      expect(result).toContain('root');
      expect(result).toContain('level1');
      expect(result).not.toContain('level2');
    });
  });

  describe('紧凑模式', () => {
    test('compact=true 隐藏样式', () => {
      const node = {
        selector: 'div',
        styles: [['color', 'red']],
        children: [{ selector: 'span', styles: [['color', 'blue']] }]
      };
      const result = formatTree(node, '', true, 3, true);
      expect(result).not.toContain('color');
    });

    test('compact=false 显示样式', () => {
      const node = {
        selector: 'div',
        styles: [['color', 'red']],
        children: [{ selector: 'span', styles: [['color', 'blue']] }]
      };
      const result = formatTree(node, '', true, 3, false);
      expect(result).toContain('color:red');
      expect(result).toContain('color:blue');
    });
  });
});

// ===== elementSignature 测试 =====

describe('elementSignature', () => {
  describe('基本签名生成', () => {
    test('无子元素的基本签名', () => {
      const el = createMockElement({ tagName: 'div', className: 'item', children: [] });
      expect(elementSignature(el)).toBe('div.item[]');
    });

    test('无 className 时显示空', () => {
      const el = createMockElement({ tagName: 'div', className: '', children: [] });
      expect(elementSignature(el)).toBe('div.[]');
    });

    test('无 className 属性时显示空', () => {
      const el = { tagName: 'SECTION', children: [] };
      expect(elementSignature(el)).toBe('section.[]');
    });
  });

  describe('包含子元素', () => {
    test('单个子元素签名', () => {
      const el = createMockElement({
        tagName: 'div',
        className: 'container',
        children: [
          createMockElement({ tagName: 'span', className: 'text' })
        ]
      });
      expect(elementSignature(el)).toBe('div.container[span.text]');
    });

    test('多个子元素签名用 | 分隔', () => {
      const el = createMockElement({
        tagName: 'ul',
        className: 'list',
        children: [
          createMockElement({ tagName: 'li', className: 'item' }),
          createMockElement({ tagName: 'li', className: 'item' }),
          createMockElement({ tagName: 'li', className: 'item' })
        ]
      });
      expect(elementSignature(el)).toBe('ul.list[li.item|li.item|li.item]');
    });
  });

  describe('嵌套子元素', () => {
    test('只考虑直接子元素（不递归）', () => {
      const el = createMockElement({
        tagName: 'div',
        className: 'outer',
        children: [
          createMockElement({
            tagName: 'div',
            className: 'inner',
            children: [
              createMockElement({ tagName: 'span', className: 'deep' })
            ]
          })
        ]
      });
      // 只包含直接子元素 div.inner，不包含深层 span.deep
      expect(elementSignature(el)).toBe('div.outer[div.inner]');
    });
  });

  describe('不同 className 组合', () => {
    test('子元素有不同 className', () => {
      const el = createMockElement({
        tagName: 'nav',
        className: 'menu',
        children: [
          createMockElement({ tagName: 'a', className: 'link active' }),
          createMockElement({ tagName: 'a', className: 'link disabled' })
        ]
      });
      // 完整 className 比较
      expect(elementSignature(el)).toBe('nav.menu[a.link active|a.link disabled]');
    });

    test('子元素无 className', () => {
      const el = createMockElement({
        tagName: 'div',
        children: [
          createMockElement({ tagName: 'p' }),
          createMockElement({ tagName: 'p' })
        ]
      });
      expect(elementSignature(el)).toBe('div.[p.|p.]');
    });
  });

  describe('标签名小写转换', () => {
    test('tagName 自动转小写', () => {
      const el = { tagName: 'HEADER', className: 'site-header', children: [] };
      expect(elementSignature(el)).toBe('header.site-header[]');
    });
  });
});

// ===== groupSimilar 测试 =====

describe('groupSimilar', () => {
  describe('基本分组功能', () => {
    test('空数组返回空数组', () => {
      const result = groupSimilar([]);
      expect(result).toEqual([]);
    });

    test('单个元素返回单组', () => {
      const elements = [createMockElement({ tagName: 'div', className: 'item' })];
      const result = groupSimilar(elements);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
    });

    test('两个相同元素分为一组', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = groupSimilar(elements);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    test('三个连续相同元素分为一组', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = groupSimilar(elements);
      
      // 测试标准：3 个连续相同 className 的 div 被折叠为 1 组
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });
  });

  describe('不同元素分组', () => {
    test('不同 tagName 分为不同组', () => {
      const elements = [
        createMockElement({ tagName: 'div' }),
        createMockElement({ tagName: 'span' }),
        createMockElement({ tagName: 'div' })
      ];
      const result = groupSimilar(elements);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(1);
    });

    test('不同 className 分为不同组', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item-a' }),
        createMockElement({ tagName: 'div', className: 'item-b' }),
        createMockElement({ tagName: 'div', className: 'item-a' })
      ];
      const result = groupSimilar(elements);
      
      expect(result).toHaveLength(3);
      expect(result[0][0].className).toBe('item-a');
      expect(result[1][0].className).toBe('item-b');
      expect(result[2][0].className).toBe('item-a');
    });

    test('相同元素但被不同元素隔开分为不同组', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'span', className: 'separator' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = groupSimilar(elements);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(1);
    });
  });

  describe('复杂分组场景', () => {
    test('多组连续相同元素', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'a' }),
        createMockElement({ tagName: 'div', className: 'a' }),
        createMockElement({ tagName: 'span', className: 'b' }),
        createMockElement({ tagName: 'span', className: 'b' }),
        createMockElement({ tagName: 'span', className: 'b' }),
        createMockElement({ tagName: 'p', className: 'c' })
      ];
      const result = groupSimilar(elements);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(2); // div.a × 2
      expect(result[1]).toHaveLength(3); // span.b × 3
      expect(result[2]).toHaveLength(1); // p.c × 1
    });

    test('交替模式', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'span', className: 'separator' }),
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'span', className: 'separator' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = groupSimilar(elements);
      
      expect(result).toHaveLength(5);
    });

    test('带 ID 的元素', () => {
      const elements = [
        createMockElement({ tagName: 'div', id: 'header' }),
        createMockElement({ tagName: 'div', id: 'content' }),
        createMockElement({ tagName: 'div', id: 'footer' })
      ];
      const result = groupSimilar(elements);
      
      // 相同 tagName 但不同 ID，className 都为空，应该分为一组
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    test('多 class 元素（完整 className 比较）', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item active' }),
        createMockElement({ tagName: 'div', className: 'item disabled' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = groupSimilar(elements);
      
      // sameSignature 比较完整的 className，所以应该分为三组
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(1);
    });
  });

  describe('边界情况', () => {
    test('空 className 视为相同', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: '' }),
        createMockElement({ tagName: 'div', className: '' }),
        createMockElement({ tagName: 'div' })
      ];
      const result = groupSimilar(elements);
      
      // 所有元素的 className 都为空/undefined，应该分为一组
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    test('大小写敏感', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'Item' }),
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'ITEM' })
      ];
      const result = groupSimilar(elements);
      
      // className 大小写不同，应该分为三组
      expect(result).toHaveLength(3);
    });
  });
});

// ===== summarizeChildren 测试 =====

describe('summarizeChildren', () => {
  describe('基本摘要功能', () => {
    test('空数组返回 null', () => {
      const result = summarizeChildren([]);
      expect(result).toBeNull();
    });

    test('单个元素返回选择器', () => {
      const elements = [createMockElement({ tagName: 'div' })];
      const result = summarizeChildren(elements);
      
      expect(result).toBe('div');
    });

    test('两个相同元素返回带计数的选择器', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = summarizeChildren(elements);
      
      expect(result).toBe('div.item×2');
    });

    test('三个相同元素返回正确计数', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = summarizeChildren(elements);
      
      // 测试标准：摘要格式正确
      expect(result).toBe('div.item×3');
    });
  });

  describe('混合元素摘要', () => {
    test('不同类型元素分别计数', () => {
      const elements = [
        createMockElement({ tagName: 'div' }),
        createMockElement({ tagName: 'span' }),
        createMockElement({ tagName: 'div' })
      ];
      const result = summarizeChildren(elements);
      
      expect(result).toContain('div×2');
      expect(result).toContain('span');
    });

    test('带 ID 的元素', () => {
      const elements = [
        createMockElement({ tagName: 'div', id: 'header' }),
        createMockElement({ tagName: 'div', id: 'content' })
      ];
      const result = summarizeChildren(elements);
      
      // ID 元素应该显示为 tag#id 格式
      expect(result).toContain('div#header');
      expect(result).toContain('div#content');
    });

    test('带 className 的元素', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'span', className: 'text' })
      ];
      const result = summarizeChildren(elements);
      
      expect(result).toContain('div.item×2');
      expect(result).toContain('span.text');
    });
  });

  describe('摘要格式', () => {
    test('多个不同元素用逗号分隔', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'a' }),
        createMockElement({ tagName: 'span', className: 'b' }),
        createMockElement({ tagName: 'p', className: 'c' })
      ];
      const result = summarizeChildren(elements);
      
      expect(result).toContain(', ');
      expect(result.split(', ')).toHaveLength(3);
    });

    test('计数格式正确（使用 × 符号）', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' }),
        createMockElement({ tagName: 'div', className: 'item' })
      ];
      const result = summarizeChildren(elements);
      
      // 应该使用 × 符号而不是 x
      expect(result).toBe('div.item×4');
      expect(result).not.toContain('x4');
    });

    test('单个元素不显示计数', () => {
      const elements = [createMockElement({ tagName: 'div', className: 'item' })];
      const result = summarizeChildren(elements);
      
      // 单个元素不应该有 ×1
      expect(result).toBe('div.item');
      expect(result).not.toContain('×');
    });
  });

  describe('复杂场景', () => {
    test('大量相同元素', () => {
      const elements = Array(10).fill(null).map(() => 
        createMockElement({ tagName: 'li', className: 'item' })
      );
      const result = summarizeChildren(elements);
      
      expect(result).toBe('li.item×10');
    });

    test('多种元素混合', () => {
      const elements = [
        createMockElement({ tagName: 'h1' }),
        createMockElement({ tagName: 'p' }),
        createMockElement({ tagName: 'p' }),
        createMockElement({ tagName: 'p' }),
        createMockElement({ tagName: 'img' }),
        createMockElement({ tagName: 'p' }),
        createMockElement({ tagName: 'div' })
      ];
      const result = summarizeChildren(elements);
      
      // p 出现 4 次
      expect(result).toContain('p×4');
      // 其他元素各出现 1 次
      expect(result).toContain('h1');
      expect(result).toContain('img');
      expect(result).toContain('div');
    });

    test('多 class 元素只显示第一个 class', () => {
      const elements = [
        createMockElement({ tagName: 'div', className: 'item active selected' }),
        createMockElement({ tagName: 'div', className: 'item disabled' })
      ];
      const result = summarizeChildren(elements);
      
      // 只显示第一个 class
      expect(result).toBe('div.item×2');
    });
  });

  describe('测试标准验证', () => {
    test('T042 测试标准：3 个连续相同 className 的 div 被折叠为 1 组', () => {
      // 创建 3 个连续相同 className 的 div
      const elements = [
        createMockElement({ tagName: 'div', className: 'card' }),
        createMockElement({ tagName: 'div', className: 'card' }),
        createMockElement({ tagName: 'div', className: 'card' })
      ];
      
      // 测试 groupSimilar
      const groups = groupSimilar(elements);
      expect(groups).toHaveLength(1);  // 折叠为 1 组
      expect(groups[0]).toHaveLength(3);  // 组内有 3 个元素
      
      // 测试 summarizeChildren
      const summary = summarizeChildren(elements);
      expect(summary).toBe('div.card×3');  // 摘要格式正确
    });
  });
});
