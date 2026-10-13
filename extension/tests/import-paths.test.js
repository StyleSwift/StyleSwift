/**
 * 所有相对 import（静态与动态 import()）都必须指向存在的文件。
 * 拆分模块时动态 import 路径相对于模块文件解析，ESLint 不会报错。
 */

import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const IMPORT_RE = /(?:from\s+|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g;

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return ["tests", "node_modules"].includes(e.name) ? [] : jsFiles(p);
    return e.name.endsWith(".js") ? [p] : [];
  });
}

describe("relative imports resolve", () => {
  test.each(jsFiles(ROOT).map((f) => [path.relative(ROOT, f), f]))("%s", (_, file) => {
    const missing = [...fs.readFileSync(file, "utf8").matchAll(IMPORT_RE)]
      .map((m) => m[1])
      .filter((spec) => !fs.existsSync(path.resolve(path.dirname(file), spec)));
    expect(missing).toEqual([]);
  });
});
