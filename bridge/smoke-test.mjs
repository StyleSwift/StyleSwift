// 模拟扩展端，验证 host ↔ claude ↔ MCP 工具往返：node bridge/smoke-test.mjs
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const host = spawn(process.execPath, [fileURLToPath(new URL("./host.mjs", import.meta.url))]);
const send = (m) => {
  const b = Buffer.from(JSON.stringify(m));
  const h = Buffer.alloc(4);
  h.writeUInt32LE(b.length);
  host.stdin.write(Buffer.concat([h, b]));
};
host.stderr.pipe(process.stderr);

let buf = Buffer.alloc(0);
let toolCalled = false;
host.stdout.on("data", (c) => {
  buf = Buffer.concat([buf, c]);
  while (buf.length >= 4 && buf.length >= 4 + buf.readUInt32LE(0)) {
    const msg = JSON.parse(buf.subarray(4, 4 + buf.readUInt32LE(0)));
    buf = buf.subarray(4 + buf.readUInt32LE(0));
    if (msg.type === "detect_result") {
      console.log("detect:", msg);
      if (!msg.ok) process.exit(1);
      send({
        type: "run",
        system: "You are a test agent. Always call get_secret first, then reply with exactly the secret.",
        prompt: "What is the secret?",
        tools: [{ name: "get_secret", description: "Return the secret word", input_schema: { type: "object", properties: {} } }],
      });
    } else if (msg.type === "tool_call") {
      toolCalled = true;
      console.log("tool_call:", msg.name);
      send({ type: "tool_result", id: msg.id, content: [{ type: "text", text: "PINEAPPLE42" }] });
    } else if (msg.type === "event" && msg.event.type === "result") {
      console.log("result:", msg.event.result);
    } else if (msg.type === "done") {
      console.log("done:", msg);
      const ok = toolCalled && msg.code === 0;
      console.log(ok ? "SMOKE OK" : "SMOKE FAIL");
      process.exit(ok ? 0 : 1);
    }
  }
});
send({ type: "detect" });
