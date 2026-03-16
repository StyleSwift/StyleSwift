/**
 * StyleSwift - Style Skill Storage Module
 * 
 * 用户动态创建的风格技能（Style Skill）的 CRUD 封装
 * 使用 chrome.storage.local 存储
 * 
 * 索引结构: skills:user:index - Array<{id, name, mood, sourceDomain, createdAt}>
 * 内容存储: skills:user:{id} - string (markdown)
 */

// ============================================================================
// StyleSkillStore 静态类
// ============================================================================

/**
 * 风格技能存储类
 * 
 * 提供用户动态创建的风格技能的 CRUD 操作。
 * 所有技能索引存储在 skills:user:index 中，
 * 每个技能的内容存储在 skills:user:{id} 中。
 * 
 * @example
 * // 保存技能
 * await StyleSkillStore.save('a1b2c3d4', '赛博朋克', '深色背景+霓虹色调', 'github.com', markdownContent);
 * 
 * // 列出所有技能
 * const skills = await StyleSkillStore.list();
 * // [{ id, name, mood, sourceDomain, createdAt }, ...]
 * 
 * // 加载技能内容
 * const content = await StyleSkillStore.load('a1b2c3d4');
 * 
 * // 删除技能
 * await StyleSkillStore.remove('a1b2c3d4');
 */
class StyleSkillStore {
  /**
   * 技能索引的 storage key
   * @type {string}
   */
  static INDEX_KEY = 'skills:user:index';

  /**
   * 最近使用技能的 storage key
   * @type {string}
   */
  static RECENT_KEY = 'skills:recent';

  /**
   * 最近使用技能的最大数量
   * @type {number}
   */
  static MAX_RECENT = 5;

  /**
   * 生成技能内容的 storage key
   * 
   * @param {string} id - 技能 ID
   * @returns {string} 格式: 'skills:user:{id}'
   * 
   * @example
   * StyleSkillStore.skillKey('a1b2c3d4') // 'skills:user:a1b2c3d4'
   */
  static skillKey(id) {
    return `skills:user:${id}`;
  }

  /**
   * 列出所有技能索引
   * 
   * 返回技能索引数组，每个元素包含 id、name、mood、sourceDomain、createdAt。
   * 
   * @returns {Promise<Array<Object>>} 技能索引数组
   * @returns {string} returns[].id - 技能 ID
   * @returns {string} returns[].name - 风格名称
   * @returns {string} returns[].mood - 一句话风格描述
   * @returns {string} returns[].sourceDomain - 创建时所在的网站
   * @returns {number} returns[].createdAt - 创建时间戳
   * 
   * @example
   * const skills = await StyleSkillStore.list();
   * console.log(skills);
   * // [
   * //   {
   * //     id: 'a1b2c3d4',
   * //     name: '赛博朋克',
   * //     mood: '深色背景+霓虹色调',
   * //     sourceDomain: 'github.com',
   * //     createdAt: 1709510400000
   * //   }
   * // ]
   */
  static async list() {
    const { [this.INDEX_KEY]: index = [] } = await chrome.storage.local.get(this.INDEX_KEY);
    return index;
  }

  /**
   * 保存技能
   * 
   * 保存技能内容到 chrome.storage.local，并更新索引。
   * 如果技能 ID 已存在，则更新该技能；否则创建新技能。
   * 
   * @param {string} id - 技能 ID（建议使用 crypto.randomUUID().slice(0, 8)）
   * @param {string} name - 风格名称，如"赛博朋克"、"清新日式"
   * @param {string} mood - 一句话风格描述
   * @param {string} sourceDomain - 创建时所在的网站
   * @param {string} content - 技能文档内容（markdown 格式）
   * @returns {Promise<void>}
   * 
   * @example
   * const id = crypto.randomUUID().slice(0, 8);
   * await StyleSkillStore.save(
   *   id,
   *   '赛博朋克',
   *   '深色背景+霓虹色调的高科技感',
   *   'github.com',
   *   '# 赛博朋克\n\n## 风格描述\n...'
   * );
   */
  static async save(id, name, mood, sourceDomain, content) {
    // 1. 获取当前索引
    const index = await this.list();
    
    // 2. 检查是否已存在该 ID
    const existingIndex = index.findIndex(s => s.id === id);
    
    // 3. 创建索引条目
    const entry = {
      id,
      name,
      mood,
      sourceDomain,
      createdAt: Date.now()
    };
    
    // 4. 更新或添加到索引
    if (existingIndex >= 0) {
      // 保留原有的 createdAt（如果是更新）
      entry.createdAt = index[existingIndex].createdAt;
      index[existingIndex] = entry;
    } else {
      index.push(entry);
    }
    
    // 5. 保存索引和内容
    await chrome.storage.local.set({
      [this.INDEX_KEY]: index,
      [this.skillKey(id)]: content,
    });
  }

