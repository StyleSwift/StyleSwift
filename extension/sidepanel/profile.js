/**
 * StyleSwift - 用户画像管理
 * 
 * 用户风格偏好画像的读写操作
 * 画像存储在 chrome.storage.local 的 userProfile key 中
 */

import { getMessage, formatMessage } from './i18n.js';

/**
 * 用户画像默认提示的 i18n key
 * 用于标识"无画像"状态，避免硬编码本地化字符串做比较
 */
const NEW_USER_PROFILE_KEY = 'newUserProfile';

/**
 * 获取用户风格偏好画像
 * 
 * @returns {Promise<string>} 用户画像内容，无画像时返回默认提示
 * 
 * @example
 * const profile = await runGetUserProfile();
 * // 有画像：返回画像内容
 * // 无画像：返回 '(New user, no style preferences recorded)' 等本地化提示
 */
async function runGetUserProfile() {
  try {
    const { userProfile } = await chrome.storage.local.get('userProfile');
    
    // 检查画像是否存在且非空
    if (!userProfile?.trim()) {
      return '(' + getMessage(NEW_USER_PROFILE_KEY) + ')';
    }
    
    return userProfile;
  } catch (error) {
    console.error('[Profile] Failed to get user profile:', error);
    // 出错时返回默认提示，不中断流程
    return '(' + getMessage(NEW_USER_PROFILE_KEY) + ')';
  }
}

/**
 * 更新用户风格偏好画像
 * 
 * @param {string} content - 完整的用户画像内容（覆盖写入）
 * @returns {Promise<string>} 操作结果消息
 * 
 * @example
 * await runUpdateUserProfile('用户偏好：深色模式、圆角设计、现代简约风格');
 * // 返回: '已更新用户画像' (本地化消息)
 */
async function runUpdateUserProfile(content) {
  try {
    await chrome.storage.local.set({ userProfile: content });
    return getMessage('profileUpdated');
  } catch (error) {
    console.error('[Profile] Failed to update user profile:', error);
    throw new Error(formatMessage('profileUpdateFailed', { error: error.message }));
  }
}

/**
 * 判断画像内容是否为默认提示（即"无画像"状态）
 * 
 * @param {string} profile - 画像内容
 * @returns {boolean} 是否为默认提示
 */
function isDefaultProfile(profile) {
  return profile === '(' + getMessage(NEW_USER_PROFILE_KEY) + ')';
}

/**
 * 获取画像的第一行（用于 Session Context L1 注入）
 * 
 * @returns {Promise<string>} 画像第一行内容，最多 100 字
 * 
 * @example
 * const oneLiner = await getProfileOneLiner();
 * // 有画像：返回第一行（最多 100 字）
 * // 无画像：返回空字符串
 */
async function getProfileOneLiner() {
  try {
    const profile = await runGetUserProfile();
    
    // 无画像或默认提示时返回空字符串
    if (!profile || isDefaultProfile(profile)) {
      return '';
    }
    
    // 获取第一行并截断到 100 字
    const firstLine = profile.split('\n')[0];
    return firstLine.length > 100 ? firstLine.slice(0, 100) : firstLine;
  } catch (error) {
    console.error('[Profile] Failed to get profile one-liner:', error);
    return '';
  }
}

// 导出函数供其他模块使用
export { runGetUserProfile, runUpdateUserProfile, getProfileOneLiner, isDefaultProfile };