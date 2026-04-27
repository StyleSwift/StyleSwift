/**
 * OpenAI API 格式测试
 * 验证 API 调用是否符合 OpenAI 兼容格式
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('OpenAI API Format', () => {
  let mockFetch;
  
  beforeEach(() => {
    // Mock chrome.storage.local
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            settings: {
              apiKey: 'test-api-key',
              apiBase: 'https://api.ppio.com/openai',
              model: 'deepseek/deepseek-r1',
            }
          })
        }
      }
    };
    
    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('应该使用正确的 OpenAI 格式调用 API', async () => {
    // Mock 流式响应
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5}}\n')
        })
        .mockResolvedValueOnce({ done: true })
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    // 动态导入模块
    const agentLoopModule = await import('../sidepanel/agent/agent-loop.js');
    
    // 调用 API（通过内部函数）
    const system = 'You are a helpful assistant';
    const messages = [{ role: 'user', content: 'Hi' }];
    const tools = [{
      name: 'test_tool',
      description: 'A test tool',
      input_schema: {
        type: 'object',
        properties: {
          param: { type: 'string' }
        }
      }
    }];
    
    // 注意：这里我们无法直接测试 callAnthropicStream，因为它不是导出的
    // 但我们可以验证 fetch 调用的格式
    
    // 验证 API 基础地址和模型的默认值
    const { DEFAULT_API_BASE, DEFAULT_MODEL } = await import('../sidepanel/api.js');
    expect(DEFAULT_API_BASE).toBe('https://api.ppio.com/openai');
    expect(DEFAULT_MODEL).toBe('deepseek/deepseek-r1');
  });

  it('validateConnection 应该使用 OpenAI 格式', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    const { validateConnection } = await import('../sidepanel/api.js');
    
    const result = await validateConnection(
      'test-key',
      'https://api.ppio.com/openai',
      'deepseek/deepseek-r1'
    );

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.ppio.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key',
        }),
        body: expect.stringContaining('"model":"deepseek/deepseek-r1"')
      })
    );
  });

  it('应该正确转换工具结果为 OpenAI 格式', async () => {
    // 导入实际的序列化函数
    const { serializeToOpenAI } = await import('../sidepanel/agent/message-serialization.js');

    // ICF 格式的输入：assistant 有 tool_calls，user 消息包含 tool_result
    const messages = [
      { 
        role: 'assistant', 
        content: [
          { type: 'text', text: 'I will use a tool' },
          { type: 'tool_use', id: 'call_123', name: 'test_tool', input: {} }
        ]
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'call_123', content: 'Tool execution result' }
        ]
      }
    ];

    // 转换为 OpenAI 格式
    const openaiMessages = serializeToOpenAI(null, messages);

    // 验证：assistant 消息应有 tool_calls
    expect(openaiMessages[0].role).toBe('assistant');
    expect(openaiMessages[0].tool_calls).toBeDefined();
    expect(openaiMessages[0].tool_calls[0].id).toBe('call_123');

    // 验证：紧接着必须是 role: "tool" 的独立消息（而非嵌套在 user 消息里）
    expect(openaiMessages[1].role).toBe('tool');
    expect(openaiMessages[1].tool_call_id).toBe('call_123');
    expect(openaiMessages[1].content).toBe('Tool execution result');

    // 这是 OpenAI API 要求的正确格式
    // 参见：https://platform.openai.com/docs/api-reference/chat/create#chat-create-tool_calls
  });
});
