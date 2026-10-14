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
