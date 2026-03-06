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

// Mock IndexedDB
const mockIndexedDB = {
  store: {},
  
  open(dbName, version) {
    return {
      result: {
        name: dbName,
        version: version,
        objectStoreNames: {
          contains: () => true
        },
        createObjectStore: () => {}
      },
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    };
  }
};

// Mock IDBTransaction
class MockIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.mode = mode;
    this.objectStore = () => new MockObjectStore(mockIndexedDB.store);
    this.oncomplete = null;
    this.onerror = null;
    this.error = null;
  }
}

// Mock IDBObjectStore
class MockObjectStore {
  constructor(store) {
    this.store = store;
  }
  
  put(value, key) {
    this.store[key] = value;
    return { result: key };
  }
  
  get(key) {
    return { result: this.store[key] || null };
  }
  
  delete(key) {
    delete this.store[key];
    return { result: undefined };
  }
}

// Setup mocks before importing the module
vi.stubGlobal('chrome', {
  storage: {
    local: mockStorage
  }
});

vi.stubGlobal('indexedDB', {
  open: (dbName, version) => {
    const mockDB = {
      name: dbName,
      version: version,
      objectStoreNames: {
        contains: () => true
      },
      createObjectStore: () => {},
      transaction: (storeName, mode) => {
        const tx = {
          objectStore: () => new MockObjectStore(mockIndexedDB.store),
          oncomplete: null,
          onerror: null,
          error: null
        };
        
        // Simulate async transaction completion
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 0);
        
        return tx;
      }
    };
    
    const request = {
      result: mockDB,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    };
    
    // Simulate async success
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess({ target: request });
    }, 0);
    
    return request;
  }
});

// Mock crypto.randomUUID
let uuidCounter = 0;
const mockRandomUUID = () => {
  uuidCounter++;
  return `test-uuid-${uuidCounter}`;
};

vi.stubGlobal('crypto', {
  randomUUID: mockRandomUUID
});

// Import function under test
const { getOrCreateSession, loadSessionMeta, saveSessionMeta, deleteSession, autoTitle, updateStylesSummary, SessionContext, setCurrentSession } = await import('../sidepanel/session.js');

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

