// @vitest-environment node
import { describe, test, expect } from "vitest";
import { encodeMessage, createDecoder, MAX_STRING } from "../lib/framing.mjs";

describe("framing", () => {
  test("round-trips messages split across chunks", () => {
    const got = [];
    const decode = createDecoder((m) => got.push(m));
    const buf = Buffer.concat([encodeMessage({ a: 1 }), encodeMessage({ b: "中文" })]);
    decode(buf.subarray(0, 3));
    decode(buf.subarray(3, 9));
    decode(buf.subarray(9));
    expect(got).toEqual([{ a: 1 }, { b: "中文" }]);
  });

  test("length header is little-endian byte length", () => {
    const buf = encodeMessage({ s: "é" });
    expect(buf.readUInt32LE(0)).toBe(buf.length - 4);
  });

  test("truncates long strings only when asked", () => {
    const long = "x".repeat(MAX_STRING + 10);
    const decodeOne = (b) => JSON.parse(b.subarray(4).toString("utf8"));
    expect(decodeOne(encodeMessage({ s: long })).s).toBe(long);
    const cut = decodeOne(encodeMessage({ s: long }, { truncate: true })).s;
    expect(cut.startsWith("x".repeat(MAX_STRING))).toBe(true);
    expect(cut.endsWith("…[truncated]")).toBe(true);
  });
});
