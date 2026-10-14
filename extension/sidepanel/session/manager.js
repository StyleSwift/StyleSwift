/**
 * StyleSwift - Session Manager
 *
 * Session creation, switching, deletion, and metadata management.
 */

import {
  SessionContext,
  currentSession,
  setCurrentSession,
  getCurrentSession,
  extractPath,
  pageStylesKey,
  pageActiveKey,
} from "./context.js";
import {
  saveHistory,
  loadHistory,
  deleteHistory,
  loadStylesHistory,
  saveStylesHistory,
  deleteStylesHistory,
  checkQuotaAndMigrate,
} from "./storage.js";
import {
  MAX_SESSIONS_PER_DOMAIN,
  SESSION_EXPIRE_DAYS,
  CURRENT_SCHEMA_VERSION,
} from "./constants.js";
import { ENGINES, engineSessionKey } from "../agent/engines/prefs.js";

// Re-export context
export { SessionContext, currentSession, setCurrentSession, getCurrentSession, extractPath };

// =============================================================================
// 会话索引管理
// =============================================================================

/**
 * 记录活跃会话：域名级写 sessions:{domain}:active，页面级写该路径的页面指针
 */
export async function setActiveSession(domain, sessionId, scope = "domain", path = null) {
  const key =
    scope === "page" ? pageActiveKey(domain, path) : `sessions:${domain}:active`;
  await chrome.storage.local.set({ [key]: sessionId });
}

/** 读取会话索引条目（旧数据无 scope 时视为域名级） */
async function loadIndex(domain) {
  const indexKey = `sessions:${domain}:index`;
  const { [indexKey]: index = [] } = await chrome.storage.local.get(indexKey);
  return Array.isArray(index) ? index : [];
}

const scopeOf = (entry) => (entry?.scope === "page" ? "page" : "domain");

/**
 * 按会话索引中的 scope/path 构建 SessionContext
 */
export async function loadSessionContext(domain, sessionId) {
  const entry = (await loadIndex(domain)).find((s) => s.id === sessionId);
  return new SessionContext(domain, sessionId, scopeOf(entry), entry?.path ?? null);
}

/**
 * 解析当前页面应使用的会话：
 * 1. 该路径的页面级活跃会话 → 2. 域名级活跃会话 → 3. 最新的域名级会话 → 4. 新建域名级会话
 * @returns {Promise<{id: string, scope: "domain"|"page", path: string|null}>}
 */
export async function resolveSession(domain, path) {
  const index = await loadIndex(domain);
  const pKey = pageActiveKey(domain, path);
  const dKey = `sessions:${domain}:active`;
  const { [pKey]: pageId, [dKey]: domainId } = await chrome.storage.local.get([pKey, dKey]);

  const pageEntry = index.find((s) => s.id === pageId && scopeOf(s) === "page");
  if (pageEntry) return { id: pageEntry.id, scope: "page", path: pageEntry.path };

  const domainEntries = index.filter((s) => scopeOf(s) === "domain");
  const active = domainEntries.find((s) => s.id === domainId);
  if (active) return { id: active.id, scope: "domain", path: null };
  if (domainEntries.length > 0) {
    const latest = [...domainEntries].sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];
    return { id: latest.id, scope: "domain", path: null };
  }

  const id = await getOrCreateSession(domain, { forceNew: true });
  return { id, scope: "domain", path: null };
}

/**
 * 切换会话作用范围（保留样式，只改变应用范围；规格 4.2）
 * @param {"domain"|"page"} scope
 * @param {string|null} path - 页面级时为当前页面路径
 */
