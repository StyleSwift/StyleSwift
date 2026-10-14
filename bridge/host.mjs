#!/usr/bin/env node
/**
 * StyleSwift Bridge - Chrome Native Messaging host
 *
 * 让扩展驱动本机 Claude Code CLI：
 *   扩展 --native messaging--> host --spawn--> claude -p (stream-json)
 *   claude --MCP(HTTP, 127.0.0.1)--> host --tool_call--> 扩展执行页面工具 --tool_result--> host
 *
 * 扩展 → host: {type:"detect"} | {type:"run", prompt, system, tools, resume?} | {type:"tool_result", id, content}
 * host → 扩展: {type:"detect_result"} | {type:"event", event} | {type:"tool_call", id, name, args} | {type:"done", code, error?}
 */

import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MCP_NAME = "styleswift";
const MAX_STRING = 20000; // host → 扩展单条消息上限 1MB，大字符串（截图 base64、页面结构）截断后再转发
const WORK_DIR = join(tmpdir(), "styleswift-bridge");
mkdirSync(WORK_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Native messaging 帧：4 字节小端长度 + UTF-8 JSON
// ---------------------------------------------------------------------------

function send(msg) {
  const body = Buffer.from(
    JSON.stringify(msg, (_k, v) =>
      typeof v === "string" && v.length > MAX_STRING ? v.slice(0, MAX_STRING) + "…[truncated]" : v,
    ),
  );
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

let inbuf = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  inbuf = Buffer.concat([inbuf, chunk]);
  while (inbuf.length >= 4) {
    const len = inbuf.readUInt32LE(0);
    if (inbuf.length < 4 + len) break;
    const msg = JSON.parse(inbuf.subarray(4, 4 + len).toString("utf8"));
    inbuf = inbuf.subarray(4 + len);
    handle(msg).catch((err) => send({ type: "done", code: -1, error: String(err?.message || err) }));
  }
});
// 扩展断开（取消 / 关闭面板）→ 结束子进程并退出
process.stdin.on("end", () => {
  child?.kill();
  process.exit(0);
});

// ---------------------------------------------------------------------------
// 定位 claude 可执行文件（npm 安装是 .cmd，需要 shell 启动）
// ---------------------------------------------------------------------------

function findClaude() {
  const cmd = process.platform === "win32" ? "where" : "which";
  const out = execFileSync(cmd, ["claude"], { encoding: "utf8" });
  return out.split(/\r?\n/).find(Boolean).trim();
}

function spawnClaude(args) {
  const bin = findClaude();
  if (/\.(cmd|bat)$/i.test(bin)) {
    // 参数全部是固定 flag / 临时文件路径 / UUID，加引号后交给 cmd 安全
    const quoted = args.map((a) => `"${a}"`);
    return spawn(`"${bin}"`, quoted, { cwd: WORK_DIR, shell: true, windowsHide: true });
  }
  return spawn(bin, args, { cwd: WORK_DIR, windowsHide: true });
}

// ---------------------------------------------------------------------------
// 最小 MCP Streamable HTTP 服务：把 tools/call 转发给扩展
// ---------------------------------------------------------------------------

const token = randomBytes(24).toString("hex");
const pendingCalls = new Map(); // id → resolve
let tools = [];
let callSeq = 0;

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

async function handleRpc(req) {
  switch (req.method) {
    case "initialize":
      return rpcResult(req.id, {
        protocolVersion: req.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: MCP_NAME, version: "0.1.0" },
      });
    case "tools/list":
      return rpcResult(req.id, {
        tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema })),
      });
    case "tools/call": {
      const id = ++callSeq;
      const content = await new Promise((resolve) => {
        pendingCalls.set(id, resolve);
        send({ type: "tool_call", id, name: req.params.name, args: req.params.arguments || {} });
      });
      return rpcResult(req.id, { content });
    }
    case "ping":
      return rpcResult(req.id, {});
    default:
      return { jsonrpc: "2.0", id: req.id, error: { code: -32601, message: `Unknown method ${req.method}` } };
  }
}

const mcpServer = createServer((req, res) => {
  if (req.headers.authorization !== `Bearer ${token}`) {
    res.writeHead(401).end();
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    const msg = JSON.parse(body);
    if (msg.id === undefined) {
      res.writeHead(202).end(); // notification
      return;
    }
    const out = await handleRpc(msg);
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
  });
});
const mcpReady = new Promise((r) => mcpServer.listen(0, "127.0.0.1", r));

// ---------------------------------------------------------------------------
// 消息处理
// ---------------------------------------------------------------------------

let child = null;

async function handle(msg) {
  if (msg.type === "detect") {
    try {
      const version = execFileSync(findClaude(), ["--version"], { encoding: "utf8", shell: process.platform === "win32" }).trim();
      send({ type: "detect_result", ok: true, version });
    } catch (err) {
      send({ type: "detect_result", ok: false, error: String(err?.message || err) });
    }
    return;
  }

  if (msg.type === "tool_result") {
    pendingCalls.get(msg.id)?.(msg.content);
    pendingCalls.delete(msg.id);
    return;
  }

  if (msg.type === "run") {
    if (child) throw new Error("Claude Code is already running");
    tools = msg.tools;
    await mcpReady;

    const systemFile = join(WORK_DIR, "system.md");
    const mcpFile = join(WORK_DIR, "mcp.json");
    writeFileSync(systemFile, msg.system);
    writeFileSync(
      mcpFile,
      JSON.stringify({
        mcpServers: {
          [MCP_NAME]: {
            type: "http",
            url: `http://127.0.0.1:${mcpServer.address().port}/mcp`,
            headers: { Authorization: `Bearer ${token}` },
          },
        },
      }),
    );

    const args = [
      "-p",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose",
      "--system-prompt-file", systemFile,
      "--mcp-config", mcpFile,
      "--strict-mcp-config",
      "--setting-sources", "",          // 不加载用户 hooks / CLAUDE.md 等
      "--tools", "",                    // 关闭全部内置工具（Bash、文件读写…），只留 StyleSwift MCP 工具
      "--allowedTools", `mcp__${MCP_NAME}`,
    ];
    if (msg.resume) args.push("--resume", msg.resume);

    child = spawnClaude(args);
    child.stdin.end(
      JSON.stringify({ type: "user", message: { role: "user", content: msg.prompt } }) + "\n",
    );

    let stdoutBuf = "";
    child.stdout.on("data", (c) => {
      stdoutBuf += c;
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop();
      for (const line of lines) {
        if (line.trim()) send({ type: "event", event: JSON.parse(line) });
      }
    });
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (code) => {
      child = null;
      send({ type: "done", code, error: code ? stderr.slice(-2000) : undefined });
    });
  }
}
