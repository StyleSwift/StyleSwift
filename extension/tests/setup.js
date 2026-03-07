/**
 * Vitest 全局 Setup 文件
 * 
 * 提供 Chrome Extension API Mock 组件库：
 * - chrome.storage.local API
 * - chrome.tabs API
 * - chrome.permissions API
 * - chrome.runtime API
 * - IndexedDB API
 * - DOM API（jsdom 环境）
 * - crypto.randomUUID
 * 
 * 使用方式：
 * 1. 导入并使用预创建的 mock 实例
 * 2. 或创建新的 mock 实例
 * 
 * 注意：此文件不强制安装全局 mock，测试文件需要自行安装。
 * 这是为了向后兼容现有测试文件。
 */

import { vi } from 'vitest';

// ============================================================================
// Chrome Storage Mock
// ============================================================================

/**
 * 模拟 chrome.storage.local API
 * 支持完整的 CRUD 操作和 getBytesInUse
 */
export class MockChromeStorage {
  constructor() {
    this.data = {};
  }

  async get(keys) {
    if (keys === null || keys === undefined) {
      return { ...this.data };
    }
    
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
  }

  async set(items) {
    Object.assign(this.data, items);
  }

  async remove(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
      delete this.data[key];
    }
  }

  async clear() {
    this.data = {};
  }

  async getBytesInUse(keys) {
    if (keys === null || keys === undefined) {
      return JSON.stringify(this.data).length;
    }
    const keyArray = Array.isArray(keys) ? keys : [keys];
    let bytes = 0;
    for (const key of keyArray) {
      if (this.data[key] !== undefined) {
        bytes += key.length + JSON.stringify(this.data[key]).length;
      }
    }
    return bytes;
  }

  get QUOTA_BYTES() {
    return 10485760; // 10MB
  }
}

// ============================================================================
// Chrome Tabs Mock
// ============================================================================

/**
 * 模拟 chrome.tabs API
 */
export class MockChromeTabs {
  constructor() {
    this.tabs = [];
    this.activeTab = { id: 1, url: 'https://example.com' };
    this.onActivatedListeners = [];
  }

  async query(options) {
    if (options.active && options.currentWindow) {
      return [this.activeTab];
    }
    return this.tabs;
  }

  async sendMessage(tabId, message) {
    // 默认行为：返回成功响应
    // 测试可以覆盖此行为
    return { success: true, domain: 'example.com' };
  }

  onActivated = {
    addListener: vi.fn((callback) => {
      this.onActivatedListeners.push(callback);
    }),
    removeListener: vi.fn((callback) => {
      const idx = this.onActivatedListeners.indexOf(callback);
      if (idx > -1) this.onActivatedListeners.splice(idx, 1);
    }),
    hasListener: vi.fn((callback) => {
      return this.onActivatedListeners.includes(callback);
    })
  };
}

// ============================================================================
// Chrome Permissions Mock
// ============================================================================

/**
 * 模拟 chrome.permissions API
 */
export class MockChromePermissions {
  constructor() {
    this.grantedOrigins = new Set(['https://api.anthropic.com/*']);
  }

  async contains(permissions) {
    if (permissions.origins) {
      return permissions.origins.every(origin => this.grantedOrigins.has(origin));
    }
    return true;
  }

  async request(permissions) {
    // 默认行为：自动授权
    // 测试可以覆盖此行为
    if (permissions.origins) {
      permissions.origins.forEach(origin => this.grantedOrigins.add(origin));
    }
    return true;
  }

  async remove(permissions) {
    if (permissions.origins) {
      permissions.origins.forEach(origin => this.grantedOrigins.delete(origin));
    }
    return true;
  }
}

// ============================================================================
// Chrome Runtime Mock
// ============================================================================

/**
 * 模拟 chrome.runtime API
 */
export class MockChromeRuntime {
  constructor() {
    this.lastError = null;
    this.id = 'test-extension-id';
  }

  getURL(path) {
    return `chrome-extension://${this.id}/${path}`;
  }

  onMessage = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn()
  };

  onConnect = {
    addListener: vi.fn(),
    removeListener: vi.fn()
  };
}

// ============================================================================
// Chrome Side Panel Mock
// ============================================================================

/**
 * 模拟 chrome.sidePanel API
 */
export class MockChromeSidePanel {
  async setPanelBehavior(options) {
    return true;
  }
}

// ============================================================================
// IndexedDB Mock
// ============================================================================

/**
 * 模拟 IndexedDB API
 */
export class MockIndexedDB {
  constructor() {
    this.databases = {};
    this.stores = {};
  }

  open(dbName, version) {
    const self = this;
    const mockDB = {
      name: dbName,
      version: version,
      objectStoreNames: {
        contains: () => true
      },
      createObjectStore: vi.fn(),
      transaction: (storeName, mode) => {
        const storeKey = `${dbName}:${storeName}`;
        if (!self.stores[storeKey]) {
          self.stores[storeKey] = {};
        }
        
        const tx = {
          objectStore: () => ({
            put: (value, key) => {
              self.stores[storeKey][key] = value;
              return { result: key };
            },
            get: (key) => ({
              result: self.stores[storeKey][key] || null
            }),
            delete: (key) => {
              delete self.stores[storeKey][key];
              return { result: undefined };
            },
            getAll: () => ({
              result: Object.values(self.stores[storeKey] || {})
            }),
            clear: () => {
              self.stores[storeKey] = {};
              return { result: undefined };
            }
          }),
          oncomplete: null,
          onerror: null,
          error: null
        };
        
        // Simulate async transaction completion
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 0);
        
        return tx;
      },
      close: vi.fn()
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

  deleteDatabase(dbName) {
    delete this.databases[dbName];
    delete this.stores[dbName];
    return { result: undefined };
  }
}

// ============================================================================
// DOM API Mock (用于需要 jsdom 环境的测试)
// ============================================================================

/**
 * 模拟 DOM API
 * 注意：vitest 配置 environment: 'jsdom' 时会自动提供 DOM API
 * 这里提供一些额外的 mock 用于特定场景
 */
export const mockDOM = {
  /**
   * 创建模拟的 DOM 元素
   */
  createElement: (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: '',
    id: '',
    style: {},
    textContent: '',
    innerHTML: '',
    children: [],
    parentNode: null,
    appendChild: vi.fn(function(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }),
    removeChild: vi.fn(function(child) {
      const idx = this.children.indexOf(child);
      if (idx > -1) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => [])
  }),

  /**
   * 模拟 getComputedStyle
   */
  getComputedStyle: () => ({
    getPropertyValue: vi.fn(() => ''),
    backgroundColor: '',
    color: ''
  })
};

// ============================================================================
// UUID Mock
// ============================================================================

/**
 * 创建一个可控的 UUID 生成器
 * @returns {Function} 返回一个生成递增 UUID 的函数
 */
export function createMockRandomUUID() {
  let counter = 0;
  return () => {
    counter++;
    return `test-uuid-${counter}`;
  };
}

// ============================================================================
// 默认导出：预创建的 Mock 实例
// ============================================================================

export const mockStorage = new MockChromeStorage();
export const mockTabs = new MockChromeTabs();
export const mockPermissions = new MockChromePermissions();
export const mockRuntime = new MockChromeRuntime();
export const mockSidePanel = new MockChromeSidePanel();
export const mockIndexedDBInstance = new MockIndexedDB();
export const mockRandomUUID = createMockRandomUUID();

// 别名导出
export { mockIndexedDBInstance as mockIndexedDB };
