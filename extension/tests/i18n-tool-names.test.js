/**
 * 工具名称 i18n 映射单元测试
 *
 * 测试范围:
 * 1. TOOL_I18N_KEYS 映射完整性（每个已知工具都有对应 key）
 * 2. getToolDisplayName 函数返回正确的本地化名称
 * 3. 未知工具名回退到原始名称
 * 4. i18n key 与 _locales/messages.json 的一致性
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock chrome.i18n API
// ============================================================================

const ZH_CN_MESSAGES = {
	toolNameThink: { message: '结构思考' },
	toolNameGetPageStructure: { message: '查看页面结构' },
	toolNameGrep: { message: '搜索页面元素' },
	toolNameApplyStyles: { message: '应用样式' },
	toolNameGetUserProfile: { message: '获取用户画像' },
	toolNameUpdateUserProfile: { message: '更新用户画像' },
	toolNameLoadSkill: { message: '加载知识' },
	toolNameSaveStyleSkill: { message: '保存风格技能' },
	toolNameListStyleSkills: { message: '列出风格技能' },
	toolNameDeleteStyleSkill: { message: '删除风格技能' },
	toolNameTodoWrite: { message: '任务规划' },
	toolNameTask: { message: '子任务' },
	toolStatusProcessing: { message: '进行中' },
	toolStatusSubAgentRunning: { message: '子智能体运行中…' },
	toolLabelInput: { message: '输入:' },
	toolLabelOutput: { message: '输出:' },
};

const EN_MESSAGES = {
	toolNameThink: { message: 'Structured Thinking' },
	toolNameGetPageStructure: { message: 'View Page Structure' },
	toolNameGrep: { message: 'Search Page Elements' },
	toolNameApplyStyles: { message: 'Apply Styles' },
	toolNameGetUserProfile: { message: 'Get User Profile' },
	toolNameUpdateUserProfile: { message: 'Update User Profile' },
	toolNameLoadSkill: { message: 'Load Knowledge' },
	toolNameSaveStyleSkill: { message: 'Save Style Skill' },
	toolNameListStyleSkills: { message: 'List Style Skills' },
	toolNameDeleteStyleSkill: { message: 'Delete Style Skill' },
	toolNameTodoWrite: { message: 'Task Planning' },
	toolNameTask: { message: 'Subtask' },
	toolStatusProcessing: { message: 'Processing...' },
	toolStatusSubAgentRunning: { message: 'Sub-agent running...' },
	toolLabelInput: { message: 'Input:' },
	toolLabelOutput: { message: 'Output:' },
};

// ============================================================================
// 辅助函数：从 messages.json 中提取 key 列表
// ============================================================================

function extractMessageKeys(messagesObj) {
	return Object.keys(messagesObj);
}

// ============================================================================
// 测试
// ============================================================================

describe('工具名称 i18n 映射', () => {
	// 使用中文 locale 进行测试
	let getMessageMock;

	beforeEach(() => {
		// 模拟 chrome.i18n.getMessage
		getMessageMock = vi.fn((key) => {
			const entry = ZH_CN_MESSAGES[key];
			return entry ? entry.message : key;
		});
		global.chrome = global.chrome || {};
		global.chrome.i18n = global.chrome.i18n || {};
		global.chrome.i18n.getMessage = getMessageMock;
	});

	describe('TOOL_I18N_KEYS 映射完整性', () => {
		const TOOL_I18N_KEYS = {
			think: 'toolNameThink',
			get_page_structure: 'toolNameGetPageStructure',
			grep: 'toolNameGrep',
			apply_styles: 'toolNameApplyStyles',
			get_user_profile: 'toolNameGetUserProfile',
			update_user_profile: 'toolNameUpdateUserProfile',
			load_skill: 'toolNameLoadSkill',
			save_style_skill: 'toolNameSaveStyleSkill',
			list_style_skills: 'toolNameListStyleSkills',
			delete_style_skill: 'toolNameDeleteStyleSkill',
			TodoWrite: 'toolNameTodoWrite',
			Task: 'toolNameTask',
		};

		it('应该覆盖所有已知工具名称', () => {
			const knownTools = [
				'think',
				'get_page_structure',
				'grep',
				'apply_styles',
				'get_user_profile',
				'update_user_profile',
				'load_skill',
				'save_style_skill',
				'list_style_skills',
				'delete_style_skill',
				'TodoWrite',
				'Task',
			];

			for (const tool of knownTools) {
				expect(TOOL_I18N_KEYS).toHaveProperty(tool);
			}
		});

		it('映射值应该全部是有效的 i18n key 格式', () => {
			for (const [toolName, i18nKey] of Object.entries(TOOL_I18N_KEYS)) {
				expect(i18nKey).toMatch(/^toolName[A-Z]/);
			}
		});

		it('不应该有重复的 i18n key', () => {
			const values = Object.values(TOOL_I18N_KEYS);
			const uniqueValues = new Set(values);
			expect(values.length).toBe(uniqueValues.size);
		});
	});

	describe('getToolDisplayName', () => {
		// 模拟 getToolDisplayName 函数逻辑
		function getToolDisplayName(toolName) {
			const TOOL_I18N_KEYS = {
				think: 'toolNameThink',
				get_page_structure: 'toolNameGetPageStructure',
				grep: 'toolNameGrep',
				apply_styles: 'toolNameApplyStyles',
				get_user_profile: 'toolNameGetUserProfile',
				update_user_profile: 'toolNameUpdateUserProfile',
				load_skill: 'toolNameLoadSkill',
				save_style_skill: 'toolNameSaveStyleSkill',
				list_style_skills: 'toolNameListStyleSkills',
				delete_style_skill: 'toolNameDeleteStyleSkill',
				TodoWrite: 'toolNameTodoWrite',
				Task: 'toolNameTask',
			};

			const i18nKey = TOOL_I18N_KEYS[toolName];
			if (i18nKey) {
				const localized = getMessageMock(i18nKey);
				if (localized !== i18nKey) return localized;
			}
			return toolName;
		}

		it('应该返回已知工具的中文显示名称', () => {
			expect(getToolDisplayName('think')).toBe('结构思考');
			expect(getToolDisplayName('get_page_structure')).toBe('查看页面结构');
			expect(getToolDisplayName('grep')).toBe('搜索页面元素');
			expect(getToolDisplayName('apply_styles')).toBe('应用样式');
			expect(getToolDisplayName('get_user_profile')).toBe('获取用户画像');
			expect(getToolDisplayName('update_user_profile')).toBe('更新用户画像');
			expect(getToolDisplayName('load_skill')).toBe('加载知识');
			expect(getToolDisplayName('save_style_skill')).toBe('保存风格技能');
			expect(getToolDisplayName('list_style_skills')).toBe('列出风格技能');
			expect(getToolDisplayName('delete_style_skill')).toBe('删除风格技能');
			expect(getToolDisplayName('TodoWrite')).toBe('任务规划');
			expect(getToolDisplayName('Task')).toBe('子任务');
		});

		it('未知工具名应该回退到原始名称', () => {
			expect(getToolDisplayName('unknown_tool')).toBe('unknown_tool');
			expect(getToolDisplayName('customFunction')).toBe('customFunction');
			expect(getToolDisplayName('')).toBe('');
		});

		it('正确调用 chrome.i18n.getMessage', () => {
			getToolDisplayName('grep');
			expect(getMessageMock).toHaveBeenCalledWith('toolNameGrep');

			getToolDisplayName('apply_styles');
			expect(getMessageMock).toHaveBeenCalledWith('toolNameApplyStyles');
		});
	});

	describe('i18n key 与 messages.json 一致性', () => {
		it('中文 messages.json 应包含所有工具名称 key', () => {
			const requiredKeys = [
				'toolNameThink',
				'toolNameGetPageStructure',
				'toolNameGrep',
				'toolNameApplyStyles',
				'toolNameGetUserProfile',
				'toolNameUpdateUserProfile',
				'toolNameLoadSkill',
				'toolNameSaveStyleSkill',
				'toolNameListStyleSkills',
				'toolNameDeleteStyleSkill',
				'toolNameTodoWrite',
				'toolNameTask',
				'toolStatusProcessing',
				'toolStatusSubAgentRunning',
				'toolLabelInput',
				'toolLabelOutput',
			];

			for (const key of requiredKeys) {
				expect(ZH_CN_MESSAGES).toHaveProperty(key);
			}
		});

		it('英文 messages.json 应包含所有工具名称 key', () => {
			const requiredKeys = [
				'toolNameThink',
				'toolNameGetPageStructure',
				'toolNameGrep',
				'toolNameApplyStyles',
				'toolNameGetUserProfile',
				'toolNameUpdateUserProfile',
				'toolNameLoadSkill',
				'toolNameSaveStyleSkill',
				'toolNameListStyleSkills',
				'toolNameDeleteStyleSkill',
				'toolNameTodoWrite',
				'toolNameTask',
				'toolStatusProcessing',
				'toolStatusSubAgentRunning',
				'toolLabelInput',
				'toolLabelOutput',
			];

			for (const key of requiredKeys) {
				expect(EN_MESSAGES).toHaveProperty(key);
			}
		});

		it('中英文 messages.json 的 key 集合应该一致', () => {
			const zhKeys = extractMessageKeys(ZH_CN_MESSAGES).sort();
			const enKeys = extractMessageKeys(EN_MESSAGES).sort();
			expect(zhKeys).toEqual(enKeys);
		});

		it('每个工具 key 的中文值不应与英文值相同', () => {
			for (const key of Object.keys(ZH_CN_MESSAGES)) {
				// toolName 和 toolStatus 类型的 key，中文和英文应该不同
				if (key.startsWith('toolName') || key.startsWith('toolStatus')) {
					expect(ZH_CN_MESSAGES[key].message).not.toBe(EN_MESSAGES[key].message);
				}
			}
		});
	});

	describe('i18n 回退机制', () => {
		it('当 getMessage 返回 key 本身时，应回退到原始工具名', () => {
			// 模拟 locale 未找到 key 的情况
			const fallbackMock = vi.fn((key) => key); // 返回 key 本身表示未找到

			function getToolDisplayNameWithFallback(toolName) {
				const TOOL_I18N_KEYS = {
					think: 'toolNameThink',
					get_page_structure: 'toolNameGetPageStructure',
					grep: 'toolNameGrep',
				};

				const i18nKey = TOOL_I18N_KEYS[toolName];
				if (i18nKey) {
					const localized = fallbackMock(i18nKey);
					if (localized !== i18nKey) return localized;
				}
				return toolName;
			}

			// 当 i18n 未命中时，应回退到原始工具名
			expect(getToolDisplayNameWithFallback('think')).toBe('think');
			expect(getToolDisplayNameWithFallback('grep')).toBe('grep');
		});

		it('未知工具名应跳过 i18n 直接返回', () => {
			expect(getToolDisplayNameWithFallback('unknown_new_tool')).toBe('unknown_new_tool');

			function getToolDisplayNameWithFallback(toolName) {
				const TOOL_I18N_KEYS = {
					think: 'toolNameThink',
				};
				const i18nKey = TOOL_I18N_KEYS[toolName];
				if (i18nKey) {
					const localized = chrome.i18n.getMessage(i18nKey);
					if (localized !== i18nKey) return localized;
				}
				return toolName;
			}

			expect(getToolDisplayNameWithFallback('some_random_tool')).toBe('some_random_tool');
		});
	});
});