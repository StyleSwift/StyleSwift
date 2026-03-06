/**
 * Content Script 单元测试
 * 
 * 测试 groupSimilar 函数
 * 测试 summarizeChildren 函数
 * 
 * 测试标准：
 * - 3 个连续相同 className 的 div 被折叠为 1 组(count=3)
 * - 摘要格式正确
 */

import { describe, test, expect } from 'vitest';

// === 模拟 DOM 元素 ===

/**
 * 创建模拟 DOM 元素
 * @param {Object} options - 元素配置
 * @returns {Object} 模拟元素对象
 */
function createMockElement({ tagName = 'div', id = '', className = '' } = {}) {
  return {
    tagName: tagName.toUpperCase(),
    id,
    className,
    childNodes: [],
    children: []
  };
}

// === 从 content.js 提取待测试函数 ===

/**
 * 判断两个元素是否具有相同签名（tagName + className）
 */
function sameSignature(a, b) {
  return a.tagName === b.tagName && a.className === b.className;
}

/**
 * 生成元素的最短选择器
 */
function shortSelector(el) {
  const tag = el.tagName.toLowerCase();
  
  if (el.id) {
    return `${tag}#${el.id}`;
  }
  
  if (el.className && typeof el.className === 'string') {
    const firstClass = el.className.split(/\s+/)[0];
    if (firstClass) {
      return `${tag}.${firstClass}`;
    }
  }
  
  return tag;
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
      
      // 两个相同元素被不同元素隔开，应该分为不同的组
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
      
      // 每个元素都与前一个不同，应该分为 5 组
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