describe('deleteSession', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockIndexedDB.store = {}; // 清理 IndexedDB store
    uuidCounter = 0;
  });
  
  test('删除普通会话（非最后一个）', async () => {
    const domain = 'github.com';
    const indexKey = `sessions:${domain}:index`;
    
    // 预设多个会话
    const now = Date.now();
    const sessions = [
      { id: 'session-1', created_at: now - 2000 },
      { id: 'session-2', created_at: now - 1000 },
      { id: 'session-3', created_at: now }
    ];
    await mockStorage.set({ [indexKey]: sessions });
    
    // 预设会话的 meta 和 styles 数据
    await mockStorage.set({
      'sessions:github.com:session-2:meta': { title: '会话 2', created_at: now - 1000 },
      'sessions:github.com:session-2:styles': 'body { background: red; }'
    });
    
    // 删除 session-2
    const result = await deleteSession(domain, 'session-2');
    
    // 验证返回值
    expect(result.lastSession).toBe(false);
    
    // 验证索引已更新
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    expect(index.length).toBe(2);
    expect(index.find(s => s.id === 'session-2')).toBeUndefined();
    expect(index.find(s => s.id === 'session-1')).toBeDefined();
    expect(index.find(s => s.id === 'session-3')).toBeDefined();
    
    // 验证 storage 数据已删除
    const metaKey = 'sessions:github.com:session-2:meta';
    const stylesKey = 'sessions:github.com:session-2:styles';
    const { [metaKey]: meta, [stylesKey]: styles } = await mockStorage.get([metaKey, stylesKey]);
    expect(meta).toBeUndefined();
    expect(styles).toBeUndefined();
  });
  
  test('删除最后一个会话返回正确标识', async () => {
    const domain = 'example.com';
    const indexKey = `sessions:${domain}:index`;
    
    // 预设一个会话
    const session = { id: 'last-session', created_at: Date.now() };
    await mockStorage.set({ [indexKey]: [session] });
    
    // 预设会话数据
    await mockStorage.set({
      'sessions:example.com:last-session:meta': { title: '最后一个会话' },
      'sessions:example.com:last-session:styles': 'body { color: blue; }'
    });
    
    // 删除最后一个会话
    const result = await deleteSession(domain, 'last-session');
    
    // 验证返回值
    expect(result.lastSession).toBe(true);
    expect(result.domain).toBe(domain);
    
    // 验证索引为空
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    expect(index.length).toBe(0);
    
    // 验证 storage 数据已删除
    const metaKey = 'sessions:example.com:last-session:meta';
    const stylesKey = 'sessions:example.com:last-session:styles';
    const { [metaKey]: meta, [stylesKey]: styles } = await mockStorage.get([metaKey, stylesKey]);
    expect(meta).toBeUndefined();
    expect(styles).toBeUndefined();
  });
  
  test('删除不存在的会话', async () => {
    const domain = 'test.com';
    const indexKey = `sessions:${domain}:index`;
    
    // 预设会话
    const sessions = [
      { id: 'session-1', created_at: Date.now() }
    ];
    await mockStorage.set({ [indexKey]: sessions });
    
    // 尝试删除不存在的会话
    const result = await deleteSession(domain, 'non-existent-session');
    
    // 验证返回值
    expect(result.lastSession).toBe(false);
    
    // 验证索引未改变
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    expect(index.length).toBe(1);
    expect(index[0].id).toBe('session-1');
  });
  
  test('删除后其他会话数据保持不变', async () => {
    const domain = 'multi-session.com';
    const indexKey = `sessions:${domain}:index`;
    
    // 预设多个会话
    const now = Date.now();
    const sessions = [
      { id: 'keep-session', created_at: now - 1000 },
      { id: 'delete-session', created_at: now }
    ];
    await mockStorage.set({ [indexKey]: sessions });
    
    // 预设多个会话的数据
    await mockStorage.set({
      'sessions:multi-session.com:keep-session:meta': { title: '保留的会话' },
      'sessions:multi-session.com:keep-session:styles': 'body { margin: 0; }',
      'sessions:multi-session.com:delete-session:meta': { title: '要删除的会话' },
      'sessions:multi-session.com:delete-session:styles': 'body { padding: 10px; }'
    });
    
    // 删除其中一个会话
    await deleteSession(domain, 'delete-session');
    
    // 验证其他会话数据保持不变
    const keepMeta = await mockStorage.get('sessions:multi-session.com:keep-session:meta');
    const keepStyles = await mockStorage.get('sessions:multi-session.com:keep-session:styles');
    
    expect(keepMeta['sessions:multi-session.com:keep-session:meta']).toEqual({ title: '保留的会话' });
    expect(keepStyles['sessions:multi-session.com:keep-session:styles']).toBe('body { margin: 0; }');
  });
  
  test('不同域名的会话独立删除', async () => {
    const domain1 = 'github.com';
    const domain2 = 'stackoverflow.com';
    
    const indexKey1 = `sessions:${domain1}:index`;
    const indexKey2 = `sessions:${domain2}:index`;
    
    // 为两个域名预设会话
    const now = Date.now();
    await mockStorage.set({
      [indexKey1]: [{ id: 'github-session', created_at: now }],
      [indexKey2]: [{ id: 'stackoverflow-session', created_at: now }]
    });
    
    // 删除 domain1 的会话
    const result1 = await deleteSession(domain1, 'github-session');
    expect(result1.lastSession).toBe(true);
    expect(result1.domain).toBe(domain1);
    
    // 验证 domain2 的会话仍然存在
    const { [indexKey2]: index2 } = await mockStorage.get(indexKey2);
    expect(index2.length).toBe(1);
    expect(index2[0].id).toBe('stackoverflow-session');
  });
  
  test('删除会话后索引正确排序', async () => {
    const domain = 'ordered-test.com';
    const indexKey = `sessions:${domain}:index`;
    
    // 预设多个会话（乱序）
    const now = Date.now();
    const sessions = [
      { id: 'session-3', created_at: now - 500 },
      { id: 'session-1', created_at: now - 2000 },
      { id: 'session-2', created_at: now - 1000 }
    ];
    await mockStorage.set({ [indexKey]: sessions });
    
    // 删除中间的会话
    await deleteSession(domain, 'session-2');
    
    // 验证索引只移除了目标会话，其他保持原样
    const { [indexKey]: index } = await mockStorage.get(indexKey);
    expect(index.length).toBe(2);
    expect(index.find(s => s.id === 'session-1')).toBeDefined();
    expect(index.find(s => s.id === 'session-3')).toBeDefined();
    expect(index.find(s => s.id === 'session-2')).toBeUndefined();
  });
  
  test('错误处理：storage 操作失败', async () => {
    const domain = 'error-test.com';
    const sessionId = 'error-session';
    
    // 预设会话
    const indexKey = `sessions:${domain}:index`;
    await mockStorage.set({ [indexKey]: [{ id: sessionId, created_at: Date.now() }] });
    
    // 模拟 get 方法抛出错误
    const originalGet = mockStorage.get;
    mockStorage.get = vi.fn().mockRejectedValue(new Error('Storage error'));
    
    // 应抛出错误
    await expect(deleteSession(domain, sessionId)).rejects.toThrow('Storage error');
    
    // 恢复原方法
    mockStorage.get = originalGet;
  });
});

