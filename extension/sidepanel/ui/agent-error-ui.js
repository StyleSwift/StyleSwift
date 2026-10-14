/**
 * StyleSwift - Agent 错误码 → 横幅类型、文案与操作
 * raw: true 表示直接展示引擎返回的原文（而非 i18n 文案）
 */
export const AGENT_ERROR_UI = {
	API_KEY_INVALID: { type: "API_KEY_INVALID", key: "errApiKeyInvalid", action: "settings" },
	ACCESS_DENIED: { type: "API_KEY_INVALID", key: "errAccessDenied", action: "settings" },
	MODEL_NOT_FOUND: { type: "API_ERROR", key: "errModelNotFound", action: "settings" },
	INSUFFICIENT_BALANCE: { type: "API_ERROR", key: "errInsufficientBalance", action: "retry" },
	RATE_LIMITED: { type: "API_ERROR", key: "errRateLimited", action: "retry" },
	MAX_RETRIES: { type: "API_ERROR", key: "errRateLimited", action: "retry" },
	CONTEXT_TOO_LONG: { type: "API_ERROR", key: "errContextTooLong", action: "newSession" },
	NETWORK_ERROR: { type: "NETWORK_ERROR", key: "errNetwork", action: "retry" },
	LOCAL_BRIDGE_UNAVAILABLE: { type: "API_ERROR", key: "errLocalBridgeUnavailable", action: "localSetup" },
	LOCAL_NOT_LOGGED_IN: { type: "API_ERROR", key: "errLocalNotLoggedIn", action: "localSetup" },
	LOCAL_CLI_MISSING: { type: "API_ERROR", key: "errLocalCliMissing", action: "localSetup" },
	LOCAL_PROTOCOL_MISMATCH: { type: "API_ERROR", key: "errLocalProtocolMismatch", action: "localSetup" },
	LOCAL_QUOTA: { type: "API_ERROR", raw: true, action: "switchEngine" },
	LOCAL_ENGINE_ERROR: { type: "API_ERROR", raw: true, action: "switchEngine" },
};
