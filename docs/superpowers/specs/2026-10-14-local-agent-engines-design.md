# 本机 Agent 引擎（Claude Code / Codex）接入设计

> 版本：v1.0
> 日期：2026-10-14
> 状态：设计已确认，待实现
>
> 前置：已完成 Claude Code 单引擎原型（`bridge/host.mjs`、`bridge/install.mjs`、`extension/sidepanel/agent/claude-code-engine.js`），扩展内手动验证可跑通。本设计在原型基础上定义正式版本。

---

## 一、背景与目标

### 问题

StyleSwift 目前只有自研 Agent 内核，用户必须自备 API Key。很多开发者本机已经安装并登录了 Claude Code 或 Codex（订阅制），希望直接用它们来做网页个性化，不必再单独购买 API。

### 目标用户

| 类型 | 描述 | 入口 |
|---|---|---|
| B（主要） | 新用户，没有 API Key，但已有 Claude / ChatGPT 订阅的开发者 | 首次引导页 |
| A（同样支持） | 已在用内置引擎的老用户，想切换或尝试本机 Agent | 输入框旁的引擎切换器、设置页 |

### 成功标准

1. 本机已装好并登录 CLI 的新用户，从打开扩展到发出第一条消息：除了复制粘贴一条命令，只需要点击确认。
2. 三个引擎（内置 / Claude Code / Codex）应用样式、撤销、页面级 scope、会话历史的行为一致。
3. 老用户升级扩展时不会因为新增权限被 Chrome 禁用。
4. 本机 CLI 只能调用 StyleSwift 的页面工具，不能执行命令或读写本地文件。

### 不在范围内

- 跨引擎的对话上下文延续（切换引擎后，新引擎看不到之前的对话）
- 本机引擎运行中插入用户消息（会排队到下一轮）
- 签名安装包（.exe / .pkg）
- Firefox / Safari

---

## 二、关键决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 扩展与本机通信 | Chrome Native Messaging | 官方机制；只有本扩展 ID 能连接；不需要常驻进程，按需由 Chrome 拉起。本地 WebSocket 方案需要常驻进程，安全防护也得自己做，不采用 |
| 权限申请 | `nativeMessaging` 放在 `optional_permissions`，用户点击连接时申请 | 放进 `permissions` 会让老用户更新扩展后被禁用，直到重新授权 |
| Bridge 交付 | 首版：npx 命令 + 无 Node 时的单行安装脚本；签名安装包延后 | 目标用户是开发者，复制命令没有门槛；避免先投入签名成本 |
| 引擎选择粒度 | 输入框旁的切换器，全局记住上次选择，下一条消息生效 | 设置页入口太深；按会话绑定太僵硬 |
| 首版引擎 | Claude Code + Codex，通过适配器接口接入 | Codex 作为第二个适配器，可以验证抽象是否合理 |
| ACP 统一协议 | 不作为首版依赖，列为未来演进 | 第三方适配器的成熟度不可控 |

---

## 三、架构

```
┌──────────── Chrome 扩展 ────────────┐         ┌────────────── 本机 ──────────────┐
│ Side Panel                          │         │ styleswift-bridge (host)         │
│  引擎切换器 / 引导页 / 设置页          │ Native  │  ├─ 消息帧收发                    │
│  agentLoop（公共：Tab锁/会话/历史/快照）│ Messag- │  ├─ MCP 服务 127.0.0.1 + token    │
│   ├─ builtin  → 原自研循环           │  ing    │  └─ 适配器                        │
│   └─ local    → engines/local.js ◀──┼────────▶│      ├─ claude-code → claude -p   │
│  工具集（页面工具，统一一份）          │         │      └─ codex       → codex exec  │
└─────────────────────────────────────┘         └──────────────────────────────────┘
              ▲  tool_call / tool_result（经 MCP → host → 扩展）
```

### 3.1 `styleswift-bridge`（npm 包，仓库 `bridge/` 目录）

- `styleswift-bridge install [--extension-id <id>] [--browser chrome|edge]`
  - 写 host manifest 和启动器（launcher 中写死当前 node 的绝对路径）
  - Windows：写入 `HKCU\Software\{Google\Chrome|Microsoft\Edge}\NativeMessagingHosts\com.styleswift.bridge`
  - macOS / Linux：写入对应浏览器的 `NativeMessagingHosts/` 目录
  - 默认 `allowed_origins` 是商店版扩展 ID；开发时用 `--extension-id` 覆盖或追加
- `styleswift-bridge uninstall`：删除注册信息
- `host`：由 Chrome 拉起，包含以下部分
  - 消息帧：4 字节小端长度 + JSON。host → 扩展的单条消息不能超过 1MB，超长字符串截断后再转发
  - MCP 服务：Streamable HTTP，只监听 `127.0.0.1` 随机端口，每次进程生成随机 Bearer token；实现 `initialize` / `tools/list` / `tools/call` / `ping`
  - 适配器分发