export async function setSessionScope(domain, sessionId, scope, path) {
  const oldCtx = await loadSessionContext(domain, sessionId);
  const newCtx = new SessionContext(domain, sessionId, scope, path);

  const indexKey = `sessions:${domain}:index`;
  const index = (await loadIndex(domain)).map((s) =>
    s.id === sessionId ? { ...s, scope: newCtx.scope, path: newCtx.path } : s,
  );
  const meta = await loadSessionMeta(domain, sessionId);
  const { [newCtx.stylesKey]: css = "" } = await chrome.storage.local.get(newCtx.stylesKey);

  // 移除旧范围的活跃样式与指针（仅当指针指向本会话）
  const oldPointer =
    oldCtx.scope === "page" ? pageActiveKey(domain, oldCtx.path) : `sessions:${domain}:active`;
  const { [oldPointer]: pointed } = await chrome.storage.local.get(oldPointer);
  const toRemove = [oldCtx.activeStylesKey];
  if (pointed === sessionId) toRemove.push(oldPointer);
  await chrome.storage.local.remove(toRemove);

  await chrome.storage.local.set({
    [indexKey]: index,
    [newCtx.metaKey]: { ...meta, scope: newCtx.scope, path: newCtx.path },
    ...(css.trim() ? { [newCtx.activeStylesKey]: css } : {}),
  });
  await setActiveSession(domain, sessionId, newCtx.scope, newCtx.path);
  return newCtx;
}

/**
 * 获取某域名当前活跃的会话 ID
 */
export async function getActiveSession(domain) {
  const key = `sessions:${domain}:active`;
  const { [key]: sessionId = null } = await chrome.storage.local.get(key);
  return sessionId;
}

/**
 * 获取或创建会话
 */
export async function getOrCreateSession(domain, { forceNew = false } = {}) {
  const indexKey = `sessions:${domain}:index`;

  try {
    const { [indexKey]: index = [] } = await chrome.storage.local.get(indexKey);

    if (!forceNew && Array.isArray(index) && index.length > 0) {
      const activeId = await getActiveSession(domain);
      if (activeId && index.some((s) => s.id === activeId)) {
        return activeId;
      }

      const sorted = [...index].sort(
        (a, b) => (b.created_at || 0) - (a.created_at || 0),
      );
      return sorted[0].id;
    }

    const sessionId = crypto.randomUUID();
    const now = Date.now();

    const newSession = {
      id: sessionId,
      created_at: now,
    };

    const newIndex = [...(Array.isArray(index) ? index : []), newSession];
    await chrome.storage.local.set({ [indexKey]: newIndex });

    console.log(
      `[Session] Created new session: ${sessionId} for domain: ${domain}`,
    );
    return sessionId;
  } catch (error) {
    console.error("[Session] Failed to get or create session:", error);
    throw error;
  }
}

// =============================================================================
// 会话元数据读写
// =============================================================================

/**
 * 加载会话元数据
 */
export async function loadSessionMeta(domain, sessionId) {
  const key = `sessions:${domain}:${sessionId}:meta`;

  try {
    const result = await chrome.storage.local.get(key);

    if (result[key]) {
      return result[key];
    }

    return {
      title: null,
      created_at: Date.now(),
      message_count: 0,
    };
  } catch (error) {
    console.error("[Session] Failed to load session meta:", error);
    return {
      title: null,
      created_at: Date.now(),
      message_count: 0,
    };
  }
}

/**
 * 保存会话元数据
 */
export async function saveSessionMeta(domain, sessionId, meta) {
  const key = `sessions:${domain}:${sessionId}:meta`;

  try {
    await chrome.storage.local.set({ [key]: meta });
  } catch (error) {
    console.error("[Session] Failed to save session meta:", error);
    throw error;
  }
}

// =============================================================================
// 会话标题自动生成
// =============================================================================

/**
 * 自动生成会话标题
 */
export function autoTitle(sessionMeta, firstUserMessage) {
  if (!sessionMeta.title) {
    sessionMeta.title = firstUserMessage.slice(0, 20);
  }
}

// =============================================================================
// 会话删除
// =============================================================================

/**
 * 删除会话
 */
