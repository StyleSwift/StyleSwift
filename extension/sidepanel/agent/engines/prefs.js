/**
 * StyleSwift - 引擎偏好
 */

export const ENGINE_KEY = "agent_engine";

export const ENGINES = [
  { id: "builtin", label: "StyleSwift", local: false },
  { id: "claude-code", label: "Claude Code", local: true },
  { id: "codex", label: "Codex", local: true },
];

export const isLocalEngine = (id) => ENGINES.some((e) => e.id === id && e.local);
export const engineLabel = (id) => ENGINES.find((e) => e.id === id)?.label ?? id;

export async function getEngine() {
  const { [ENGINE_KEY]: id } = await chrome.storage.local.get(ENGINE_KEY);
  return ENGINES.some((e) => e.id === id) ? id : "builtin";
}

export async function setEngine(id) {
  await chrome.storage.local.set({ [ENGINE_KEY]: id });
}

/** StyleSwift 会话 → CLI 会话 ID（用于续接） */
export const engineSessionKey = (engine, domain, sessionId) => `engine_session:${engine}:${domain}:${sessionId}`;
