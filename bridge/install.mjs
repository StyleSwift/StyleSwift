#!/usr/bin/env node
/**
 * 注册 Native Messaging host：node bridge/install.mjs <extension-id>
 * 扩展 ID 见 chrome://extensions（开发者模式）。
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HOST_NAME = "com.styleswift.bridge";
const extensionId = process.argv[2];
if (!/^[a-p]{32}$/.test(extensionId || "")) {
  console.error("用法: node bridge/install.mjs <extension-id>（32 位 a-p 字母）");
  process.exit(1);
}
// ponytail: 仅支持 Windows + Chrome；macOS/Linux 写 manifest 到 NativeMessagingHosts 目录即可，正式发布时补
if (process.platform !== "win32") {
  console.error("原型目前只支持 Windows");
  process.exit(1);
}

const dir = dirname(fileURLToPath(import.meta.url));
const launcher = join(dir, "host.bat");
const manifestPath = join(dir, `${HOST_NAME}.json`);

// Chrome 启动 host 时 PATH 可能不同，写死当前 node 的绝对路径
writeFileSync(launcher, `@echo off\r\n"${process.execPath}" "${join(dir, "host.mjs")}" %*\r\n`);
writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      name: HOST_NAME,
      description: "StyleSwift bridge to local Claude Code",
      path: launcher,
      type: "stdio",
      allowed_origins: [`chrome-extension://${extensionId}/`],
    },
    null,
    2,
  ),
);
execFileSync("reg", [
  "add", `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`,
  "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f",
]);
console.log(`已注册 ${HOST_NAME} → ${manifestPath}`);
