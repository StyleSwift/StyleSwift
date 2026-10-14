# 本机 Agent 引擎（Claude Code / Codex）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 StyleSwift 用户无需 API Key，通过一次性安装的本地 Bridge，用本机已登录的 Claude Code 或 Codex 驱动网页个性化，并可在三个引擎间切换。

**Architecture:** 独立 npm 包 `styleswift-bridge`（仓库 `bridge/`，零依赖 Node ESM）作为 Chrome Native Messaging host：为每次运行启动 CLI 子进程，同时提供一个只监听 127.0.0.1、带 token 的 MCP HTTP 服务，把 CLI 的工具调用转发回扩展执行。扩展侧新增 `agent/engines/`（Bridge 客户端、本机引擎运行器、提示词与偏好），`agentLoop` 公共部分不变、只分流循环本体；UI 新增引导页本机入口、输入框引擎切换器、设置页本机 Agent 分组和错误横幅映射。

**Tech Stack:** Node ≥18（bridge，仅标准库）、Chrome MV3 扩展原生 ES modules、vitest + jsdom、Claude Code CLI ≥2.1、Codex CLI ≥0.139。

**Spec:** `docs/superpowers/specs/2026-10-14-local-agent-engines-design.md`

## Global Constraints

- Native host 名：`com.styleswift.bridge`；商店版扩展 ID：`llchggmimjgnbjlcgpkjmplhfbkjjcli`；开发版 ID 用 `--extension-id <id>` 追加（格式 `^[a-p]{32}$`）。
- 扩展 ↔ Bridge 协议版本 `PROTOCOL_VERSION = 1`，两端各定义一份同名常量。
- `nativeMessaging` 只放 `optional_permissions`，用户点击时用 `chrome.permissions.request` 申请；不得放入 `permissions`。
- host → 扩展单条消息上限 1MB：只有 `type:"event"` 消息截断超过 20000 字的字符串；`tool_call`（含 CSS 参数）绝不截断。
- CLI 参数只能是固定 flag、临时文件路径、UUID、`key=value`（不含 `" % ^ & | < > !`）；用户输入只经 stdin 或文件传递。Codex `-c` 值一律不加引号（实测非 TOML 值按字面字符串解析）。
- MCP 服务名 `styleswift`，只监听 `127.0.0.1`，每个 host 进程随机 Bearer token。
- Claude Code 必带：`--tools "" --setting-sources "" --strict-mcp-config --allowedTools mcp__styleswift`。
- Codex 必带：`--ignore-user-config --ignore-rules -c sandbox_mode=read-only -c approval_policy=never -c web_search=disabled -c include_apply_patch_tool=false`、`--disable shell_tool|image_generation|apps|goals|multi_agent|plugins`、`-c mcp_servers.styleswift.default_tools_approval_mode=approve`；token 经环境变量 `STYLESWIFT_MCP_TOKEN`。
- 引擎 ID：`builtin` / `claude-code` / `codex`；存储键 `agent_engine`、`engine_session:{engine}:{domain}:{sessionId}`。
- 本机引擎历史只写纯文本（`content` 为字符串，带 `_engine`）；无续接时附带最近对话文字记录，上限 8000 字。
- 本机引擎工具集 = `ALL_TOOLS` 去掉 `Task`/`TodoWrite`/`think`，加 `capture_screenshot`。
- 新 UI 文案全部进 `_locales/en` 与 `_locales/zh_CN`，HTML 用 `data-i18n`。
- 新错误码：`LOCAL_BRIDGE_UNAVAILABLE`、`LOCAL_NOT_LOGGED_IN`、`LOCAL_QUOTA`、`LOCAL_CLI_MISSING`、`LOCAL_PROTOCOL_MISMATCH`、`LOCAL_ENGINE_ERROR`。

## Review Focus

1. **超长 CSS 经 tool_call 传给扩展** —— `apply_styles` 的 CSS 可能超过 20000 字，必须完整到达扩展；截断只能作用于 event。（Task 1 测试 `encodeMessage` 不带 truncate 时保留长字符串；Task 6 测试 host 发出的 tool_call 不截断。）
2. **Claude Code 跨轮续接** —— Claude 的会话按工作目录存储，换目录 `--resume` 会找不到会话；Claude 适配器必须用固定工作目录 `<workRoot>/claude-code`，每次运行的临时文件名要唯一，避免多窗口并发互相覆盖。（Task 4 测试两次 run 的 cwd 相同、文件名不同。）
3. **续接失效** —— 用户清理了 CLI 会话或换了机器，续接立刻报错；期望自动丢弃映射、带文字记录重跑一次，而不是把错误抛给用户。（Task 10 测试。）
4. **用户在本机引擎下附加参考图片** —— 本机引擎首版只收文本；期望在回复里明确提示「本机引擎暂不支持图片，已忽略附图」，而不是静默丢弃。（Task 11 测试。）
5. **单条历史消息超过 8000 字** —— 文字记录不能因为最新一条过长而变成空；期望保留其末尾 8000 字。（Task 8 测试。）

---

## File Structure

**Bridge（新建，`bridge/`）**
| 文件 | 职责 |
|---|---|
| `bridge/package.json` | npm 包元数据、`bin`、`files` |
| `bridge/lib/framing.mjs` | Native Messaging 帧编解码、event 截断 |
| `bridge/lib/mcp-server.mjs` | 最小 MCP Streamable HTTP 服务 |
| `bridge/lib/process.mjs` | 定位 CLI、安全启动、JSONL 流式读取、错误分类、`contentText` |
| `bridge/adapters/claude-code.mjs` | Claude Code 适配器 |
| `bridge/adapters/codex.mjs` | Codex 适配器 |
| `bridge/adapters/index.mjs` | 适配器注册表 |
| `bridge/lib/host-core.mjs` | 协议处理：detect / run / tool_result |
| `bridge/host.mjs` | stdin/stdout 接线（Chrome 拉起的入口，替换原型） |
| `bridge/lib/install-paths.mjs` | 安装路径、manifest、launcher、注册表键（纯函数） |
| `bridge/cli.mjs` | `install` / `uninstall` 命令（替换原型 `install.mjs`） |
| `bridge/scripts/install.ps1`、`install.sh` | 无 Node 单行安装 |
| `bridge/smoke-test.mjs` | 真实 CLI 冒烟（改为两个引擎） |
| `bridge/README.md` | 安装/卸载/开发说明 |
| `bridge/test/*.test.mjs` | vitest（node 环境） |

**扩展**
| 文件 | 职责 |
|---|---|
| `extension/sidepanel/agent/engines/prefs.js`（新） | 引擎列表、当前引擎读写、续接键 |
| `extension/sidepanel/agent/engines/local-prompt.js`（新） | 本机系统提示词、对话文字记录 |
| `extension/sidepanel/agent/engines/bridge-client.js`（新） | 权限、detect、run 的端口协议 |
| `extension/sidepanel/agent/engines/local-engine.js`（新） | 运行一轮本机引擎：UI 映射、工具执行、续接重试 |
| `extension/sidepanel/agent/claude-code-engine.js` | 删除（原型） |
| `extension/sidepanel/agent/agent-loop.js` | 替换原型分流 |
| `extension/sidepanel/session/manager.js` | `deleteSession` 清理续接键 |
| `extension/sidepanel/views/local-setup.js`（新） | 权限→检测→安装→选引擎 面板（引导页/设置页/弹窗共用） |
| `extension/sidepanel/views/engine-switcher.js`（新） | 输入框引擎切换器、切换提示、设置弹窗 |
| `extension/sidepanel/views/onboarding.js` | 引导页本机入口 |
| `extension/sidepanel/views/settings.js` | 用本机 Agent 分组替换原型开关 |
| `extension/sidepanel/panel.js` | 首次启动判断、错误码映射、新 uiCallbacks |
| `extension/sidepanel/index.html`、`panel.css` | 结构与样式 |
| `extension/_locales/{en,zh_CN}/messages.json` | 文案 |
| `extension/manifest.json` | `nativeMessaging` 移到 `optional_permissions` |
| `vitest.config.js` | 加入 `bridge/test/*.test.mjs` |

---

### Task 1: Bridge 包骨架与消息帧

**Files:**
- Create: `bridge/package.json`、`bridge/lib/framing.mjs`、`bridge/test/framing.test.mjs`
- Modify: `vitest.config.js`

**Interfaces:**
- Produces: `encodeMessage(msg, { truncate?: boolean }) → Buffer`；`createDecoder(onMessage: (msg) => void) → (chunk: Buffer) => void`；`MAX_STRING = 20000`

- [ ] **Step 1: 创建 package.json 并让 vitest 收录 bridge 测试**

`bridge/package.json`：
```json
{
  "name": "styleswift-bridge",
  "version": "0.1.0",
  "description": "Connect the StyleSwift browser extension to your local Claude Code / Codex",
  "type": "module",
  "bin": { "styleswift-bridge": "cli.mjs" },
  "files": ["cli.mjs", "host.mjs", "lib/", "adapters/", "scripts/", "README.md"],
  "engines": { "node": ">=18" },
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/StyleSwift/StyleSwift.git", "directory": "bridge" }
}
```

`vitest.config.js` 中 `include` 改为：
```js
    include: [
      'extension/tests/*.test.js',
      'bridge/test/*.test.mjs',
    ],
```

- [ ] **Step 2: 写失败测试**

`bridge/test/framing.test.mjs`：
```js
// @vitest-environment node
import { describe, test, expect } from "vitest";
import { encodeMessage, createDecoder, MAX_STRING } from "../lib/framing.mjs";

describe("framing", () => {
  test("round-trips messages split across chunks", () => {
    const got = [];
    const decode = createDecoder((m) => got.push(m));
    const buf = Buffer.concat([encodeMessage({ a: 1 }), encodeMessage({ b: "中文" })]);
    decode(buf.subarray(0, 3));
    decode(buf.subarray(3, 9));
    decode(buf.subarray(9));
    expect(got).toEqual([{ a: 1 }, { b: "中文" }]);
  });

  test("length header is little-endian byte length", () => {
    const buf = encodeMessage({ s: "é" });
    expect(buf.readUInt32LE(0)).toBe(buf.length - 4);
  });

  test("truncates long strings only when asked", () => {
    const long = "x".repeat(MAX_STRING + 10);
    const decodeOne = (b) => JSON.parse(b.subarray(4).toString("utf8"));
    expect(decodeOne(encodeMessage({ s: long })).s).toBe(long);
    const cut = decodeOne(encodeMessage({ s: long }, { truncate: true })).s;
    expect(cut.startsWith("x".repeat(MAX_STRING))).toBe(true);
    expect(cut.endsWith("…[truncated]")).toBe(true);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run bridge/test/framing.test.mjs`
Expected: FAIL，`Failed to load url ../lib/framing.mjs`

- [ ] **Step 4: 实现**

`bridge/lib/framing.mjs`：
```js
/**
 * Chrome Native Messaging 帧：4 字节小端长度 + UTF-8 JSON
 */

export const MAX_STRING = 20000; // host → 扩展单条消息上限 1MB

function truncateStrings(_key, value) {
  return typeof value === "string" && value.length > MAX_STRING
    ? value.slice(0, MAX_STRING) + "…[truncated]"
    : value;
}

/** truncate 只用于展示用的 event；tool_call 必须原样传输 */
export function encodeMessage(msg, { truncate = false } = {}) {
  const body = Buffer.from(JSON.stringify(msg, truncate ? truncateStrings : undefined));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export function createDecoder(onMessage) {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 4) {
      const len = buf.readUInt32LE(0);
      if (buf.length < 4 + len) return;
      const body = buf.subarray(4, 4 + len);
      buf = buf.subarray(4 + len);
      onMessage(JSON.parse(body.toString("utf8")));
    }
  };
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run bridge/test/framing.test.mjs`
Expected: PASS（3 tests）

- [ ] **Step 6: Commit**

```bash
git add bridge/package.json bridge/lib/framing.mjs bridge/test/framing.test.mjs vitest.config.js
git commit -m "feat(bridge): package skeleton and native messaging framing"
```

---

### Task 2: MCP HTTP 服务

**Files:**
- Create: `bridge/lib/mcp-server.mjs`、`bridge/test/mcp-server.test.mjs`

**Interfaces:**
- Produces: `MCP_NAME = "styleswift"`；`createMcpServer({ onToolCall: (name, args) => Promise<McpContent[]> }) → { token: string, setTools(tools: {name, description, input_schema}[]): void, start(): Promise<string /*url*/>, close(): void }`，其中 `McpContent = {type:"text", text} | {type:"image", data, mimeType}`

- [ ] **Step 1: 写失败测试**

`bridge/test/mcp-server.test.mjs`：
```js
// @vitest-environment node
import { describe, test, expect, afterEach } from "vitest";
import { createMcpServer } from "../lib/mcp-server.mjs";

let server;
afterEach(() => server?.close());

async function rpc(url, token, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

describe("mcp server", () => {
  test("rejects missing or wrong token", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    const res = await rpc(url, "wrong", { jsonrpc: "2.0", id: 1, method: "ping" });
    expect(res.status).toBe(401);
  });

  test("binds to 127.0.0.1", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    expect(await server.start()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
  });

  test("initialize echoes protocol version, notifications get 202", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    const init = await (await rpc(url, server.token, {
      jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18" },
    })).json();
    expect(init.result.protocolVersion).toBe("2025-06-18");
    expect(init.result.serverInfo.name).toBe("styleswift");
    const note = await rpc(url, server.token, { jsonrpc: "2.0", method: "notifications/initialized" });
    expect(note.status).toBe(202);
  });

  test("tools/list maps input_schema to inputSchema", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    server.setTools([{ name: "grep", description: "d", input_schema: { type: "object" } }]);
    const res = await (await rpc(url, server.token, { jsonrpc: "2.0", id: 1, method: "tools/list" })).json();
    expect(res.result.tools).toEqual([{ name: "grep", description: "d", inputSchema: { type: "object" } }]);
  });

  test("tools/call forwards to onToolCall", async () => {
    const calls = [];
    server = createMcpServer({
      onToolCall: async (name, args) => { calls.push([name, args]); return [{ type: "text", text: "ok" }]; },
    });
    const url = await server.start();
    const res = await (await rpc(url, server.token, {
      jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "grep", arguments: { query: "h1" } },
    })).json();
    expect(calls).toEqual([["grep", { query: "h1" }]]);
    expect(res.result.content).toEqual([{ type: "text", text: "ok" }]);
  });

  test("unknown method returns JSON-RPC error, bad JSON returns 400", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    const res = await (await rpc(url, server.token, { jsonrpc: "2.0", id: 3, method: "nope" })).json();
    expect(res.error.code).toBe(-32601);
    const bad = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${server.token}` }, body: "{" });
    expect(bad.status).toBe(400);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run bridge/test/mcp-server.test.mjs`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`bridge/lib/mcp-server.mjs`：
```js
/**
 * 最小 MCP Streamable HTTP 服务：只支持 JSON 响应（不开 SSE），把 tools/call 交给 onToolCall
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

export const MCP_NAME = "styleswift";

export function createMcpServer({ onToolCall }) {
  const token = randomBytes(24).toString("hex");
  let tools = [];

  async function handleRpc(req) {
    switch (req.method) {
      case "initialize":
        return {
          protocolVersion: req.params?.protocolVersion || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: MCP_NAME, version: "1" },
        };
      case "tools/list":
        return {
          tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema })),
        };
      case "tools/call":
        return { content: await onToolCall(req.params.name, req.params.arguments || {}) };
      case "ping":
        return {};
      default:
        return null;
    }
  }

  const server = createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) return res.writeHead(401).end();
    if (req.method !== "POST") return res.writeHead(405).end();
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let msg;
      try {
        msg = JSON.parse(body);
      } catch {
        return res.writeHead(400).end();
      }
      if (msg.id === undefined) return res.writeHead(202).end(); // notification
      const result = await handleRpc(msg);
      const out = result === null
        ? { jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `Unknown method ${msg.method}` } }
        : { jsonrpc: "2.0", id: msg.id, result };
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
    });
  });

  return {
    token,
    setTools(list) {
      tools = list;
    },
    start() {
      return new Promise((resolve) =>
        server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}/mcp`)),
      );
    },
    close() {
      server.close();
    },
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run bridge/test/mcp-server.test.mjs`
Expected: PASS（6 tests）

- [ ] **Step 5: Commit**

```bash
git add bridge/lib/mcp-server.mjs bridge/test/mcp-server.test.mjs
git commit -m "feat(bridge): minimal MCP HTTP server with token auth"
```

---

### Task 3: 进程工具与错误分类

**Files:**
- Create: `bridge/lib/process.mjs`、`bridge/test/process.test.mjs`

**Interfaces:**
- Produces:
  - `pickBin(candidates: string[], platform: string) → string | null`
  - `resolveBin(name: string) → Promise<string | null>`
  - `quoteArg(arg: string) → string`（含不安全字符时抛错）
  - `spawnCli(bin, args, { cwd?, env? }) → ChildProcess`
  - `execText(bin, args) → Promise<string>`（非零退出 reject）
  - `classifyError(text: string) → "LOCAL_NOT_LOGGED_IN" | "LOCAL_QUOTA" | "LOCAL_ENGINE_ERROR"`
  - `contentText(content: string | {type, text?}[]) → string`
  - `streamCli({ name, args, cwd, env?, stdin, mapEvent: (raw) => EngineEvent[], cleanup?: () => void, resolve?: boolean /*默认 true；false 时 name 即可执行文件路径，供测试用*/ }) → { events: AsyncIterable<EngineEvent>, kill(): void }`
  - `EngineEvent`：`{type:"session",id}`、`{type:"text",text}`、`{type:"thinking",text}`、`{type:"tool_use",id,name,input}`、`{type:"tool_result",id,text}`、`{type:"result",usage?}`、`{type:"error",code,message}`

- [ ] **Step 1: 写失败测试**

`bridge/test/process.test.mjs`：
```js
// @vitest-environment node
import { describe, test, expect } from "vitest";
import { pickBin, quoteArg, classifyError, contentText, streamCli } from "../lib/process.mjs";

describe("pickBin", () => {
  test("windows prefers .exe, then .cmd, ignores extensionless shims", () => {
    expect(pickBin(["C:\\npm\\codex", "C:\\npm\\codex.cmd", "C:\\bin\\codex.exe"], "win32")).toBe("C:\\bin\\codex.exe");
    expect(pickBin(["C:\\npm\\codex", "C:\\npm\\codex.cmd"], "win32")).toBe("C:\\npm\\codex.cmd");
    expect(pickBin(["C:\\npm\\codex"], "win32")).toBeNull();
  });
  test("posix takes the first hit", () => {
    expect(pickBin(["/usr/local/bin/claude"], "darwin")).toBe("/usr/local/bin/claude");
    expect(pickBin([], "linux")).toBeNull();
  });
});

describe("quoteArg", () => {
  test("quotes safe args including empty string", () => {
    expect(quoteArg("--tools")).toBe('"--tools"');
    expect(quoteArg("")).toBe('""');
    expect(quoteArg("mcp_servers.styleswift.url=http://127.0.0.1:5/mcp")).toBe('"mcp_servers.styleswift.url=http://127.0.0.1:5/mcp"');
  });
  test("rejects cmd metacharacters", () => {
    for (const bad of ['a"b', "50%", "a&b", "a|b", "a^b", "a<b", "a>b", "a!b"]) {
      expect(() => quoteArg(bad)).toThrow(/Unsafe/);
    }
  });
});

