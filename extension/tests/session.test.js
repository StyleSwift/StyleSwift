/**
 * Session 管理单元测试
 * 
 * 测试 getOrCreateSession 会话索引管理
 * 
 * 测试标准：
 * - 首次调用创建新会话并返回 id
 * - 再次调用返回已存在的最近会话
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock chrome.storage.local
const mockStorage = {
  data: {},
  
  async get(keys) {
    if (typeof keys === 'string') {
      return { [keys]: this.data[keys] };
    }
    if (Array.isArray(keys)) {
      const result = {};
      for (const key of keys) {
        if (this.data[key] !== undefined) {
          result[key] = this.data[key];
        }
      }
      return result;
    }
    // keys is object with default values
    const result = {};
    for (const [key, defaultValue] of Object.entries(keys)) {
      result[key] = this.data[key] !== undefined ? this.data[key] : defaultValue;
    }
    return result;
  },
  
  async set(items) {
    Object.assign(this.data, items);
  },
  
  async remove(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
      delete this.data[key];
    }
  },
  
  clear() {
    this.data = {};
  }
};

// Mock crypto.randomUUID
let uuidCounter = 0;
const mockRandomUUID = () => {
  uuidCounter++;
  return `test-uuid-${uuidCounter}`;
};

// Setup mocks before importing the module
vi.stubGlobal('chrome', {
  storage: {
    local: mockStorage
  }
});

vi.stubGlobal('crypto', {
  randomUUID: mockRandomUUID
});

// Import function under test
const { getOrCreateSession, loadSessionMeta, saveSessionMeta } = await import('../sidepanel/session.js');

describe('getOrCreateSession', () => {
  beforeEach(() => {
    mockStorage.clear();
    uuidCounter = 0;
  });
  
  test('首次调用创建新会话并返回 id', async () => {
    const domain = 'github.com';
    const sessionId = await getOrCreateSession(domain);
    
    // 应返回有效的 session id
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    expect(sessionId).toBe('test-uuid-1');
    
    // 验证索引已创建
    const indexKey = `sessions:${domain}:index`;
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    
    expect(index).toBeDefined();
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBe(1);
    expect(index[0].id).toBe(sessionId);
    expect(index[0].created_at).toBeDefined();
    expect(typeof index[0].created_at).toBe('number');
  });
  
  test('再次调用返回已存在的最近会话', async () => {
    const domain = 'github.com';
    
    // 第一次调用：创建会话
    const sessionId1 = await getOrCreateSession(domain);
    expect(sessionId1).toBe('test-uuid-1');
    
    // 第二次调用：应返回相同的会话
    const sessionId2 = await getOrCreateSession(domain);
    expect(sessionId2).toBe(sessionId1);
    expect(sessionId2).toBe('test-uuid-1');
    
    // 验证索引只有一个会话
    const indexKey = `sessions:${domain}:index`;
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    expect(index.length).toBe(1);
  });
  
  test('返回最新创建的会话（按 created_at 降序）', async () => {
    const domain = 'example.com';
    
    // 手动插入多个会话，模拟已存在的索引
    const indexKey = `sessions:${domain}:index`;
    const now = Date.now();
    const existingIndex = [
      { id: 'old-session-1', created_at: now - 2000 },
      { id: 'new-session-1', created_at: now - 500 },  // 最新
      { id: 'old-session-2', created_at: now - 1000 }
    ];
    await mockStorage.set({ [indexKey]: existingIndex });
    
    // 调用 getOrCreateSession
    const sessionId = await getOrCreateSession(domain);
    
    // 应返回最新的会话（new-session-1）
    expect(sessionId).toBe('new-session-1');
    
    // 索引不应改变
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    expect(index.length).toBe(3);
  });
  
  test('不同域名的会话独立管理', async () => {
    const domain1 = 'github.com';
    const domain2 = 'stackoverflow.com';
    
    // 为 domain1 创建会话
    const sessionId1 = await getOrCreateSession(domain1);
    expect(sessionId1).toBe('test-uuid-1');
    
    // 为 domain2 创建会话
    const sessionId2 = await getOrCreateSession(domain2);
    expect(sessionId2).toBe('test-uuid-2');
    expect(sessionId2).not.toBe(sessionId1);
    
    // 验证两个域名有独立的索引
    const index1 = (await mockStorage.get(`sessions:${domain1}:index`))[`sessions:${domain1}:index`];
    const index2 = (await mockStorage.get(`sessions:${domain2}:index`))[`sessions:${domain2}:index`];
    
    expect(index1.length).toBe(1);
    expect(index2.length).toBe(1);
    expect(index1[0].id).toBe(sessionId1);
    expect(index2[0].id).toBe(sessionId2);
  });
  
  test('处理空索引（非数组）', async () => {
    const domain = 'test.com';
    const indexKey = `sessions:${domain}:index`;
    
    // 手动设置一个非数组值
    await mockStorage.set({ [indexKey]: null });
    
    // 应创建新会话
    const sessionId = await getOrCreateSession(domain);
    expect(sessionId).toBe('test-uuid-1');
    
    // 验证索引已更新为数组
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBe(1);
  });
  
  test('新创建的会话包含正确的元数据', async () => {
    const domain = 'newsite.com';
    const beforeCreate = Date.now();
    
    const sessionId = await getOrCreateSession(domain);
    const afterCreate = Date.now();
    
    const indexKey = `sessions:${domain}:index`;
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    
    expect(index[0].id).toBe(sessionId);
    expect(index[0].created_at).toBeGreaterThanOrEqual(beforeCreate);
    expect(index[0].created_at).toBeLessThanOrEqual(afterCreate);
  });
});

describe('loadSessionMeta', () => {
  beforeEach(() => {
    mockStorage.clear();
  });
  
  test('无 meta 时返回默认值', async () => {
    const domain = 'github.com';
    const sessionId = 'test-session-123';
    const beforeLoad = Date.now();
    
    const meta = await loadSessionMeta(domain, sessionId);
    const afterLoad = Date.now();
    
    // 应返回默认元数据
    expect(meta).toBeDefined();
    expect(meta.title).toBeNull();
    expect(meta.message_count).toBe(0);
    expect(meta.created_at).toBeGreaterThanOrEqual(beforeLoad);
    expect(meta.created_at).toBeLessThanOrEqual(afterLoad);
  });
  
  test('加载已存在的 meta', async () => {
    const domain = 'example.com';
    const sessionId = 'existing-session';
    const key = `sessions:${domain}:${sessionId}:meta`;
    
    // 预设元数据
    const existingMeta = {
      title: '我的样式调整',
      created_at: 1234567890,
      message_count: 5,
      activeStylesSummary: '3 条规则，涉及 body, header, footer 等'
    };
    await mockStorage.set({ [key]: existingMeta });
    
    // 加载元数据
    const meta = await loadSessionMeta(domain, sessionId);
    
    // 应返回已存在的元数据
    expect(meta).toEqual(existingMeta);
    expect(meta.title).toBe('我的样式调整');
    expect(meta.message_count).toBe(5);
    expect(meta.activeStylesSummary).toBe('3 条规则，涉及 body, header, footer 等');
  });
  
  test('不同会话的 meta 独立', async () => {
    const domain = 'test.com';
    const sessionId1 = 'session-1';
    const sessionId2 = 'session-2';
    
    const key1 = `sessions:${domain}:${sessionId1}:meta`;
    const key2 = `sessions:${domain}:${sessionId2}:meta`;
    
    // 设置不同的元数据
    await mockStorage.set({
      [key1]: { title: '会话 1', created_at: 1000, message_count: 1 },
      [key2]: { title: '会话 2', created_at: 2000, message_count: 2 }
    });
    
    // 加载并验证独立性
    const meta1 = await loadSessionMeta(domain, sessionId1);
    const meta2 = await loadSessionMeta(domain, sessionId2);
    
    expect(meta1.title).toBe('会话 1');
    expect(meta1.message_count).toBe(1);
    
    expect(meta2.title).toBe('会话 2');
    expect(meta2.message_count).toBe(2);
  });
  
  test('错误时返回默认值', async () => {
    const domain = 'error-test.com';
    const sessionId = 'error-session';
    
    // 模拟 get 方法抛出错误
    const originalGet = mockStorage.get;
    mockStorage.get = vi.fn().mockRejectedValue(new Error('Storage error'));
    
    // 应返回默认值而不抛出错误
    const meta = await loadSessionMeta(domain, sessionId);
    expect(meta.title).toBeNull();
    expect(meta.message_count).toBe(0);
    
    // 恢复原方法
    mockStorage.get = originalGet;
  });
});

describe('saveSessionMeta', () => {
  beforeEach(() => {
    mockStorage.clear();
  });
  
  test('保存会话元数据', async () => {
    const domain = 'github.com';
    const sessionId = 'test-session-456';
    const key = `sessions:${domain}:${sessionId}:meta`;
    
    const meta = {
      title: '深色模式调整',
      created_at: Date.now(),
      message_count: 3,
      activeStylesSummary: '5 条规则，涉及 body, .header 等'
    };
    
    await saveSessionMeta(domain, sessionId, meta);
    
    // 验证保存成功
    const { [key]: savedMeta } = await mockStorage.get(key);
    expect(savedMeta).toEqual(meta);
    expect(savedMeta.title).toBe('深色模式调整');
    expect(savedMeta.message_count).toBe(3);
  });
  
  test('覆盖已存在的元数据', async () => {
    const domain = 'example.com';
    const sessionId = 'overwrite-session';
    const key = `sessions:${domain}:${sessionId}:meta`;
    
    // 设置初始元数据
    const initialMeta = {
      title: '初始标题',
      created_at: 1000,
      message_count: 1
    };
    await mockStorage.set({ [key]: initialMeta });
    
    // 更新元数据
    const updatedMeta = {
      title: '更新后的标题',
      created_at: 1000,
      message_count: 5,
      activeStylesSummary: '10 条规则'
    };
    await saveSessionMeta(domain, sessionId, updatedMeta);
    
    // 验证已覆盖
    const { [key]: savedMeta } = await mockStorage.get(key);
    expect(savedMeta.title).toBe('更新后的标题');
    expect(savedMeta.message_count).toBe(5);
    expect(savedMeta.activeStylesSummary).toBe('10 条规则');
  });
  
  test('保存后读取一致', async () => {
    const domain = 'consistency-test.com';
    const sessionId = 'consistency-session';
    
    const originalMeta = {
      title: '测试标题',
      created_at: 9876543210,
      message_count: 7,
      activeStylesSummary: '2 条规则，涉及 .button 等'
    };
    
    // 保存
    await saveSessionMeta(domain, sessionId, originalMeta);
    
    // 读取
    const loadedMeta = await loadSessionMeta(domain, sessionId);
    
    // 验证一致性
    expect(loadedMeta).toEqual(originalMeta);
    expect(loadedMeta.title).toBe(originalMeta.title);
    expect(loadedMeta.created_at).toBe(originalMeta.created_at);
    expect(loadedMeta.message_count).toBe(originalMeta.message_count);
    expect(loadedMeta.activeStylesSummary).toBe(originalMeta.activeStylesSummary);
  });
  
  test('保存空对象', async () => {
    const domain = 'empty-test.com';
    const sessionId = 'empty-session';
    const key = `sessions:${domain}:${sessionId}:meta`;
    
    const emptyMeta = {};
    await saveSessionMeta(domain, sessionId, emptyMeta);
    
    const { [key]: savedMeta } = await mockStorage.get(key);
    expect(savedMeta).toEqual({});
  });
  
  test('错误时抛出异常', async () => {
    const domain = 'error-save.com';
    const sessionId = 'error-session';
    const meta = { title: '测试', created_at: Date.now(), message_count: 0 };
    
    // 模拟 set 方法抛出错误
    const originalSet = mockStorage.set;
    mockStorage.set = vi.fn().mockRejectedValue(new Error('Save failed'));
    
    // 应抛出错误
    await expect(saveSessionMeta(domain, sessionId, meta)).rejects.toThrow('Save failed');
    
    // 恢复原方法
    mockStorage.set = originalSet;
  });
});
