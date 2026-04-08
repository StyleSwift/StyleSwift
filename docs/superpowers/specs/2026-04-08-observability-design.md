# StyleSwift 可观测性模块设计

## 概述

为 StyleSwift Agent 项目设计可观测性模块，用于采集、存储和分析 Agent 运行指标，辅助评估 Agent 效果并迭代优化。

**设计目标**：
- 采集性能、效果、行为三类综合指标
- 数据存储在本地 Chrome Storage / IndexedDB
- 保留最近 30 天数据
- 提供独立观测页面（不显示在界面入口）

## 数据模型

### 1. 会话级指标 (SessionMetrics)

每次 Agent 会话的整体统计：

```typescript
interface SessionMetrics {
  sessionId: string;
  domain: string;
  startTime: number;       // timestamp
  endTime: number;         // timestamp
  durationMs: number;

  // 性能指标
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  llmCallsCount: number;
  avgLatencyMs: number;

  // 效果指标
  status: "completed" | "aborted" | "error";
  toolCallsCount: number;
  successfulToolCalls: number;
  failedToolCalls: number;

  // 用户交互
  userMessagesCount: number;
  userFeedback: "positive" | "neutral" | "negative" | null;
}
```

### 2. 工具调用级指标 (ToolCallMetrics)

每次工具调用的详细记录：

```typescript
interface ToolCallMetrics {
  sessionId: string;
  timestamp: number;
  toolName: string;
  toolArgs: object;
  resultPreview: string;   // 截断的前 200 字符
  success: boolean;
  errorType: string | null;
  latencyMs: number;
}
```

### 3. LLM 调用级指标 (LLMCallMetrics)

每次 API 调用的详细记录：

```typescript
interface LLMCallMetrics {
  sessionId: string;
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  statusCode: number;
  errorType: string | null;
}
```

## 模块架构

采用中间件包装式设计，用包装器拦截 LLM Client 和 Tool Registry 的调用，自动采集指标。

### 目录结构

新增模块位于 `extension/sidepanel/telemetry/`：

```
extension/sidepanel/telemetry/
├── index.js           # 模块入口，导出公共 API
├── collector.js       # TelemetryCollector - 数据采集核心
├── middleware.js      # TelemetryMiddleware - 包装拦截器
├── storage.js         # IndexedDB 存储操作
├── constants.js       # 配置常量
└── analyzer.js        # 数据分析工具类

extension/observability/
├── index.html         # 观测仪表板页面
├── observability.js   # 页面逻辑
├── observability.css  # 样式
```

### 核心组件

#### TelemetryCollector

负责管理当前会话的指标采集。采用单例模式，全局共享一个实例：

```javascript
class TelemetryCollector {
  constructor() {
    this.currentSession = null;
  }

  // 会话生命周期
  startSession(sessionId, domain) {
    this.currentSession = {
      sessionId,
      domain,
      startTime: Date.now(),
      // ... 初始化所有计数器为 0
    };
  }

  endSession(status) {
    if (!this.currentSession) return;
    this.currentSession.endTime = Date.now();
    this.currentSession.status = status;
    this._flushToStorage();
    this.currentSession = null;
  }

  // 指标记录
  recordToolCall(toolName, args, result, latencyMs, success = true) {
    if (!this.currentSession) return;
    this.currentSession.toolCallsCount++;
    if (success) this.currentSession.successfulToolCalls++;
    else this.currentSession.failedToolCalls++;
    // 同时存储到 tool_calls store
  }

  recordLLMCall(model, inputTokens, outputTokens, latencyMs, statusCode, errorType = null) {
    if (!this.currentSession) return;
    this.currentSession.llmCallsCount++;
    this.currentSession.inputTokens += inputTokens;
    this.currentSession.outputTokens += outputTokens;
    // 同时存储到 llm_calls store
  }

  recordUserMessage() {
    if (!this.currentSession) return;
    this.currentSession.userMessagesCount++;
  }

  setUserFeedback(feedback) {
    if (!this.currentSession) return;
    this.currentSession.userFeedback = feedback;
  }

  // 内部方法
  async _flushToStorage() {
    await saveSessionMetrics(this.currentSession);
  }
}

// 单例导出
export const collector = new TelemetryCollector();
```

