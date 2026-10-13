/**
 * buildApiUrl / PROVIDER_PRESETS 测试
 */

import { describe, test, expect } from "vitest";
import { buildApiUrl, detectProvider, PROVIDER_PRESETS } from "../sidepanel/api.js";

describe("buildApiUrl", () => {
  test.each([
    ["https://api.deepseek.com", "https://api.deepseek.com/v1/chat/completions"],
    ["https://open.bigmodel.cn/api/paas/v4", "https://open.bigmodel.cn/api/paas/v4/chat/completions"],
    // Gemini 的 /v1beta 也是版本段，不能再追加 /v1
    ["https://generativelanguage.googleapis.com/v1beta/openai",
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"],
  ])("%s", (base, url) => {
    expect(buildApiUrl(base, "/chat/completions")).toBe(url);
  });
});

describe("PROVIDER_PRESETS", () => {
  test("every preset except custom has a valid URL, model and key page", () => {
    for (const p of PROVIDER_PRESETS.filter((p) => p.id !== "custom")) {
      expect(() => new URL(p.apiBase)).not.toThrow();
      expect(p.model).toBeTruthy();
      expect(() => new URL(p.keyUrl)).not.toThrow();
    }
  });

  test("only Anthropic uses the Claude-native format", () => {
    const claude = PROVIDER_PRESETS.filter((p) => p.apiBase && detectProvider(p.apiBase) === "claude");
    expect(claude.map((p) => p.id)).toEqual(["anthropic"]);
  });
});
