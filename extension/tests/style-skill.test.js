/**
 * StyleSkillStore 单元测试
 * 
 * 测试 CRUD 操作，使用 mock chrome.storage.local
 * 
 * 测试标准：
 * - save 后 list 可见
 * - load 返回正确内容
 * - remove 后 list 不可见
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

// 设置全局 chrome mock
global.chrome = {
  storage: {
    local: mockStorage
  }
};

// 动态导入被测模块（在 mock 设置后）
const { StyleSkillStore } = await import('../sidepanel/style-skill.js');

describe('StyleSkillStore', () => {
  beforeEach(() => {
    // 每个测试前清空存储
    mockStorage.clear();
  });

  describe('INDEX_KEY 常量', () => {
    test('INDEX_KEY 应为正确的 key 格式', () => {
      expect(StyleSkillStore.INDEX_KEY).toBe('skills:user:index');
    });
  });

  describe('skillKey 方法', () => {
    test('应生成正确格式的 key', () => {
      expect(StyleSkillStore.skillKey('abc123')).toBe('skills:user:abc123');
    });

    test('不同 ID 应生成不同 key', () => {
      expect(StyleSkillStore.skillKey('abc')).toBe('skills:user:abc');
      expect(StyleSkillStore.skillKey('def')).toBe('skills:user:def');
    });
  });

  describe('list 方法', () => {
    test('空存储时应返回空数组', async () => {
      const skills = await StyleSkillStore.list();
      expect(skills).toEqual([]);
    });

    test('应返回所有技能索引', async () => {
      const testIndex = [
        { id: 'abc', name: '风格1', mood: '描述1', sourceDomain: 'a.com', createdAt: 1000 },
        { id: 'def', name: '风格2', mood: '描述2', sourceDomain: 'b.com', createdAt: 2000 }
      ];
      await mockStorage.set({ 'skills:user:index': testIndex });
      
      const skills = await StyleSkillStore.list();
      expect(skills).toEqual(testIndex);
    });
  });

  describe('save 方法', () => {
    test('save 后 list 可见', async () => {
      await StyleSkillStore.save('test123', '测试风格', '测试描述', 'example.com', '# 测试内容');
      
      const skills = await StyleSkillStore.list();
      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('test123');
      expect(skills[0].name).toBe('测试风格');
      expect(skills[0].mood).toBe('测试描述');
      expect(skills[0].sourceDomain).toBe('example.com');
      expect(skills[0].createdAt).toBeGreaterThan(0);
    });

    test('应正确保存技能内容', async () => {
      const content = '# 赛博朋克\n\n## 风格描述\n深色背景';
      await StyleSkillStore.save('cyber', '赛博朋克', '高科技感', 'github.com', content);
      
      const saved = await mockStorage.get('skills:user:cyber');
      expect(saved['skills:user:cyber']).toBe(content);
    });

    test('更新已存在的技能应保留原 createdAt', async () => {
      const originalTime = 1700000000000;
      await mockStorage.set({
        'skills:user:index': [
          { id: 'existing', name: '旧名称', mood: '旧描述', sourceDomain: 'old.com', createdAt: originalTime }
        ]
      });
      
      await StyleSkillStore.save('existing', '新名称', '新描述', 'new.com', '新内容');
      
      const skills = await StyleSkillStore.list();
      expect(skills[0].createdAt).toBe(originalTime);
      expect(skills[0].name).toBe('新名称');
    });

    test('新增技能应生成新的 createdAt', async () => {
      const beforeSave = Date.now();
      await StyleSkillStore.save('new', '新技能', '描述', 'test.com', '内容');
      const afterSave = Date.now();
      
      const skills = await StyleSkillStore.list();
      expect(skills[0].createdAt).toBeGreaterThanOrEqual(beforeSave);
      expect(skills[0].createdAt).toBeLessThanOrEqual(afterSave);
    });
  });

  describe('load 方法', () => {
    test('load 返回正确内容', async () => {
      const content = '# 测试风格\n\n这是测试内容';
      await mockStorage.set({ 'skills:user:loadtest': content });
      
      const loaded = await StyleSkillStore.load('loadtest');
      expect(loaded).toBe(content);
    });

    test('不存在的技能应返回 null', async () => {
      const loaded = await StyleSkillStore.load('nonexistent');
      expect(loaded).toBeNull();
    });

    test('空字符串内容应返回 null', async () => {
      await mockStorage.set({ 'skills:user:empty': '' });
      
      const loaded = await StyleSkillStore.load('empty');
      expect(loaded).toBeNull();
    });
  });

  describe('remove 方法', () => {
    test('remove 后 list 不可见', async () => {
      await StyleSkillStore.save('toremove', '待删除', '描述', 'test.com', '内容');
      
      // 确认存在
      let skills = await StyleSkillStore.list();
      expect(skills.length).toBe(1);
      
      // 删除
      await StyleSkillStore.remove('toremove');
      
      // 确认已删除
      skills = await StyleSkillStore.list();
      expect(skills.length).toBe(0);
    });

    test('应同时删除内容和索引', async () => {
      await StyleSkillStore.save('delete1', '风格1', '描述1', 'a.com', '内容1');
      await StyleSkillStore.save('delete2', '风格2', '描述2', 'b.com', '内容2');
      
      await StyleSkillStore.remove('delete1');
      
      // 验证索引
      const skills = await StyleSkillStore.list();
      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('delete2');
      
      // 验证内容
      const content1 = await StyleSkillStore.load('delete1');
      expect(content1).toBeNull();
      
      const content2 = await StyleSkillStore.load('delete2');
      expect(content2).toBe('内容2');
    });

    test('删除不存在的技能不应报错', async () => {
      // 空 storage 情况下删除不存在的 ID
      await expect(StyleSkillStore.remove('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('完整 CRUD 流程', () => {
    test('save → list → load → remove 完整流程', async () => {
      // 1. Save
      await StyleSkillStore.save('fulltest', '完整测试', '测试描述', 'test.com', '# 完整测试内容');
      
      // 2. List 验证
      let skills = await StyleSkillStore.list();
      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('fulltest');
      expect(skills[0].name).toBe('完整测试');
      
      // 3. Load 验证
      let content = await StyleSkillStore.load('fulltest');
      expect(content).toBe('# 完整测试内容');
      
      // 4. Remove
      await StyleSkillStore.remove('fulltest');
      
      // 5. 验证删除
      skills = await StyleSkillStore.list();
      expect(skills.length).toBe(0);
      
      content = await StyleSkillStore.load('fulltest');
      expect(content).toBeNull();
    });

    test('多个技能的 CRUD 操作', async () => {
      // 创建多个技能
      await StyleSkillStore.save('skill1', '风格1', '描述1', 'a.com', '内容1');
      await StyleSkillStore.save('skill2', '风格2', '描述2', 'b.com', '内容2');
      await StyleSkillStore.save('skill3', '风格3', '描述3', 'c.com', '内容3');
      
      // 验证 list
      let skills = await StyleSkillStore.list();
      expect(skills.length).toBe(3);
      
      // 删除中间的
      await StyleSkillStore.remove('skill2');
      
      // 验证删除后状态
      skills = await StyleSkillStore.list();
      expect(skills.length).toBe(2);
      expect(skills.find(s => s.id === 'skill2')).toBeUndefined();
      expect(skills.find(s => s.id === 'skill1')).toBeDefined();
      expect(skills.find(s => s.id === 'skill3')).toBeDefined();
      
      // 验证内容也被删除
      expect(await StyleSkillStore.load('skill2')).toBeNull();
      expect(await StyleSkillStore.load('skill1')).toBe('内容1');
      expect(await StyleSkillStore.load('skill3')).toBe('内容3');
    });
  });
});