#### TelemetryMiddleware

包装 LLM Client 和 Tool Registry 的调用：

```javascript
import { collector } from "./collector.js";

// 包装 LLM Client 的流式调用
export function wrapLLMStreamCall(originalStreamCall) {
  return async function wrappedCall(params, callbacks, abortSignal) {
    const startTime = performance.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let statusCode = 200;
    let errorType = null;

    // 包装 callbacks 以拦截 token 计数
    const wrappedCallbacks = {
      ...callbacks,
      onToken: (token) => {
        outputTokens++;
        callbacks.onToken?.(token);
      },
      onComplete: (result) => {
        // 从 result 中提取 inputTokens（如果可用）
        inputTokens = result?.usage?.prompt_tokens || 0;
        callbacks.onComplete?.(result);
      },
    };

    try {
      const result = await originalStreamCall(params, wrappedCallbacks, abortSignal);
      const latencyMs = performance.now() - startTime;
      collector.recordLLMCall(
        params.model,
        inputTokens,
        outputTokens,
        latencyMs,
        statusCode,
        errorType
      );
      return result;
    } catch (error) {
      statusCode = error.code === "RATE_LIMITED" ? 429 : 500;
      errorType = error.code || "UNKNOWN";
      const latencyMs = performance.now() - startTime;
      collector.recordLLMCall(
        params.model,
        inputTokens,
        outputTokens,
        latencyMs,
        statusCode,
        errorType
      );
      throw error;
    }
  };
}

// 包装 Tool Registry 的 executeTool 方法
export function wrapToolExecute(originalExecute) {
  return async function wrappedExecute(toolName, args) {
    const startTime = performance.now();
    let success = true;
    let errorType = null;
    let resultPreview = "";

    try {
      const result = await originalExecute(toolName, args);
      resultPreview = typeof result === "string"
        ? result.substring(0, 200)
        : JSON.stringify(result).substring(0, 200);
      return result;
    } catch (error) {
      success = false;
      errorType = error.name || error.code || "UNKNOWN";
      resultPreview = error.message?.substring(0, 200) || "";
      throw error;
    } finally {
      const latencyMs = performance.now() - startTime;
      collector.recordToolCall(toolName, args, resultPreview, latencyMs, success, errorType);
    }
  };
}
```

### 存储层

复用现有 IndexedDB 基础设施，新增三个 Object Store：

```javascript
// 在 session/constants.js 中添加
export const TELEMETRY_SESSIONS_STORE = "telemetry_sessions";
export const TELEMETRY_TOOL_CALLS_STORE = "telemetry_tool_calls";
export const TELEMETRY_LLM_CALLS_STORE = "telemetry_llm_calls";

// DB_VERSION 升级到 3
export const DB_VERSION = 3;
```

在 `session/storage.js` 的 `openDB` 函数中添加版本迁移：

```javascript
if (oldVersion < 3) {
  if (!db.objectStoreNames.contains(TELEMETRY_SESSIONS_STORE)) {
    db.createObjectStore(TELEMETRY_SESSIONS_STORE, { keyPath: "sessionId" });
  }
  if (!db.objectStoreNames.contains(TELEMETRY_TOOL_CALLS_STORE)) {
    db.createObjectStore(TELEMETRY_TOOL_CALLS_STORE, { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(TELEMETRY_LLM_CALLS_STORE)) {
    db.createObjectStore(TELEMETRY_LLM_CALLS_STORE, { keyPath: "id", autoIncrement: true });
  }
}
```

为提升查询效率，创建索引：

- `telemetry_sessions`: 按 `startTime` 索引，按 `domain` 索引
- `telemetry_tool_calls`: 按 `sessionId` 索引，按 `toolName` 索引
- `telemetry_llm_calls`: 按 `sessionId` 索引

