/**
 * checkHttpError 错误分类测试：决定用户看到的错误提示与操作按钮
 */

import { describe, test, expect } from "vitest";
import { checkHttpError } from "../sidepanel/agent/llm-client.js";

const res = (status, body) => ({ ok: false, status, text: async () => body });
const codeOf = (status, body = "") =>
  checkHttpError(res(status, body)).then(() => null, (e) => e.code);

describe("checkHttpError", () => {
  test.each([
    [401, "", "API_KEY_INVALID"],
    [402, "", "INSUFFICIENT_BALANCE"],
    [429, '{"error":{"code":"insufficient_quota"}}', "INSUFFICIENT_BALANCE"],
    [400, "账户余额不足", "INSUFFICIENT_BALANCE"],
    [403, "forbidden", "ACCESS_DENIED"],
    [404, "", "MODEL_NOT_FOUND"],
    [400, "The model `gpt-x` does not exist", "MODEL_NOT_FOUND"],
    [429, "slow down", "RATE_LIMITED"],
    [400, "maximum context length exceeded", "CONTEXT_TOO_LONG"],
    [500, "oops", "API_ERROR"],
  ])("HTTP %i %s -> %s", async (status, body, code) => {
    expect(await codeOf(status, body)).toBe(code);
  });

  test("ok response passes", async () => {
    await expect(checkHttpError({ ok: true })).resolves.toBeUndefined();
  });
});

import { recordUsage, resetTurnUsage, getTurnUsage } from "../sidepanel/agent/llm-client.js";

describe("turn usage", () => {
  test("sums reported usage and falls back to estimates", () => {
    resetTurnUsage();
    recordUsage({ usage: { input_tokens: 100, output_tokens: 20 }, content: [] }, []);
    expect(getTurnUsage()).toEqual({ input: 100, output: 20 });

    recordUsage({ usage: null, content: [{ type: "text", text: "hello world" }] }, []);
    const { input, output } = getTurnUsage();
    expect(input).toBeGreaterThan(100);
    expect(output).toBeGreaterThan(20);

    resetTurnUsage();
    expect(getTurnUsage()).toEqual({ input: 0, output: 0 });
  });
});