  /**
   * 加载技能内容
   * 
   * 从 chrome.storage.local 读取指定技能的内容。
   * 
   * @param {string} id - 技能 ID
   * @returns {Promise<string|null>} 技能内容（markdown 格式），不存在时返回 null
   * 
   * @example
   * const content = await StyleSkillStore.load('a1b2c3d4');
   * if (content) {
   *   console.log(content); // '# 赛博朋克\n\n## 风格描述\n...'
   * } else {
   *   console.log('技能不存在');
   * }
   */
  static async load(id) {
    const { [this.skillKey(id)]: content } = await chrome.storage.local.get(this.skillKey(id));
    return content || null;
  }

  /**
   * 删除技能
   * 
   * 从 chrome.storage.local 删除指定技能的内容和索引条目。
   * 
   * @param {string} id - 技能 ID
   * @returns {Promise<void>}
   * 
   * @example
   * await StyleSkillStore.remove('a1b2c3d4');
   * const skills = await StyleSkillStore.list();
   * // 技能已从列表中移除
   */
  static async remove(id) {
    // 1. 获取当前索引
    const index = await this.list();
    
    // 2. 从索引中移除该 ID
    const filtered = index.filter(s => s.id !== id);
    
    // 3. 更新索引
    await chrome.storage.local.set({ [this.INDEX_KEY]: filtered });
    
    // 4. 删除技能内容
    await chrome.storage.local.remove(this.skillKey(id));
    
    // 5. 从最近使用列表中移除
    await this.removeFromRecent(id);
  }

  // ============================================================================
  // 最近使用技能管理
  // ============================================================================

  /**
   * 获取最近使用的技能 ID 列表
   * 
   * @returns {Promise<Array<{id: string, type: 'built-in' | 'user', timestamp: number}>>}
   * 
   * @example
   * const recent = await StyleSkillStore.getRecent();
   * // [{ id: 'dark-mode-template', type: 'built-in', timestamp: 1709510400000 }, ...]
   */
  static async getRecent() {
    const { [this.RECENT_KEY]: recent = [] } = await chrome.storage.local.get(this.RECENT_KEY);
    return recent;
  }

  /**
   * 记录技能使用
   * 
   * 将技能添加到最近使用列表，并移除超出限制的旧记录。
   * 
   * @param {string} id - 技能 ID
   * @param {'built-in' | 'user'} type - 技能类型
   * @returns {Promise<void>}
   * 
   * @example
   * await StyleSkillStore.recordUsage('dark-mode-template', 'built-in');
   */
  static async recordUsage(id, type) {
    // 获取当前最近使用列表
    let recent = await this.getRecent();
    
    // 移除已存在的同 ID 记录
    recent = recent.filter(r => r.id !== id);
    
    // 添加到列表开头
    recent.unshift({
      id,
      type,
      timestamp: Date.now(),
    });
    
    // 保持最大数量限制
    if (recent.length > this.MAX_RECENT) {
      recent = recent.slice(0, this.MAX_RECENT);
    }
    
    // 保存
    await chrome.storage.local.set({ [this.RECENT_KEY]: recent });
  }

  /**
   * 从最近使用列表中移除技能
   * 
   * @param {string} id - 技能 ID
   * @returns {Promise<void>}
   */
  static async removeFromRecent(id) {
    let recent = await this.getRecent();
    recent = recent.filter(r => r.id !== id);
    await chrome.storage.local.set({ [this.RECENT_KEY]: recent });
  }

  /**
   * 清空最近使用列表
   * 
   * @returns {Promise<void>}
   */
  static async clearRecent() {
    await chrome.storage.local.remove(this.RECENT_KEY);
  }
}

// ============================================================================
// 导出
// ============================================================================

export { StyleSkillStore };
