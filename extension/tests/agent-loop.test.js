/**
 * Agent Loop 单元测试
 * 
 * 测试 SYSTEM_BASE 常量定义
 * 测试 buildSessionContext 函数
 * 测试 checkAndCompressHistory 函数
 * 测试 findTurnBoundary 函数
 * 测试 summarizeOldTurns 函数（需要 mock API）
 * 
 * 测试标准：
 * - SYSTEM_BASE 包含所有关键指引
 * - buildSessionContext 输出包含域名和会话标题，有摘要时包含样式信息，有画像时包含偏好提示
 * - TOKEN_BUDGET 为 50000
 * - 未超预算不压缩
 * - 超预算后保留最近 10 轮 + 摘要
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Import constants to test
import { 
  SYSTEM_BASE, 
  buildSessionContext,
  TOKEN_BUDGET,
  checkAndCompressHistory,
  findTurnBoundary,
  summarizeOldTurns
} from '../sidepanel/agent-loop.js';

describe('SYSTEM_BASE 常量', () => {
  test('SYSTEM_BASE 定义为字符串', () => {
    expect(typeof SYSTEM_BASE).toBe('string');
    expect(SYSTEM_BASE.length).toBeGreaterThan(100);
  });

  test('包含身份定义', () => {
    expect(SYSTEM_BASE).toContain('StyleSwift');
    expect(SYSTEM_BASE).toContain('网页样式个性化');
  });

  test('包含工作方式指引', () => {
    expect(SYSTEM_BASE).toContain('工作方式');
    expect(SYSTEM_BASE).toContain('使用工具');
    expect(SYSTEM_BASE).toContain('优先行动');
  });

  test('包含可用工具列表', () => {
    expect(SYSTEM_BASE).toContain('get_page_structure');
    expect(SYSTEM_BASE).toContain('grep');
    expect(SYSTEM_BASE).toContain('apply_styles');
    expect(SYSTEM_BASE).toContain('get_user_profile');
    expect(SYSTEM_BASE).toContain('update_user_profile');
    expect(SYSTEM_BASE).toContain('load_skill');
    expect(SYSTEM_BASE).toContain('save_style_skill');
    expect(SYSTEM_BASE).toContain('list_style_skills');
    expect(SYSTEM_BASE).toContain('delete_style_skill');
    expect(SYSTEM_BASE).toContain('Task');
    expect(SYSTEM_BASE).toContain('TodoWrite');
  });

  test('包含 CSS 生成规则', () => {
    expect(SYSTEM_BASE).toContain('生成 CSS 时遵循');
    expect(SYSTEM_BASE).toContain('具体选择器');
    expect(SYSTEM_BASE).toContain('!important');
    expect(SYSTEM_BASE).toContain('hex 或 rgba');
  });

  test('包含风格技能指引', () => {
    expect(SYSTEM_BASE).toContain('风格技能');
    expect(SYSTEM_BASE).toContain('save_style_skill');
    expect(SYSTEM_BASE).toContain('抽象特征');
    expect(SYSTEM_BASE).toContain('视觉一致性');
  });
});

describe('工具数组导出验证', () => {
  test('可以从 agent-loop.js 导入 SYSTEM_BASE', async () => {
    // 验证模块可以正常导入
    const agentLoop = await import('../sidepanel/agent-loop.js');
    expect(agentLoop.SYSTEM_BASE).toBeDefined();
    expect(typeof agentLoop.SYSTEM_BASE).toBe('string');
  });

  test('agent-loop.js 导出 BASE_TOOLS 和 ALL_TOOLS', async () => {
    // 验证模块导出
    const agentLoop = await import('../sidepanel/agent-loop.js');
    
    // 这两个变量应该被导出
    expect(agentLoop).toHaveProperty('BASE_TOOLS');
    expect(agentLoop).toHaveProperty('ALL_TOOLS');
  });
});

describe('buildSessionContext 函数', () => {
  test('输出包含域名和会话标题', () => {
    const ctx = buildSessionContext('github.com', { title: '深色模式' }, '');
    
    expect(ctx).toContain('[会话上下文]');
    expect(ctx).toContain('域名: github.com');
    expect(ctx).toContain('会话: 深色模式');
  });

  test('无标题时显示"新会话"', () => {
    const ctx = buildSessionContext('example.com', { title: null }, '');
    
    expect(ctx).toContain('会话: 新会话');
  });

  test('有样式摘要时包含样式信息', () => {
    const ctx = buildSessionContext('github.com', {
      title: '样式调整',
      activeStylesSummary: '5 条规则，涉及 body, .header 等'
    }, '');
    
    expect(ctx).toContain('已应用样式: 5 条规则，涉及 body, .header 等');
  });

  test('无样式摘要时不包含样式信息', () => {
    const ctx = buildSessionContext('github.com', { title: '新会话' }, '');
    
    expect(ctx).not.toContain('已应用样式');
  });

  test('有画像时包含偏好提示', () => {
    const ctx = buildSessionContext('github.com', { title: '调整' }, '偏好深色模式、圆角设计');
    
    expect(ctx).toContain('用户风格偏好: 偏好深色模式、圆角设计');
    expect(ctx).toContain('(详情可通过 get_user_profile 获取)');
  });

  test('无画像时不包含偏好提示', () => {
    const ctx = buildSessionContext('github.com', { title: '调整' }, '');
    
    expect(ctx).not.toContain('用户风格偏好');
  });

  test('完整上下文包含所有信息', () => {
    const ctx = buildSessionContext('github.com', {
      title: '深色模式调整',
      activeStylesSummary: '3 条规则，涉及 body, .header 等'
    }, '偏好深色模式');
    
    expect(ctx).toContain('[会话上下文]');
    expect(ctx).toContain('域名: github.com');
    expect(ctx).toContain('会话: 深色模式调整');
    expect(ctx).toContain('已应用样式: 3 条规则，涉及 body, .header 等');
    expect(ctx).toContain('用户风格偏好: 偏好深色模式');
  });

  test('返回的上下文以换行符开始', () => {
    const ctx = buildSessionContext('test.com', { title: '测试' }, '');
    
    expect(ctx.startsWith('\n')).toBe(true);
  });
});

// =============================================================================
// §6.3 Layer 2 — 对话历史与 Token 预算控制 测试
// =============================================================================

describe('TOKEN_BUDGET 常量', () => {
  test('TOKEN_BUDGET 定义为 50000', () => {
    expect(TOKEN_BUDGET).toBe(50000);
  });
});

describe('findTurnBoundary 函数', () => {
  test('找到最近 1 轮对话的边界', () => {
    const history = [
      { role: 'user', content: '消息1' },
      { role: 'assistant', content: [{ type: 'text', text: '回复1' }] },
      { role: 'user', content: '消息2' },
      { role: 'assistant', content: [{ type: 'text', text: '回复2' }] },
    ];
    
    // 最近 1 轮应该从索引 2 开始（'消息2'）
    expect(findTurnBoundary(history, 1)).toBe(2);
  });

  test('找到最近 3 轮对话的边界', () => {
    const history = [
      { role: 'user', content: '消息1' },
      { role: 'assistant', content: [{ type: 'text', text: '回复1' }] },
      { role: 'user', content: '消息2' },
      { role: 'assistant', content: [{ type: 'text', text: '回复2' }] },
      { role: 'user', content: '消息3' },
      { role: 'assistant', content: [{ type: 'text', text: '回复3' }] },
    ];
    
    // 最近 3 轮应该从索引 0 开始（'消息1'）
    expect(findTurnBoundary(history, 3)).toBe(0);
  });

  test('历史轮数不足时返回 0', () => {
    const history = [
      { role: 'user', content: '消息1' },
      { role: 'assistant', content: [{ type: 'text', text: '回复1' }] },
    ];
    
    // 只有 1 轮，要求保留 10 轮，应该返回 0
    expect(findTurnBoundary(history, 10)).toBe(0);
  });

  test('忽略 tool_result 消息（非字符串内容）', () => {
    const history = [
      { role: 'user', content: '消息1' },
      { role: 'assistant', content: [{ type: 'tool_use', name: 'grep' }] },
      { role: 'user', content: [{ type: 'tool_result', content: '结果' }] }, // 不计入轮数
      { role: 'assistant', content: [{ type: 'text', text: '回复' }] },
      { role: 'user', content: '消息2' },
    ];
    
    // 最近 1 轮应该从索引 4 开始（'消息2'）
    expect(findTurnBoundary(history, 1)).toBe(4);
  });

  test('空历史返回 0', () => {
    expect(findTurnBoundary([], 10)).toBe(0);
  });
});

describe('checkAndCompressHistory 函数', () => {
  test('未超预算不压缩', async () => {
    const history = [
      { role: 'user', content: '消息1' },
      { role: 'assistant', content: [{ type: 'text', text: '回复1' }] },
    ];
    
    const result = await checkAndCompressHistory(history, 30000);
    
    // 应该返回原历史（同一引用）
    expect(result).toBe(history);
  });

  test('刚好等于预算不压缩', async () => {
    const history = [
      { role: 'user', content: '消息1' },
      { role: 'assistant', content: [{ type: 'text', text: '回复1' }] },
    ];
    
    const result = await checkAndCompressHistory(history, 50000);
    
    // 刚好等于预算，不压缩
    expect(result).toBe(history);
  });

  test('超预算但历史不足 10 轮不压缩', async () => {
    const history = [
      { role: 'user', content: '消息1' },
      { role: 'assistant', content: [{ type: 'text', text: '回复1' }] },
      { role: 'user', content: '消息2' },
    ];
    
    // 只有 2 轮，不足 10 轮
    const result = await checkAndCompressHistory(history, 60000);
    
    // 历史太短，不应该压缩
    expect(result).toBe(history);
  });

  test('超预算后压缩历史并生成摘要', async () => {
    // Mock chrome.storage 和 fetch
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            settings: {
              apiKey: 'test-api-key',
              model: 'claude-sonnet-4-20250514',
              apiBase: 'https://api.anthropic.com'
            }
          })
        }
      }
    };
    
    const mockSummary = '用户偏好深色模式，已应用深蓝背景';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: mockSummary }]
      })
    });
    
    // 创建 15 轮对话历史
    const history = [];
    for (let i = 1; i <= 15; i++) {
      history.push({ role: 'user', content: `消息${i}` });
      history.push({ role: 'assistant', content: [{ type: 'text', text: `回复${i}` }] });
    }
    
    // 超过预算
    const result = await checkAndCompressHistory(history, 60000);
    
    // 应该返回新数组（不是原引用）
    expect(result).not.toBe(history);
    
    // 第一条应该是摘要消息
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('[之前的对话摘要]');
    expect(result[0].content).toContain(mockSummary);
    
    // 应该保留最近 10 轮（20 条消息）
    // 结果长度：1 条摘要 + 20 条消息（10 轮 × 2）
    expect(result.length).toBe(21);
    
    // 验证保留了最近的消息
    expect(result[result.length - 2].content).toBe('消息15');
    expect(result[result.length - 1].content[0].text).toBe('回复15');
    
    // 清理 mock
    vi.clearAllMocks();
  });
});

describe('summarizeOldTurns 函数', () => {
  beforeEach(() => {
    // Mock chrome.storage.local
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            settings: {
              apiKey: 'test-api-key',
              model: 'claude-sonnet-4-20250514',
              apiBase: 'https://api.anthropic.com'
            }
          })
        }
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('对简单历史生成摘要（需要 mock fetch）', async () => {
    const mockSummary = '用户偏好深色模式';
    
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: mockSummary }]
      })
    });
    
    const history = [
      { role: 'user', content: '改成深色模式' },
      { role: 'assistant', content: [{ type: 'text', text: '好的，已为您应用深色模式' }] },
    ];
    
    const summary = await summarizeOldTurns(history);
    
    // 应该返回摘要
    expect(summary).toBe(mockSummary);
    
    // 验证调用了正确的 API
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key'
        })
      })
    );
  });

  test('处理包含工具调用的历史', async () => {
    const mockSummary = '用户调用了样式工具';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: mockSummary }]
      })
    });
    
    const history = [
      { role: 'user', content: '查看页面结构' },
      { role: 'assistant', content: [
        { type: 'tool_use', name: 'get_page_structure' }
      ]},
      { role: 'user', content: [{ type: 'tool_result', content: '页面结构...' }] },
    ];
    
    const summary = await summarizeOldTurns(history);
    
    expect(summary).toBe(mockSummary);
  });

  test('空历史返回默认消息', async () => {
    const summary = await summarizeOldTurns([]);
    
    expect(summary).toBe('(无历史记录)');
  });

  test('API 错误时返回失败消息', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });
    
    const history = [
      { role: 'user', content: '消息' },
      { role: 'assistant', content: [{ type: 'text', text: '回复' }] },
    ];
    
    const summary = await summarizeOldTurns(history);
    
    expect(summary).toBe('(历史摘要生成失败)');
  });

  test('网络错误时返回失败消息', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const history = [
      { role: 'user', content: '消息' },
      { role: 'assistant', content: [{ type: 'text', text: '回复' }] },
    ];
    
    const summary = await summarizeOldTurns(history);
    
    expect(summary).toBe('(历史摘要生成失败)');
  });
});
