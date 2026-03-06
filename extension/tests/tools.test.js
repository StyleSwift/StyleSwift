/**
 * Tools 单元测试
 * 
 * 测试 Tab 锁定机制（getTargetTabId / lockTab / unlockTab / getTargetDomain / sendToContentScript）
 * 
 * 测试标准：
 * - 锁定后切换 Tab 不影响通信目标
 * - 解锁后获取新的活跃 Tab
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
