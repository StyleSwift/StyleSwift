import { claudeCode } from "./claude-code.mjs";
import { codex } from "./codex.mjs";

export const adapters = { [claudeCode.id]: claudeCode, [codex.id]: codex };
