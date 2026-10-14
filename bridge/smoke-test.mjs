// 真实 CLI 冒烟：node bridge/smoke-test.mjs [claude-code|codex]（默认两个都跑）
// 第一轮让模型调用工具拿到暗号，第二轮用续接问回暗号，验证工具往返与 resume。
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { encodeMessage, createDecoder } from "./lib/framing.mjs";

const PROTOCOL = 1;
const TOOLS = [{ name: "get_secret", description: "Return the secret word", input_schema: { type: "object", properties: {} } }];
const SYSTEM = "You are a test agent. When asked for the secret, call get_secret first, then reply with exactly the secret word.";

function session() {
  const host = spawn(process.execPath, [fileURLToPath(new URL("./host.mjs", import.meta.url))]);
  host.stderr.pipe(process.stderr);
  const listeners = new Set();
  host.stdout.on("data", createDecoder((m) => listeners.forEach((l) => l(m))));
  return {
    send: (m) => host.stdin.write(encodeMessage(m)),
    on: (l) => listeners.add(l),
    close: () => host.stdin.end(),
  };
}

function runTurn(engine, prompt, resume) {
  return new Promise((resolve) => {
    const s = session();
    const result = { text: "", toolCalled: false, sessionId: null, error: null };
    s.on((m) => {
      if (m.type === "tool_call") {
        result.toolCalled = true;
        s.send({ type: "tool_result", id: m.id, content: [{ type: "text", text: "PINEAPPLE42" }] });
      } else if (m.type === "event") {
        if (m.event.type === "text") result.text += m.event.text;
        if (m.event.type === "session") result.sessionId = m.event.id;
        if (m.event.type === "error") result.error = m.event;
      } else if (m.type === "done") {
        s.close();
        resolve(result);
      }
    });
    s.send({ type: "run", protocol: PROTOCOL, engine, prompt, system: SYSTEM, tools: TOOLS, resume });
  });
}

function detect() {
  return new Promise((resolve) => {
    const s = session();
    s.on((m) => { if (m.type === "detect_result") { s.close(); resolve(m); } });
    s.send({ type: "detect" });
  });
}

const engines = process.argv[2] ? [process.argv[2]] : ["claude-code", "codex"];
const detected = await detect();
console.log("detect:", JSON.stringify(detected));
let ok = true;
for (const engine of engines) {
  const first = await runTurn(engine, "What is the secret?");
  const second = await runTurn(engine, "Repeat the secret word from earlier without calling any tool.", first.sessionId);
  const pass = first.toolCalled && first.text.includes("PINEAPPLE42") && second.text.includes("PINEAPPLE42") && !second.error;
  console.log(`${engine}: ${pass ? "OK" : "FAIL"}`, JSON.stringify({ first, second }));
  ok &&= pass;
}
process.exit(ok ? 0 : 1);
