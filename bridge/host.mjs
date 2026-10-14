#!/usr/bin/env node
/**
 * StyleSwift Bridge - Chrome Native Messaging host 入口
 * Chrome 拉起时会附带 origin 等参数，这里不需要使用。
 */

import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adapters } from "./adapters/index.mjs";
import { createDecoder, encodeMessage } from "./lib/framing.mjs";
import { createHost } from "./lib/host-core.mjs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const workRoot = join(tmpdir(), "styleswift-bridge");
mkdirSync(workRoot, { recursive: true });

const send = (msg, opts) => process.stdout.write(encodeMessage(msg, opts));
const host = createHost({ adapters, send, bridgeVersion: version, workRoot });

process.stdin.on(
  "data",
  createDecoder((msg) =>
    host.handle(msg).catch((err) => {
      send({ type: "event", event: { type: "error", code: "LOCAL_ENGINE_ERROR", message: String(err?.message || err) } });
      send({ type: "done" });
    }),
  ),
);
// 扩展断开（取消 / 关闭面板）→ 结束子进程并退出
process.stdin.on("end", () => {
  host.shutdown();
  process.exit(0);
});
