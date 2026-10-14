/**
 * Native host 协议核心：detect / run / tool_result
 */

import { createMcpServer } from "./mcp-server.mjs";

export const PROTOCOL_VERSION = 1;

export function createHost({ adapters, send, bridgeVersion, workRoot }) {
  const pending = new Map(); // tool_call id → resolve
  let seq = 0;
  let current = null;
  let busy = false;

  const mcp = createMcpServer({
    onToolCall: (name, args) =>
      new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        send({ type: "tool_call", id, name, args }); // 不截断：CSS 参数必须完整
      }),
  });
  const mcpUrl = mcp.start();

  const fail = (code, message) => {
    send({ type: "event", event: { type: "error", code, message } }, { truncate: true });
    send({ type: "done" });
  };

  async function detect() {
    const engines = {};
    for (const [id, adapter] of Object.entries(adapters)) {
      engines[id] = await adapter.detect().catch((err) => ({ installed: false, error: err.message }));
    }
    send({ type: "detect_result", protocol: PROTOCOL_VERSION, bridgeVersion, engines });
  }

  async function run(msg) {
    if (msg.protocol !== PROTOCOL_VERSION) {
      return fail("LOCAL_PROTOCOL_MISMATCH", `Extension protocol ${msg.protocol}, bridge protocol ${PROTOCOL_VERSION}`);
    }
    const adapter = adapters[msg.engine];
    if (!adapter) return fail("LOCAL_ENGINE_ERROR", `Unknown engine: ${msg.engine}`);
    if (busy) return fail("LOCAL_ENGINE_ERROR", "Another run is in progress");
    busy = true; // 同步占位，避免 await 期间被并发 run 越过

    try {
      mcp.setTools(msg.tools ?? []);
      current = adapter.run({
        prompt: msg.prompt,
        system: msg.system,
        resume: msg.resume,
        mcpUrl: await mcpUrl,
        mcpToken: mcp.token,
        workRoot,
      });
      for await (const event of current.events) send({ type: "event", event }, { truncate: true });
    } catch (err) {
      send({ type: "event", event: { type: "error", code: "LOCAL_ENGINE_ERROR", message: String(err?.message || err) } }, { truncate: true });
    } finally {
      current = null;
      busy = false;
      send({ type: "done" });
    }
  }

  return {
    async handle(msg) {
      if (msg.type === "detect") return detect();
      if (msg.type === "run") return run(msg);
      if (msg.type === "tool_result") {
        pending.get(msg.id)?.(msg.content);
        pending.delete(msg.id);
      }
    },
    shutdown() {
      current?.kill();
      mcp.close();
    },
  };
}