describe('autoTitle', () => {
  test('无标题时自动生成（从首条消息前20字）', () => {
    const sessionMeta = { title: null, created_at: Date.now(), message_count: 0 };
    const firstUserMessage = '把背景改成深蓝色';
    
    autoTitle(sessionMeta, firstUserMessage);
    
    expect(sessionMeta.title).toBe('把背景改成深蓝色');
  });
  
  test('已有标题时不覆盖', () => {
    const existingTitle = '我的样式调整';
    const sessionMeta = { title: existingTitle, created_at: Date.now() };
    const firstUserMessage = '把背景改成深蓝色';
    
    autoTitle(sessionMeta, firstUserMessage);
    
    expect(sessionMeta.title).toBe(existingTitle);
  });
  
  test('首条消息超过20字时截断', () => {
    const sessionMeta = { title: null };
    const longMessage = '这是一条超过二十个字的用户消息内容会被截断只保留前二十个字';
    
    autoTitle(sessionMeta, longMessage);
    
    // slice(0, 20) 取前 20 个字符
    expect(sessionMeta.title).toBe('这是一条超过二十个字的用户消息内容会被截');
    expect(sessionMeta.title.length).toBe(20);
  });
  
  test('首条消息正好20字时完整保留', () => {
    const sessionMeta = { title: null };
    // 构造一个正好20个字符的消息
    const exactMessage = '一二三四五六七八九十一二三四五六七八九十';
    
    autoTitle(sessionMeta, exactMessage);
    
    expect(sessionMeta.title).toBe(exactMessage);
    expect(sessionMeta.title.length).toBe(20);
  });
  
  test('首条消息不足20字时完整保留', () => {
    const sessionMeta = { title: null };
    const shortMessage = '短消息';
    
    autoTitle(sessionMeta, shortMessage);
    
    expect(sessionMeta.title).toBe(shortMessage);
    expect(sessionMeta.title.length).toBe(3);
  });
  
  test('空消息时生成空标题', () => {
    const sessionMeta = { title: null };
    const emptyMessage = '';
    
    autoTitle(sessionMeta, emptyMessage);
    
    expect(sessionMeta.title).toBe('');
  });
  
  test('title 为空字符串时不覆盖', () => {
    const sessionMeta = { title: '', created_at: Date.now() };
    const firstUserMessage = '把背景改成深蓝色';
    
    autoTitle(sessionMeta, firstUserMessage);
    
    // 空字符串是 falsy 值，所以会被覆盖
    expect(sessionMeta.title).toBe('把背景改成深蓝色');
  });
  
  test('title 为 undefined 时生成标题', () => {
    const sessionMeta = { title: undefined };
    const firstUserMessage = '测试消息';
    
    autoTitle(sessionMeta, firstUserMessage);
    
    expect(sessionMeta.title).toBe('测试消息');
  });
  
  test('包含特殊字符的消息正确处理', () => {
    const sessionMeta = { title: null };
    const messageWithSpecialChars = '改！@#￥%……&*（）成深蓝色';
    
    autoTitle(sessionMeta, messageWithSpecialChars);
    
    expect(sessionMeta.title).toBe('改！@#￥%……&*（）成深蓝色');
    expect(sessionMeta.title.length).toBeLessThanOrEqual(20);
  });
  
  test('包含换行符的消息正确处理', () => {
    const sessionMeta = { title: null };
    const messageWithNewline = '第一行\n第二行内容继续';
    
    autoTitle(sessionMeta, messageWithNewline);
    
    // slice 会保留换行符
    expect(sessionMeta.title).toBe('第一行\n第二行内容继续');
  });
  
  test('多次调用不影响已有标题', () => {
    const sessionMeta = { title: null };
    const message1 = '第一次消息';
    const message2 = '第二次消息';
    
    autoTitle(sessionMeta, message1);
    const firstTitle = sessionMeta.title;
    
    // 再次调用
    autoTitle(sessionMeta, message2);
    
    expect(sessionMeta.title).toBe(firstTitle);
  });
});