describe("classifyError", () => {
  test.each([
    ["Not logged in · Please run /login", "LOCAL_NOT_LOGGED_IN"],
    ["401 Unauthorized", "LOCAL_NOT_LOGGED_IN"],
    ["You've hit your usage limit", "LOCAL_QUOTA"],
    ["429 Too Many Requests", "LOCAL_QUOTA"],
    ["The 'gpt-6' model requires a newer version of Codex.", "LOCAL_ENGINE_ERROR"],
    ["", "LOCAL_ENGINE_ERROR"],
  ])("%s → %s", (text, code) => expect(classifyError(text)).toBe(code));
});

describe("contentText", () => {
  test("joins text blocks and labels others", () => {
    expect(contentText("plain")).toBe("plain");
    expect(contentText([{ type: "text", text: "a" }, { type: "image" }, { type: "text", text: "b" }])).toBe("a\n[image]\nb");
    expect(contentText(undefined)).toBe("");
  });
});

describe("streamCli", () => {
  const node = process.execPath;
  const script = (lines, code = 0) =>
    `process.stdin.resume();process.stdin.on('end',()=>{${lines.map((l) => `console.log(${JSON.stringify(l)});`).join("")}process.stderr.write('boom');process.exit(${code});});`;

  async function collect(it) {
    const out = [];
    for await (const e of it) out.push(e);
    return out;
  }

  test("maps JSON lines, skips non-JSON, passes stdin", async () => {
    const run = streamCli({
      name: node, resolve: false,
      args: ["-e", script(['{"n":1}', "log noise", '{"n":2}'])],
      cwd: process.cwd(), stdin: "hi\n",
      mapEvent: (raw) => [{ type: "text", text: String(raw.n) }],
    });
    expect(await collect(run.events)).toEqual([{ type: "text", text: "1" }, { type: "text", text: "2" }]);
  });

  test("non-zero exit without error event yields classified error from stderr", async () => {
    const run = streamCli({
      name: node, resolve: false, args: ["-e", script([], 3)], cwd: process.cwd(), stdin: "",
      mapEvent: () => [],
    });
    const events = await collect(run.events);
    expect(events).toEqual([{ type: "error", code: "LOCAL_ENGINE_ERROR", message: "boom" }]);
  });

  test("missing CLI yields LOCAL_CLI_MISSING and runs cleanup", async () => {
    let cleaned = false;
    const run = streamCli({
      name: "definitely-not-a-real-cli-xyz", args: [], cwd: process.cwd(), stdin: "",
      mapEvent: () => [], cleanup: () => { cleaned = true; },
    });
    const events = await collect(run.events);
    expect(events[0].code).toBe("LOCAL_CLI_MISSING");
    expect(cleaned).toBe(true);
  });
});
```

（`resolve: false` 是测试用开关：直接把 `name` 当可执行文件路径，不走 `where/which`。）

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run bridge/test/process.test.mjs`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`bridge/lib/process.mjs`：
```js
/**
 * CLI 进程工具：定位、安全启动、JSONL 事件流、错误分类
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export function pickBin(candidates, platform) {
  if (platform !== "win32") return candidates[0] ?? null;
  return (
    candidates.find((c) => /\.exe$/i.test(c)) ??
    candidates.find((c) => /\.(cmd|bat)$/i.test(c)) ??
    null
  );
}

export async function resolveBin(name) {
  const finder = process.platform === "win32" ? "where" : "which";
  const out = await execText(finder, [name]).catch(() => "");
  const candidates = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return pickBin(candidates, process.platform);
}

/** npm 安装的 .cmd 需要经 cmd.exe 启动；参数只允许不含 cmd 元字符的值 */
export function quoteArg(arg) {
  if (/["%^&|<>!]/.test(arg)) throw new Error(`Unsafe CLI argument: ${arg}`);
  return `"${arg}"`;
}

export function spawnCli(bin, args, { cwd, env } = {}) {
  const opts = { cwd, env: { ...process.env, ...env }, windowsHide: true };
  if (/\.(cmd|bat)$/i.test(bin)) {
    return spawn(`"${bin}"`, args.map(quoteArg), { ...opts, shell: true });
  }
  return spawn(bin, args, opts);
}

export function execText(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawnCli(bin, args);
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error((err || out).trim() || `exit ${code}`)),
    );
  });
}

export function classifyError(text = "") {
  if (/not logged in|please (run|use) .*log ?in|log ?in required|unauthori[sz]ed|\b401\b|authentication/i.test(text)) {
    return "LOCAL_NOT_LOGGED_IN";
  }
  if (/usage limit|rate.?limit|quota|\b429\b|too many requests/i.test(text)) return "LOCAL_QUOTA";
  return "LOCAL_ENGINE_ERROR";
}

export function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n");
}

/**
 * 启动 CLI，把 stdout 的每行 JSON 经 mapEvent 转为 EngineEvent 流。
 * 非零退出且没有产生过 error 事件时，用 stderr 补一个 error 事件。
 */
export function streamCli({ name, args, cwd, env, stdin, mapEvent, cleanup, resolve = true }) {
  let child = null;
  async function* events() {
    try {
      const bin = resolve ? await resolveBin(name) : name;
      if (!bin) {
        yield { type: "error", code: "LOCAL_CLI_MISSING", message: `${name} not found in PATH` };
        return;
      }
      child = spawnCli(bin, args, { cwd, env });
      child.stdin.on("error", () => {}); // 进程提前退出时写 stdin 会 EPIPE
      child.stdin.end(stdin);
      let stderr = "";
      child.stderr.on("data", (c) => (stderr += c));
      const exit = new Promise((done) => {
        child.on("error", (err) => done({ code: -1, spawnError: err }));
        child.on("close", (code) => done({ code }));
      });
      let sawError = false;
      for await (const line of createInterface({ input: child.stdout })) {
        let raw;
        try {
          raw = JSON.parse(line);
        } catch {
          continue; // 非 JSON 日志行
        }
        for (const ev of mapEvent(raw)) {
          if (ev.type === "error") sawError = true;
          yield ev;
        }
      }
      const { code, spawnError } = await exit;
      if (spawnError?.code === "ENOENT") {
        yield { type: "error", code: "LOCAL_CLI_MISSING", message: spawnError.message };
      } else if (code !== 0 && !sawError) {
        const message = (spawnError?.message || stderr).trim().slice(-2000) || `${name} exited with code ${code}`;
        yield { type: "error", code: classifyError(message), message };
      }
    } finally {
      cleanup?.();
    }
  }
  return { events: events(), kill: () => child?.kill() };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run bridge/test/process.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add bridge/lib/process.mjs bridge/test/process.test.mjs
git commit -m "feat(bridge): CLI process helpers and error classification"
```

---

### Task 4: Claude Code 适配器

**Files:**
- Create: `bridge/adapters/claude-code.mjs`、`bridge/test/claude-code.test.mjs`

**Interfaces:**
- Consumes: `streamCli`、`resolveBin`、`execText`、`classifyError`、`contentText`（Task 3）；`MCP_NAME`（Task 2）
- Produces: `buildClaudeArgs({ systemFile, mcpFile, resume? }) → string[]`；`mapClaudeEvent(raw) → EngineEvent[]`；`claudeCode = { id: "claude-code", detect(): Promise<{installed, version?, loggedIn?, error?}>, run({ prompt, system, mcpUrl, mcpToken, resume?, workRoot }) → { events, kill } }`；`claudeWorkDir(workRoot) → string`

- [ ] **Step 1: 写失败测试**

`bridge/test/claude-code.test.mjs`：
```js
// @vitest-environment node
import { describe, test, expect } from "vitest";
import { buildClaudeArgs, mapClaudeEvent, claudeWorkDir, claudeRunFiles } from "../adapters/claude-code.mjs";

describe("buildClaudeArgs", () => {
  test("locks down tools and settings", () => {
    const args = buildClaudeArgs({ systemFile: "/t/s.md", mcpFile: "/t/m.json" });
    const flag = (f) => args[args.indexOf(f) + 1];
    expect(args[0]).toBe("-p");
    expect(flag("--tools")).toBe("");
    expect(flag("--setting-sources")).toBe("");
    expect(flag("--allowedTools")).toBe("mcp__styleswift");
    expect(args).toContain("--strict-mcp-config");
    expect(flag("--system-prompt-file")).toBe("/t/s.md");
    expect(flag("--mcp-config")).toBe("/t/m.json");
    expect(args).not.toContain("--resume");
  });
  test("adds --resume when given", () => {
    const args = buildClaudeArgs({ systemFile: "s", mcpFile: "m", resume: "abc-123" });
    expect(args.slice(-2)).toEqual(["--resume", "abc-123"]);
  });
});

describe("work dir", () => {
  test("cwd is stable per workRoot (resume depends on it), files are unique per run", () => {
    expect(claudeWorkDir("/tmp/ss")).toBe(claudeWorkDir("/tmp/ss"));
    const a = claudeRunFiles("/tmp/ss");
    const b = claudeRunFiles("/tmp/ss");
    expect(a.systemFile).not.toBe(b.systemFile);
    expect(a.mcpFile).not.toBe(b.mcpFile);
  });
});

describe("mapClaudeEvent", () => {
  test("init → session", () => {
    expect(mapClaudeEvent({ type: "system", subtype: "init", session_id: "s1" })).toEqual([{ type: "session", id: "s1" }]);
  });
  test("assistant blocks → text / thinking / tool_use (prefix stripped)", () => {
    expect(mapClaudeEvent({
      type: "assistant",
      message: { content: [
        { type: "thinking", thinking: "hmm" },
        { type: "text", text: "hi" },
        { type: "tool_use", id: "t1", name: "mcp__styleswift__grep", input: { query: "h1" } },
      ] },
    })).toEqual([
      { type: "thinking", text: "hmm" },
      { type: "text", text: "hi" },
      { type: "tool_use", id: "t1", name: "grep", input: { query: "h1" } },
    ]);
  });
  test("user tool_result → tool_result", () => {
    expect(mapClaudeEvent({
      type: "user",
      message: { content: [{ type: "tool_result", tool_use_id: "t1", content: [{ type: "text", text: "found" }] }] },
    })).toEqual([{ type: "tool_result", id: "t1", text: "found" }]);
  });
  test("result → result or classified error", () => {
    expect(mapClaudeEvent({ type: "result", is_error: false, result: "done", usage: { input_tokens: 5 } }))
      .toEqual([{ type: "result", usage: { input_tokens: 5 } }]);
    expect(mapClaudeEvent({ type: "result", is_error: true, result: "Not logged in · Please run /login" }))
      .toEqual([{ type: "error", code: "LOCAL_NOT_LOGGED_IN", message: "Not logged in · Please run /login" }]);
  });
  test("unknown events are ignored", () => {
    expect(mapClaudeEvent({ type: "stream_event" })).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run bridge/test/claude-code.test.mjs`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`bridge/adapters/claude-code.mjs`：
```js
/**
 * Claude Code 适配器：claude -p，stream-json 输入输出
 * 参数均在 Claude Code 2.1.292 上实测（2026-10-14）
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { MCP_NAME } from "../lib/mcp-server.mjs";
import { classifyError, contentText, execText, resolveBin, streamCli } from "../lib/process.mjs";

const TOOL_PREFIX = `mcp__${MCP_NAME}__`;

/** Claude 的会话按工作目录存储：目录必须稳定，否则 --resume 找不到会话 */
export function claudeWorkDir(workRoot) {
  return join(workRoot, "claude-code");
}

/** 多窗口可能并发运行：每次运行用唯一文件名 */
export function claudeRunFiles(workRoot) {
  const id = randomUUID();
  const dir = claudeWorkDir(workRoot);
  return { systemFile: join(dir, `system-${id}.md`), mcpFile: join(dir, `mcp-${id}.json`) };
}

export function buildClaudeArgs({ systemFile, mcpFile, resume }) {
  const args = [
    "-p",
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--verbose",
    "--system-prompt-file", systemFile,
    "--mcp-config", mcpFile,
    "--strict-mcp-config",
    "--setting-sources", "", // 不加载用户 hooks / CLAUDE.md
    "--tools", "", // 关闭全部内置工具
    "--allowedTools", `mcp__${MCP_NAME}`,
  ];
  if (resume) args.push("--resume", resume);
  return args;
}

export function mapClaudeEvent(ev) {
  if (ev.type === "system" && ev.subtype === "init") return [{ type: "session", id: ev.session_id }];
  if (ev.type === "assistant") {
    return (ev.message?.content ?? []).flatMap((b) => {
      if (b.type === "text") return [{ type: "text", text: b.text }];
      if (b.type === "thinking") return [{ type: "thinking", text: b.thinking }];
      if (b.type === "tool_use") {
        return [{ type: "tool_use", id: b.id, name: b.name.replace(TOOL_PREFIX, ""), input: b.input }];
      }
      return [];
    });
  }
  if (ev.type === "user") {
    const blocks = Array.isArray(ev.message?.content) ? ev.message.content : [];
    return blocks
      .filter((b) => b.type === "tool_result")
      .map((b) => ({ type: "tool_result", id: b.tool_use_id, text: contentText(b.content) }));
  }
  if (ev.type === "result") {
    if (ev.is_error) {
      const message = String(ev.result || ev.errors?.join("\n") || "Claude Code error");
      return [{ type: "error", code: classifyError(message), message }];
    }
    return [{ type: "result", usage: ev.usage }];
  }
  return [];
}

export const claudeCode = {
  id: "claude-code",

  async detect() {
    const bin = await resolveBin("claude");
    if (!bin) return { installed: false };
    try {
      const version = (await execText(bin, ["--version"])).trim();
      const status = await execText(bin, ["auth", "status"]).then(JSON.parse).catch(() => ({}));
      return { installed: true, version, loggedIn: status.loggedIn === true };
    } catch (err) {
      return { installed: true, error: err.message };
    }
  },

  run({ prompt, system, mcpUrl, mcpToken, resume, workRoot }) {
    const cwd = claudeWorkDir(workRoot);
    mkdirSync(cwd, { recursive: true });
    const { systemFile, mcpFile } = claudeRunFiles(workRoot);
    writeFileSync(systemFile, system);
    writeFileSync(mcpFile, JSON.stringify({
      mcpServers: { [MCP_NAME]: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${mcpToken}` } } },
    }));
    return streamCli({
      name: "claude",
      args: buildClaudeArgs({ systemFile, mcpFile, resume }),
      cwd,
      stdin: JSON.stringify({ type: "user", message: { role: "user", content: prompt } }) + "\n",
      mapEvent: mapClaudeEvent,
      cleanup: () => {
        rmSync(systemFile, { force: true });
        rmSync(mcpFile, { force: true });
      },
    });
  },
};
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run bridge/test/claude-code.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add bridge/adapters/claude-code.mjs bridge/test/claude-code.test.mjs
git commit -m "feat(bridge): Claude Code adapter"
```

---

### Task 5: Codex 适配器

**Files:**
- Create: `bridge/adapters/codex.mjs`、`bridge/adapters/index.mjs`、`bridge/test/codex.test.mjs`

**Interfaces:**
- Consumes: Task 3 工具；`MCP_NAME`
- Produces: `TOKEN_ENV = "STYLESWIFT_MCP_TOKEN"`；`CODEX_TOOL_HINT: string`；`readCodexModel(tomlText) → { model?, effort? }`；`buildCodexArgs({ mcpUrl, resume?, model?, effort? }) → string[]`；`mapCodexEvent(raw) → EngineEvent[]`；`codex = { id: "codex", detect, run }`（签名同 Task 4）；`adapters = { "claude-code": claudeCode, codex }`

- [ ] **Step 1: 写失败测试**

`bridge/test/codex.test.mjs`：
```js
// @vitest-environment node
import { describe, test, expect } from "vitest";
import { buildCodexArgs, mapCodexEvent, readCodexModel, CODEX_TOOL_HINT } from "../adapters/codex.mjs";

describe("readCodexModel", () => {
  test("reads only top-level keys", () => {
    const toml = 'model = "gpt-5.5"\nmodel_reasoning_effort = "high"\n\n[profiles.x]\nmodel = "other"\n';
    expect(readCodexModel(toml)).toEqual({ model: "gpt-5.5", effort: "high" });
  });
  test("missing keys → undefined", () => {
    expect(readCodexModel("[features]\nx = true\n")).toEqual({ model: undefined, effort: undefined });
  });
});

describe("buildCodexArgs", () => {
  const base = { mcpUrl: "http://127.0.0.1:9/mcp" };
  test("locks down built-ins and wires MCP", () => {
    const args = buildCodexArgs(base);
    const configs = args.flatMap((a, i) => (a === "-c" ? [args[i + 1]] : []));
    const disabled = args.flatMap((a, i) => (a === "--disable" ? [args[i + 1]] : []));
    expect(args.slice(0, 2)).toEqual(["exec", "--json"]);
    expect(args).toEqual(expect.arrayContaining(["--ignore-user-config", "--ignore-rules", "--skip-git-repo-check"]));
    expect(configs).toEqual(expect.arrayContaining([
      "sandbox_mode=read-only",
      "approval_policy=never",
      "web_search=disabled",
      "include_apply_patch_tool=false",
      "mcp_servers.styleswift.url=http://127.0.0.1:9/mcp",
      "mcp_servers.styleswift.bearer_token_env_var=STYLESWIFT_MCP_TOKEN",
      "mcp_servers.styleswift.default_tools_approval_mode=approve",
    ]));
    expect(disabled.sort()).toEqual(["apps", "goals", "image_generation", "multi_agent", "plugins", "shell_tool"]);
    expect(args.at(-1)).toBe("-");
  });
  test("no argument contains a double quote (safe for .cmd shells)", () => {
    expect(buildCodexArgs({ ...base, model: "gpt-5.5", effort: "high", resume: "u-1" }).some((a) => a.includes('"'))).toBe(false);
  });
  test("resume and model placement", () => {
    const args = buildCodexArgs({ ...base, resume: "u-1", model: "gpt-5.5", effort: "high" });
    expect(args.slice(0, 4)).toEqual(["exec", "resume", "u-1", "--json"]);
    expect(args[args.indexOf("-m") + 1]).toBe("gpt-5.5");
    expect(args).toContain("model_reasoning_effort=high");
  });
});

