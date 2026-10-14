// @vitest-environment node
import { describe, test, expect } from "vitest";
import { mergePath } from "../lib/env-path.mjs";

describe("mergePath", () => {
  test("node dir first, then saved, then current entries", () => {
    expect(mergePath({ current: "/usr/bin:/bin", saved: "/opt/homebrew/bin:/Users/u/.local/bin", nodeDir: "/n/bin", delimiter: ":" }))
      .toBe("/n/bin:/opt/homebrew/bin:/Users/u/.local/bin:/usr/bin:/bin");
  });

  test("de-duplicates keeping the first occurrence and drops empty entries", () => {
    expect(mergePath({ current: "/usr/bin::/n/bin", saved: "/usr/bin:/a", nodeDir: "/n/bin", delimiter: ":" }))
      .toBe("/n/bin:/usr/bin:/a");
  });

  test("missing saved / current PATH", () => {
    expect(mergePath({ current: "C:\\Windows", saved: undefined, nodeDir: "C:\\node", delimiter: ";" })).toBe("C:\\node;C:\\Windows");
    expect(mergePath({ current: undefined, saved: undefined, nodeDir: "/n", delimiter: ":" })).toBe("/n");
  });
});