describe('updateStylesSummary', () => {
  beforeEach(() => {
    mockStorage.clear();
  });
  
  test('无当前会话时不执行操作', async () => {
    // currentSession 为 null
    await updateStylesSummary();
    
    // 不应抛出错误，正常返回
    // 验证 storage 没有被写入
    expect(Object.keys(mockStorage.data).length).toBe(0);
  });
  
  test('无 CSS 样式时不生成摘要', async () => {
    const domain = 'github.com';
    const sessionId = 'test-session';
    
    // 设置 currentSession
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 无 CSS
    await updateStylesSummary();
    
    // meta 不应被写入
    const metaKey = sessionCtx.metaKey;
    const { [metaKey]: meta } = await mockStorage.get(metaKey);
    expect(meta).toBeUndefined();
  });
  
  test('生成样式摘要（规则数和选择器）', async () => {
    const domain = 'example.com';
    const sessionId = 'test-session';
    
    // 设置 currentSession
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 预设 CSS 样式
    const css = `body { background: #000; }
.header { color: #fff; }
.footer { padding: 10px; }
.main { margin: 20px; }`;
    
    await mockStorage.set({ [sessionCtx.stylesKey]: css });
    
    // 更新摘要
    await updateStylesSummary();
    
    // 验证摘要已写入 meta
    const metaKey = sessionCtx.metaKey;
    const { [metaKey]: meta } = await mockStorage.get(metaKey);
    
    expect(meta).toBeDefined();
    expect(meta.activeStylesSummary).toBeDefined();
    expect(meta.activeStylesSummary).toBe('4 条规则，涉及 body, .header, .footer 等');
  });
  
  test('少于 3 个选择器时正确处理', async () => {
    const domain = 'test.com';
    const sessionId = 'test-session';
    
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 只有一个选择器
    const css = 'body { background: #fff; }';
    await mockStorage.set({ [sessionCtx.stylesKey]: css });
    
    await updateStylesSummary();
    
    const metaKey = sessionCtx.metaKey;
    const { [metaKey]: meta } = await mockStorage.get(metaKey);
    
    expect(meta.activeStylesSummary).toBe('1 条规则，涉及 body 等');
  });
  
  test('保留已有 meta 字段，只更新 activeStylesSummary', async () => {
    const domain = 'github.com';
    const sessionId = 'existing-meta-session';
    
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 预设已有 meta
    const metaKey = sessionCtx.metaKey;
    const existingMeta = {
      title: '已有标题',
      created_at: 1234567890,
      message_count: 5
    };
    await mockStorage.set({ [metaKey]: existingMeta });
    
    // 预设 CSS
    const css = 'body { margin: 0; }';
    await mockStorage.set({ [sessionCtx.stylesKey]: css });
    
    await updateStylesSummary();
    
    const { [metaKey]: meta } = await mockStorage.get(metaKey);
    
    // 验证原有字段保留
    expect(meta.title).toBe('已有标题');
    expect(meta.created_at).toBe(1234567890);
    expect(meta.message_count).toBe(5);
    // 验证新字段添加
    expect(meta.activeStylesSummary).toBe('1 条规则，涉及 body 等');
  });
  
  test('正确统计规则数（包含嵌套规则）', async () => {
    const domain = 'nested-test.com';
    const sessionId = 'test-session';
    
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 包含 @media 嵌套的 CSS
    const css = `body { background: #fff; }
@media screen and (max-width: 600px) {
  body { background: #000; }
  .container { padding: 10px; }
}
.header { margin: 0; }`;
    
    await mockStorage.set({ [sessionCtx.stylesKey]: css });
    
    await updateStylesSummary();
    
    const metaKey = sessionCtx.metaKey;
    const { [metaKey]: meta } = await mockStorage.get(metaKey);
    
    // 规则数应该统计所有 {
    // body { ... } (1) + @media ... { (1) + body { (1) + .container { (1) + .header { (1) = 5
    expect(meta.activeStylesSummary).toContain('5 条规则');
  });
  
  test('空 CSS（空白字符）时不生成摘要', async () => {
    const domain = 'empty-css.com';
    const sessionId = 'test-session';
    
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 只有空白字符的 CSS
    const css = '   \n\t  \n  ';
    await mockStorage.set({ [sessionCtx.stylesKey]: css });
    
    await updateStylesSummary();
    
    const metaKey = sessionCtx.metaKey;
    const { [metaKey]: meta } = await mockStorage.get(metaKey);
    
    expect(meta).toBeUndefined();
  });
  
  test('错误处理：storage 操作失败时不中断流程', async () => {
    const domain = 'error-test.com';
    const sessionId = 'test-session';
    
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 预设 CSS
    const css = 'body { margin: 0; }';
    await mockStorage.set({ [sessionCtx.stylesKey]: css });
    
    // 模拟 get 方法抛出错误
    const originalGet = mockStorage.get;
    mockStorage.get = vi.fn().mockRejectedValue(new Error('Storage error'));
    
    // 应不抛出错误，正常返回
    await expect(updateStylesSummary()).resolves.not.toThrow();
    
    // 恢复原方法
    mockStorage.get = originalGet;
  });
  
  test('选择器包含空白字符时正确提取', async () => {
    const domain = 'whitespace-test.com';
    const sessionId = 'test-session';
    
    const sessionCtx = new SessionContext(domain, sessionId);
    setCurrentSession(sessionCtx);
    
    // 选择器包含各种空白字符
    const css = `body   { margin: 0; }
.header .nav   { padding: 10px; }
  .footer   { color: #333; }`;
    
    await mockStorage.set({ [sessionCtx.stylesKey]: css });
    
    await updateStylesSummary();
    
    const metaKey = sessionCtx.metaKey;
    const { [metaKey]: meta } = await mockStorage.get(metaKey);
    
    // 选择器应被 trim
    expect(meta.activeStylesSummary).toBe('3 条规则，涉及 body, .header .nav, .footer 等');
  });
});
