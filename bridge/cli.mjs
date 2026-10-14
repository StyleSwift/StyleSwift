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
  // 从 Dock / Finder 启动的 Chrome 不继承终端 PATH，host 启动时合并回去（见 lib/env-path.mjs）
  writeFileSync(join(dir, "env.json"), JSON.stringify({ PATH: process.env.PATH }));

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