export async function deleteSession(domain, sessionId) {
  try {
    const indexKey = `sessions:${domain}:index`;
    const { [indexKey]: index = [] } = await chrome.storage.local.get(indexKey);
    const filtered = index.filter((s) => s.id !== sessionId);

    if (filtered.length === index.length) {
      console.warn(`[Session] Session not found in index: ${sessionId}`);
      return { lastSession: false };
    }

    await chrome.storage.local.set({ [indexKey]: filtered });
    console.log(
      `[Session] Removed session ${sessionId} from index for domain: ${domain}`,
    );

    const metaKey = `sessions:${domain}:${sessionId}:meta`;
    const stylesKey = `sessions:${domain}:${sessionId}:styles`;
    const stylesHistoryKey = `sessions:${domain}:${sessionId}:styles_history`;
    const engineKeys = ENGINES.filter((e) => e.local).map((e) => engineSessionKey(e.id, domain, sessionId));
    await chrome.storage.local.remove([metaKey, stylesKey, stylesHistoryKey, ...engineKeys]);

    const activeId = await getActiveSession(domain);
    if (activeId === sessionId) {
      await chrome.storage.local.remove(`sessions:${domain}:active`);
    }

    // 页面级会话：清除其页面指针与页面级活跃样式
    const removed = index.find((s) => s.id === sessionId);
    if (removed?.scope === "page") {
      const pKey = pageActiveKey(domain, removed.path);
      const { [pKey]: pageId } = await chrome.storage.local.get(pKey);
      if (pageId === sessionId) {
        await chrome.storage.local.remove([pKey, pageStylesKey(domain, removed.path)]);
      }
    }

    await deleteHistory(domain, sessionId);
    await deleteStylesHistory(domain, sessionId);

    if (filtered.length === 0) {
      console.log(`[Session] Deleted last session for domain: ${domain}`);
      return { lastSession: true, domain };
    }

    return { lastSession: false };
  } catch (error) {
    console.error("[Session] Failed to delete session:", error);
    throw error;
  }
}

// =============================================================================
// 样式摘要更新
// =============================================================================

/**
 * 更新样式摘要
 */
