# 本机 Agent 引擎 · 人工验收记录

> 日期：2026-10-14
> 对应设计：`docs/superpowers/specs/2026-10-14-local-agent-engines-design.md`
> 分支：`feat/local-agent-engines`

## 验收前准备

1. 在 `chrome://extensions` 重新加载开发版（unpacked）扩展。
2. Bridge 已为开发版扩展 ID `ifbcoafkoaijjhffpciaonbldchfflmf` 安装（见下方「自动化检查」）。第 2 项需要先 `node bridge/cli.mjs uninstall`，验完再重新 `install --extension-id ifbcoafkoaijjhffpciaonbldchfflmf`。
3. 开发者的 `~/.codex/config.toml` 当前选的是 `gpt-6.1-sol`，Codex CLI 0.139.0 对 ChatGPT 账号拒绝该模型（报错 "not supported when using Codex with a ChatGPT account"）。运行 Codex 相关项（6、7、11、13）之前，二选一：把 `~/.codex/config.toml` 里的 `model` 改成账号支持的模型（冒烟测试用 `gpt-5.5` 通过了）；或升级 Codex CLI，并用 `codex exec "hi"` 确认配置的模型可用。
4. Windows 先验；有 macOS 设备时重复一遍。

任何 ❌：回到对应 Task 修复并补测试，再重跑该项。

## 验收清单

结果列填写 ✅/❌ + 备注。

| # | 场景 | 期望 | 结果 |
|---|---|---|---|
| 1 | 清空存储，引导页点「使用本机」，拒绝权限 | 提示需要授权，停留在面板 | |
| 2 | 同意权限，Bridge 未安装（先 `uninstall`） | 显示两条安装命令；运行 `install` 后 3 秒内自动变为引擎列表 | |
| 3 | 选 Claude Code 进入主界面，发「把背景改成深色」 | 显示「正在启动 Claude Code…」，工具卡片出现，样式生效 | |
| 4 | 同会话再发「再暗一点」 | 续接成功（不重复带文字记录），样式更新 | |
| 5 | 撤销按钮 | 回到上一步样式 | |
| 6 | 切换器切到 Codex | 消息流出现「已切换到 Codex · 之前的对话会以文字带入」 | |
| 7 | 用 Codex 发「标题改成蓝色」 | Codex 能看到之前的对话；工具调用成功、样式生效 | |
| 8 | 运行中点停止 | 显示 Cancelled，任务管理器中无残留 claude/codex 进程 | |
| 9 | 运行中切换器 | 无法打开菜单 | |
| 10 | 附带参考图片发送 | 回复开头提示「本机引擎暂不支持图片，已忽略附图」 | |
| 11 | `codex logout` 后检测 | 列表中 Codex 显示「未登录：在终端运行 codex login」 | |
| 12 | 删除 `%LOCALAPPDATA%\StyleSwift\bridge` 后发送 | 横幅「本机 Agent 未连接」+「检查本机 Agent」，点击弹出设置弹窗 | |
| 13 | 清空 `engine_session:*` 对应的 CLI 会话（删除 `~/.codex/sessions` 下对应文件或改存储值为无效 UUID）后发送 | 出现「本机会话已失效，已重新开始」，回复正常 | |
| 14 | 切回内置引擎（有 API Key） | 内置引擎能读到本机引擎轮次的文字 | |
| 15 | 无 API Key 用户在切换器点「内置」 | 跳转设置页 | |
| 16 | 重新打开会话 | 本机引擎轮次以文字显示，无报错 | |
| 17 | 设置页「本机 Agent」分组 | 显示检测结果，可切换引擎；返回主界面后切换器标签已更新 | |
| 18 | 升级场景：从 1.0.6 商店版升级到本版本（打包后安装覆盖） | 扩展未被禁用，无新权限提示 | |

## 自动化检查

执行于 2026-10-14，仓库根目录 `D:\PRODUCT\PRODUCT\StyleSwift`，分支 `feat/local-agent-engines`。

### 1. `npm test`

通过：33 个测试文件通过、1 个跳过；725 个用例通过、17 个跳过（vitest 4.1.1，约 6 秒）。

### 2. `node bridge/smoke-test.mjs`（真实 CLI，用户本机配置）

检测结果：Claude Code 2.1.292 已安装已登录；Codex `codex-cli 0.139.0` 已安装已登录。

| 引擎 | 结果 | 说明 |
|---|---|---|
| claude-code | OK | 第一轮调用 `get_secret` 拿到 `PINEAPPLE42`；第二轮续接（同一 session）未调工具即答出暗号 |
| codex | FAIL | 两轮均报 `LOCAL_ENGINE_ERROR`：`The 'gpt-6.1-sol' model is not supported when using Codex with a ChatGPT account.` |

环境原因，非 Bridge 缺陷：开发者的 `~/.codex/config.toml` 当前写的是 `model = "gpt-6.1-sol"`（不是预期的 `gpt-6-astra`），该模型对 ChatGPT 账号下的 Codex CLI 0.139.0 不可用。需升级 Codex CLI 或改用受支持的模型。

### 3. `node bridge/smoke-test.mjs codex`，临时 `CODEX_HOME`

临时目录（系统临时目录，非仓库）里复制了 `~/.codex/auth.json`，`config.toml` 只含 `model = "gpt-5.5"`；运行后已删除。`~/.codex` 未改动。

结果：`codex: OK`。第一轮调用工具拿到 `PINEAPPLE42`；第二轮续接同一 session，答出 `PINEAPPLE42`，无错误（该轮 Codex 又调用了一次 `get_secret`，不影响通过判定）。

结论：Bridge 的 Codex 适配器（工具往返 + resume）在受支持的模型下正常，上面第 2 项的 codex FAIL 仅由用户本机模型配置导致。

### 4. `node bridge/cli.mjs install --extension-id ifbcoafkoaijjhffpciaonbldchfflmf`

未先执行 `uninstall`（重装会覆盖，避免丢失开发者现有注册）。输出：

```
✓ StyleSwift Bridge 已安装到 C:\Users\22703\AppData\Local\StyleSwift\bridge
  回到 StyleSwift 侧边栏点击「重新检测」即可。
```

退出码 0。注册表核对：`HKCU\Software\Google\Chrome\NativeMessagingHosts\com.styleswift.bridge` 与 `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.styleswift.bridge` 均指向 `C:\Users\22703\AppData\Local\StyleSwift\bridge\com.styleswift.bridge.json`；`allowed_origins` 含商店版 ID `llchggmimjgnbjlcgpkjmplhfbkjjcli` 和开发版 ID `ifbcoafkoaijjhffpciaonbldchfflmf`。

注：安装命令只输出一行 ✓（计划里写的是两行 ✓ 输出，实际是一行 ✓ 加一行提示）。
