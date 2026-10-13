/**
 * StyleSwift - GlobalStateManager
 * 从 panel.js 拆分（行为不变）
 */

/**
 * 全局状态管理器类
 * 实现状态变化通知机制，支持订阅/发布模式
 */
export class GlobalStateManager {
	constructor() {
		/** @type {Object} 状态存储 */
		this._state = {
			/** 当前视图: 'onboarding' | 'main' | 'settings' */
			currentView: "onboarding",

			/** Agent 状态: 'idle' | 'running' | 'error' | 'restricted' */
			agentStatus: "idle",

			/** API Key 状态: 'valid' | 'invalid' | 'missing' */
			apiKeyStatus: "missing",

			/** 页面状态: 'ready' | 'restricted' */
			pageStatus: "ready",

			/** 当前域名 */
			currentDomain: null,

			/** 当前会话 ID */
			currentSessionId: null,

			/** 是否有样式生效 */
			hasActiveStyles: false,

			/** 存储空间警告: 'none' | 'warning' | 'critical' */
			storageWarning: "none",

			/** 当前错误类型: null | 'API_KEY_INVALID' | 'NETWORK_ERROR' | 'API_ERROR' */
			currentError: null,

			/** 会话是否已开始对话（用于控制技能区显示） */
			hasConversationStarted: false,
		};

		/** @type {Map<string, Set<Function>>} 状态变化监听器 */
		this._listeners = new Map();

		/** @type {Set<Function>} 全局状态变化监听器 */
		this._globalListeners = new Set();
	}

	/**
	 * 获取状态值
	 * @param {string} key - 状态键名
	 * @returns {*} 状态值
	 */
	get(key) {
		return this._state[key];
	}

	/**
	 * 获取所有状态
	 * @returns {Object} 状态对象
	 */
	getAll() {
		return { ...this._state };
	}

	/**
	 * 设置状态值并触发监听器
	 * @param {string} key - 状态键名
	 * @param {*} value - 新值
	 */
	set(key, value) {
		const oldValue = this._state[key];

		if (oldValue === value) return; // 值未变化，不触发

		this._state[key] = value;

		// 触发特定键的监听器
		const keyListeners = this._listeners.get(key);
		if (keyListeners) {
			keyListeners.forEach((listener) => {
				try {
					listener(value, oldValue, key);
				} catch (err) {
					console.error("[StateManager] Listener error:", err);
				}
			});
		}

		// 触发全局监听器
		this._globalListeners.forEach((listener) => {
			try {
				listener(key, value, oldValue);
			} catch (err) {
				console.error("[StateManager] Global listener error:", err);
			}
		});

		console.log(
			`[StateManager] State changed: ${key} = ${JSON.stringify(value)}`,
		);
	}

	/**
	 * 批量设置状态
	 * @param {Object} updates - 状态更新对象
	 */
	setMultiple(updates) {
		Object.entries(updates).forEach(([key, value]) => {
			this.set(key, value);
		});
	}

	/**
	 * 订阅特定状态变化
	 * @param {string} key - 状态键名
	 * @param {Function} listener - 监听函数 (newValue, oldValue, key) => void
	 * @returns {Function} 取消订阅函数
	 */
	subscribe(key, listener) {
		if (!this._listeners.has(key)) {
			this._listeners.set(key, new Set());
		}

		this._listeners.get(key).add(listener);

		// 返回取消订阅函数
		return () => {
			const keyListeners = this._listeners.get(key);
			if (keyListeners) {
				keyListeners.delete(listener);
			}
		};
	}

	/**
	 * 订阅所有状态变化
	 * @param {Function} listener - 监听函数 (key, newValue, oldValue) => void
	 * @returns {Function} 取消订阅函数
	 */
	subscribeAll(listener) {
		this._globalListeners.add(listener);
		return () => this._globalListeners.delete(listener);
	}
}