## 采集点嵌入

在关键节点插入采集代码：

### Agent Loop (`agent-loop.js`)

```javascript
// 在 runAgentLoop 开始时
collector.startSession(sessionId, domain);

// 在 runAgentLoop 结束时（正常/异常）
collector.endSession(status);

// 在 handleUserMessage 时
collector.recordUserMessage();
```

### LLM Client (`llm-client.js`)

导入并使用 middleware 包装：

```javascript
import { wrapLLMStreamCall } from "../telemetry/middleware.js";

// 内部原始函数
async function _callLLMStream(params, callbacks, abortSignal) {
  // ... 原始实现
}

// 导出包装后的函数
export async function callLLMStream(params, callbacks, abortSignal) {
  return wrapLLMStreamCall(_callLLMStream)(params, callbacks, abortSignal);
}

export async function callLLMStreamSafe(params, callbacks, abortSignal) {
  return wrapLLMStreamCall(_callLLMStreamSafe)(params, callbacks, abortSignal);
}
```

### Tool Registry (`tools/registry.js`)

修改 `ToolRegistry` 类，导入 middleware 包装：

```javascript
import { wrapToolExecute } from "../telemetry/middleware.js";

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  // 包装 executeTool 方法
  async executeTool(toolName, args) {
    const originalExecute = async (name, params) => {
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Tool not found: ${name}`);
      return await tool.execute(params);
    };
    return wrapToolExecute(originalExecute)(toolName, args);
  }
}
```

或者更简洁的方式：在 `tools/index.js` 导出时包装：

```javascript
import { ToolRegistry } from "./registry.js";
import { wrapToolExecute } from "../telemetry/middleware.js";

const registry = new ToolRegistry();

// 导出包装后的 executeTool
export async function executeTool(toolName, args) {
  return wrapToolExecute(registry.executeTool.bind(registry))(toolName, args);
}
```

### 用户反馈采集

隐藏的反馈机制：
- 快捷键 `Ctrl+F` 标记正面
- 快捷键 `Ctrl+D` 标记负面
- DevTools Console 执行 `window.__setFeedback("positive")`

## 观测页面

### 页面结构

分为四个区域：

1. **概览面板** — 最近 30 天的整体统计：
   - 总会话数、成功率、平均耗时
   - Token 消耗总量、平均每次消耗
   - 工具调用成功率分布图

2. **会话列表** — 可筛选的会话记录表格：
   - 按域名、状态、日期范围筛选
   - 点击展开查看详细指标

3. **工具分析** — 各工具的使用统计：
   - 调用频次排行
   - 成功/失败率
   - 平均耗时

4. **趋势图表** — 时间序列可视化：
   - 每日会话量趋势
   - Token 消耗趋势
   - 错误率趋势

### 入口方式

不显示在界面，通过以下方式访问：
- **直接 URL**: `chrome-extension://[id]/observability/index.html`
- **快捷命令**: DevTools Console 执行 `window.__openObservability()`

### 清理功能

在观测页面提供"清理过期数据"按钮，手动删除超过 30 天的数据。

## 实现顺序

1. 创建 telemetry 模块基础结构
2. 实现 TelemetryCollector 和 storage
3. 实现 TelemetryMiddleware 包装器
4. 在 Agent Loop、LLM Client、Tool Registry 中嵌入采集点
5. 创建 observability 页面
6. 在 manifest.json 中声明 web_accessible_resources

## 技术决策

| 决策点 | 选择 | 理由 |
|-------|------|------|
| 架构方案 | 中间件包装式 | 自动采集、改动适中、代码干净 |
| 数据存储 | IndexedDB | 复用现有基础设施、支持大数据量 |
| 数据保留 | 30 天 | 平衡存储与分析深度 |
| 清理策略 | 手动清理 | 简单可控、避免后台定时任务复杂性 |
| 页面入口 | 隐藏入口 | 仅供开发者使用、不干扰用户界面 |