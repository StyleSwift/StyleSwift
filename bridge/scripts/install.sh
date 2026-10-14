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