### 3.2 适配器接口

```js
/** @typedef {{type:'text',text}|{type:'thinking',text}|{type:'tool_use',id,name,input}
 *   |{type:'tool_result',id,text}|{type:'session',id}|{type:'result',text,usage?}
 *   |{type:'error',code,message}} EngineEvent */

adapter.detect()  // → {installed, version?, loggedIn?, error?}
adapter.run({ prompt, system, mcpUrl, mcpToken, resume, workDir }) // → AsyncIterable<EngineEvent>，可 kill()
```

| | Claude Code | Codex |
|---|---|---|
| 启动 | `claude -p --input-format stream-json --output-format stream-json --verbose` | `codex exec --json`（多轮续接用 `codex exec resume <id>`） |
| 系统提示词 | `--system-prompt-file` | 写入工作目录的 `AGENTS.md`，或用 `-c` 覆盖（实现时验证） |
| MCP 注入 | `--mcp-config <file> --strict-mcp-config` | `-c mcp_servers.styleswift.url=...`（实现时验证 HTTP + header 的支持情况） |
| 关闭内置能力 | `--tools "" --setting-sources ""`，`--allowedTools mcp__styleswift` | `--sandbox read-only`，审批策略设为不询问，只放行 MCP |
| 续接 | `--resume <session_id>` | thread id |
| 登录检测 | 读取 init 事件或运行最小命令（实现时确定低成本做法） | `codex login status` |

Windows 下 CLI 可能是 `.cmd`（npm 安装），需要经 shell 启动。所有参数只能是固定 flag、临时文件路径或 UUID，用户输入一律通过 stdin 或文件传递，不拼进命令行。

### 3.3 扩展 ↔ Bridge 协议

所有消息都带 `v`（协议版本）。

| 方向 | 消息 |
|---|---|
| 扩展 → host | `{type:'hello'}`、`{type:'detect'}`、`{type:'run', engine, prompt, system, tools, resume}`、`{type:'tool_result', id, content}` |
| host → 扩展 | `{type:'hello', bridgeVersion, protocol}`、`{type:'detect_result', engines:{claude-code:{…}, codex:{…}}}`、`{type:'event', event: EngineEvent}`、`{type:'tool_call', id, name, args}`、`{type:'done', code, error?}` |

- 协议不兼容时，扩展显示「请更新 Bridge」并给出更新命令
- 取消 = 扩展断开端口 → host 收到 stdin EOF → 结束子进程并退出

### 3.4 扩展侧引擎层

- `extension/sidepanel/agent/engines/local.js`：通用本机引擎（取代原型里的 `claude-code-engine.js`），负责连接、检测、运行、工具往返、把统一事件映射到 `uiCallbacks`
- `agentLoop`：公共部分（并发保护、Tab 锁定、页面访问检查、会话解析、历史 / 快照 / 标题保存）保持不变；只把「循环本体」按引擎分流
- 工具集：本机引擎使用 `ALL_TOOLS` 去掉 `Task` / `TodoWrite` / `think`，再加上 `capture_screenshot`
- 系统提示词：本机引擎单独一版，去掉内置循环专用的工具说明，保留会话上下文、用户画像、技能描述、当前样式摘要

### 3.5 安全边界

1. CLI 的内置工具全部关闭（Claude Code 用 `--tools ""`，Codex 用只读沙箱），只放行 `mcp__styleswift__*`
2. 不加载用户自己的 hooks / 设置 / 其他 MCP 配置，避免被干扰，也避免误触发
3. CLI 工作目录是系统临时目录下的 `styleswift-bridge/`
4. MCP 只监听 127.0.0.1，并校验随机 token
5. Native host 的 `allowed_origins` 只包含 StyleSwift 扩展 ID
6. 网页内容进入 CLI 时可能带提示词注入。由于能力已收窄到页面工具，最坏后果仅限于改当前页面的样式

---

## 四、入口与用户流程

### 4.1 首次引导页（B 类用户）

顶部并列两个选项：

- **使用本机 Claude Code / Codex**（无需 API Key，适合已有订阅的开发者）
- **使用 API Key**（现有表单）

选择本机后：

```
申请 nativeMessaging 权限
  └─ 拒绝 → 留在选择页，提示「需要该权限才能连接本机 Agent」
  └─ 同意 → 检测 Bridge
        ├─ 未安装 → 安装面板（标签页：有 Node / 无 Node），复制按钮
        │           停留期间每 3 秒自动检测，另有「重新检测」按钮
        ├─ 版本过旧 → 显示更新命令
        └─ 正常 → 引擎列表
              ✅ 已就绪 vX.Y   ⚠️ 未登录（在终端运行 `claude` / `codex login`）   ➖ 未安装（文档链接）
              选中已就绪的引擎 →「开始使用」→ 主界面
```

