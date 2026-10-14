/**
 * Chrome 从 Dock / Finder 启动时 PATH 很短（缺 ~/.local/bin、/opt/homebrew/bin 等）：
 * install 时把终端里的 PATH 存进 env.json，host 启动时合并回来
 */

export function mergePath({ current, saved, nodeDir, delimiter }) {
  const entries = [nodeDir, ...(saved ?? "").split(delimiter), ...(current ?? "").split(delimiter)];
  return [...new Set(entries.filter(Boolean))].join(delimiter);
}
