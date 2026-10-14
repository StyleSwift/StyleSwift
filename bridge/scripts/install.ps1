# StyleSwift Bridge 安装（Windows）：irm https://raw.githubusercontent.com/StyleSwift/StyleSwift/main/bridge/scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未检测到 Node.js，正在通过 winget 安装 Node.js LTS..."
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}
npx -y styleswift-bridge@latest install
