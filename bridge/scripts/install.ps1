# StyleSwift Bridge 安装（Windows）：irm https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未检测到 Node.js，正在通过 winget 安装 Node.js LTS..."
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  # throw 而非 exit：经 irm | iex 运行时 exit 会关掉用户的 PowerShell 窗口
  if ($LASTEXITCODE -ne 0) { throw "Node.js 安装失败（winget 退出码 $LASTEXITCODE）。请从 https://nodejs.org 手动安装 Node.js LTS 后重新运行本命令。" }
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}
# npx.ps1 会被默认的 Restricted 执行策略拦截，直接调用 npx.cmd
npx.cmd -y styleswift-bridge@latest install
