// @vitest-environment node
import { describe, test, expect } from "vitest";
import {
  HOST_NAME, STORE_EXTENSION_ID, REGISTRY_KEYS, installDir, manifestDirs,
  buildManifest, launcherFile, launcherScript, parseExtensionIds,
} from "../lib/install-paths.mjs";

describe("install paths", () => {
  test("install dir is stable (not inside the npx cache)", () => {
    expect(installDir({ platform: "win32", env: { LOCALAPPDATA: "C:\\Users\\u\\AppData\\Local" }, home: "C:\\Users\\u" }))
      .toBe("C:\\Users\\u\\AppData\\Local\\StyleSwift\\bridge");
    expect(installDir({ platform: "darwin", env: {}, home: "/Users/u" })).toBe("/Users/u/.styleswift/bridge");
  });

  test("manifest dirs cover Chrome and Edge", () => {
    expect(manifestDirs({ platform: "darwin", home: "/Users/u" })).toEqual([
      "/Users/u/Library/Application Support/Google/Chrome/NativeMessagingHosts",
      "/Users/u/Library/Application Support/Microsoft Edge/NativeMessagingHosts",
    ]);
    expect(manifestDirs({ platform: "linux", home: "/home/u" })).toEqual([
      "/home/u/.config/google-chrome/NativeMessagingHosts",
      "/home/u/.config/microsoft-edge/NativeMessagingHosts",
    ]);
    expect(REGISTRY_KEYS).toEqual([
      `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`,
      `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${HOST_NAME}`,
    ]);
  });

  test("manifest allows store id plus extra ids", () => {
    expect(buildManifest({ launcherPath: "/x/host.sh", extensionIds: [STORE_EXTENSION_ID, "a".repeat(32)] })).toEqual({
      name: HOST_NAME,
      description: "StyleSwift bridge to local Claude Code / Codex",
      path: "/x/host.sh",
      type: "stdio",
      allowed_origins: [`chrome-extension://${STORE_EXTENSION_ID}/`, `chrome-extension://${"a".repeat(32)}/`],
    });
  });

  test("launcher per platform", () => {
    expect(launcherFile({ platform: "win32", dir: "C:\\b" })).toBe("C:\\b\\host.bat");
    expect(launcherFile({ platform: "linux", dir: "/b" })).toBe("/b/host.sh");
    expect(launcherScript({ platform: "win32", nodePath: "C:\\node.exe", hostPath: "C:\\b\\host.mjs" }))
      .toBe('@echo off\r\n"C:\\node.exe" "C:\\b\\host.mjs" %*\r\n');
    expect(launcherScript({ platform: "darwin", nodePath: "/n/node", hostPath: "/b/host.mjs" }))
      .toBe('#!/bin/sh\nexec "/n/node" "/b/host.mjs" "$@"\n');
  });

  test("parseExtensionIds always includes the store id and validates extras", () => {
    expect(parseExtensionIds([])).toEqual([STORE_EXTENSION_ID]);
    expect(parseExtensionIds(["--extension-id", "b".repeat(32)])).toEqual([STORE_EXTENSION_ID, "b".repeat(32)]);
    expect(() => parseExtensionIds(["--extension-id", "BAD"])).toThrow(/extension id/i);
  });
});
