/**
 * CLI 进程工具：定位、安全启动、JSONL 事件流、错误分类
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export function pickBin(candidates, platform) {
  if (platform !== "win32") return candidates[0] ?? null;
  return (
    candidates.find((c) => /\.exe$/i.test(c)) ??
    candidates.find((c) => /\.(cmd|bat)$/i.test(c)) ??
    null
  );
}

export async function resolveBin(name) {
  const finder = process.platform === "win32" ? "where" : "which";
  const out = await execText(finder, [name]).catch(() => "");
  const candidates = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return pickBin(candidates, process.platform);
}

/** npm 安装的 .cmd 需要经 cmd.exe 启动；参数只允许不含 cmd 元字符的值 */
export function quoteArg(arg) {
  if (/["%^&|<>!]/.test(arg)) throw new Error(`Unsafe CLI argument: ${arg}`);
  return `"${arg}"`;
}

export function spawnCli(bin, args, { cwd, env } = {}) {
  const opts = { cwd, env: { ...process.env, ...env }, windowsHide: true };
  if (/\.(cmd|bat)$/i.test(bin)) {
    return spawn(`"${bin}"`, args.map(quoteArg), { ...opts, shell: true });
  }
  return spawn(bin, args, opts);
}

export function execText(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawnCli(bin, args);
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error((err || out).trim() || `exit ${code}`)),
    );
  });
}

export function classifyError(text = "") {
  if (/not logged in|please (run|use) .*log ?in|log ?in required|unauthori[sz]ed|\b401\b|authentication/i.test(text)) {
    return "LOCAL_NOT_LOGGED_IN";
  }
  if (/usage limit|rate.?limit|quota|\b429\b|too many requests/i.test(text)) return "LOCAL_QUOTA";
  return "LOCAL_ENGINE_ERROR";
}

export function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n");
}

/** Kill process, with special handling for Windows shell spawns */
function killChild(child, useShell) {
  if (!child) return;
  // Avoid taskkill on a stale/reused pid if child already exited
  if (child.exitCode !== null || child.killed) return;
  // On Windows, a .cmd spawn uses shell:true, which only kills cmd.exe, not the CLI.
  // Use taskkill to terminate the whole process tree.
  if (process.platform === "win32" && useShell) {
    const tk = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
    tk.on("error", () => {}); // Suppress spawn failures to avoid crashing host
  } else {
    child.kill();
  }
}

/**
 * 启动 CLI，把 stdout 的每行 JSON 经 mapEvent 转为 EngineEvent 流。
 * 非零退出且没有产生过 error 事件时，用 stderr 补一个 error 事件。
 */
export function streamCli({ name, args, cwd, env, stdin, mapEvent, cleanup, resolve = true }) {
  let child = null;
  let exited = false;
  let killed = false;
  let useShell = false;
  async function* events() {
    try {
      if (killed) return; // kill() was called before iteration
      const bin = resolve ? await resolveBin(name) : name;
      if (killed) return; // kill() was called during resolveBin
      if (!bin) {
        yield { type: "error", code: "LOCAL_CLI_MISSING", message: `${name} not found in PATH` };
        return;
      }
      child = spawnCli(bin, args, { cwd, env });
      // Track if spawned through shell (for Windows taskkill)
      if (/\.(cmd|bat)$/i.test(bin)) {
        useShell = true;
      }
      child.stdin.on("error", () => {}); // 进程提前退出时写 stdin 会 EPIPE
      child.stdin.end(stdin);
      let stderr = "";
      child.stderr.on("data", (c) => (stderr += c));
      const exit = new Promise((done) => {
        child.on("error", (err) => {
          exited = true;
          done({ code: -1, spawnError: err });
        });
        child.on("close", (code) => {
          exited = true;
          done({ code });
        });
      });
      let sawError = false;
      for await (const line of createInterface({ input: child.stdout })) {
        let raw;
        try {
          raw = JSON.parse(line);
        } catch {
          continue; // 非 JSON 日志行
        }
        for (const ev of mapEvent(raw)) {
          if (ev.type === "error") sawError = true;
          yield ev;
        }
      }
      const { code, spawnError } = await exit;
      if (spawnError?.code === "ENOENT") {
        yield { type: "error", code: "LOCAL_CLI_MISSING", message: spawnError.message };
      } else if (code !== 0 && !sawError) {
        const message = (spawnError?.message || stderr).trim().slice(-2000) || `${name} exited with code ${code}`;
        yield { type: "error", code: classifyError(message), message };
      }
    } finally {
      // Kill child if it hasn't exited yet (consumer break, throw, etc.)
      if (!exited) {
        killChild(child, useShell);
      }
      cleanup?.();
    }
  }
  return {
    events: events(),
    kill: () => {
      killed = true;
      killChild(child, useShell);
    },
  };
}