export async function updateStylesSummary() {
  if (!currentSession) {
    console.warn("[Session] updateStylesSummary called without active session");
    return;
  }

  try {
    const key = currentSession.stylesKey;
    const { [key]: css = "" } = await chrome.storage.local.get(key);

    if (!css.trim()) return;

    const ruleCount = (css.match(/\{/g) || []).length;

    const selectorMatches = css.match(/([^{}]+)\{/g);
    const selectors = selectorMatches
      ?.map((s) => s.replace("{", "").trim())
      .filter((s) => s.length > 0)
      .slice(0, 3);

    const summary = `${ruleCount} 条规则，涉及 ${selectors?.join(", ") || "未知"} 等`;

    const metaKey = currentSession.metaKey;
    const { [metaKey]: meta = {} } = await chrome.storage.local.get(metaKey);
    meta.activeStylesSummary = summary;
    await chrome.storage.local.set({ [metaKey]: meta });
  } catch (error) {
    console.error("[Session] Failed to update styles summary:", error);
  }
}

// =============================================================================
// 对话历史加载与准备
// =============================================================================

/**
 * 加载并准备对话历史
 */
export async function loadAndPrepareHistory(domain, sessionId) {
  const data = await loadHistory(domain, sessionId);
  if (Array.isArray(data)) {
    return { messages: data, snapshots: {} };
  }
  if (data && typeof data === "object" && Array.isArray(data.messages)) {
    return { messages: data.messages, snapshots: data.snapshots || {} };
  }
  return { messages: [], snapshots: {} };
}

// =============================================================================
// 时间旅行：逐轮快照
// =============================================================================

/**
 * 统计用户文本消息的数量
 */
export function countUserTextMessages(messages) {
  let count = 0;
  for (const msg of messages) {
    if (
      msg.role === "user" &&
      typeof msg.content === "string" &&
      !msg._isSummary
    ) {
      count++;
    }
  }
  return count;
}

/**
 * 找到第 N 轮用户文本消息在 messages 数组中的索引
 */
function findTurnMessageIndex(messages, turn) {
  let count = 0;
  for (let i = 0; i < messages.length; i++) {
    if (
      messages[i].role === "user" &&
      typeof messages[i].content === "string" &&
      !messages[i]._isSummary
    ) {
      count++;
      if (count === turn) return i;
    }
  }
  return -1;
}

/**
 * 回退到指定轮次（时间旅行）
 */
export async function rewindToTurn(domain, sessionId, targetTurn) {
  const { messages, snapshots } = await loadAndPrepareHistory(domain, sessionId);

  const turnStartIdx = findTurnMessageIndex(messages, targetTurn);
  const truncated =
    turnStartIdx === -1 ? messages : messages.slice(0, turnStartIdx);

  let css = "";
  for (let t = targetTurn - 1; t >= 0; t--) {
    if (snapshots[t] !== undefined) {
      css = snapshots[t];
      break;
    }
  }

  const prunedSnapshots = {};
  for (const [k, v] of Object.entries(snapshots)) {
    if (Number(k) < targetTurn) {
      prunedSnapshots[k] = v;
    }
  }

  await saveHistory(domain, sessionId, {
    messages: truncated,
    snapshots: prunedSnapshots,
  });

  const session = await loadSessionContext(domain, sessionId);
  if (css.trim()) {
    await chrome.storage.local.set({
      [session.stylesKey]: css,
      [session.activeStylesKey]: css,
    });
  } else {
    await chrome.storage.local.remove([
      session.stylesKey,
      session.activeStylesKey,
    ]);
  }

  const prevSession = getCurrentSession();
  setCurrentSession(session);
  await updateStylesSummary();
  setCurrentSession(prevSession);

  return { messages: truncated, snapshots: prunedSnapshots, css };
}

// =============================================================================
// 存储清理
// =============================================================================

/**
 * 清理会话存储
 */
export async function cleanupStorage() {
  try {
    const all = await chrome.storage.local.get(null);
    const now = Date.now();
    const keysToRemove = [];

    const domainIndices = Object.entries(all).filter(([k]) =>
      k.match(/^sessions:.+:index$/),
    );

    for (const [indexKey, sessions] of domainIndices) {
      if (!Array.isArray(sessions)) continue;

      const parts = indexKey.split(":");
      if (parts.length < 3) continue;
      const domain = parts[1];

      // 正在应用的会话不参与清理
      const activeId = await getActiveSession(domain);

      const sorted = sessions
        .map((s) => ({ ...s, age: now - (s.created_at || 0) }))
        .sort((a, b) => a.age - b.age);

      const toKeep = [];
      const toDelete = [];

      for (const session of sorted) {
        const expired = session.age > SESSION_EXPIRE_DAYS * 86400000;
        const isActive = session.id === activeId;

        if (!isActive && (expired || toKeep.length >= MAX_SESSIONS_PER_DOMAIN)) {
          toDelete.push(session);
        } else {
          toKeep.push(session);
        }
      }

      for (const session of toDelete) {
        keysToRemove.push(`sessions:${domain}:${session.id}:meta`);
        keysToRemove.push(`sessions:${domain}:${session.id}:styles`);
        await deleteHistory(domain, session.id);
        await deleteStylesHistory(domain, session.id);
      }

      if (toDelete.length > 0) {
        const cleanToKeep = toKeep.map(({ age, ...rest }) => rest);
        await chrome.storage.local.set({ [indexKey]: cleanToKeep });
        console.log(
          `[Cleanup] Removed ${toDelete.length} sessions for domain: ${domain}`,
        );
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`[Cleanup] Removed ${keysToRemove.length} storage keys`);
    }

    await cleanupStyleSkills();
  } catch (error) {
    console.error("[Cleanup] Storage cleanup failed:", error);
  }
}

/**
 * 清理风格技能存储
 */
async function cleanupStyleSkills() {
  try {
    const { StyleSkillStore } = await import("../style-skill.js");

    const skills = await StyleSkillStore.list();
    const MAX_STYLE_SKILLS = 50;

    if (skills.length <= MAX_STYLE_SKILLS) return;

    const sorted = [...skills].sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );

    const toRemove = sorted.slice(MAX_STYLE_SKILLS);

    for (const skill of toRemove) {
      await StyleSkillStore.remove(skill.id);
    }

    if (toRemove.length > 0) {
      console.log(`[Cleanup] Removed ${toRemove.length} old style skills`);
    }
  } catch (error) {
    console.error("[Cleanup] Style skills cleanup failed:", error);
  }
}

/**
 * 获取存储用量
 */
export async function getStorageUsage() {
  const bytes = await chrome.storage.local.getBytesInUse(null);
  const maxBytes = chrome.storage.local.QUOTA_BYTES || 10485760;
  return { bytes, maxBytes, percent: Math.round((bytes / maxBytes) * 100) };
}