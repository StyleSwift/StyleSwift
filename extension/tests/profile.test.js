/**
 * Profile 用户画像单元测试
 * 
 * 测试 runGetUserProfile、runUpdateUserProfile、getProfileOneLiner
 * 
 * 测试标准：
 * - runGetUserProfile: 有画像返回内容，无画像返回默认提示
 * - runUpdateUserProfile: 写入后读取一致
 * - getProfileOneLiner: 返回第一行内容且不超过 100 字
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

// Setup mocks before importing the module
vi.stubGlobal('chrome', {
  storage: {
    local: mockStorage
  }
});

// Import functions under test
const { runGetUserProfile, runUpdateUserProfile, getProfileOneLiner } = await import('../sidepanel/profile.js');

describe('runGetUserProfile', () => {
  beforeEach(() => {
    mockStorage.clear();
  });
  
  test('无画像时返回默认提示', async () => {
    const profile = await runGetUserProfile();
    
    expect(profile).toBe('(新用户，暂无风格偏好记录)');
  });
  
  test('有画像时返回内容', async () => {
    const testProfile = '用户偏好：深色模式、圆角设计、现代简约风格';
    await mockStorage.set({ userProfile: testProfile });
    
    const profile = await runGetUserProfile();
    
    expect(profile).toBe(testProfile);
  });
  
  test('空字符串画像返回默认提示', async () => {
    await mockStorage.set({ userProfile: '' });
    
    const profile = await runGetUserProfile();
    
    expect(profile).toBe('(新用户，暂无风格偏好记录)');
  });
  
  test('只有空白字符的画像返回默认提示', async () => {
    await mockStorage.set({ userProfile: '   \n\t  ' });
    
    const profile = await runGetUserProfile();
    
    expect(profile).toBe('(新用户，暂无风格偏好记录)');
  });
  
  test('多行画像内容正确返回', async () => {
    const multiLineProfile = `用户偏好：
- 深色模式
- 圆角设计
- 现代简约风格`;
    
    await mockStorage.set({ userProfile: multiLineProfile });
    
    const profile = await runGetUserProfile();
    
    expect(profile).toBe(multiLineProfile);
  });
  
  test('错误时返回默认提示', async () => {
    // 模拟 get 方法抛出错误
    const originalGet = mockStorage.get;
    mockStorage.get = vi.fn().mockRejectedValue(new Error('Storage error'));
    
    // 应返回默认值而不抛出错误
    const profile = await runGetUserProfile();
    expect(profile).toBe('(新用户，暂无风格偏好记录)');
    
    // 恢复原方法
    mockStorage.get = originalGet;
  });
});

describe('runUpdateUserProfile', () => {
  beforeEach(() => {
    mockStorage.clear();
  });
  
  test('写入画像成功', async () => {
    const content = '用户偏好：深色模式、圆角设计';
    
    const result = await runUpdateUserProfile(content);
    
    expect(result).toBe('已更新用户画像');
    
    // 验证写入成功
    const { userProfile } = await mockStorage.get('userProfile');
    expect(userProfile).toBe(content);
  });
  
  test('写入后读取一致', async () => {
    const content = '用户偏好：护眼绿色、大字体、高对比度';
    
    // 写入
    await runUpdateUserProfile(content);
    
    // 读取
    const profile = await runGetUserProfile();
    
    // 验证一致性
    expect(profile).toBe(content);
  });
  
  test('覆盖写入已有画像', async () => {
    // 先写入一个画像
    await mockStorage.set({ userProfile: '旧画像内容' });
    
    // 覆盖写入新画像
    const newContent = '新画像内容：赛博朋克风格';
    await runUpdateUserProfile(newContent);
    
    // 验证已覆盖
    const { userProfile } = await mockStorage.get('userProfile');
    expect(userProfile).toBe(newContent);
    expect(userProfile).not.toBe('旧画像内容');
  });
  
  test('写入多行内容', async () => {
    const multiLineContent = `用户偏好：
- 深色模式
- 圆角设计
- 现代简约风格`;
    
    await runUpdateUserProfile(multiLineContent);
    
    const { userProfile } = await mockStorage.get('userProfile');
    expect(userProfile).toBe(multiLineContent);
  });
  
  test('写入空字符串', async () => {
    await runUpdateUserProfile('');
    
    const { userProfile } = await mockStorage.get('userProfile');
    expect(userProfile).toBe('');
  });
  
  test('写入特殊字符内容', async () => {
    const specialContent = '偏好：!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
    
    await runUpdateUserProfile(specialContent);
    
    const { userProfile } = await mockStorage.get('userProfile');
    expect(userProfile).toBe(specialContent);
  });
  
  test('错误时抛出异常', async () => {
    const content = '测试内容';
    
    // 模拟 set 方法抛出错误
    const originalSet = mockStorage.set;
    mockStorage.set = vi.fn().mockRejectedValue(new Error('Write failed'));
    
    // 应抛出错误
    await expect(runUpdateUserProfile(content)).rejects.toThrow('更新用户画像失败: Write failed');
    
    // 恢复原方法
    mockStorage.set = originalSet;
  });
});

describe('getProfileOneLiner', () => {
  beforeEach(() => {
    mockStorage.clear();
  });
  
  test('无画像时返回空字符串', async () => {
    const oneLiner = await getProfileOneLiner();
    
    expect(oneLiner).toBe('');
  });
  
  test('返回画像第一行', async () => {
    const profile = `第一行偏好
第二行内容
第三行更多`;
    
    await mockStorage.set({ userProfile: profile });
    
    const oneLiner = await getProfileOneLiner();
    
    expect(oneLiner).toBe('第一行偏好');
  });
  
  test('第一行超过 100 字时截断', async () => {
    // 构造一个超过 100 个字符的行（使用 ASCII 字符便于精确计数）
    const longLine = 'A'.repeat(150);
    
    await mockStorage.set({ userProfile: longLine });
    
    const oneLiner = await getProfileOneLiner();
    
    expect(oneLiner.length).toBe(100);
    expect(oneLiner).toBe(longLine.slice(0, 100));
  });
  
  test('第一行正好 100 字时完整保留', async () => {
    // 构造一个正好 100 个字符的行（ASCII字符计数更精确）
    const exactLine = 'A'.repeat(100);
    expect(exactLine.length).toBe(100);
    
    await mockStorage.set({ userProfile: exactLine });
    
    const oneLiner = await getProfileOneLiner();
    
    expect(oneLiner).toBe(exactLine);
    expect(oneLiner.length).toBe(100);
  });
  
  test('第一行不足 100 字时完整保留', async () => {
    const shortLine = '短内容';
    
    await mockStorage.set({ userProfile: shortLine });
    
    const oneLiner = await getProfileOneLiner();
    
    expect(oneLiner).toBe(shortLine);
    expect(oneLiner.length).toBeLessThan(100);
  });
  
  test('多行画像只返回第一行', async () => {
    const profile = `首行内容
第二行不应该返回
第三行也不应该返回`;
    
    await mockStorage.set({ userProfile: profile });
    
    const oneLiner = await getProfileOneLiner();
    
    expect(oneLiner).toBe('首行内容');
    expect(oneLiner).not.toContain('第二行');
  });
  
  test('错误时返回空字符串', async () => {
    // 模拟 get 方法抛出错误
    const originalGet = mockStorage.get;
    mockStorage.get = vi.fn().mockRejectedValue(new Error('Storage error'));
    
    // 应返回空字符串而不抛出错误
    const oneLiner = await getProfileOneLiner();
    expect(oneLiner).toBe('');
    
    // 恢复原方法
    mockStorage.get = originalGet;
  });
  
  test('默认提示文本返回空字符串', async () => {
    // 当 runGetUserProfile 返回默认提示时
    // getProfileOneLiner 应返回空字符串
    const oneLiner = await getProfileOneLiner();
    
    expect(oneLiner).toBe('');
  });
});
