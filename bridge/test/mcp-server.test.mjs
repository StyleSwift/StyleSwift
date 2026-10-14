// @vitest-environment node
import { describe, test, expect, afterEach } from "vitest";
import { createMcpServer } from "../lib/mcp-server.mjs";

let server;
afterEach(() => server?.close());

async function rpc(url, token, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

describe("mcp server", () => {
  test("rejects missing or wrong token", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    const res = await rpc(url, "wrong", { jsonrpc: "2.0", id: 1, method: "ping" });
    expect(res.status).toBe(401);
  });

  test("binds to 127.0.0.1", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    expect(await server.start()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
  });

  test("initialize echoes protocol version, notifications get 202", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    const init = await (await rpc(url, server.token, {
      jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18" },
    })).json();
    expect(init.result.protocolVersion).toBe("2025-06-18");
    expect(init.result.serverInfo.name).toBe("styleswift");
    const note = await rpc(url, server.token, { jsonrpc: "2.0", method: "notifications/initialized" });
    expect(note.status).toBe(202);
  });

  test("tools/list maps input_schema to inputSchema", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    server.setTools([{ name: "grep", description: "d", input_schema: { type: "object" } }]);
    const res = await (await rpc(url, server.token, { jsonrpc: "2.0", id: 1, method: "tools/list" })).json();
    expect(res.result.tools).toEqual([{ name: "grep", description: "d", inputSchema: { type: "object" } }]);
  });

  test("tools/call forwards to onToolCall", async () => {
    const calls = [];
    server = createMcpServer({
      onToolCall: async (name, args) => { calls.push([name, args]); return [{ type: "text", text: "ok" }]; },
    });
    const url = await server.start();
    const res = await (await rpc(url, server.token, {
      jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "grep", arguments: { query: "h1" } },
    })).json();
    expect(calls).toEqual([["grep", { query: "h1" }]]);
    expect(res.result.content).toEqual([{ type: "text", text: "ok" }]);
  });

  test("unknown method returns JSON-RPC error, bad JSON returns 400", async () => {
    server = createMcpServer({ onToolCall: async () => [] });
    const url = await server.start();
    const res = await (await rpc(url, server.token, { jsonrpc: "2.0", id: 3, method: "nope" })).json();
    expect(res.error.code).toBe(-32601);
    const bad = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${server.token}` }, body: "{" });
    expect(bad.status).toBe(400);
  });
});
