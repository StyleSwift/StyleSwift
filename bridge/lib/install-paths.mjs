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