describe("mapCodexEvent", () => {
  test("thread.started → session", () => {
    expect(mapCodexEvent({ type: "thread.started", thread_id: "t-1" })).toEqual([{ type: "session", id: "t-1" }]);
  });
  test("mcp tool call lifecycle", () => {
    expect(mapCodexEvent({ type: "item.started", item: { id: "i0", type: "mcp_tool_call", tool: "grep", arguments: { query: "h1" } } }))
      .toEqual([{ type: "tool_use", id: "i0", name: "grep", input: { query: "h1" } }]);
    expect(mapCodexEvent({ type: "item.completed", item: { id: "i0", type: "mcp_tool_call", result: { content: [{ type: "text", text: "ok" }] }, error: null } }))
      .toEqual([{ type: "tool_result", id: "i0", text: "ok" }]);
    expect(mapCodexEvent({ type: "item.completed", item: { id: "i1", type: "mcp_tool_call", result: null, error: { message: "denied" } } }))
      .toEqual([{ type: "tool_result", id: "i1", text: "Error: denied" }]);
  });
  test("agent_message / reasoning / turn.completed", () => {
    expect(mapCodexEvent({ type: "item.completed", item: { type: "agent_message", text: "hi" } })).toEqual([{ type: "text", text: "hi" }]);
    expect(mapCodexEvent({ type: "item.completed", item: { type: "reasoning", text: "r" } })).toEqual([{ type: "thinking", text: "r" }]);
    expect(mapCodexEvent({ type: "turn.completed", usage: { input_tokens: 1 } })).toEqual([{ type: "result", usage: { input_tokens: 1 } }]);
  });
  test("turn.failed unwraps the nested JSON error message", () => {
    const message = JSON.stringify({ type: "error", status: 400, error: { message: "The 'gpt-6' model requires a newer version of Codex." } });
    expect(mapCodexEvent({ type: "turn.failed", error: { message } })).toEqual([
      { type: "error", code: "LOCAL_ENGINE_ERROR", message: "The 'gpt-6' model requires a newer version of Codex." },
    ]);
  });
  test("top-level error is ignored (turn.failed follows it)", () => {
    expect(mapCodexEvent({ type: "error", message: "x" })).toEqual([]);
  });
});

