/**
 * 最小 MCP Streamable HTTP 服务：只支持 JSON 响应（不开 SSE），把 tools/call 交给 onToolCall
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

export const MCP_NAME = "styleswift";

export function createMcpServer({ onToolCall }) {
  const token = randomBytes(24).toString("hex");
  let tools = [];

  async function handleRpc(req) {
    switch (req.method) {
      case "initialize":
        return {
          protocolVersion: req.params?.protocolVersion || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: MCP_NAME, version: "1" },
        };
      case "tools/list":
        return {
          tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema })),
        };
      case "tools/call":
        return { content: await onToolCall(req.params.name, req.params.arguments || {}) };
      case "ping":
        return {};
      default:
        return null;
    }
  }

  const server = createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) return res.writeHead(401).end();
    if (req.method !== "POST") return res.writeHead(405).end();
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let msg;
      try {
        msg = JSON.parse(body);
      } catch {
        return res.writeHead(400).end();
      }
      if (msg.id === undefined) return res.writeHead(202).end(); // notification
      const result = await handleRpc(msg);
      const out = result === null
        ? { jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `Unknown method ${msg.method}` } }
        : { jsonrpc: "2.0", id: msg.id, result };
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
    });
  });

  return {
    token,
    setTools(list) {
      tools = list;
    },
    start() {
      return new Promise((resolve) =>
        server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}/mcp`)),
      );
    },
    close() {
      server.close();
    },
  };
}
