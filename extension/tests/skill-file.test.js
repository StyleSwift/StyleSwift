/**
 * 风格技能导入/导出文件格式测试
 */

import { describe, test, expect } from "vitest";
import { formatSkillFile, parseSkillFile, MAX_SKILL_FILE_BYTES } from "../sidepanel/style-skill.js";

describe("skill file", () => {
  test("round-trips name, mood, source, content and css", () => {
    const text = formatSkillFile(
      { name: "赛博朋克", mood: "深色: 霓虹", sourceDomain: "github.com" },
      "# 赛博朋克\n\n## 配色\n- 黑底",
      "body { background: #000; }",
    );
    expect(parseSkillFile(text)).toEqual({
      name: "赛博朋克",
      mood: "深色: 霓虹",
      sourceDomain: "github.com",
      content: "# 赛博朋克\n\n## 配色\n- 黑底",
      cssContent: "body { background: #000; }",
    });
  });

  test("works without css and normalizes CRLF", () => {
    const text = formatSkillFile({ name: "Calm", mood: "", sourceDomain: "" }, "content", null)
      .replace(/\n/g, "\r\n");
    const parsed = parseSkillFile(text);
    expect(parsed.name).toBe("Calm");
    expect(parsed.content).toBe("content");
    expect(parsed.cssContent).toBeNull();
  });

  test("plain markdown without frontmatter uses fallback name", () => {
    expect(parseSkillFile("# Hi", "my-style")).toMatchObject({ name: "my-style", content: "# Hi" });
  });

  test("rejects empty content and oversized files", () => {
    expect(() => parseSkillFile("---\nname: x\n---\n")).toThrow();
    expect(() => parseSkillFile("x".repeat(MAX_SKILL_FILE_BYTES + 1), "big")).toThrow();
  });

  test("trims overly long names", () => {
    expect(parseSkillFile(`---\nname: ${"n".repeat(200)}\n---\nbody`).name.length).toBe(60);
  });
});