选择本机引擎并完成检测，就算「已配置」；`apiKeyStatus` 的判断要改成「已有 API Key 或已有可用的本机引擎」。

### 4.2 主界面：引擎切换器

- 位置在输入框旁，显示为紧凑标签「Claude Code ▾」
- 下拉列出三个引擎及其状态；不可用的显示为灰色，附「去设置」；内置引擎没有 Key 时显示「配置 API Key」
- Agent 运行期间禁用切换
- 选中尚未连接的本机引擎时，以弹层形式打开与 4.1 相同的检测和安装流程
- 会话中途切换时，消息流里插入分隔线：「已切换到 Codex · 新引擎看不到之前的对话，已应用的样式会保留」

### 4.3 设置页「AI 引擎」分组

- 内置引擎：现有的 API Key / 地址 / 模型 / 视觉模型配置挪到这里
- 本机引擎：Bridge 状态、各 CLI 的状态、「重新检测」、安装 / 更新 / 卸载命令

### 4.4 运行时状态与异常

复用现有的 AgentError 横幅机制，新增以下错误码：

| 错误码 | 情况 | 提示 | 操作 |
|---|---|---|---|
| `LOCAL_BRIDGE_UNAVAILABLE` | 连不上 Bridge | 本机 Agent 未连接 | 重新检测 / 切换引擎 |
| `LOCAL_NOT_LOGGED_IN` | CLI 未登录或已过期 | 请在终端运行 `claude` 登录 | 重新检测 |
| `LOCAL_QUOTA` | 额度用尽或被限流 | 显示 CLI 原始提示 | 切换引擎 |
| `LOCAL_CLI_MISSING` | CLI 被卸载 | 未找到 Claude Code | 安装文档 |
| `LOCAL_PROTOCOL_MISMATCH` | Bridge 版本不兼容 | 请更新 Bridge | 复制更新命令 |

- 冷启动时显示「正在启动 Claude Code…」，第一条事件到达后消失
- 每个错误码怎么判定（依据退出码、stderr、result 事件中的哪些字段），由各适配器在实现时用真实输出确定，并写进测试数据

---

## 五、数据与会话

### 5.1 存储键

| 键 | 内容 |
|---|---|
| `agent_engine` | 最近一次选择的引擎：`builtin` / `claude-code` / `codex` |
| `engine_session:{engine}:{domain}:{sessionId}` | 对应 CLI 的会话 ID，用于续接 |

删除 StyleSwift 会话时，同时删除对应的 `engine_session:*` 键。

### 5.2 历史

- 本机引擎每一轮的用户消息、助手最终文本、工具调用记录都写入 `fullHistory`，每条带 `_engine` 字段
- 内置引擎组装 LLM 历史时过滤掉 `_engine` 不是 `builtin` 的消息（没有该字段的旧消息视为 `builtin`）
- 本机引擎靠 CLI 自己的会话续接，扩展不回放历史给它
- 续接失败时，自动新开 CLI 会话重试一次，并在消息流里提示「本机会话已失效，已重新开始」

### 5.3 不变的部分

Tab 锁定、受限页面检查、页面级 scope、撤销快照、会话标题都在 `agentLoop` 的公共部分；样式工具统一走 `runApplyStyles` / `runEditCSS`，三个引擎行为一致。

### 5.4 首版的取舍

- 运行中用户追加的消息先排队，本轮结束后作为下一轮发出
- 如果 `result` 事件带用量 / 费用就显示，没有就不显示

---

## 六、测试策略

| 层 | 内容 | 工具 |
|---|---|---|
| Bridge 单元 | 消息帧编解码、截断；MCP 各方法与 token 校验；每个适配器的事件映射（用录制的真实 CLI 输出 jsonl 作测试数据） | vitest |
| 扩展单元 | 引擎层（模拟 `connectNative` 端口）：工具往返、取消、断开、错误码映射；`agentLoop` 分流与 `_engine` 历史过滤；引导页检测状态切换 | vitest + jsdom |
| 真实环境冒烟 | `bridge/smoke-test.mjs` 扩展到两个引擎，手动运行，CI 中跳过 | node |
| 人工验收 | Windows / macOS × Claude Code / Codex：安装、检测、对话、截图、撤销、取消、未登录、额度用尽、版本不兼容 | 清单 |

---

## 七、未来演进

- **ACP**：等 Claude Code / Codex 的 ACP 适配器成熟后，可以把 Bridge 的适配器层换成单个 ACP client，接入 Gemini CLI 等更多 agent
- **签名安装包**：用户量起来后提供 .exe / .pkg，去掉对 Node 和终端的依赖
- **运行中插入消息**：利用 stream-json 输入的多消息能力
- **逐字流式**：Claude Code 加 `--include-partial-messages`