test("tool hint tells the model to load deferred styleswift tools", () => {
  expect(CODEX_TOOL_HINT).toMatch(/tool_search/);
  expect(CODEX_TOOL_HINT).toMatch(/styleswift/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run bridge/test/codex.test.mjs`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`bridge/adapters/codex.mjs`：
```js
/**
 * Codex 适配器：codex exec --json
 * 参数均在 Codex CLI 0.139.0 上实测（2026-10-14）：
 * - MCP 工具总是延迟在 tool_search 后，需在 AGENTS.md 中提示模型先加载
 * - approval_policy=never 下 MCP 调用默认被拒，需 default_tools_approval_mode=approve
 * - --ignore-user-config 会丢掉用户的模型设置，需从 config.toml 读回
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MCP_NAME } from "../lib/mcp-server.mjs";
import { classifyError, contentText, execText, resolveBin, streamCli } from "../lib/process.mjs";

export const TOKEN_ENV = "STYLESWIFT_MCP_TOKEN";
const DISABLED_FEATURES = ["shell_tool", "image_generation", "apps", "goals", "multi_agent", "plugins"];

export const CODEX_TOOL_HINT = `

## Tools
Your StyleSwift tools live in the MCP namespace \`${MCP_NAME}\` and are deferred: before your first action, use tool_search (query "${MCP_NAME}") to load them. Only use ${MCP_NAME} tools; never run shell commands or edit files.
`;

export function readCodexModel(tomlText) {
  const topLevel = tomlText.split(/^\s*\[/m)[0];
  const pick = (key) => topLevel.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"))?.[1];
  return { model: pick("model"), effort: pick("model_reasoning_effort") };
}

function userCodexModel() {
  const home = process.env.CODEX_HOME || join(homedir(), ".codex");
  try {
    return readCodexModel(readFileSync(join(home, "config.toml"), "utf8"));
  } catch {
    return {};
  }
}

export function buildCodexArgs({ mcpUrl, resume, model, effort }) {
  const args = ["exec"];
  if (resume) args.push("resume", resume);
  args.push(
    "--json", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
    "-c", "sandbox_mode=read-only", // exec resume 不支持 -s
    "-c", "approval_policy=never",
    "-c", "web_search=disabled",
    "-c", "include_apply_patch_tool=false",
    ...DISABLED_FEATURES.flatMap((f) => ["--disable", f]),
    "-c", `mcp_servers.${MCP_NAME}.url=${mcpUrl}`,
    "-c", `mcp_servers.${MCP_NAME}.bearer_token_env_var=${TOKEN_ENV}`,
    "-c", `mcp_servers.${MCP_NAME}.default_tools_approval_mode=approve`,
  );
  if (model) args.push("-m", model);
  if (effort) args.push("-c", `model_reasoning_effort=${effort}`);
  args.push("-"); // prompt 从 stdin 读取
  return args;
}

function unwrapMessage(message) {
  try {
    return JSON.parse(message)?.error?.message || message;
  } catch {
    return message;
  }
}

export function mapCodexEvent(ev) {
  const item = ev.item ?? {};
  switch (ev.type) {
    case "thread.started":
      return [{ type: "session", id: ev.thread_id }];
    case "item.started":
      return item.type === "mcp_tool_call"
        ? [{ type: "tool_use", id: item.id, name: item.tool, input: item.arguments ?? {} }]
        : [];
    case "item.completed":
      if (item.type === "agent_message") return [{ type: "text", text: item.text }];
      if (item.type === "reasoning") return [{ type: "thinking", text: item.text }];
      if (item.type === "mcp_tool_call") {
        const text = item.error ? `Error: ${item.error.message}` : contentText(item.result?.content);
        return [{ type: "tool_result", id: item.id, text }];
      }
      return [];
    case "turn.completed":
      return [{ type: "result", usage: ev.usage }];
    case "turn.failed": {
      const message = unwrapMessage(ev.error?.message || "Codex turn failed");
      return [{ type: "error", code: classifyError(message), message }];
    }
    default:
      return []; // 顶层 error 事件之后总会跟 turn.failed
  }
}

export const codex = {
  id: "codex",

  async detect() {
    const bin = await resolveBin("codex");
    if (!bin) return { installed: false };
    try {
      const version = (await execText(bin, ["--version"])).trim();
      const loggedIn = await execText(bin, ["login", "status"]).then(() => true, () => false);
      return { installed: true, version, loggedIn };
    } catch (err) {
      return { installed: true, error: err.message };
    }
  },

  run({ prompt, system, mcpUrl, mcpToken, resume, workRoot }) {
    // Codex 按 UUID 续接，不依赖工作目录；每次运行用独立目录放 AGENTS.md
    const cwd = mkdtempSync(join(workRoot, "codex-"));
    writeFileSync(join(cwd, "AGENTS.md"), system + CODEX_TOOL_HINT);
    return streamCli({
      name: "codex",
      args: buildCodexArgs({ mcpUrl, resume, ...userCodexModel() }),
      cwd,
      env: { [TOKEN_ENV]: mcpToken },
      stdin: prompt,
      mapEvent: mapCodexEvent,
      cleanup: () => rmSync(cwd, { recursive: true, force: true }),
    });
  },
};
```

`bridge/adapters/index.mjs`：
```js
import { claudeCode } from "./claude-code.mjs";
import { codex } from "./codex.mjs";

export const adapters = { [claudeCode.id]: claudeCode, [codex.id]: codex };
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run bridge/test/codex.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add bridge/adapters/codex.mjs bridge/adapters/index.mjs bridge/test/codex.test.mjs
git commit -m "feat(bridge): Codex adapter"
```

---

### Task 6: Host 协议核心与入口

**Files:**
- Create: `bridge/lib/host-core.mjs`、`bridge/test/host-core.test.mjs`
- Modify: `bridge/host.mjs`（整体替换原型）、`bridge/smoke-test.mjs`（整体替换）

**Interfaces:**
- Consumes: `createMcpServer`（Task 2）；adapter 形如 Task 4/5
- Produces: `PROTOCOL_VERSION = 1`；`createHost({ adapters, send: (msg, opts?) => void, bridgeVersion, workRoot }) → { handle(msg): Promise<void>, shutdown(): void }`
- 协议（扩展侧 Task 9 按此实现）：
  - 扩展 → host：`{type:"detect"}`；`{type:"run", protocol, engine, prompt, system, tools, resume?}`；`{type:"tool_result", id, content}`
  - host → 扩展：`{type:"detect_result", protocol, bridgeVersion, engines:{[id]:{installed, version?, loggedIn?, error?}}}`；`{type:"event", event}`；`{type:"tool_call", id, name, args}`；`{type:"done"}`（每次 run 恰好一个，出错也发）

- [ ] **Step 1: 写失败测试**

`bridge/test/host-core.test.mjs`：
```js
// @vitest-environment node
import { describe, test, expect, afterEach } from "vitest";
import { createHost, PROTOCOL_VERSION } from "../lib/host-core.mjs";
import { MAX_STRING } from "../lib/framing.mjs";

let host;
afterEach(() => host?.shutdown());

function setup(adapters) {
  const sent = [];
  const send = (msg, opts) => sent.push({ msg, opts });
  host = createHost({ adapters, send, bridgeVersion: "9.9.9", workRoot: "/tmp" });
  return sent;
}

const fakeAdapter = (runImpl) => ({
  id: "fake",
  detect: async () => ({ installed: true, version: "1.0", loggedIn: true }),
  run: (opts) => ({ events: runImpl(opts), kill: () => {} }),
});

describe("host core", () => {
  test("detect reports protocol, version and every engine", async () => {
    const sent = setup({ fake: fakeAdapter(async function* () {}), broken: { detect: async () => { throw new Error("x"); } } });
    await host.handle({ type: "detect" });
    expect(sent[0].msg).toEqual({
      type: "detect_result", protocol: PROTOCOL_VERSION, bridgeVersion: "9.9.9",
      engines: { fake: { installed: true, version: "1.0", loggedIn: true }, broken: { installed: false, error: "x" } },
    });
  });

  test("run streams truncated events and ends with done", async () => {
    const sent = setup({ fake: fakeAdapter(async function* () { yield { type: "text", text: "hi" }; }) });
    await host.handle({ type: "run", protocol: PROTOCOL_VERSION, engine: "fake", prompt: "p", system: "s", tools: [] });
    expect(sent.map((s) => s.msg)).toEqual([{ type: "event", event: { type: "text", text: "hi" } }, { type: "done" }]);
    expect(sent[0].opts).toEqual({ truncate: true });
  });

  test("protocol mismatch → LOCAL_PROTOCOL_MISMATCH + done", async () => {
    const sent = setup({ fake: fakeAdapter(async function* () {}) });
    await host.handle({ type: "run", protocol: 999, engine: "fake" });
    expect(sent[0].msg.event.code).toBe("LOCAL_PROTOCOL_MISMATCH");
    expect(sent.at(-1).msg).toEqual({ type: "done" });
  });

  test("unknown engine → LOCAL_ENGINE_ERROR + done", async () => {
    const sent = setup({});
    await host.handle({ type: "run", protocol: PROTOCOL_VERSION, engine: "nope" });
    expect(sent[0].msg.event.code).toBe("LOCAL_ENGINE_ERROR");
    expect(sent.at(-1).msg).toEqual({ type: "done" });
  });

  test("adapter tool calls reach the extension untruncated and results flow back", async () => {
    const longCss = "a{}".repeat(MAX_STRING);
    let sent;
    const adapter = fakeAdapter(async function* ({ mcpUrl, mcpToken }) {
      const res = await fetch(mcpUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${mcpToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "apply_styles", arguments: { css: longCss } } }),
      });
      yield { type: "text", text: (await res.json()).result.content[0].text };
    });
    sent = setup({ fake: adapter });
    const pump = setInterval(() => {
      const call = sent.find((s) => s.msg.type === "tool_call");
      if (call) {
        clearInterval(pump);
        expect(call.opts).toBeUndefined();
        expect(call.msg.args.css).toBe(longCss);
        host.handle({ type: "tool_result", id: call.msg.id, content: [{ type: "text", text: "applied" }] });
      }
    }, 5);
    await host.handle({ type: "run", protocol: PROTOCOL_VERSION, engine: "fake", prompt: "p", system: "s", tools: [] });
    expect(sent.find((s) => s.msg.type === "event").msg.event).toEqual({ type: "text", text: "applied" });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run bridge/test/host-core.test.mjs`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现 host-core**

`bridge/lib/host-core.mjs`：
```js
/**
 * Native host 协议核心：detect / run / tool_result
 */

import { createMcpServer } from "./mcp-server.mjs";

export const PROTOCOL_VERSION = 1;

export function createHost({ adapters, send, bridgeVersion, workRoot }) {
  const pending = new Map(); // tool_call id → resolve
  let seq = 0;
  let current = null;

  const mcp = createMcpServer({
    onToolCall: (name, args) =>
      new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        send({ type: "tool_call", id, name, args }); // 不截断：CSS 参数必须完整
      }),
  });
  const mcpUrl = mcp.start();

  const fail = (code, message) => {
    send({ type: "event", event: { type: "error", code, message } }, { truncate: true });
    send({ type: "done" });
  };

  async function detect() {
    const engines = {};
    for (const [id, adapter] of Object.entries(adapters)) {
      engines[id] = await adapter.detect().catch((err) => ({ installed: false, error: err.message }));
    }
    send({ type: "detect_result", protocol: PROTOCOL_VERSION, bridgeVersion, engines });
  }

  async function run(msg) {
    if (msg.protocol !== PROTOCOL_VERSION) {
      return fail("LOCAL_PROTOCOL_MISMATCH", `Extension protocol ${msg.protocol}, bridge protocol ${PROTOCOL_VERSION}`);
    }
    const adapter = adapters[msg.engine];
    if (!adapter) return fail("LOCAL_ENGINE_ERROR", `Unknown engine: ${msg.engine}`);
    if (current) return fail("LOCAL_ENGINE_ERROR", "Another run is in progress");

    mcp.setTools(msg.tools);
    current = adapter.run({
      prompt: msg.prompt,
      system: msg.system,
      resume: msg.resume,
      mcpUrl: await mcpUrl,
      mcpToken: mcp.token,
      workRoot,
    });
    try {
      for await (const event of current.events) send({ type: "event", event }, { truncate: true });
    } finally {
      current = null;
      send({ type: "done" });
    }
  }

  return {
    async handle(msg) {
      if (msg.type === "detect") return detect();
      if (msg.type === "run") return run(msg);
      if (msg.type === "tool_result") {
        pending.get(msg.id)?.(msg.content);
        pending.delete(msg.id);
      }
    },
    shutdown() {
      current?.kill();
      mcp.close();
    },
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run bridge/test/host-core.test.mjs`
Expected: PASS

- [ ] **Step 5: 用 host-core 重写 host.mjs**

`bridge/host.mjs`（整体替换）：
```js
#!/usr/bin/env node
/**
 * StyleSwift Bridge - Chrome Native Messaging host 入口
 * Chrome 拉起时会附带 origin 等参数，这里不需要使用。
 */

import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adapters } from "./adapters/index.mjs";
import { createDecoder, encodeMessage } from "./lib/framing.mjs";
import { createHost } from "./lib/host-core.mjs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const workRoot = join(tmpdir(), "styleswift-bridge");
mkdirSync(workRoot, { recursive: true });

const send = (msg, opts) => process.stdout.write(encodeMessage(msg, opts));
const host = createHost({ adapters, send, bridgeVersion: version, workRoot });

process.stdin.on(
  "data",
  createDecoder((msg) =>
    host.handle(msg).catch((err) => {
      send({ type: "event", event: { type: "error", code: "LOCAL_ENGINE_ERROR", message: String(err?.message || err) } });
      send({ type: "done" });
    }),
  ),
);
// 扩展断开（取消 / 关闭面板）→ 结束子进程并退出
process.stdin.on("end", () => {
  host.shutdown();
  process.exit(0);
});
```

- [ ] **Step 6: 重写冒烟测试覆盖两个引擎（含续接）**

`bridge/smoke-test.mjs`（整体替换）：
```js
// 真实 CLI 冒烟：node bridge/smoke-test.mjs [claude-code|codex]（默认两个都跑）
// 第一轮让模型调用工具拿到暗号，第二轮用续接问回暗号，验证工具往返与 resume。
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { encodeMessage, createDecoder } from "./lib/framing.mjs";

const PROTOCOL = 1;
const TOOLS = [{ name: "get_secret", description: "Return the secret word", input_schema: { type: "object", properties: {} } }];
const SYSTEM = "You are a test agent. When asked for the secret, call get_secret first, then reply with exactly the secret word.";

function session() {
  const host = spawn(process.execPath, [fileURLToPath(new URL("./host.mjs", import.meta.url))]);
  host.stderr.pipe(process.stderr);
  const listeners = new Set();
  host.stdout.on("data", createDecoder((m) => listeners.forEach((l) => l(m))));
  return {
    send: (m) => host.stdin.write(encodeMessage(m)),
    on: (l) => listeners.add(l),
    close: () => host.stdin.end(),
  };
}

function runTurn(engine, prompt, resume) {
  return new Promise((resolve) => {
    const s = session();
    const result = { text: "", toolCalled: false, sessionId: null, error: null };
    s.on((m) => {
      if (m.type === "tool_call") {
        result.toolCalled = true;
        s.send({ type: "tool_result", id: m.id, content: [{ type: "text", text: "PINEAPPLE42" }] });
      } else if (m.type === "event") {
        if (m.event.type === "text") result.text += m.event.text;
        if (m.event.type === "session") result.sessionId = m.event.id;
        if (m.event.type === "error") result.error = m.event;
      } else if (m.type === "done") {
        s.close();
        resolve(result);
      }
    });
    s.send({ type: "run", protocol: PROTOCOL, engine, prompt, system: SYSTEM, tools: TOOLS, resume });
  });
}

function detect() {
  return new Promise((resolve) => {
    const s = session();
    s.on((m) => { if (m.type === "detect_result") { s.close(); resolve(m); } });
    s.send({ type: "detect" });
  });
}

const engines = process.argv[2] ? [process.argv[2]] : ["claude-code", "codex"];
const detected = await detect();
console.log("detect:", JSON.stringify(detected));
let ok = true;
for (const engine of engines) {
  const first = await runTurn(engine, "What is the secret?");
  const second = await runTurn(engine, "Repeat the secret word from earlier without calling any tool.", first.sessionId);
  const pass = first.toolCalled && first.text.includes("PINEAPPLE42") && second.text.includes("PINEAPPLE42") && !second.error;
  console.log(`${engine}: ${pass ? "OK" : "FAIL"}`, JSON.stringify({ first, second }));
  ok &&= pass;
}
process.exit(ok ? 0 : 1);
```

- [ ] **Step 7: 运行冒烟（需要本机已登录两个 CLI）**

Run: `node bridge/smoke-test.mjs`
Expected: 输出 `claude-code: OK` 和 `codex: OK`，退出码 0。任一 FAIL 时，从 JSON 里的 `error` 字段定位，修完再继续，不要跳过。

- [ ] **Step 8: Commit**

```bash
git add bridge/lib/host-core.mjs bridge/test/host-core.test.mjs bridge/host.mjs bridge/smoke-test.mjs
git commit -m "feat(bridge): protocol v1 host core with engine dispatch"
```

---

### Task 7: 安装 / 卸载 CLI 与单行安装脚本

**Files:**
- Create: `bridge/lib/install-paths.mjs`、`bridge/cli.mjs`、`bridge/scripts/install.ps1`、`bridge/scripts/install.sh`、`bridge/README.md`、`bridge/test/install-paths.test.mjs`
- Delete: `bridge/install.mjs`
- Modify: `.gitignore`（去掉原型添加的两行 `bridge/host.bat`、`bridge/com.styleswift.bridge.json` 及其注释——安装产物改到用户目录）

**Interfaces:**
- Produces: `HOST_NAME`、`STORE_EXTENSION_ID`、`installDir({platform, env, home})`、`manifestDirs({platform, home}) → string[]`（仅 macOS/Linux）、`REGISTRY_KEYS: string[]`、`buildManifest({launcherPath, extensionIds}) → object`、`launcherFile({platform, dir}) → string`、`launcherScript({platform, nodePath, hostPath}) → string`、`parseExtensionIds(argv: string[]) → string[]`

- [ ] **Step 1: 写失败测试**

`bridge/test/install-paths.test.mjs`：
```js
// @vitest-environment node
import { describe, test, expect } from "vitest";
import {
  HOST_NAME, STORE_EXTENSION_ID, REGISTRY_KEYS, installDir, manifestDirs,
  buildManifest, launcherFile, launcherScript, parseExtensionIds,
} from "../lib/install-paths.mjs";

describe("install paths", () => {
  test("install dir is stable (not inside the npx cache)", () => {
    expect(installDir({ platform: "win32", env: { LOCALAPPDATA: "C:\\Users\\u\\AppData\\Local" }, home: "C:\\Users\\u" }))
      .toBe("C:\\Users\\u\\AppData\\Local\\StyleSwift\\bridge");
    expect(installDir({ platform: "darwin", env: {}, home: "/Users/u" })).toBe("/Users/u/.styleswift/bridge");
  });

  test("manifest dirs cover Chrome and Edge", () => {
    expect(manifestDirs({ platform: "darwin", home: "/Users/u" })).toEqual([
      "/Users/u/Library/Application Support/Google/Chrome/NativeMessagingHosts",
      "/Users/u/Library/Application Support/Microsoft Edge/NativeMessagingHosts",
    ]);
    expect(manifestDirs({ platform: "linux", home: "/home/u" })).toEqual([
      "/home/u/.config/google-chrome/NativeMessagingHosts",
      "/home/u/.config/microsoft-edge/NativeMessagingHosts",
    ]);
    expect(REGISTRY_KEYS).toEqual([
      `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`,
      `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${HOST_NAME}`,
    ]);
  });

  test("manifest allows store id plus extra ids", () => {
    expect(buildManifest({ launcherPath: "/x/host.sh", extensionIds: [STORE_EXTENSION_ID, "a".repeat(32)] })).toEqual({
      name: HOST_NAME,
      description: "StyleSwift bridge to local Claude Code / Codex",
      path: "/x/host.sh",
      type: "stdio",
      allowed_origins: [`chrome-extension://${STORE_EXTENSION_ID}/`, `chrome-extension://${"a".repeat(32)}/`],
    });
  });

  test("launcher per platform", () => {
    expect(launcherFile({ platform: "win32", dir: "C:\\b" })).toBe("C:\\b\\host.bat");
    expect(launcherFile({ platform: "linux", dir: "/b" })).toBe("/b/host.sh");
    expect(launcherScript({ platform: "win32", nodePath: "C:\\node.exe", hostPath: "C:\\b\\host.mjs" }))
      .toBe('@echo off\r\n"C:\\node.exe" "C:\\b\\host.mjs" %*\r\n');
    expect(launcherScript({ platform: "darwin", nodePath: "/n/node", hostPath: "/b/host.mjs" }))
      .toBe('#!/bin/sh\nexec "/n/node" "/b/host.mjs" "$@"\n');
  });

  test("parseExtensionIds always includes the store id and validates extras", () => {
    expect(parseExtensionIds([])).toEqual([STORE_EXTENSION_ID]);
    expect(parseExtensionIds(["--extension-id", "b".repeat(32)])).toEqual([STORE_EXTENSION_ID, "b".repeat(32)]);
    expect(() => parseExtensionIds(["--extension-id", "BAD"])).toThrow(/extension id/i);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run bridge/test/install-paths.test.mjs`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现 install-paths**

`bridge/lib/install-paths.mjs`：
```js
/**
 * 安装位置与 Native Messaging 注册信息（纯函数，便于测试）
 */

import path from "node:path";

export const HOST_NAME = "com.styleswift.bridge";
export const STORE_EXTENSION_ID = "llchggmimjgnbjlcgpkjmplhfbkjjcli";
const ID_RE = /^[a-p]{32}$/;

const pathFor = (platform) => (platform === "win32" ? path.win32 : path.posix);

/** 复制到稳定目录：npx 缓存可能被清理，launcher 不能指向那里 */
export function installDir({ platform, env, home }) {
  return platform === "win32"
    ? path.win32.join(env.LOCALAPPDATA, "StyleSwift", "bridge")
    : path.posix.join(home, ".styleswift", "bridge");
}

export function manifestDirs({ platform, home }) {
  const j = path.posix.join;
  if (platform === "darwin") {
    return [
      j(home, "Library/Application Support/Google/Chrome/NativeMessagingHosts"),
      j(home, "Library/Application Support/Microsoft Edge/NativeMessagingHosts"),
    ];
  }
  return [j(home, ".config/google-chrome/NativeMessagingHosts"), j(home, ".config/microsoft-edge/NativeMessagingHosts")];
}

export const REGISTRY_KEYS = [
  `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`,
  `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${HOST_NAME}`,
];

export function buildManifest({ launcherPath, extensionIds }) {
  return {
    name: HOST_NAME,
    description: "StyleSwift bridge to local Claude Code / Codex",
    path: launcherPath,
    type: "stdio",
    allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`),
  };
}

export function launcherFile({ platform, dir }) {
  return pathFor(platform).join(dir, platform === "win32" ? "host.bat" : "host.sh");
}

/** Chrome 启动 host 时 PATH 可能不同，写死 node 的绝对路径 */
export function launcherScript({ platform, nodePath, hostPath }) {
  return platform === "win32"
    ? `@echo off\r\n"${nodePath}" "${hostPath}" %*\r\n`
    : `#!/bin/sh\nexec "${nodePath}" "${hostPath}" "$@"\n`;
}

export function parseExtensionIds(argv) {
  const ids = [STORE_EXTENSION_ID];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--extension-id") continue;
    const id = argv[++i];
    if (!ID_RE.test(id || "")) throw new Error(`Invalid extension id: ${id}（应为 32 位 a-p 字母）`);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run bridge/test/install-paths.test.mjs`
Expected: PASS

- [ ] **Step 5: 实现 cli.mjs，删除原型安装脚本**

`bridge/cli.mjs`：
```js
#!/usr/bin/env node
/**
 * styleswift-bridge install [--extension-id <id>]...   注册 Native Messaging host（Chrome + Edge）
 * styleswift-bridge uninstall                          移除注册与安装目录
 */

import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HOST_NAME, REGISTRY_KEYS, buildManifest, installDir, launcherFile, launcherScript, manifestDirs, parseExtensionIds,
} from "./lib/install-paths.mjs";

const ctx = { platform: process.platform, env: process.env, home: homedir() };
const SRC = dirname(fileURLToPath(import.meta.url));

function install(argv) {
  const extensionIds = parseExtensionIds(argv);
  const dir = installDir(ctx);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const entry of ["host.mjs", "package.json", "lib", "adapters"]) {
    cpSync(join(SRC, entry), join(dir, entry), { recursive: true });
  }

  const launcherPath = launcherFile({ platform: ctx.platform, dir });
  writeFileSync(launcherPath, launcherScript({ platform: ctx.platform, nodePath: process.execPath, hostPath: join(dir, "host.mjs") }));
  if (ctx.platform !== "win32") chmodSync(launcherPath, 0o755);

  const manifest = JSON.stringify(buildManifest({ launcherPath, extensionIds }), null, 2);
  if (ctx.platform === "win32") {
    const manifestPath = join(dir, `${HOST_NAME}.json`);
    writeFileSync(manifestPath, manifest);
    for (const key of REGISTRY_KEYS) {
      execFileSync("reg", ["add", key, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"], { stdio: "ignore" });
    }
  } else {
    for (const mdir of manifestDirs(ctx)) {
      mkdirSync(mdir, { recursive: true });
      writeFileSync(join(mdir, `${HOST_NAME}.json`), manifest);
    }
  }
  console.log(`✓ StyleSwift Bridge 已安装到 ${dir}`);
  console.log("  回到 StyleSwift 侧边栏点击「重新检测」即可。");
}

function uninstall() {
  if (ctx.platform === "win32") {
    for (const key of REGISTRY_KEYS) {
      try {
        execFileSync("reg", ["delete", key, "/f"], { stdio: "ignore" });
      } catch {
        // 未注册过该浏览器
      }
    }
  } else {
    for (const mdir of manifestDirs(ctx)) rmSync(join(mdir, `${HOST_NAME}.json`), { force: true });
  }
  rmSync(installDir(ctx), { recursive: true, force: true });
  console.log("✓ StyleSwift Bridge 已卸载");
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "install") install(rest);
  else if (cmd === "uninstall") uninstall();
  else {
    console.log("用法: styleswift-bridge install [--extension-id <id>] | uninstall");
    process.exit(cmd ? 1 : 0);
  }
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
```

Run: `git rm bridge/install.mjs`

从 `.gitignore` 删除以下三行：
```
# Bridge (generated by bridge/install.mjs)
bridge/host.bat
bridge/com.styleswift.bridge.json
```
然后删除原型生成的残留文件：`rm -f bridge/host.bat bridge/com.styleswift.bridge.json`

- [ ] **Step 6: 单行安装脚本与 README**

`bridge/scripts/install.ps1`：
```powershell
# StyleSwift Bridge 安装（Windows）：irm https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未检测到 Node.js，正在通过 winget 安装 Node.js LTS..."
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}
npx -y styleswift-bridge@latest install
```

`bridge/scripts/install.sh`：
```sh
#!/bin/sh
# StyleSwift Bridge 安装（macOS/Linux）：curl -fsSL https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts/install.sh | sh
set -e
if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "未检测到 Node.js，正在通过 Homebrew 安装..."
    brew install node
  else
    echo "未检测到 Node.js，请先安装 Node.js 18+：https://nodejs.org" >&2
    exit 1
  fi
fi
npx -y styleswift-bridge@latest install
```

`bridge/README.md`：
````markdown
# styleswift-bridge

让 StyleSwift 浏览器扩展使用你本机已登录的 Claude Code / Codex。

## 安装
```sh
npx -y styleswift-bridge@latest install
```
没有 Node：Windows `irm https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts/install.ps1 | iex`；macOS/Linux `curl -fsSL https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts/install.sh | sh`

开发版扩展（未打包）追加 ID：`npx styleswift-bridge install --extension-id <chrome://extensions 中的 ID>`

## 卸载
```sh
npx styleswift-bridge uninstall
```

## 安全
CLI 的内置工具（命令执行、文件读写、联网搜索等）全部关闭，只能调用 StyleSwift 的页面工具；MCP 服务只监听 127.0.0.1 并校验随机 token；只有 StyleSwift 扩展能连接本 host。

## 开发
- 单元测试：仓库根目录 `npx vitest run bridge/test`
- 真实 CLI 冒烟：`node bridge/smoke-test.mjs [claude-code|codex]`
````

- [ ] **Step 7: 本机实装验证（Windows）**

Run: `node bridge/cli.mjs install --extension-id <chrome://extensions 中开发版扩展的 ID>`
Expected: 打印 `✓ StyleSwift Bridge 已安装到 C:\Users\<you>\AppData\Local\StyleSwift\bridge`；`reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.styleswift.bridge" /ve` 输出该目录下的 `com.styleswift.bridge.json`。

- [ ] **Step 8: Commit**

```bash
git add bridge/lib/install-paths.mjs bridge/cli.mjs bridge/scripts bridge/README.md bridge/test/install-paths.test.mjs .gitignore
git commit -m "feat(bridge): install/uninstall CLI for Chrome and Edge, no-Node install scripts"
```

---

### Task 8: 扩展侧引擎偏好与本机提示词

**Files:**
- Create: `extension/sidepanel/agent/engines/prefs.js`、`extension/sidepanel/agent/engines/local-prompt.js`、`extension/tests/local-prompt.test.js`

**Interfaces:**
- Produces（prefs.js）：`ENGINE_KEY = "agent_engine"`；`ENGINES: {id, label, local}[]`；`isLocalEngine(id) → boolean`；`engineLabel(id) → string`；`getEngine() → Promise<string>`；`setEngine(id) → Promise<void>`；`engineSessionKey(engine, domain, sessionId) → string`
- Produces（local-prompt.js）：`TRANSCRIPT_LIMIT = 8000`；`stripSections(prompt, titles) → string`；`buildLocalSystemPrompt({ sessionContext, skillDescriptions, stylesSummary? }) → string`；`buildTranscript(history, limit?) → string`；`withTranscript(prompt, transcript) → string`

- [ ] **Step 1: 写失败测试**

`extension/tests/local-prompt.test.js`：
```js
import { describe, test, expect, beforeEach } from "vitest";

const store = {};
globalThis.chrome = {
  storage: {
    local: {
      get: async (k) => (k in store ? { [k]: store[k] } : {}),
      set: async (o) => Object.assign(store, o),
    },
  },
};

const { getEngine, setEngine, isLocalEngine, engineSessionKey } = await import("../sidepanel/agent/engines/prefs.js");
const { stripSections, buildLocalSystemPrompt, buildTranscript, withTranscript } = await import("../sidepanel/agent/engines/local-prompt.js");

describe("engine prefs", () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  test("defaults to builtin and ignores unknown ids", async () => {
    expect(await getEngine()).toBe("builtin");
    store.agent_engine = "gpt-agent";
    expect(await getEngine()).toBe("builtin");
    await setEngine("codex");
    expect(await getEngine()).toBe("codex");
  });

  test("local flags and session key", () => {
    expect(isLocalEngine("builtin")).toBe(false);
    expect(isLocalEngine("claude-code")).toBe(true);
    expect(engineSessionKey("codex", "a.com", "s1")).toBe("engine_session:codex:a.com:s1");
  });
});

describe("local system prompt", () => {
  test("stripSections removes whole sections by title", () => {
    const p = "intro\n## A\na body\n## B\nb body\n## C\nc body\n";
    expect(stripSections(p, ["B"])).toBe("intro\n## A\na body\n## C\nc body\n");
  });

  test("drops builtin-only sections and adds context + styles summary", () => {
    const out = buildLocalSystemPrompt({ sessionContext: "\n[Session Context]\nDomain: a.com\n", skillDescriptions: "\n[Available Skills]\n", stylesSummary: "3 条规则" });
    expect(out).not.toMatch(/## Task Planning/);
    expect(out).not.toMatch(/## Quality Audit/);
    expect(out).not.toMatch(/## Think Tool Usage/);
    expect(out).toMatch(/## Trust & Security/);
    expect(out).toMatch(/Domain: a\.com/);
    expect(out).toMatch(/Applied Styles: 3 条规则/);
    expect(out).toMatch(/capture_screenshot/);
  });

  test("omits styles line when nothing applied", () => {
    expect(buildLocalSystemPrompt({ sessionContext: "", skillDescriptions: "" })).not.toMatch(/Applied Styles/);
  });
});

describe("transcript", () => {
  test("keeps text turns from any engine, skips tool-only and compressed messages", () => {
    const history = [
      { role: "user", content: "make it dark" },
      { role: "assistant", content: [{ type: "text", text: "done" }, { type: "tool_use", id: "t", name: "x", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "ok" }] },
      { role: "user", content: "old", _isCompressed: true },
      { role: "assistant", content: "via codex", _engine: "codex" },
    ];
    expect(buildTranscript(history)).toBe("User: make it dark\nAssistant: done\nAssistant: via codex");
  });

  test("keeps most recent turns within the limit", () => {
    const history = [{ role: "user", content: "a".repeat(50) }, { role: "user", content: "recent" }];
    expect(buildTranscript(history, 20)).toBe("User: recent");
  });

  test("a single oversized latest message keeps its tail instead of becoming empty", () => {
    const out = buildTranscript([{ role: "assistant", content: "x".repeat(100) + "END" }], 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("END")).toBe(true);
  });

  test("withTranscript wraps only when there is history", () => {
    expect(withTranscript("hi", "")).toBe("hi");
    expect(withTranscript("hi", "User: a")).toBe("[Previous conversation]\nUser: a\n\n[Current request]\nhi");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run extension/tests/local-prompt.test.js`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`extension/sidepanel/agent/engines/prefs.js`：
```js
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
```

`extension/sidepanel/agent/engines/local-prompt.js`：
```js
/**
 * StyleSwift - 本机引擎系统提示词与对话文字记录
 */

import { SYSTEM_BASE } from "../system-prompt.js";

export const TRANSCRIPT_LIMIT = 8000;

// 依赖内置循环的工具（TodoWrite / Task / think），本机引擎不提供
const BUILTIN_ONLY_SECTIONS = ["Task Planning", "Quality Audit", "Think Tool Usage"];

const LOCAL_GUIDANCE = `
[Local Engine]
After large changes (8+ rules or theme-wide colors), call capture_screenshot and fix visible issues yourself.
`;

export function stripSections(prompt, titles) {
  return prompt
    .split(/^(?=## )/m)
    .filter((part) => !titles.some((t) => part.startsWith(`## ${t}`)))
    .join("");
}

export function buildLocalSystemPrompt({ sessionContext, skillDescriptions, stylesSummary }) {
  const styles = stylesSummary
    ? `Applied Styles: ${stylesSummary} (call get_current_styles for the exact CSS)\n`
    : "";
  return stripSections(SYSTEM_BASE, BUILTIN_ONLY_SECTIONS) + sessionContext + styles + skillDescriptions + LOCAL_GUIDANCE;
}

function messageText(msg) {
  if (typeof msg.content === "string") return msg.content;
  if (!Array.isArray(msg.content)) return "";
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

/** 最近的纯文本对话，从新到旧累加直到超出 limit；最新一条过长时保留其末尾 */
export function buildTranscript(history, limit = TRANSCRIPT_LIMIT) {
  const lines = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && !m._isCompressed)
    .map((m) => [m.role, messageText(m).trim()])
    .filter(([, text]) => text)
    .map(([role, text]) => `${role === "user" ? "User" : "Assistant"}: ${text}`);

  let out = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const next = out ? `${lines[i]}\n${out}` : lines[i];
    if (next.length > limit) {
      if (!out) out = lines[i].slice(-limit);
      break;
    }
    out = next;
  }
  return out;
}

export function withTranscript(prompt, transcript) {
  return transcript ? `[Previous conversation]\n${transcript}\n\n[Current request]\n${prompt}` : prompt;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run extension/tests/local-prompt.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/sidepanel/agent/engines/prefs.js extension/sidepanel/agent/engines/local-prompt.js extension/tests/local-prompt.test.js
git commit -m "feat(engines): engine prefs and local system prompt with transcript carryover"
```

---

### Task 9: 扩展侧 Bridge 客户端

**Files:**
- Create: `extension/sidepanel/agent/engines/bridge-client.js`、`extension/tests/bridge-client.test.js`

**Interfaces:**
- Consumes: Task 6 协议；`AgentError`（`extension/sidepanel/agent/llm-client.js`）
- Produces:
  - `HOST_NAME`、`PROTOCOL_VERSION = 1`
  - `hasNativePermission() → Promise<boolean>`；`requestNativePermission() → Promise<boolean>`
  - `detectBridge() → Promise<Detection>`，`Detection = {status:"no-permission"} | {status:"not-installed", error?} | {status:"outdated", bridgeVersion?} | {status:"ok", bridgeVersion, engines}`
  - `engineState(detection, engineId) → "no-permission"|"not-installed"|"outdated"|"cli-missing"|"error"|"not-logged-in"|"ready"`
  - `runBridge({ engine, prompt, system, tools, resume? }, { onEvent(ev), onToolCall(name, args) → Promise<McpContent[]> }, signal) → Promise<void>`；断开抛 `AgentError("LOCAL_BRIDGE_UNAVAILABLE")`；取消抛 `DOMException("AbortError")`

- [ ] **Step 1: 写失败测试**

`extension/tests/bridge-client.test.js`：
```js
import { describe, test, expect, beforeEach, vi } from "vitest";

let granted = true;
let lastPort;
let hostBehavior;

function makePort() {
  const msgL = [];
  const discL = [];
  const port = {
    posted: [],
    onMessage: { addListener: (f) => msgL.push(f) },
    onDisconnect: { addListener: (f) => discL.push(f) },
    postMessage: (m) => { port.posted.push(m); hostBehavior?.(m, port); },
    disconnect: vi.fn(),
    emit: (m) => msgL.forEach((f) => f(m)),
    drop: () => discL.forEach((f) => f()),
  };
  return port;
}

globalThis.chrome = {
  runtime: {
    lastError: null,
    connectNative: vi.fn(() => (lastPort = makePort())),
  },
  permissions: {
    contains: async () => granted,
    request: async () => (granted = true),
  },
};

const { detectBridge, engineState, runBridge, PROTOCOL_VERSION } = await import("../sidepanel/agent/engines/bridge-client.js");

beforeEach(() => { granted = true; hostBehavior = null; chrome.runtime.lastError = null; });

describe("detectBridge", () => {
  test("no permission → no-permission without connecting", async () => {
    granted = false;
    chrome.runtime.connectNative.mockClear();
    expect(await detectBridge()).toEqual({ status: "no-permission" });
    expect(chrome.runtime.connectNative).not.toHaveBeenCalled();
  });

  test("host missing → not-installed", async () => {
    hostBehavior = (_m, port) => { chrome.runtime.lastError = { message: "Specified native messaging host not found." }; port.drop(); };
    expect(await detectBridge()).toEqual({ status: "not-installed", error: "Specified native messaging host not found." });
  });

  test("protocol match → ok, mismatch or missing → outdated", async () => {
    hostBehavior = (_m, port) => port.emit({ type: "detect_result", protocol: PROTOCOL_VERSION, bridgeVersion: "0.1.0", engines: { codex: { installed: true, loggedIn: true } } });
    expect(await detectBridge()).toEqual({ status: "ok", bridgeVersion: "0.1.0", engines: { codex: { installed: true, loggedIn: true } } });
    hostBehavior = (_m, port) => port.emit({ type: "detect_result", ok: true, version: "x" }); // 原型 host
    expect((await detectBridge()).status).toBe("outdated");
  });
});

describe("engineState", () => {
  const ok = (e) => ({ status: "ok", engines: { codex: e } });
  test.each([
    [{ status: "not-installed" }, "not-installed"],
    [ok(undefined), "cli-missing"],
    [ok({ installed: false }), "cli-missing"],
    [ok({ installed: true, error: "x" }), "error"],
    [ok({ installed: true, loggedIn: false }), "not-logged-in"],
    [ok({ installed: true, loggedIn: true }), "ready"],
  ])("%o → %s", (detection, state) => expect(engineState(detection, "codex")).toBe(state));
});

describe("runBridge", () => {
  test("sends run with protocol, relays events and tool results, resolves on done", async () => {
    const events = [];
    hostBehavior = (m, port) => {
      if (m.type === "run") {
        port.emit({ type: "event", event: { type: "text", text: "hi" } });
        port.emit({ type: "tool_call", id: 7, name: "grep", args: { q: 1 } });
      }
      if (m.type === "tool_result") port.emit({ type: "done" });
    };
    await runBridge(
      { engine: "codex", prompt: "p", system: "s", tools: [] },
      { onEvent: (e) => events.push(e), onToolCall: async () => [{ type: "text", text: "r" }] },
      new AbortController().signal,
    );
    expect(lastPort.posted[0]).toMatchObject({ type: "run", protocol: PROTOCOL_VERSION, engine: "codex" });
    expect(lastPort.posted[1]).toEqual({ type: "tool_result", id: 7, content: [{ type: "text", text: "r" }] });
    expect(events).toEqual([{ type: "text", text: "hi" }]);
    expect(lastPort.disconnect).toHaveBeenCalled();
  });

  test("disconnect → LOCAL_BRIDGE_UNAVAILABLE", async () => {
    hostBehavior = (_m, port) => port.drop();
    await expect(runBridge({ engine: "codex" }, { onEvent() {}, onToolCall: async () => [] }, new AbortController().signal))
      .rejects.toMatchObject({ code: "LOCAL_BRIDGE_UNAVAILABLE" });
  });

  test("abort → AbortError and port disconnected", async () => {
    const ac = new AbortController();
    const p = runBridge({ engine: "codex" }, { onEvent() {}, onToolCall: async () => [] }, ac.signal);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(lastPort.disconnect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run extension/tests/bridge-client.test.js`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`extension/sidepanel/agent/engines/bridge-client.js`：
```js
/**
 * StyleSwift - Native Messaging Bridge 客户端
 * 协议见 bridge/lib/host-core.mjs
 */

import { AgentError } from "../llm-client.js";

export const HOST_NAME = "com.styleswift.bridge";
export const PROTOCOL_VERSION = 1;
const PERMISSION = { permissions: ["nativeMessaging"] };

export const hasNativePermission = () => chrome.permissions.contains(PERMISSION);
export const requestNativePermission = () => chrome.permissions.request(PERMISSION);

export async function detectBridge() {
  if (!(await hasNativePermission())) return { status: "no-permission" };
  return new Promise((resolve) => {
    let port;
    try {
      port = chrome.runtime.connectNative(HOST_NAME);
    } catch (err) {
      resolve({ status: "not-installed", error: err.message });
      return;
    }
    port.onDisconnect.addListener(() =>
      resolve({ status: "not-installed", error: chrome.runtime.lastError?.message }),
    );
    port.onMessage.addListener((msg) => {
      if (msg.type !== "detect_result") return;
      port.disconnect();
      resolve(
        msg.protocol === PROTOCOL_VERSION
          ? { status: "ok", bridgeVersion: msg.bridgeVersion, engines: msg.engines }
          : { status: "outdated", bridgeVersion: msg.bridgeVersion },
      );
    });
    port.postMessage({ type: "detect" });
  });
}

export function engineState(detection, engineId) {
  if (detection.status !== "ok") return detection.status;
  const e = detection.engines?.[engineId];
  if (!e?.installed) return "cli-missing";
  if (e.error) return "error";
  return e.loggedIn ? "ready" : "not-logged-in";
}

export function runBridge(request, { onEvent, onToolCall }, signal) {
  return new Promise((resolve, reject) => {
    let port = null;
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      try {
        port?.disconnect(); // host 收到 EOF 后结束 CLI 子进程
      } catch {}
      err ? reject(err) : resolve();
    };

    if (signal.aborted) return finish(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", () => finish(new DOMException("Aborted", "AbortError")), { once: true });

    try {
      port = chrome.runtime.connectNative(HOST_NAME);
    } catch (err) {
      return finish(new AgentError("LOCAL_BRIDGE_UNAVAILABLE", err.message));
    }
    port.onDisconnect.addListener(() =>
      finish(new AgentError("LOCAL_BRIDGE_UNAVAILABLE", chrome.runtime.lastError?.message || "Bridge disconnected")),
    );
    port.onMessage.addListener(async (msg) => {
      if (msg.type === "event") onEvent(msg.event);
      else if (msg.type === "done") finish();
      else if (msg.type === "tool_call") {
        const content = await onToolCall(msg.name, msg.args);
        if (!settled) port.postMessage({ type: "tool_result", id: msg.id, content });
      }
    });
    port.postMessage({ type: "run", protocol: PROTOCOL_VERSION, ...request });
  });
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run extension/tests/bridge-client.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/sidepanel/agent/engines/bridge-client.js extension/tests/bridge-client.test.js
git commit -m "feat(engines): native messaging bridge client"
```

---

### Task 10: 本机引擎运行器

**Files:**
- Create: `extension/sidepanel/agent/engines/local-engine.js`、`extension/tests/local-engine.test.js`

**Interfaces:**
- Consumes: `runBridge`（Task 9）；`engineSessionKey`、`engineLabel`（Task 8）；`buildTranscript`、`withTranscript`（Task 8）；`ALL_TOOLS`、`CAPTURE_SCREENSHOT_TOOL`、`executeTool`、`normalizeToolResult`（`extension/sidepanel/tools/index.js`）；`AgentError`
- Produces: `LOCAL_TOOLS: {name, description, input_schema}[]`；`toMcpContent(output) → McpContent[]`；`runLocalEngine({ engine, prompt, system, tabId, domain, sessionId, history }, uiCallbacks, signal) → Promise<string /*最终回复文本*/>`
- uiCallbacks 新增两个可选回调（Task 14 在 panel.js 实现）：`onEngineStarting(label: string)`、`onEngineStarted()`；续接失效提示通过 `uiCallbacks.onEngineNotice(text)`（Task 14 实现，渲染为消息流内的提示行）

- [ ] **Step 1: 写失败测试**

`extension/tests/local-engine.test.js`：
```js
import { describe, test, expect, beforeEach, vi } from "vitest";

const store = {};
globalThis.chrome = {
  runtime: {},
  storage: {
    local: {
      get: async (k) => (k in store ? { [k]: store[k] } : {}),
      set: async (o) => Object.assign(store, o),
      remove: async (k) => { for (const key of [].concat(k)) delete store[key]; },
    },
  },
};

const runs = [];
let script; // (request) => { events: EngineEvent[], toolCalls?: [name,args][] }
vi.mock("../sidepanel/agent/engines/bridge-client.js", () => ({
  runBridge: async (request, { onEvent, onToolCall }) => {
    runs.push(request);
    const { events, toolCalls = [] } = script(request, runs.length);
    for (const [name, args] of toolCalls) request._toolResults = [...(request._toolResults || []), await onToolCall(name, args)];
    for (const e of events) onEvent(e);
  },
}));
vi.mock("../sidepanel/tools/index.js", () => ({
  ALL_TOOLS: [{ name: "grep", description: "g", input_schema: {} }, { name: "Task" }, { name: "TodoWrite" }, { name: "think" }],
  CAPTURE_SCREENSHOT_TOOL: { name: "capture_screenshot", description: "c", input_schema: {} },
  executeTool: async (name) => (name === "capture_screenshot" ? { _screenshot_result: true, dataUrl: "data:image/png;base64,QUJD" } : `ran ${name}`),
  normalizeToolResult: (v) => (typeof v === "string" ? v : JSON.stringify(v)),
}));

const { runLocalEngine, LOCAL_TOOLS, toMcpContent } = await import("../sidepanel/agent/engines/local-engine.js");

function ui() {
  const calls = [];
  const rec = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    cb: {
      appendText: rec("text"), appendReasoning: rec("reasoning"), showToolCall: rec("toolCall"),
      showToolResult: rec("toolResult"), showToolExecuting: rec("executing"), onNewIteration: rec("newIteration"),
      onEngineStarting: rec("starting"), onEngineStarted: rec("started"), onEngineNotice: rec("notice"),
    },
  };
}

const base = { engine: "codex", prompt: "make it dark", system: "SYS", tabId: 1, domain: "a.com", sessionId: "s1", history: [{ role: "user", content: "earlier" }] };
const signal = new AbortController().signal;

beforeEach(() => { runs.length = 0; for (const k of Object.keys(store)) delete store[k]; });

describe("tools", () => {
  test("LOCAL_TOOLS drops loop-only tools and adds screenshot", () => {
    expect(LOCAL_TOOLS.map((t) => t.name)).toEqual(["grep", "capture_screenshot"]);
  });
  test("toMcpContent maps screenshots to image content", () => {
    expect(toMcpContent({ _screenshot_result: true, dataUrl: "data:image/png;base64,QUJD" })).toEqual([{ type: "image", mimeType: "image/png", data: "QUJD" }]);
    expect(toMcpContent("ok")).toEqual([{ type: "text", text: "ok" }]);
  });
});

describe("runLocalEngine", () => {
  test("first run carries the transcript, stores session id, returns joined text", async () => {
    script = () => ({ events: [
      { type: "session", id: "thread-1" },
      { type: "text", text: "Done." },
      { type: "tool_use", id: "i0", name: "grep", input: {} },
      { type: "tool_result", id: "i0", text: "found" },
      { type: "text", text: "All set." },
    ] });
    const { calls, cb } = ui();
    const reply = await runLocalEngine(base, cb, signal);
    expect(runs[0].prompt).toBe("[Previous conversation]\nUser: earlier\n\n[Current request]\nmake it dark");
    expect(runs[0].resume).toBeUndefined();
    expect(store["engine_session:codex:a.com:s1"]).toBe("thread-1");
    expect(reply).toBe("Done.\n\nAll set.");
    expect(calls.map((c) => c[0])).toEqual(["starting", "started", "text", "toolCall", "toolResult", "newIteration", "text"]);
    expect(calls.find((c) => c[0] === "starting")[1]).toBe("Codex");
  });

  test("with a stored session it resumes and sends the bare prompt", async () => {
    store["engine_session:codex:a.com:s1"] = "thread-1";
    script = () => ({ events: [{ type: "text", text: "ok" }] });
    await runLocalEngine(base, ui().cb, signal);
    expect(runs[0]).toMatchObject({ resume: "thread-1", prompt: "make it dark" });
  });

  test("resume failing before any progress → drop mapping, notice, rerun with transcript", async () => {
    store["engine_session:codex:a.com:s1"] = "gone";
    script = (_req, n) => (n === 1
      ? { events: [{ type: "error", code: "LOCAL_ENGINE_ERROR", message: "session not found" }] }
      : { events: [{ type: "session", id: "thread-2" }, { type: "text", text: "fresh" }] });
    const { calls, cb } = ui();
    expect(await runLocalEngine(base, cb, signal)).toBe("fresh");
    expect(runs[1].resume).toBeUndefined();
    expect(runs[1].prompt).toMatch(/^\[Previous conversation\]/);
    expect(store["engine_session:codex:a.com:s1"]).toBe("thread-2");
    expect(calls.some((c) => c[0] === "notice")).toBe(true);
  });

  test("errors after progress are thrown as AgentError with the engine's code", async () => {
    store["engine_session:codex:a.com:s1"] = "thread-1";
    script = () => ({ events: [{ type: "text", text: "partial" }, { type: "error", code: "LOCAL_QUOTA", message: "usage limit" }] });
    await expect(runLocalEngine(base, ui().cb, signal)).rejects.toMatchObject({ code: "LOCAL_QUOTA", message: "usage limit" });
    expect(runs).toHaveLength(1);
  });

  test("tool calls are executed through executeTool", async () => {
    let req;
    script = (r) => { req = r; return { events: [], toolCalls: [["grep", { q: 1 }], ["capture_screenshot", {}]] }; };
    const { calls, cb } = ui();
    await runLocalEngine(base, cb, signal);
    expect(req._toolResults).toEqual([[{ type: "text", text: "ran grep" }], [{ type: "image", mimeType: "image/png", data: "QUJD" }]]);
    expect(calls.filter((c) => c[0] === "executing").map((c) => c[1])).toEqual(["grep", "capture_screenshot"]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run extension/tests/local-engine.test.js`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`extension/sidepanel/agent/engines/local-engine.js`：
```js
/**
 * StyleSwift - 本机引擎运行器
 * 一轮对话：经 Bridge 驱动 CLI，CLI 的工具调用在扩展内执行，事件映射到 uiCallbacks。
 */

import { AgentError } from "../llm-client.js";
import { ALL_TOOLS, CAPTURE_SCREENSHOT_TOOL, executeTool, normalizeToolResult } from "../../tools/index.js";
import { getMessage } from "../../i18n.js";
import { runBridge } from "./bridge-client.js";
import { engineLabel, engineSessionKey } from "./prefs.js";
import { buildTranscript, withTranscript } from "./local-prompt.js";

// Task / TodoWrite / think 依赖内置循环的子 agent 与确认 UI
const LOOP_ONLY_TOOLS = new Set(["Task", "TodoWrite", "think"]);

export const LOCAL_TOOLS = [...ALL_TOOLS.filter((t) => !LOOP_ONLY_TOOLS.has(t.name)), CAPTURE_SCREENSHOT_TOOL].map(
  ({ name, description, input_schema }) => ({ name, description, input_schema }),
);

export function toMcpContent(output) {
  if (output && typeof output === "object" && output._screenshot_result) {
    const [, mimeType, data] = output.dataUrl.match(/^data:(.+?);base64,(.*)$/);
    return [{ type: "image", mimeType, data }];
  }
  return [{ type: "text", text: normalizeToolResult(output) }];
}

async function runOnce({ engine, prompt, system, tabId, resume, key }, ui, signal) {
  const reply = [];
  let error = null;
  let progressed = false;
  let started = false;
  let afterToolResult = false;

  const markStarted = () => {
    if (!started) {
      started = true;
      ui.onEngineStarted?.();
    }
  };
  // 工具结果之后的新内容开新气泡，与内置引擎的多轮迭代一致
  const nextBubbleIfNeeded = () => {
    if (afterToolResult) {
      ui.onNewIteration?.();
      afterToolResult = false;
    }
  };

  ui.onEngineStarting?.(engineLabel(engine));
  await runBridge(
    { engine, prompt, system, tools: LOCAL_TOOLS, resume },
    {
      onEvent: (ev) => {
        markStarted();
        switch (ev.type) {
          case "session":
            chrome.storage.local.set({ [key]: ev.id });
            break;
          case "text":
            nextBubbleIfNeeded();
            progressed = true;
            reply.push(ev.text);
            ui.appendText?.(ev.text);
            break;
          case "thinking":
            ui.appendReasoning?.(ev.text);
            break;
          case "tool_use":
            nextBubbleIfNeeded();
            progressed = true;
            ui.showToolCall?.({ type: "tool_use", id: ev.id, name: ev.name, input: ev.input });
            break;
          case "tool_result":
            ui.showToolResult?.(ev.id, ev.text);
            afterToolResult = true;
            break;
          case "error":
            error ??= ev;
            break;
        }
      },
      onToolCall: async (name, args) => {
        ui.showToolExecuting?.(name);
        try {
          return toMcpContent(await executeTool(name, args, { abortSignal: signal, tabId, uiCallbacks: ui }));
        } catch (err) {
          return [{ type: "text", text: `Error: ${err.message}` }];
        }
      },
    },
    signal,
  );
  markStarted();

  if (error) {
    throw Object.assign(new AgentError(error.code, error.message), { resumeFailed: Boolean(resume) && !progressed });
  }
  return reply.join("\n\n");
}

export async function runLocalEngine({ engine, prompt, system, tabId, domain, sessionId, history }, ui, signal) {
  const key = engineSessionKey(engine, domain, sessionId);
  const { [key]: resume } = await chrome.storage.local.get(key);
  const fresh = () =>
    runOnce({ engine, prompt: withTranscript(prompt, buildTranscript(history)), system, tabId, key }, ui, signal);

  if (!resume) return fresh();
  try {
    return await runOnce({ engine, prompt, system, tabId, resume, key }, ui, signal);
  } catch (err) {
    if (!err.resumeFailed) throw err;
    await chrome.storage.local.remove(key);
    ui.onEngineNotice?.(getMessage("localSessionExpired"));
    return fresh();
  }
}
```

注：`getMessage("localSessionExpired")` 文案在 Task 12 加入 `_locales`；`getMessage`（`extension/sidepanel/i18n.js:18`）在缺少 `chrome.i18n` 时用 try/catch 回退为 key，测试无需额外 mock。

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run extension/tests/local-engine.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/sidepanel/agent/engines/local-engine.js extension/tests/local-engine.test.js
git commit -m "feat(engines): local engine runner with resume fallback"
```

---

### Task 11: 接入 agentLoop、会话清理与权限调整

**Files:**
- Modify: `extension/sidepanel/agent/agent-loop.js`（原型分流块，约 `:578-592` 及 `while` 条件）
- Modify: `extension/sidepanel/session/manager.js:240-265`（`deleteSession`）
- Modify: `extension/manifest.json`
- Delete: `extension/sidepanel/agent/claude-code-engine.js`
- Test: `extension/tests/agent-loop-local.test.js`（新建）

**Interfaces:**
- Consumes: `getEngine`、`isLocalEngine`、`ENGINES`、`engineSessionKey`（Task 8）；`buildLocalSystemPrompt`（Task 8）；`runLocalEngine`（Task 10）
- Produces: 本机引擎轮次在 `fullHistory` 中为 `{role:"user", content:string, _engine}` + `{role:"assistant", content:string, _engine}`

- [ ] **Step 1: 写失败测试**

`extension/tests/agent-loop-local.test.js`：
```js
import { describe, test, expect, beforeEach, vi } from "vitest";

const store = {};
globalThis.chrome = {
  runtime: { id: "x" },
  i18n: { getMessage: (k) => k, getUILanguage: () => "en" },
  tabs: {
    query: async () => [{ id: 1, url: "https://a.com/p" }],
    get: async () => ({ id: 1, url: "https://a.com/p" }),
    sendMessage: (_id, msg, cb) => cb(msg.tool === "get_domain" ? "a.com" : { success: true }),
  },
  storage: {
    local: {
      get: async (k) => {
        if (k === null || k === undefined) return { ...store };
        const keys = Array.isArray(k) ? k : typeof k === "object" ? Object.keys(k) : [k];
        return Object.fromEntries(keys.filter((x) => x in store).map((x) => [x, store[x]]));
      },
      set: async (o) => Object.assign(store, o),
      remove: async (k) => { for (const key of [].concat(k)) delete store[key]; },
    },
  },
};

const localRuns = [];
vi.mock("../sidepanel/agent/engines/local-engine.js", () => ({
  runLocalEngine: async (args) => { localRuns.push(args); return "reply from codex"; },
}));

const { agentLoop } = await import("../sidepanel/agent/agent-loop.js");
const { loadAndPrepareHistory } = await import("../sidepanel/session.js");

beforeEach(() => { localRuns.length = 0; for (const k of Object.keys(store)) delete store[k]; store.agent_engine = "codex"; });

describe("agentLoop with a local engine", () => {
  test("delegates to runLocalEngine and stores plain-text turns tagged with the engine", async () => {
    const reply = await agentLoop("make it dark", { appendText() {} });
    expect(reply).toBe("reply from codex");
    expect(localRuns[0]).toMatchObject({ engine: "codex", prompt: "make it dark", domain: "a.com", tabId: 1 });
    expect(localRuns[0].system).not.toMatch(/## Task Planning/);
    const sessionId = localRuns[0].sessionId;
    const { messages } = await loadAndPrepareHistory("a.com", sessionId);
    expect(messages.slice(-2)).toEqual([
      expect.objectContaining({ role: "user", content: "make it dark", _engine: "codex" }),
      expect.objectContaining({ role: "assistant", content: "reply from codex", _engine: "codex" }),
    ]);
  });

  test("attached images are ignored with a visible notice", async () => {
    const texts = [];
    await agentLoop(
      [{ type: "text", text: "match this" }, { type: "image_url", image_url: { url: "data:image/png;base64,AA" } }],
      { appendText: (t) => texts.push(t) },
    );
    expect(localRuns[0].prompt).toBe("match this");
    expect(texts.join("")).toMatch(/localImagesIgnored/);
  });
});
```

说明：此测试依赖真实的 `session.js` 与 `checkPageAccess`。运行后若因 `checkPageAccess`（`agent-loop.js:72`）需要的 chrome API 缺失而失败，按报错把对应 API 补进上面的 `globalThis.chrome` mock（例如 `chrome.scripting`），不要改被测代码来迁就 mock。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run extension/tests/agent-loop-local.test.js`
Expected: FAIL（当前原型导入的是 `./claude-code-engine.js`，`codex` 引擎不会走本机分支，或断言不匹配）

- [ ] **Step 3: 替换 agentLoop 中的原型分流**

在 `extension/sidepanel/agent/agent-loop.js` 中，把原型加入的整段：
```js
    // 本机 Claude Code 引擎：由 CLI 自己跑 agent 循环，这里只负责桥接和保存历史
    const { getEngine, runClaudeCode } = await import("./claude-code-engine.js");
    const useClaudeCode = (await getEngine()) === "claude-code";
    if (useClaudeCode) {
      const text = await runClaudeCode(
        { prompt: textOnlyContent, system, tabId, resumeKey: `cc_session:${domain}:${sessionId}` },
        uiCallbacks,
        signal,
      );
      response = { content: [{ type: "text", text }] };
      fullHistory.push({ role: "assistant", content: response.content });
    }

    while (!useClaudeCode && iterations++ < MAX_ITERATIONS) {
```
替换为：
```js
    // 本机引擎（Claude Code / Codex）：CLI 自己跑 agent 循环，这里负责桥接并以纯文本记录历史
    const { getEngine, isLocalEngine } = await import("./engines/prefs.js");
    const engine = await getEngine();
    const useLocalEngine = isLocalEngine(engine);
    if (useLocalEngine) {
      const { runLocalEngine } = await import("./engines/local-engine.js");
      const { buildLocalSystemPrompt } = await import("./engines/local-prompt.js");
      const { getMessage } = await import("../i18n.js");
      if (hasImagesInPrompt) uiCallbacks.appendText?.(getMessage("localImagesIgnored") + "\n\n");
      const localSystem = buildLocalSystemPrompt({
        sessionContext: buildSessionContext(domain, sessionMeta, profileHint),
        skillDescriptions,
        stylesSummary: sessionMeta.activeStylesSummary,
      });
      userMsg._engine = engine;
      let localPrompt = textOnlyContent;
      for (;;) {
        const text = await runLocalEngine(
          { engine, prompt: localPrompt, system: localSystem, tabId, domain, sessionId, history: fullHistory.slice(0, -1) },
          uiCallbacks,
          signal,
        );
        response = { content: [{ type: "text", text }] };
        fullHistory.push({ role: "assistant", content: text, _engine: engine });
        if (pendingUserMessages.length === 0) break;
        // 运行中追加的消息：本轮结束后合并为下一轮
        localPrompt = pendingUserMessages.map((m) => (typeof m.content === "string" ? m.content : "")).filter(Boolean).join("\n");
        for (const m of pendingUserMessages) {
          if (onQueuedMessageProcessed && typeof m.content === "string") onQueuedMessageProcessed(m.content);
        }
        pendingUserMessages = [];
        fullHistory.push({ role: "user", content: localPrompt, _engine: engine });
        uiCallbacks.onNewIteration?.();
      }
    }

    while (!useLocalEngine && iterations++ < MAX_ITERATIONS) {
```

确认 `hasImagesInPrompt`、`skillDescriptions`、`sessionMeta`、`profileHint`、`userMsg` 在该位置之前已定义（见 `agent-loop.js` 中 `const hasImagesInPrompt =`、`const skillDescriptions =`）。

- [ ] **Step 4: 删除原型模块**

Run: `git rm extension/sidepanel/agent/claude-code-engine.js`

- [ ] **Step 5: deleteSession 清理续接键**

在 `extension/sidepanel/session/manager.js` 顶部 import 区加入：
```js
import { ENGINES, engineSessionKey } from "../agent/engines/prefs.js";
```
把 `deleteSession` 中：
```js
    await chrome.storage.local.remove([metaKey, stylesKey, stylesHistoryKey]);
```
改为：
```js
    const engineKeys = ENGINES.filter((e) => e.local).map((e) => engineSessionKey(e.id, domain, sessionId));
    await chrome.storage.local.remove([metaKey, stylesKey, stylesHistoryKey, ...engineKeys]);
```

在 `extension/tests/session.test.js` 末尾追加测试（沿用该文件已有的 chrome mock 与 import 方式；若该文件未导入 `deleteSession`，从同一模块补导入）：
```js
describe("deleteSession engine mappings", () => {
  test("removes local engine session ids for the deleted session", async () => {
    await chrome.storage.local.set({
      "sessions:a.com:index": [{ id: "s1" }],
      "engine_session:codex:a.com:s1": "t-1",
      "engine_session:claude-code:a.com:s1": "c-1",
      "engine_session:codex:a.com:s2": "keep",
    });
    await deleteSession("a.com", "s1");
    const all = await chrome.storage.local.get(["engine_session:codex:a.com:s1", "engine_session:claude-code:a.com:s1", "engine_session:codex:a.com:s2"]);
    expect(all).toEqual({ "engine_session:codex:a.com:s2": "keep" });
  });
});
```

- [ ] **Step 6: manifest 改为可选权限**

`extension/manifest.json`：
```json
	"permissions": ["activeTab", "storage", "sidePanel", "scripting"],
	"optional_permissions": ["nativeMessaging"],
```

- [ ] **Step 7: 运行相关测试与全量测试**

Run: `npx vitest run extension/tests/agent-loop-local.test.js extension/tests/session.test.js`
Expected: PASS

Run: `npm test`
Expected: 全部 PASS（`import-paths.test.js` 会确认已删除的 `claude-code-engine.js` 不再被引用）

- [ ] **Step 8: Commit**

```bash
git add extension/sidepanel/agent/agent-loop.js extension/sidepanel/session/manager.js extension/manifest.json extension/tests/agent-loop-local.test.js extension/tests/session.test.js
git commit -m "feat(engines): route local engines through agentLoop with text-only history"
```

---

### Task 12: 本机 Agent 设置面板（共享组件）与文案

**Files:**
- Create: `extension/sidepanel/views/local-setup.js`、`extension/tests/local-setup.test.js`
- Modify: `extension/_locales/en/messages.json`、`extension/_locales/zh_CN/messages.json`、`extension/sidepanel/panel.css`

**Interfaces:**
- Consumes: `detectBridge`、`engineState`、`requestNativePermission`（Task 9）；`ENGINES`、`engineLabel`（Task 8）；`STORE_EXTENSION_ID` 值（Global Constraints）
- Produces: `INSTALL_SCRIPT_URLS`；`installCommands(runtimeId, isWindows) → { node: string, noNode: string }`；`renderLocalSetup(container: HTMLElement, { onReady(engineId: string): void, pollMs?: number }) → { refresh(): Promise<void>, destroy(): void }`
- 渲染约定（测试与样式依赖）：根元素 `.local-setup`，`data-state` 为 Detection 状态；复制按钮 `[data-copy]`；重新检测按钮 `[data-action="recheck"]`；授权按钮 `[data-action="grant"]`；引擎行 `.local-engine[data-engine][data-state]`；可用引擎的选择按钮 `[data-action="use"][data-engine]`

- [ ] **Step 1: 加入文案**

在 `extension/_locales/zh_CN/messages.json` 的顶层对象中加入（保持 JSON 合法，逗号衔接）：
```json
  "localAgentTitle": { "message": "本机 Agent" },
  "localAgentDesc": { "message": "使用你电脑上已登录的 Claude Code 或 Codex，无需 API Key。" },
  "localGrantPermission": { "message": "授权连接本机 Agent" },
  "localGrantHint": { "message": "需要授权「与协作的本地应用通信」才能连接本机 Agent。" },
  "localPermissionDenied": { "message": "未获得授权，无法连接本机 Agent。" },
  "localBridgeMissing": { "message": "还差一步：在终端运行下面的命令安装 StyleSwift Bridge（只需一次）。" },
  "localBridgeOutdated": { "message": "StyleSwift Bridge 版本过旧，请运行下面的命令更新。" },
  "localTabHasNode": { "message": "已安装 Node.js" },
  "localTabNoNode": { "message": "没有 Node.js" },
  "localCopy": { "message": "复制" },
  "localCopied": { "message": "已复制" },
  "localRecheck": { "message": "重新检测" },
  "localChecking": { "message": "正在检测…" },
  "localWaiting": { "message": "安装完成后会自动检测" },
  "localEngineReady": { "message": "已就绪 {version}" },
  "localEngineNotLoggedIn": { "message": "未登录：在终端运行 {cmd}" },
  "localEngineMissing": { "message": "未安装" },
  "localEngineError": { "message": "检测失败：{error}" },
  "localUseEngine": { "message": "使用" },
  "localInstallDocs": { "message": "安装说明" },
  "localSessionExpired": { "message": "本机会话已失效，已重新开始（之前的对话已带入）。" },
  "localImagesIgnored": { "message": "（本机引擎暂不支持图片，已忽略附图）" },
  "engineBuiltin": { "message": "内置" },
  "engineStarting": { "message": "正在启动 {engine}…" },
  "engineSwitched": { "message": "已切换到 {engine} · 之前的对话会以文字带入" },
  "engineConfigureApiKey": { "message": "配置 API Key" },
  "engineGoSetup": { "message": "去设置" },
  "engineMenuTitle": { "message": "选择 AI 引擎" },
  "useLocalAgentTitle": { "message": "使用本机 Claude Code / Codex" },
  "useLocalAgentDesc": { "message": "无需 API Key，适合已有订阅的开发者" },
  "useApiKeyInstead": { "message": "改用 API Key" },
  "errLocalBridgeUnavailable": { "message": "本机 Agent 未连接" },
  "errLocalNotLoggedIn": { "message": "本机 Agent 未登录，请在终端运行 claude 或 codex login 完成登录" },
  "errLocalCliMissing": { "message": "未找到本机 Agent，请确认 Claude Code / Codex 已安装" },
  "errLocalProtocolMismatch": { "message": "StyleSwift Bridge 需要更新" },
  "localSetupAction": { "message": "检查本机 Agent" },
  "switchEngineAction": { "message": "切换引擎" }
```

在 `extension/_locales/en/messages.json` 加入同名 key：
```json
  "localAgentTitle": { "message": "Local agent" },
  "localAgentDesc": { "message": "Use the Claude Code or Codex already signed in on this computer. No API key needed." },
  "localGrantPermission": { "message": "Allow connecting to local agent" },
  "localGrantHint": { "message": "Chrome will ask to let StyleSwift communicate with cooperating native applications." },
  "localPermissionDenied": { "message": "Permission not granted, can't connect to the local agent." },
  "localBridgeMissing": { "message": "One more step: run this in a terminal to install StyleSwift Bridge (once)." },
  "localBridgeOutdated": { "message": "StyleSwift Bridge is outdated. Run this to update." },
  "localTabHasNode": { "message": "I have Node.js" },
  "localTabNoNode": { "message": "No Node.js" },
  "localCopy": { "message": "Copy" },
  "localCopied": { "message": "Copied" },
  "localRecheck": { "message": "Check again" },
  "localChecking": { "message": "Checking…" },
  "localWaiting": { "message": "We'll detect it automatically once installed" },
  "localEngineReady": { "message": "Ready {version}" },
  "localEngineNotLoggedIn": { "message": "Not signed in: run {cmd} in a terminal" },
  "localEngineMissing": { "message": "Not installed" },
  "localEngineError": { "message": "Check failed: {error}" },
  "localUseEngine": { "message": "Use" },
  "localInstallDocs": { "message": "Install guide" },
  "localSessionExpired": { "message": "Local session expired, started fresh (earlier conversation carried over)." },
  "localImagesIgnored": { "message": "(Local engines don't support images yet; attached images were ignored)" },
  "engineBuiltin": { "message": "Built-in" },
  "engineStarting": { "message": "Starting {engine}…" },
  "engineSwitched": { "message": "Switched to {engine} · earlier conversation is carried over as text" },
  "engineConfigureApiKey": { "message": "Set up API key" },
  "engineGoSetup": { "message": "Set up" },
  "engineMenuTitle": { "message": "Choose AI engine" },
  "useLocalAgentTitle": { "message": "Use local Claude Code / Codex" },
  "useLocalAgentDesc": { "message": "No API key needed, for developers with a subscription" },
  "useApiKeyInstead": { "message": "Use an API key instead" },
  "errLocalBridgeUnavailable": { "message": "Local agent not connected" },
  "errLocalNotLoggedIn": { "message": "Local agent not signed in. Run claude or codex login in a terminal" },
  "errLocalCliMissing": { "message": "Local agent not found. Make sure Claude Code / Codex is installed" },
  "errLocalProtocolMismatch": { "message": "StyleSwift Bridge needs an update" },
  "localSetupAction": { "message": "Check local agent" },
  "switchEngineAction": { "message": "Switch engine" }
```

`formatMessage`（`extension/sidepanel/i18n.js:154`）按 `{name}` 替换参数，上面的条目已按此写法。

Run: `node -e "for (const l of ['en','zh_CN']) JSON.parse(require('fs').readFileSync('extension/_locales/'+l+'/messages.json','utf8'))" && echo ok`
Expected: `ok`

- [ ] **Step 2: 写失败测试**

`extension/tests/local-setup.test.js`：
```js
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";

globalThis.chrome = { runtime: { id: "llchggmimjgnbjlcgpkjmplhfbkjjcli" }, i18n: { getMessage: (k) => k, getUILanguage: () => "en" } };

let detection;
const requestNativePermission = vi.fn(async () => true);
vi.mock("../sidepanel/agent/engines/bridge-client.js", async () => {
  const actual = await vi.importActual("../sidepanel/agent/engines/bridge-client.js");
  return { ...actual, detectBridge: vi.fn(async () => detection), requestNativePermission };
});

const { renderLocalSetup, installCommands } = await import("../sidepanel/views/local-setup.js");

let container;
beforeEach(() => { container = document.createElement("div"); document.body.append(container); });
afterEach(() => { container.remove(); vi.useRealTimers(); });

describe("installCommands", () => {
  test("store build uses plain npx; dev build appends its id", () => {
    expect(installCommands("llchggmimjgnbjlcgpkjmplhfbkjjcli", true).node).toBe("npx -y styleswift-bridge@latest install");
    expect(installCommands("a".repeat(32), false).node).toBe(`npx -y styleswift-bridge@latest install --extension-id ${"a".repeat(32)}`);
    expect(installCommands("x", true).noNode).toMatch(/^irm .*install\.ps1 \| iex$/);
    expect(installCommands("x", false).noNode).toMatch(/^curl -fsSL .*install\.sh \| sh$/);
  });
});

describe("renderLocalSetup", () => {
  test("no permission → grant button requests permission then re-detects", async () => {
    detection = { status: "no-permission" };
    const ui = renderLocalSetup(container, { onReady() {} });
    await ui.refresh();
    expect(container.querySelector(".local-setup").dataset.state).toBe("no-permission");
    detection = { status: "not-installed" };
    container.querySelector('[data-action="grant"]').click();
    await vi.waitFor(() => expect(container.querySelector(".local-setup").dataset.state).toBe("not-installed"));
    expect(requestNativePermission).toHaveBeenCalled();
    ui.destroy();
  });

  test("not installed shows copyable commands and polls until installed", async () => {
    vi.useFakeTimers();
    detection = { status: "not-installed" };
    const ui = renderLocalSetup(container, { onReady() {}, pollMs: 3000 });
    await ui.refresh();
    expect(container.querySelectorAll("[data-copy]").length).toBe(2);
    detection = { status: "ok", engines: { "claude-code": { installed: true, loggedIn: true, version: "2.1" } } };
    await vi.advanceTimersByTimeAsync(3000);
    expect(container.querySelector(".local-setup").dataset.state).toBe("ok");
    ui.destroy();
  });

  test("destroy stops polling", async () => {
    vi.useFakeTimers();
    detection = { status: "not-installed" };
    const { detectBridge } = await import("../sidepanel/agent/engines/bridge-client.js");
    const ui = renderLocalSetup(container, { onReady() {}, pollMs: 3000 });
    await ui.refresh();
    ui.destroy();
    detectBridge.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(detectBridge).not.toHaveBeenCalled();
  });

  test("ok lists engines with states; only ready engines can be chosen", async () => {
    detection = { status: "ok", engines: {
      "claude-code": { installed: true, loggedIn: true, version: "2.1.292" },
      codex: { installed: true, loggedIn: false, version: "0.139.0" },
    } };
    const onReady = vi.fn();
    const ui = renderLocalSetup(container, { onReady });
    await ui.refresh();
    const rows = [...container.querySelectorAll(".local-engine")].map((r) => [r.dataset.engine, r.dataset.state]);
    expect(rows).toEqual([["claude-code", "ready"], ["codex", "not-logged-in"]]);
    expect(container.querySelector('[data-action="use"][data-engine="codex"]')).toBeNull();
    container.querySelector('[data-action="use"][data-engine="claude-code"]').click();
    expect(onReady).toHaveBeenCalledWith("claude-code");
    ui.destroy();
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run extension/tests/local-setup.test.js`
Expected: FAIL，模块不存在

- [ ] **Step 4: 实现**

`extension/sidepanel/views/local-setup.js`：
```js
/**
 * StyleSwift - 本机 Agent 设置面板（引导页 / 设置页 / 弹窗共用）
 * 状态：授权 → 检测 Bridge → 安装 / 更新 → 选择可用引擎
 */

import { detectBridge, engineState, requestNativePermission } from "../agent/engines/bridge-client.js";
import { ENGINES } from "../agent/engines/prefs.js";
import { formatMessage, getMessage } from "../i18n.js";
import { escapeHtml } from "../ui/dom-utils.js";

const STORE_EXTENSION_ID = "llchggmimjgnbjlcgpkjmplhfbkjjcli";
const RAW = "https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts";
export const INSTALL_SCRIPT_URLS = { windows: `${RAW}/install.ps1`, unix: `${RAW}/install.sh` };
const LOGIN_COMMANDS = { "claude-code": "claude", codex: "codex login" };
const INSTALL_DOCS = { "claude-code": "https://docs.anthropic.com/en/docs/claude-code", codex: "https://github.com/openai/codex" };
const LOCAL_ENGINES = ENGINES.filter((e) => e.local);

export function installCommands(runtimeId, isWindows) {
  const devSuffix = runtimeId === STORE_EXTENSION_ID ? "" : ` --extension-id ${runtimeId}`;
  return {
    node: `npx -y styleswift-bridge@latest install${devSuffix}`,
    noNode: isWindows ? `irm ${INSTALL_SCRIPT_URLS.windows} | iex` : `curl -fsSL ${INSTALL_SCRIPT_URLS.unix} | sh`,
  };
}

function commandBlock(label, cmd) {
  return `
    <div class="local-cmd">
      <span class="local-cmd-label">${escapeHtml(label)}</span>
      <code>${escapeHtml(cmd)}</code>
      <button class="btn-secondary local-copy" data-copy="${escapeHtml(cmd)}">${getMessage("localCopy")}</button>
    </div>`;
}

function engineRow(engine, detection) {
  const state = engineState(detection, engine.id);
  const info = detection.engines?.[engine.id] ?? {};
  const status = {
    ready: formatMessage("localEngineReady", { version: info.version || "" }),
    "not-logged-in": formatMessage("localEngineNotLoggedIn", { cmd: LOGIN_COMMANDS[engine.id] }),
    "cli-missing": getMessage("localEngineMissing"),
    error: formatMessage("localEngineError", { error: info.error || "" }),
  }[state];
  const action = state === "ready"
    ? `<button class="btn-primary" data-action="use" data-engine="${engine.id}">${getMessage("localUseEngine")}</button>`
    : state === "cli-missing"
      ? `<a href="${INSTALL_DOCS[engine.id]}" target="_blank" rel="noopener">${getMessage("localInstallDocs")}</a>`
      : `<button class="btn-ghost" data-action="recheck">${getMessage("localRecheck")}</button>`;
  return `
    <div class="local-engine" data-engine="${engine.id}" data-state="${state}">
      <strong>${escapeHtml(engine.label)}</strong>
      <span class="local-engine-status">${escapeHtml(status)}</span>
      ${action}
    </div>`;
}

function render(detection) {
  const isWindows = /win/i.test(navigator.userAgentData?.platform || navigator.platform || "");
  const cmds = installCommands(chrome.runtime.id, isWindows);
  const recheck = `<button class="btn-ghost" data-action="recheck">${getMessage("localRecheck")}</button>`;
  const body = {
    "no-permission": `
      <p class="hint">${getMessage("localGrantHint")}</p>
      <button class="btn-primary" data-action="grant">${getMessage("localGrantPermission")}</button>`,
    "not-installed": `
      <p>${getMessage("localBridgeMissing")}</p>
      ${commandBlock(getMessage("localTabHasNode"), cmds.node)}
      ${commandBlock(getMessage("localTabNoNode"), cmds.noNode)}
      <p class="hint">${getMessage("localWaiting")}</p>${recheck}`,
    outdated: `
      <p>${getMessage("localBridgeOutdated")}</p>
      ${commandBlock(getMessage("localTabHasNode"), cmds.node)}${recheck}`,
    ok: LOCAL_ENGINES.map((e) => engineRow(e, detection)).join(""),
  }[detection.status];
  return `<div class="local-setup" data-state="${detection.status}">${body}</div>`;
}

export function renderLocalSetup(container, { onReady, pollMs = 3000 }) {
  let timer = null;
  let destroyed = false;

  const stopPolling = () => {
    clearInterval(timer);
    timer = null;
  };

  async function refresh() {
    if (destroyed) return;
    const detection = await detectBridge();
    if (destroyed) return;
    container.innerHTML = render(detection);
    // 未安装 / 过旧时自动轮询，等用户在终端装完
    if (["not-installed", "outdated"].includes(detection.status)) {
      timer ??= setInterval(refresh, pollMs);
    } else {
      stopPolling();
    }
  }

  async function onClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.copy) {
      await navigator.clipboard?.writeText(btn.dataset.copy);
      btn.textContent = getMessage("localCopied");
    } else if (btn.dataset.action === "grant") {
      if (await requestNativePermission()) await refresh();
      else container.querySelector(".hint").textContent = getMessage("localPermissionDenied");
    } else if (btn.dataset.action === "recheck") {
      container.querySelector(".local-setup").dataset.checking = "true";
      await refresh();
    } else if (btn.dataset.action === "use") {
      onReady(btn.dataset.engine);
    }
  }

  container.addEventListener("click", onClick);
  container.innerHTML = `<div class="local-setup" data-state="checking"><p class="hint">${getMessage("localChecking")}</p></div>`;
  return {
    refresh,
    destroy() {
      destroyed = true;
      stopPolling();
      container.removeEventListener("click", onClick);
    },
  };
}
```

在 `extension/sidepanel/panel.css` 末尾追加：
```css
/* ===== 本机 Agent 设置面板 ===== */
.local-setup { display: flex; flex-direction: column; gap: 8px; }
.local-cmd { display: flex; flex-direction: column; gap: 4px; }
.local-cmd-label { font-size: 12px; color: var(--text-secondary, #666); }
.local-cmd code {
  display: block; padding: 6px 8px; border-radius: 6px; font-size: 12px;
  background: var(--bg-secondary, #f4f4f5); word-break: break-all; user-select: all;
}
.local-copy { align-self: flex-start; }
.local-engine { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.local-engine-status { flex: 1; font-size: 12px; color: var(--text-secondary, #666); }
.local-engine[data-state="ready"] .local-engine-status { color: var(--color-success, #16a34a); }
```
（实现时把 `var(--…, fallback)` 的变量名换成 `panel.css` 中已有的同类 token，如背景色、次要文字色；用 `grep -n "^\s*--" extension/sidepanel/panel.css | head -40` 查看。）

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run extension/tests/local-setup.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add extension/sidepanel/views/local-setup.js extension/tests/local-setup.test.js extension/_locales extension/sidepanel/panel.css
git commit -m "feat(ui): shared local agent setup panel and i18n strings"
```

---

### Task 13: 引导页本机入口与首次启动判断

**Files:**
- Modify: `extension/sidepanel/index.html`（onboarding `.setup-form` 之前）
- Modify: `extension/sidepanel/views/onboarding.js`
- Modify: `extension/sidepanel/panel.js`（`=== Step 2: 检测 API Key ===` 附近，约 `:2309`）
- Modify: `extension/sidepanel/panel.css`
- Test: `extension/tests/panel.test.js`（如该文件已覆盖首次启动流程则在其中追加；否则在 Task 15 的人工验收中验证）

**Interfaces:**
- Consumes: `renderLocalSetup`（Task 12）；`setEngine`、`getEngine`、`isLocalEngine`（Task 8）；`initMainView`、`switchView`（`panel.js` 现有导出）；`AppState`
- Produces: 引导页 DOM：`#choose-local-engine`、`#local-setup-onboarding`、`#use-api-key-instead`

- [ ] **Step 1: 引导页结构**

在 `extension/sidepanel/index.html` 中 `<div class="setup-form">` 之前插入：
```html
        <button id="choose-local-engine" class="engine-choice-card" data-testid="choose-local-engine">
          <strong data-i18n="useLocalAgentTitle">Use local Claude Code / Codex</strong>
          <span class="hint" data-i18n="useLocalAgentDesc">No API key needed, for developers with a subscription</span>
        </button>
        <div id="local-onboarding" class="local-onboarding hidden">
          <div id="local-setup-onboarding"></div>
          <button id="use-api-key-instead" class="btn-ghost" data-i18n="useApiKeyInstead">Use an API key instead</button>
        </div>
```
API Key 表单（`.setup-form`）保持默认可见，现有引导流程和测试不受影响。

- [ ] **Step 2: 引导页逻辑**

在 `extension/sidepanel/views/onboarding.js` 顶部 import 区加入：
```js
import { setEngine } from "../agent/engines/prefs.js";
import { renderLocalSetup } from "./local-setup.js";
```

在 `initOnboarding()` 函数末尾（`apiGuideLink` 处理之后）加入：
```js
	initLocalOnboarding();
```

在文件中 `initOnboarding` 之后新增：
```js
/**
 * 引导页「使用本机 Claude Code / Codex」：选中可用引擎即完成配置，无需 API Key
 */
function initLocalOnboarding() {
	const card = document.getElementById("choose-local-engine");
	const panel = document.getElementById("local-onboarding");
	const form = document.querySelector("#onboarding-view .setup-form");
	let setup = null;

	const show = (local) => {
		card.classList.toggle("hidden", local);
		form.classList.toggle("hidden", local);
		panel.classList.toggle("hidden", !local);
		if (!local) {
			setup?.destroy();
			setup = null;
		}
	};

	card.addEventListener("click", () => {
		show(true);
		setup = renderLocalSetup(document.getElementById("local-setup-onboarding"), {
			onReady: async (engineId) => {
				setup.destroy();
				await setEngine(engineId);
				AppState.apiKeyStatus = "valid"; // 已配置：本机引擎可用
				switchView("main");
				initMainView();
			},
		});
		setup.refresh();
	});
	document.getElementById("use-api-key-instead").addEventListener("click", () => show(false));
}
```

- [ ] **Step 3: 首次启动判断**

在 `extension/sidepanel/panel.js` 中把：
```js
		const { needsSetup } = await checkFirstRun();

		if (needsSetup) {
```
改为：
```js
		const { needsSetup } = await checkFirstRun();
		const { getEngine, isLocalEngine } = await import("./agent/engines/prefs.js");
		const usesLocalEngine = isLocalEngine(await getEngine());

		if (needsSetup && !usesLocalEngine) {
```

- [ ] **Step 4: 样式**

`extension/sidepanel/panel.css` 末尾追加：
```css
/* ===== 引导页本机入口 ===== */
.engine-choice-card {
  display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
  padding: 12px; margin-bottom: 12px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--border-color, #e4e4e7); background: transparent;
}
.engine-choice-card:hover { border-color: var(--color-primary, #6366f1); }
.local-onboarding { display: flex; flex-direction: column; gap: 12px; }
```
（变量名同 Task 12 Step 4 的说明，换成 `panel.css` 现有 token。）

- [ ] **Step 5: 运行全量测试**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 6: 手动检查**

在 `chrome://extensions` 重新加载扩展，清空存储后打开侧边栏（DevTools 控制台执行 `chrome.storage.local.clear()` 再关闭并重开侧边栏）：
- 引导页顶部出现「使用本机 Claude Code / Codex」卡片，下方 API Key 表单照常显示
- 点击卡片 → 弹出 Chrome 权限框；同意后进入检测；Bridge 已装（Task 7 Step 7）则列出两个引擎；点「使用」进入主界面
- 关闭并重开侧边栏，直接进入主界面而不是引导页

- [ ] **Step 7: Commit**

```bash
git add extension/sidepanel/index.html extension/sidepanel/views/onboarding.js extension/sidepanel/panel.js extension/sidepanel/panel.css
git commit -m "feat(ui): onboarding entry for local agents without an API key"
```

---

### Task 14: 输入框引擎切换器与运行状态

**Files:**
- Create: `extension/sidepanel/views/engine-switcher.js`、`extension/tests/engine-switcher.test.js`
- Modify: `extension/sidepanel/index.html`（`.input-toolbar-right` 内、`#send-btn` 之前；`#input-area` 内末尾）
- Modify: `extension/sidepanel/panel.js`（uiCallbacks、`showCompressionStatus`、`initMainView` 中初始化）
- Modify: `extension/sidepanel/panel.css`

**Interfaces:**
- Consumes: `ENGINES`、`getEngine`、`setEngine`、`engineLabel`、`isLocalEngine`（Task 8）；`detectBridge`、`engineState`（Task 9）；`renderLocalSetup`（Task 12）；`getSettings`（`api.js`）
- Produces: `engineDisplayName(id) → string`；`initEngineSwitcher({ isBusy: () => boolean, hasMessages: () => boolean, onNotice: (text) => void, openSettings: () => void }) → Promise<void>`；`refreshEngineLabel() → Promise<void>`；`openEngineMenu() → void`；`openLocalSetupModal() → void`

- [ ] **Step 1: 写失败测试**

`extension/tests/engine-switcher.test.js`：
```js
import { describe, test, expect, beforeEach, vi } from "vitest";

const store = {};
globalThis.chrome = {
  runtime: { id: "x" },
  i18n: { getMessage: (k) => k, getUILanguage: () => "en" },
  storage: { local: { get: async (k) => (k in store ? { [k]: store[k] } : {}), set: async (o) => Object.assign(store, o) } },
};

let detection = { status: "ok", engines: { "claude-code": { installed: true, loggedIn: true }, codex: { installed: true, loggedIn: false } } };
vi.mock("../sidepanel/agent/engines/bridge-client.js", async () => {
  const actual = await vi.importActual("../sidepanel/agent/engines/bridge-client.js");
  return { ...actual, detectBridge: async () => detection };
});
let hasKey = true;
vi.mock("../sidepanel/api.js", () => ({ getSettings: async () => { if (!hasKey) throw new Error("none"); return { apiKey: "k" }; } }));

const { initEngineSwitcher, openEngineMenu } = await import("../sidepanel/views/engine-switcher.js");

function mount() {
  document.body.innerHTML = `
    <button id="engine-btn"><span class="engine-label"></span></button>
    <div id="engine-menu" class="hidden"></div>`;
}

const deps = (over = {}) => ({ isBusy: () => false, hasMessages: () => true, onNotice: vi.fn(), openSettings: vi.fn(), ...over });

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; hasKey = true; mount(); });

describe("engine switcher", () => {
  test("label reflects the stored engine", async () => {
    store.agent_engine = "codex";
    await initEngineSwitcher(deps());
    expect(document.querySelector(".engine-label").textContent).toBe("Codex");
  });

  test("menu lists engines with availability", async () => {
    await initEngineSwitcher(deps());
    await openEngineMenu();
    const items = [...document.querySelectorAll("#engine-menu [data-engine]")].map((b) => [b.dataset.engine, b.dataset.available]);
    expect(items).toEqual([["builtin", "true"], ["claude-code", "true"], ["codex", "false"]]);
  });

  test("choosing an available engine saves it and posts a notice when the chat has messages", async () => {
    const d = deps();
    await initEngineSwitcher(d);
    await openEngineMenu();
    document.querySelector('#engine-menu [data-engine="claude-code"]').click();
    await vi.waitFor(() => expect(store.agent_engine).toBe("claude-code"));
    expect(d.onNotice).toHaveBeenCalledWith("engineSwitched");
    expect(document.querySelector("#engine-menu").classList.contains("hidden")).toBe(true);
  });

  test("no notice in an empty chat", async () => {
    const d = deps({ hasMessages: () => false });
    await initEngineSwitcher(d);
    await openEngineMenu();
    document.querySelector('#engine-menu [data-engine="claude-code"]').click();
    await vi.waitFor(() => expect(store.agent_engine).toBe("claude-code"));
    expect(d.onNotice).not.toHaveBeenCalled();
  });

  test("builtin without API key opens settings instead of switching", async () => {
    hasKey = false;
    store.agent_engine = "codex";
    const d = deps();
    await initEngineSwitcher(d);
    await openEngineMenu();
    document.querySelector('#engine-menu [data-engine="builtin"]').click();
    expect(d.openSettings).toHaveBeenCalled();
    expect(store.agent_engine).toBe("codex");
  });

  test("busy agent blocks opening the menu", async () => {
    await initEngineSwitcher(deps({ isBusy: () => true }));
    document.querySelector("#engine-btn").click();
    expect(document.querySelector("#engine-menu").classList.contains("hidden")).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run extension/tests/engine-switcher.test.js`
Expected: FAIL，模块不存在

- [ ] **Step 3: 实现**

`extension/sidepanel/views/engine-switcher.js`：
```js
/**
 * StyleSwift - 输入框旁的引擎切换器
 * 下一条消息生效；运行中不可切换；会话中途切换时在消息流插入提示。
 */

import { detectBridge, engineState } from "../agent/engines/bridge-client.js";
import { ENGINES, engineLabel, getEngine, isLocalEngine, setEngine } from "../agent/engines/prefs.js";
import { getSettings } from "../api.js";
import { formatMessage, getMessage } from "../i18n.js";
import { escapeHtml } from "../ui/dom-utils.js";
import { renderLocalSetup } from "./local-setup.js";

let deps = null;

export const engineDisplayName = (id) => (id === "builtin" ? getMessage("engineBuiltin") : engineLabel(id));

async function hasApiKey() {
  try {
    await getSettings();
    return true;
  } catch {
    return false;
  }
}

export async function refreshEngineLabel() {
  document.querySelector("#engine-btn .engine-label").textContent = engineDisplayName(await getEngine());
}

function closeMenu() {
  document.getElementById("engine-menu").classList.add("hidden");
  document.getElementById("engine-btn").setAttribute("aria-expanded", "false");
}

async function choose(engineId) {
  closeMenu();
  if ((await getEngine()) === engineId) return;
  await setEngine(engineId);
  await refreshEngineLabel();
  if (deps.hasMessages()) deps.onNotice(formatMessage("engineSwitched", { engine: engineDisplayName(engineId) }));
}

export async function openEngineMenu() {
  if (deps.isBusy()) return;
  const menu = document.getElementById("engine-menu");
  const [current, keyOk, detection] = await Promise.all([getEngine(), hasApiKey(), detectBridge()]);
  menu.innerHTML =
    `<div class="engine-menu-title">${getMessage("engineMenuTitle")}</div>` +
    ENGINES.map((e) => {
      const available = isLocalEngine(e.id) ? engineState(detection, e.id) === "ready" : keyOk;
      const hint = available ? "" : getMessage(isLocalEngine(e.id) ? "engineGoSetup" : "engineConfigureApiKey");
      return `<button class="engine-menu-item" role="menuitemradio" aria-checked="${e.id === current}"
        data-engine="${e.id}" data-available="${available}">
        <span>${escapeHtml(engineDisplayName(e.id))}</span><span class="hint">${escapeHtml(hint)}</span></button>`;
    }).join("");
  menu.classList.remove("hidden");
  document.getElementById("engine-btn").setAttribute("aria-expanded", "true");
}

export function openLocalSetupModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-container" role="dialog" aria-modal="true">
      <div class="modal-header"><h3 class="modal-title">${getMessage("localAgentTitle")}</h3></div>
      <div class="modal-body" id="local-setup-modal-body"></div>
      <div class="modal-footer"><button class="modal-btn modal-btn-secondary" data-action="close">${getMessage("cancel")}</button></div>
    </div>`;
  document.body.append(overlay);
  const close = () => {
    setup.destroy();
    overlay.remove();
  };
  const setup = renderLocalSetup(overlay.querySelector("#local-setup-modal-body"), {
    onReady: async (engineId) => {
      close();
      await choose(engineId);
    },
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest('[data-action="close"]')) close();
  });
  setup.refresh();
}

export async function initEngineSwitcher(options) {
  deps = options;
  await refreshEngineLabel();
  const btn = document.getElementById("engine-btn");
  const menu = document.getElementById("engine-menu");
  if (btn.dataset.bound === "true") return;
  btn.dataset.bound = "true";

  btn.addEventListener("click", () => (menu.classList.contains("hidden") ? openEngineMenu() : closeMenu()));
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-engine]");
    if (!item) return;
    if (item.dataset.available === "true") return choose(item.dataset.engine);
    closeMenu();
    if (isLocalEngine(item.dataset.engine)) openLocalSetupModal();
    else deps.openSettings();
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run extension/tests/engine-switcher.test.js`
Expected: PASS

- [ ] **Step 5: 接入 HTML**

`extension/sidepanel/index.html` 中，`<div class="input-toolbar-right">` 内 `#send-btn` 之前插入：
```html
              <button id="engine-btn" class="toolbar-btn engine-btn" data-testid="engine-btn" aria-haspopup="menu" aria-expanded="false">
                <span class="engine-label"></span>
                <span class="icon icon-chevron-down" style="width:10px;height:10px" aria-hidden="true"></span>
              </button>
```
在 `<footer id="input-area" class="input-area">` 内、`</footer>` 之前插入：
```html
        <div id="engine-menu" class="engine-menu hidden" role="menu" data-testid="engine-menu"></div>
```

- [ ] **Step 6: 接入 panel.js**

（a）`showCompressionStatus` 支持自定义文案。把签名改为 `function showCompressionStatus(phase, textOverride)`，在 `statusConfig` 中加入：
```js
		engine_starting: {
			icon: "loader",
			text: "",
		},
```
并把 `const config = statusConfig[phase] || statusConfig.compression_history;` 之后插入：
```js
	const text = textOverride ?? config.text;
```
模板中 `${config.text}` 改为 `${escapeHtml(text)}`。

（b）在发送消息构建的 `uiCallbacks` 对象中（`onCompressionEnd` 之后）加入：
```js
			/** 本机引擎冷启动：显示「正在启动 X…」，第一条事件到达后移除 */
			onEngineStarting: (label) => {
				showCompressionStatus("engine_starting", formatMessage("engineStarting", { engine: label }));
			},
			onEngineStarted: () => {
				hideCompressionStatus();
			},
			/** 本机引擎提示（如会话失效重开），渲染为消息流内的提示行 */
			onEngineNotice: (text) => {
				renderEngineNotice(text);
			},
```
`extension/sidepanel/views/skill-area.js:432` 处同样调用 `agentLoop`：在其 uiCallbacks 中加入同样三项（如该文件拿不到 `showCompressionStatus`，`onEngineStarting`/`onEngineStarted` 可省略，`onEngineNotice` 改用其 `appendText`）。

（c）在 `addMessageToContainer` 之后新增：
```js
/**
 * 消息流内的引擎提示行（切换引擎、本机会话重开）
 * @param {string} text
 */
export function renderEngineNotice(text) {
	const el = document.createElement("div");
	el.className = "engine-notice";
	el.textContent = text;
	addMessageToContainer(el);
}
```

（d）在 `initMainView()` 末尾加入：
```js
	const { initEngineSwitcher } = await import("./views/engine-switcher.js");
	await initEngineSwitcher({
		isBusy: () => AppState.agentStatus === "running",
		hasMessages: () => Boolean(DOM.messagesContainer?.querySelector(".message-user, .message-assistant")),
		onNotice: renderEngineNotice,
		openSettings: () => {
			initSettingsView();
			switchView("settings");
		},
	});
```
（先用 `grep -n "message-user\|message-assistant" extension/sidepanel/panel.js | head` 确认消息元素的实际类名并据此调整选择器。）

- [ ] **Step 7: 样式**

`extension/sidepanel/panel.css` 末尾追加：
```css
/* ===== 引擎切换器 ===== */
.engine-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
.input-area { position: relative; }
.engine-menu {
  position: absolute; right: 12px; bottom: calc(100% + 4px); z-index: 20; min-width: 200px;
  padding: 4px; border-radius: 10px; border: 1px solid var(--border-color, #e4e4e7);
  background: var(--bg-primary, #fff); box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}
.engine-menu-title { padding: 6px 8px; font-size: 12px; color: var(--text-secondary, #666); }
.engine-menu-item {
  display: flex; justify-content: space-between; width: 100%; padding: 8px; border: 0;
  border-radius: 6px; background: transparent; cursor: pointer; text-align: left;
}
.engine-menu-item:hover { background: var(--bg-secondary, #f4f4f5); }
.engine-menu-item[aria-checked="true"] { font-weight: 600; }
.engine-menu-item[data-available="false"] > span:first-child { opacity: 0.5; }
.engine-notice { margin: 8px auto; font-size: 12px; color: var(--text-secondary, #666); text-align: center; }
```
（变量名换成 `panel.css` 现有 token。）

- [ ] **Step 8: 全量测试**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 9: Commit**

```bash
git add extension/sidepanel/views/engine-switcher.js extension/tests/engine-switcher.test.js extension/sidepanel/index.html extension/sidepanel/panel.js extension/sidepanel/views/skill-area.js extension/sidepanel/panel.css
git commit -m "feat(ui): engine switcher next to the input and local engine status"
```

---

### Task 15: 设置页本机 Agent 分组与错误横幅

**Files:**
- Modify: `extension/sidepanel/index.html`（替换原型的「本机 Agent（实验）」分组）
- Modify: `extension/sidepanel/views/settings.js`（删除原型 `initClaudeCodeToggle`）
- Modify: `extension/sidepanel/panel.js`（`ERROR_ACTION_LABEL_KEYS`、`AGENT_ERROR_UI`、`showAgentError`、横幅按钮点击处理 `:3193` 附近）
- Test: `extension/tests/panel.test.js`（追加错误码映射测试，若 `AGENT_ERROR_UI` 未导出则导出它）

**Interfaces:**
- Consumes: `renderLocalSetup`（Task 12）；`setEngine`（Task 8）；`openEngineMenu`、`openLocalSetupModal`、`engineDisplayName`、`refreshEngineLabel`（Task 14）
- Produces: 横幅动作 `localSetup`、`switchEngine`；`AGENT_ERROR_UI` 新增 6 个本机错误码

- [ ] **Step 1: 写失败测试**

先确认 `extension/tests/panel.test.js` 如何导入 `panel.js`（查看文件头部）。在 `panel.js` 中把 `const AGENT_ERROR_UI` 改为 `export const AGENT_ERROR_UI`，然后在 `panel.test.js` 末尾追加：
```js
describe("local engine error mapping", () => {
  test("every local error code has a banner action", async () => {
    const { AGENT_ERROR_UI } = await import("../sidepanel/panel.js");
    expect(AGENT_ERROR_UI.LOCAL_BRIDGE_UNAVAILABLE).toMatchObject({ key: "errLocalBridgeUnavailable", action: "localSetup" });
    expect(AGENT_ERROR_UI.LOCAL_NOT_LOGGED_IN).toMatchObject({ key: "errLocalNotLoggedIn", action: "localSetup" });
    expect(AGENT_ERROR_UI.LOCAL_CLI_MISSING).toMatchObject({ key: "errLocalCliMissing", action: "localSetup" });
    expect(AGENT_ERROR_UI.LOCAL_PROTOCOL_MISMATCH).toMatchObject({ key: "errLocalProtocolMismatch", action: "localSetup" });
    expect(AGENT_ERROR_UI.LOCAL_QUOTA).toMatchObject({ raw: true, action: "switchEngine" });
    expect(AGENT_ERROR_UI.LOCAL_ENGINE_ERROR).toMatchObject({ raw: true, action: "switchEngine" });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run extension/tests/panel.test.js`
Expected: FAIL，`AGENT_ERROR_UI.LOCAL_BRIDGE_UNAVAILABLE` 为 undefined

- [ ] **Step 3: 错误码映射与横幅动作**

`panel.js` 中 `ERROR_ACTION_LABEL_KEYS` 加入：
```js
	localSetup: "localSetupAction",
	switchEngine: "switchEngineAction",
```
`AGENT_ERROR_UI` 加入：
```js
	LOCAL_BRIDGE_UNAVAILABLE: { type: "API_ERROR", key: "errLocalBridgeUnavailable", action: "localSetup" },
	LOCAL_NOT_LOGGED_IN: { type: "API_ERROR", key: "errLocalNotLoggedIn", action: "localSetup" },
	LOCAL_CLI_MISSING: { type: "API_ERROR", key: "errLocalCliMissing", action: "localSetup" },
	LOCAL_PROTOCOL_MISMATCH: { type: "API_ERROR", key: "errLocalProtocolMismatch", action: "localSetup" },
	LOCAL_QUOTA: { type: "API_ERROR", raw: true, action: "switchEngine" },
	LOCAL_ENGINE_ERROR: { type: "API_ERROR", raw: true, action: "switchEngine" },
```
`showAgentError` 中把 `customMessage` 的计算改为：
```js
	const customMessage = ui?.raw
		? String(error.message || "").slice(0, 200)
		: ui
			? getMessage(ui.key)
			: `${getMessage("errApi")}: ${String(error.message || "").slice(0, 200)}`;
```
横幅按钮点击的 `switch (action)`（`panel.js:3196` 附近，`case "settings":` 所在处）加入：
```js
				case "localSetup": {
					hideErrorBanner();
					const { openLocalSetupModal } = await import("./views/engine-switcher.js");
					openLocalSetupModal();
					break;
				}
				case "switchEngine": {
					hideErrorBanner();
					const { openEngineMenu } = await import("./views/engine-switcher.js");
					openEngineMenu();
					break;
				}
```
（若该点击处理函数不是 `async`，把它改为 `async`；保持其他 case 不变。）

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run extension/tests/panel.test.js`
Expected: PASS

- [ ] **Step 5: 设置页分组替换原型开关**

`extension/sidepanel/index.html` 中删除原型加入的整段：
```html
        <!-- ponytail: 原型文案未接 i18n -->
        <div class="settings-group">
          <h3>本机 Agent（实验）</h3>
          <p class="hint">使用本机已登录的 Claude Code 替代内置 Agent。需先运行 <code>node bridge/install.mjs &lt;扩展ID&gt;</code>。</p>
          <label><input type="checkbox" id="settings-use-claude-code"> 使用 Claude Code</label>
          <div id="claude-code-status" class="status-message hidden"></div>
        </div>
```
替换为：
```html
        <div class="settings-group">
          <h3 data-i18n="localAgentTitle">Local agent</h3>
          <p class="hint" data-i18n="localAgentDesc">Use the Claude Code or Codex already signed in on this computer. No API key needed.</p>
          <div id="local-setup-settings"></div>
          <div id="local-engine-status" class="status-message hidden"></div>
        </div>
```

`extension/sidepanel/views/settings.js`：删除原型的 `initClaudeCodeToggle` 整个函数，以及 `initSettingsView` 中的 `await initClaudeCodeToggle();` 调用；在原调用位置改为：
```js
	initLocalAgentSettings();
```
并在文件中新增：
```js
let localSetup = null;

/**
 * 设置页「本机 Agent」分组：每次进入设置页重新检测
 */
async function initLocalAgentSettings() {
	const { renderLocalSetup } = await import("./local-setup.js");
	const { setEngine } = await import("../agent/engines/prefs.js");
	const { engineDisplayName } = await import("./engine-switcher.js");
	const status = document.getElementById("local-engine-status");
	localSetup?.destroy();
	localSetup = renderLocalSetup(document.getElementById("local-setup-settings"), {
		onReady: async (engineId) => {
			await setEngine(engineId);
			status.textContent = formatMessage("engineSwitched", { engine: engineDisplayName(engineId) });
			status.className = "status-message success";
		},
	});
	localSetup.refresh();
}
```
在 `handleSettingsBack`（返回按钮处理）开头加入：
```js
	localSetup?.destroy();
	localSetup = null;
```
返回主界面后刷新切换器标签：在 `handleSettingsBack` 切回主界面的位置之后加入：
```js
	const { refreshEngineLabel } = await import("./engine-switcher.js");
	await refreshEngineLabel();
```

- [ ] **Step 6: 全量测试**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 7: Commit**

```bash
git add extension/sidepanel/index.html extension/sidepanel/views/settings.js extension/sidepanel/panel.js extension/tests/panel.test.js
git commit -m "feat(ui): local agent settings group and error banner actions"
```

---

### Task 16: 端到端人工验收与收尾

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-local-agent-engines-design.md`（状态行）
- Create: `docs/superpowers/plans/2026-10-14-local-agent-engines-qa.md`（验收记录）

- [ ] **Step 1: 自动化检查**

Run: `npm test && node bridge/smoke-test.mjs`
Expected: vitest 全部 PASS；冒烟输出 `claude-code: OK`、`codex: OK`

- [ ] **Step 2: 用开发版扩展重装 Bridge**

Run: `node bridge/cli.mjs uninstall && node bridge/cli.mjs install --extension-id <开发版扩展 ID>`
Expected: 两条 ✓ 输出

- [ ] **Step 3: 按清单手动验收（Windows；有 macOS 设备时重复一遍）**

把下表复制到 `docs/superpowers/plans/2026-10-14-local-agent-engines-qa.md`，逐项填写结果（✅/❌ + 备注）：

| # | 场景 | 期望 |
|---|---|---|
| 1 | 清空存储，引导页点「使用本机」，拒绝权限 | 提示需要授权，停留在面板 |
| 2 | 同意权限，Bridge 未安装（先 `uninstall`） | 显示两条安装命令；运行 `install` 后 3 秒内自动变为引擎列表 |
| 3 | 选 Claude Code 进入主界面，发「把背景改成深色」 | 显示「正在启动 Claude Code…」，工具卡片出现，样式生效 |
| 4 | 同会话再发「再暗一点」 | 续接成功（不重复带文字记录），样式更新 |
| 5 | 撤销按钮 | 回到上一步样式 |
| 6 | 切换器切到 Codex | 消息流出现「已切换到 Codex · 之前的对话会以文字带入」 |
| 7 | 用 Codex 发「标题改成蓝色」 | Codex 能看到之前的对话；工具调用成功、样式生效 |
| 8 | 运行中点停止 | 显示 Cancelled，任务管理器中无残留 claude/codex 进程 |
| 9 | 运行中切换器 | 无法打开菜单 |
| 10 | 附带参考图片发送 | 回复开头提示「本机引擎暂不支持图片，已忽略附图」 |
| 11 | `codex logout` 后检测 | 列表中 Codex 显示「未登录：在终端运行 codex login」 |
| 12 | 删除 `%LOCALAPPDATA%\StyleSwift\bridge` 后发送 | 横幅「本机 Agent 未连接」+「检查本机 Agent」，点击弹出设置弹窗 |
| 13 | 清空 `engine_session:*` 对应的 CLI 会话（删除 `~/.codex/sessions` 下对应文件或改存储值为无效 UUID）后发送 | 出现「本机会话已失效，已重新开始」，回复正常 |
| 14 | 切回内置引擎（有 API Key） | 内置引擎能读到本机引擎轮次的文字 |
| 15 | 无 API Key 用户在切换器点「内置」 | 跳转设置页 |
| 16 | 重新打开会话 | 本机引擎轮次以文字显示，无报错 |
| 17 | 设置页「本机 Agent」分组 | 显示检测结果，可切换引擎；返回主界面后切换器标签已更新 |
| 18 | 升级场景：从 1.0.6 商店版升级到本版本（打包后安装覆盖） | 扩展未被禁用，无新权限提示 |

任何 ❌：回到对应 Task 修复并补测试，再重跑本步骤。

- [ ] **Step 4: 更新设计文档状态**

把 spec 头部 `> 状态：设计已确认，待实现` 改为 `> 状态：已实现（YYYY-MM-DD）`，并在其下列出与设计不同的实现细节（若有）。

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-10-14-local-agent-engines-design.md docs/superpowers/plans/2026-10-14-local-agent-engines-qa.md
git commit -m "docs: local agent engines QA record and spec status"
```

- [ ] **Step 6: 发布 npm 包（需要维护者执行）**

这一步需要 npm 账号凭据，由维护者手动执行：
```bash
cd bridge && npm publish --access public
```
发布后在一台干净机器上验证 `npx -y styleswift-bridge@latest install` 可用，再提交扩展商店审核。
