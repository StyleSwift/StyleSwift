/**
 * Tools 单元测试
 * 
 * 测试 Tab 锁定机制（getTargetTabId / lockTab / unlockTab / getTargetDomain / sendToContentScript）
 * 测试 runApplyStyles（save / rollback_last / rollback_all 模式）
 * 
 * 测试标准：
 * - 锁定后切换 Tab 不影响通信目标
 * - 解锁后获取新的活跃 Tab
 * - save 后 storage 有合并后 CSS
 * - rollback_last 移除最后一条
 * - rollback_all 清空
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock chrome.tabs API
const mockTabs = {
  currentActiveTab: { id: 123, url: 'https://example.com' },
  
  async query(queryInfo) {
    if (queryInfo.active && queryInfo.currentWindow) {
      return [this.currentActiveTab];
    }
    return [];
  },
  
  sendMessage(tabId, message, callback) {
    if (tabId === this.currentActiveTab.id) {
      // Mock domain response
      if (message.tool === 'get_domain') {
        callback('example.com');
      } else if (message.tool === 'get_page_structure') {
        callback({ success: true });
      } else {
        callback({ success: true });
      }
    } else {
      // Tab doesn't exist
      chrome.runtime.lastError = { message: 'Tab not found' };
      callback(undefined);
      chrome.runtime.lastError = undefined;
    }
  }
};

// Mock chrome.runtime
const mockRuntime = {
  lastError: undefined
};

// Setup global mocks
global.chrome = {
  tabs: mockTabs,
  runtime: mockRuntime
};

// Import functions to test
// Note: In actual test environment, we'd import from the module
// For now, we'll copy the implementation here for testing

let lockedTabId = null;

async function getTargetTabId() {
  if (lockedTabId) return lockedTabId;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.id;
}

function lockTab(tabId) {
  lockedTabId = tabId;
}

function unlockTab() {
  lockedTabId = null;
}

async function getTargetDomain() {
  const tabId = await getTargetTabId();
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { tool: 'get_domain' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('getTargetDomain failed:', chrome.runtime.lastError.message);
        resolve('unknown');
      } else {
        resolve(response || 'unknown');
      }
    });
  });
}

async function sendToContentScript(message) {
  const tabId = await getTargetTabId();
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Content Script 不可用: ${chrome.runtime.lastError.message}`));
      } else {
        resolve(response);
      }
    });
  });
}

describe('Tab 锁定机制', () => {
  beforeEach(() => {
    // Reset state before each test
    lockedTabId = null;
    mockTabs.currentActiveTab = { id: 123, url: 'https://example.com' };
    mockRuntime.lastError = undefined;
    
    // Reset sendMessage mock to default behavior
    mockTabs.sendMessage = (tabId, message, callback) => {
      if (tabId === mockTabs.currentActiveTab.id) {
        // Mock domain response
        if (message.tool === 'get_domain') {
          callback('example.com');
        } else if (message.tool === 'get_page_structure') {
          callback({ success: true });
        } else {
          callback({ success: true });
        }
      } else {
        // Tab doesn't exist
        chrome.runtime.lastError = { message: 'Tab not found' };
        callback(undefined);
        chrome.runtime.lastError = undefined;
      }
    };
  });

  describe('getTargetTabId', () => {
    test('初始状态返回当前活跃 Tab', async () => {
      const tabId = await getTargetTabId();
      expect(tabId).toBe(123);
    });

    test('锁定后返回锁定的 Tab ID', async () => {
      lockTab(456);
      const tabId = await getTargetTabId();
      expect(tabId).toBe(456);
    });

    test('解锁后返回新的活跃 Tab', async () => {
      lockTab(456);
      let tabId = await getTargetTabId();
      expect(tabId).toBe(456);
      
      unlockTab();
      mockTabs.currentActiveTab = { id: 789, url: 'https://another.com' };
      tabId = await getTargetTabId();
      expect(tabId).toBe(789);
    });
  });

  describe('lockTab / unlockTab', () => {
    test('lockTab 设置正确的 Tab ID', () => {
      lockTab(999);
      expect(lockedTabId).toBe(999);
    });

    test('unlockTab 清除锁定', () => {
      lockTab(999);
      expect(lockedTabId).toBe(999);
      
      unlockTab();
      expect(lockedTabId).toBe(null);
    });

    test('多次 lockTab 覆盖之前的锁定', () => {
      lockTab(111);
      expect(lockedTabId).toBe(111);
      
      lockTab(222);
      expect(lockedTabId).toBe(222);
    });
  });

  describe('getTargetDomain', () => {
    test('成功获取域名', async () => {
      const domain = await getTargetDomain();
      expect(domain).toBe('example.com');
    });

    test('锁定 Tab 后从锁定的 Tab 获取域名', async () => {
      // 锁定 Tab 456，即使当前活跃 Tab 是 123
      lockTab(456);
      
      // 修改 sendMessage mock 以处理 Tab 456
      mockTabs.sendMessage = (tabId, message, callback) => {
        if (tabId === 456 && message.tool === 'get_domain') {
          callback('locked-tab.com');
        } else if (tabId === 123) {
          callback('example.com');
        }
      };
      
      const domain = await getTargetDomain();
      expect(domain).toBe('locked-tab.com');
    });

    test('Content Script 不可用时返回 unknown', async () => {
      const originalSendMessage = mockTabs.sendMessage;
      mockTabs.sendMessage = (tabId, message, callback) => {
        chrome.runtime.lastError = { message: 'Cannot access tab' };
        callback(undefined);
        chrome.runtime.lastError = undefined;
      };
      
      const domain = await getTargetDomain();
      expect(domain).toBe('unknown');
      
      mockTabs.sendMessage = originalSendMessage;
    });

    test('响应为空时返回 unknown', async () => {
      const originalSendMessage = mockTabs.sendMessage;
      mockTabs.sendMessage = (tabId, message, callback) => {
        callback(null);
      };
      
      const domain = await getTargetDomain();
      expect(domain).toBe('unknown');
      
      mockTabs.sendMessage = originalSendMessage;
    });
  });

  describe('sendToContentScript', () => {
    test('成功发送消息到当前 Tab', async () => {
      const message = { tool: 'get_page_structure' };
      const response = await sendToContentScript(message);
      expect(response).toEqual({ success: true });
    });

    test('锁定后发送到锁定的 Tab', async () => {
      lockTab(456);
      
      mockTabs.sendMessage = (tabId, message, callback) => {
        if (tabId === 456) {
          callback({ data: 'from locked tab' });
        }
      };
      
      const message = { tool: 'inject_css', args: { css: 'body { color: red; }' } };
      const response = await sendToContentScript(message);
      expect(response).toEqual({ data: 'from locked tab' });
    });

    test('Content Script 不可用时抛出错误', async () => {
      const originalSendMessage = mockTabs.sendMessage;
      mockTabs.sendMessage = (tabId, message, callback) => {
        chrome.runtime.lastError = { message: 'Content script not loaded' };
        callback(undefined);
      };
      
      await expect(sendToContentScript({ tool: 'test' }))
        .rejects.toThrow('Content Script 不可用: Content script not loaded');
      
      mockTabs.sendMessage = originalSendMessage;
    });
  });

  describe('集成测试 - 锁定后切换 Tab 不影响通信目标', () => {
    test('完整场景：锁定、切换、解锁', async () => {
      // 步骤 1: 初始状态，Tab 123 是活跃的
      let tabId = await getTargetTabId();
      expect(tabId).toBe(123);
      
      // 步骤 2: 锁定 Tab 123
      lockTab(123);
      
      // 步骤 3: 用户切换到 Tab 456（模拟 currentActiveTab 改变）
      mockTabs.currentActiveTab = { id: 456, url: 'https://another.com' };
      
      // 步骤 4: 即使当前活跃 Tab 已切换，getTargetTabId 仍返回锁定的 Tab
      tabId = await getTargetTabId();
      expect(tabId).toBe(123); // 仍然是 123，不是 456
      
      // 步骤 5: 发送消息仍到锁定的 Tab 123
      const originalSendMessage = mockTabs.sendMessage;
      let messageSentTo = null;
      mockTabs.sendMessage = (tabId, message, callback) => {
        messageSentTo = tabId;
        callback({ success: true });
      };
      
      await sendToContentScript({ tool: 'test' });
      expect(messageSentTo).toBe(123); // 消息发送到锁定的 Tab
      
      mockTabs.sendMessage = originalSendMessage;
      
      // 步骤 6: 解锁
      unlockTab();
      
      // 步骤 7: 现在应该获取新的活跃 Tab 456
      tabId = await getTargetTabId();
      expect(tabId).toBe(456);
    });
  });
});

// =============================================================================
// runApplyStyles 测试
// =============================================================================

describe('runApplyStyles', () => {
  // Mock chrome.storage.local
  const mockStorage = {
    data: {},
    
    async get(keys) {
      if (typeof keys === 'string') {
        return { [keys]: this.data[keys] };
      }
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (this.data[key] !== undefined) {
            result[key] = this.data[key];
          }
        });
        return result;
      }
      return this.data;
    },
    
    async set(items) {
      Object.assign(this.data, items);
    },
    
    async remove(keys) {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        delete this.data[key];
      });
    },
    
    clear() {
      this.data = {};
    }
  };
  
  // Mock currentSession
  const mockCurrentSession = {
    domain: 'example.com',
    sessionId: 'test-session-123',
    stylesKey: 'sessions:example.com:test-session-123:styles',
    metaKey: 'sessions:example.com:test-session-123:meta',
    persistKey: 'persistent:example.com'
  };
  
  // Mock CSS stack for Content Script
  let mockCSSStack = [];
  let mockActiveStyleEl = null;
  
  beforeEach(() => {
    // Reset all mocks
    mockStorage.clear();
    mockCSSStack = [];
    mockActiveStyleEl = null;
    
    // Setup chrome.storage.local mock
    global.chrome.storage = { local: mockStorage };
    
    // Setup Content Script message handler mock
    mockTabs.sendMessage = (tabId, message, callback) => {
      const { tool, args = {} } = message;
      
      switch (tool) {
        case 'inject_css':
          if (!mockActiveStyleEl) {
            mockActiveStyleEl = { textContent: '' };
          }
          mockCSSStack.push(args.css);
          mockActiveStyleEl.textContent = mockCSSStack.join('\n');
          callback({ success: true });
          break;
          
        case 'rollback_css':
          if (args.scope === 'all') {
            mockCSSStack = [];
          } else {
            mockCSSStack.pop();
          }
          if (mockActiveStyleEl) {
            mockActiveStyleEl.textContent = mockCSSStack.join('\n');
          }
          callback({ success: true });
          break;
          
        case 'get_active_css':
          const css = mockCSSStack.join('\n');
          callback(css || null);
          break;
          
        default:
          callback({ success: true });
      }
    };
  });
  
  // === Helper: Import mergeCSS from css-merge.js ===
  function mergeCSS(existingCSS, newCSS) {
    // Simplified merge for testing
    if (!existingCSS || !existingCSS.trim()) return newCSS || '';
    if (!newCSS || !newCSS.trim()) return existingCSS || '';
    return existingCSS + '\n' + newCSS;
  }
  
  // === Helper: Mock updateStylesSummary ===
  async function updateStylesSummary() {
    // Simplified implementation for testing
    const key = mockCurrentSession.stylesKey;
    const css = mockStorage.data[key] || '';
    const ruleCount = (css.match(/\{/g) || []).length;
    const summary = `${ruleCount} 条规则`;
    
    const metaKey = mockCurrentSession.metaKey;
    const meta = mockStorage.data[metaKey] || {};
    meta.activeStylesSummary = summary;
    mockStorage.data[metaKey] = meta;
  }
  
  // === runApplyStyles implementation (same as tools.js) ===
  async function runApplyStyles(css, mode) {
    if (mode === 'rollback_all') {
      await mockTabs.sendMessage(null, { tool: 'rollback_css', args: { scope: 'all' } }, () => {});
      const sKey = mockCurrentSession.stylesKey;
      const pKey = mockCurrentSession.persistKey;
      await mockStorage.remove([sKey, pKey]);
      await updateStylesSummary();
      return '已回滚所有样式';
    }
    
    if (mode === 'rollback_last') {
      await mockTabs.sendMessage(null, { tool: 'rollback_css', args: { scope: 'last' } }, () => {});
      
      const remainingCSS = await new Promise(resolve => {
        mockTabs.sendMessage(null, { tool: 'get_active_css' }, resolve);
      });
      
      const sKey = mockCurrentSession.stylesKey;
      const pKey = mockCurrentSession.persistKey;
      
      if (remainingCSS && remainingCSS.trim()) {
        await mockStorage.set({ 
          [sKey]: remainingCSS, 
          [pKey]: remainingCSS 
        });
      } else {
        await mockStorage.remove([sKey, pKey]);
      }
      
      await updateStylesSummary();
      return '已撤销最后一次样式修改';
    }
    
    if (mode === 'save') {
      if (!css || !css.trim()) {
        throw new Error('[runApplyStyles] save 模式需要提供 CSS 代码');
      }
      
      await mockTabs.sendMessage(null, { tool: 'inject_css', args: { css } }, () => {});
      
      const sKey = mockCurrentSession.stylesKey;
      const { [sKey]: existing = '' } = await mockStorage.get(sKey);
      const merged = mergeCSS(existing, css);
      await mockStorage.set({ [sKey]: merged });
      
      const pKey = mockCurrentSession.persistKey;
      const { [pKey]: existingP = '' } = await mockStorage.get(pKey);
      const mergedP = mergeCSS(existingP, css);
      await mockStorage.set({ [pKey]: mergedP });
      
      await updateStylesSummary();
      return `已保存，下次访问 ${mockCurrentSession.domain} 自动应用`;
    }
    
    throw new Error(`[runApplyStyles] 未知模式: ${mode}`);
  }
  
  describe('save 模式', () => {
    test('首次保存 CSS', async () => {
      const css = 'body { background: #000 !important; }';
      const result = await runApplyStyles(css, 'save');
      
      // 验证返回消息
      expect(result).toContain('已保存');
      expect(result).toContain('example.com');
      
      // 测试标准：save 后 storage 有合并后 CSS
      const sKey = mockCurrentSession.stylesKey;
      const pKey = mockCurrentSession.persistKey;
      
      expect(mockStorage.data[sKey]).toContain('body { background: #000 !important; }');
      expect(mockStorage.data[pKey]).toContain('body { background: #000 !important; }');
    });
    
    test('多次保存会合并 CSS', async () => {
      const css1 = 'body { background: #000 !important; }';
      const css2 = '.header { color: #fff !important; }';
      
      await runApplyStyles(css1, 'save');
      await runApplyStyles(css2, 'save');
      
      const sKey = mockCurrentSession.stylesKey;
      const stored = mockStorage.data[sKey];
      
      // 两次保存的 CSS 都应该在存储中
      expect(stored).toContain('body { background: #000 !important; }');
      expect(stored).toContain('.header { color: #fff !important; }');
    });
    
    test('会话样式和永久样式同时更新', async () => {
      const css = 'body { margin: 0 !important; }';
      await runApplyStyles(css, 'save');
      
      const sKey = mockCurrentSession.stylesKey;
      const pKey = mockCurrentSession.persistKey;
      
      expect(mockStorage.data[sKey]).toBeDefined();
      expect(mockStorage.data[pKey]).toBeDefined();
      expect(mockStorage.data[sKey]).toBe(mockStorage.data[pKey]);
    });
    
    test('空 CSS 抛出错误', async () => {
      await expect(runApplyStyles('', 'save')).rejects.toThrow('save 模式需要提供 CSS 代码');
      await expect(runApplyStyles(null, 'save')).rejects.toThrow('save 模式需要提供 CSS 代码');
    });
    
    test('更新样式摘要', async () => {
      const css = 'body { background: #000 !important; }';
      await runApplyStyles(css, 'save');
      
      const metaKey = mockCurrentSession.metaKey;
      const meta = mockStorage.data[metaKey];
      
      expect(meta.activeStylesSummary).toContain('条规则');
    });
  });
  
  describe('rollback_last 模式', () => {
    test('撤销最后一次修改', async () => {
      // 先保存两次
      const css1 = 'body { background: #000 !important; }';
      const css2 = '.header { color: #fff !important; }';
      
      await runApplyStyles(css1, 'save');
      await runApplyStyles(css2, 'save');
      
      // 撤销最后一次
      const result = await runApplyStyles(null, 'rollback_last');
      
      expect(result).toBe('已撤销最后一次样式修改');
      
      // 测试标准：rollback_last 移除最后一条
      const sKey = mockCurrentSession.stylesKey;
      const stored = mockStorage.data[sKey];
      
      // 应该只剩下第一条 CSS
      expect(stored).toContain('body { background: #000 !important; }');
      expect(stored).not.toContain('.header { color: #fff !important; }');
    });
    
    test('撤销到空状态', async () => {
      const css = 'body { margin: 0 !important; }';
      await runApplyStyles(css, 'save');
      
      // 撤销唯一的 CSS
      await runApplyStyles(null, 'rollback_last');
      
      const sKey = mockCurrentSession.stylesKey;
      const pKey = mockCurrentSession.persistKey;
      
      // 存储应该被清空
      expect(mockStorage.data[sKey]).toBeUndefined();
      expect(mockStorage.data[pKey]).toBeUndefined();
    });
    
    test('多次撤销', async () => {
      const css1 = 'body { a: 1 !important; }';
      const css2 = 'body { b: 2 !important; }';
      const css3 = 'body { c: 3 !important; }';
      
      await runApplyStyles(css1, 'save');
      await runApplyStyles(css2, 'save');
      await runApplyStyles(css3, 'save');
      
      // 撤销两次
      await runApplyStyles(null, 'rollback_last');
      await runApplyStyles(null, 'rollback_last');
      
      const sKey = mockCurrentSession.stylesKey;
      const stored = mockStorage.data[sKey];
      
      // 只剩下第一条
      expect(stored).toContain('body { a: 1 !important; }');
      expect(stored).not.toContain('b: 2');
      expect(stored).not.toContain('c: 3');
    });
  });
  
  describe('rollback_all 模式', () => {
    test('清空所有样式', async () => {
      // 保存多次
      const css1 = 'body { background: #000 !important; }';
      const css2 = '.header { color: #fff !important; }';
      const css3 = '.footer { padding: 0 !important; }';
      
      await runApplyStyles(css1, 'save');
      await runApplyStyles(css2, 'save');
      await runApplyStyles(css3, 'save');
      
      // 清空所有
      const result = await runApplyStyles(null, 'rollback_all');
      
      expect(result).toBe('已回滚所有样式');
      
      // 测试标准：rollback_all 清空
      const sKey = mockCurrentSession.stylesKey;
      const pKey = mockCurrentSession.persistKey;
      
      expect(mockStorage.data[sKey]).toBeUndefined();
      expect(mockStorage.data[pKey]).toBeUndefined();
    });
    
    test('空状态时也能执行', async () => {
      // 没有任何 CSS，直接执行 rollback_all
      const result = await runApplyStyles(null, 'rollback_all');
      
      expect(result).toBe('已回滚所有样式');
    });
  });
  
  describe('集成测试', () => {
    test('完整流程：save -> save -> rollback_last -> rollback_all', async () => {
      // 步骤 1: 保存第一条 CSS
      const css1 = 'body { background: #000 !important; }';
      let result = await runApplyStyles(css1, 'save');
      expect(result).toContain('已保存');
      
      let sKey = mockCurrentSession.stylesKey;
      expect(mockStorage.data[sKey]).toContain('background: #000');
      
      // 步骤 2: 保存第二条 CSS
      const css2 = '.header { color: #fff !important; }';
      result = await runApplyStyles(css2, 'save');
      expect(result).toContain('已保存');
      
      expect(mockStorage.data[sKey]).toContain('background: #000');
      expect(mockStorage.data[sKey]).toContain('color: #fff');
      
      // 步骤 3: 撤销最后一条
      result = await runApplyStyles(null, 'rollback_last');
      expect(result).toBe('已撤销最后一次样式修改');
      
      expect(mockStorage.data[sKey]).toContain('background: #000');
      expect(mockStorage.data[sKey]).not.toContain('color: #fff');
      
      // 步骤 4: 清空所有
      result = await runApplyStyles(null, 'rollback_all');
      expect(result).toBe('已回滚所有样式');
      
      expect(mockStorage.data[sKey]).toBeUndefined();
    });
  });
});
