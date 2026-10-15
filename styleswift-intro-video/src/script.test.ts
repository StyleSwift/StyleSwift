import {describe, expect, it} from 'vitest';
import {FPS, TOTAL_FRAMES} from './script';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {AGENT, END, ENGINES, HEADLINES, HOOK, ORIGINAL_SHOT, RESTYLE, SCENES, SHOTS, SKILLS, TERM_PREFIX, type SceneName, type TermLine} from './script';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

// Width and height from a JPEG's SOF marker, so the test needs no image library.
const jpegSize = (file: string) => {
  const b = readFileSync(file);
  for (let i = 2; i < b.length; i += 2 + b.readUInt16BE(i + 2)) {
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xc3) return {w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5)};
  }
  throw new Error(`no SOF marker in ${file}`);
};

// JetBrains Mono advances 0.6em per glyph, so each fixed-width box fits floor(inner width / (font size × 0.6))
// characters. Recompute these if a scene's box width or font size changes.
const MAX_CHARS = {
  agentLine: Math.floor(946 / (26 * 0.6)), // S3 terminal: 1020 wide − 72 padding − 2 border
  agentCss: Math.floor(864 / (20 * 0.6)), // S3 CSS box: 946 − 64 indent − 16 padding − 2 border
  skillCall: Math.floor(560 / (22 * 0.6)), // S4 left column
  skillCard: Math.floor(506 / (20 * 0.6)), // S4 card: 580 wide − 72 padding − 2 border
  engineLine: Math.floor(826 / (26 * 0.6)), // S5 terminal: 900 wide − 72 padding − 2 border
};

const termLen = (l: TermLine) => TERM_PREFIX[l.kind].length + l.text.length;

const typedEnd = (l: TermLine, cps: number) => l.at + Math.ceil((l.text.length * FPS) / cps);

// Each typed line must finish before the next line appears, and lines must be strictly ordered
// (their `at` doubles as the React key).
const checkTerminal = (lines: readonly TermLine[], cps: number, sceneLen: number) => {
  lines.forEach((l, i) => {
    const next = lines[i + 1]?.at ?? sceneLen;
    const end = l.kind === 'cmd' || l.kind === 'call' ? typedEnd(l, cps) : l.at;
    expect(l.at, l.text).toBeLessThan(next);
    expect(end, l.text).toBeLessThanOrEqual(next);
  });
};

describe('script', () => {
  it('runs exactly 45 seconds', () => {
    expect(TOTAL_FRAMES).toBe(45 * FPS);
  });

  it('every referenced image exists in public/', () => {
    const files = ['logo.png', `shots/${ORIGINAL_SHOT}`, ...SHOTS.map((s) => `shots/${s.file}`)];
    for (const f of files) expect(existsSync(publicDir + f), f).toBe(true);
  });

  it('hook prompt finishes typing well before enter, and fades out inside the scene', () => {
    const typedEnd = HOOK.typeAt + Math.ceil((HOOK.prompt.length * FPS) / HOOK.cps);
    expect(typedEnd + 10).toBeLessThanOrEqual(HOOK.enterAt);
    expect(HOOK.fadeAt + 15).toBeLessThanOrEqual(SCENES.hook);
  });

  const WORDS_PER_SECOND = 3;
  const FADE_IN = 15;

  it('every headline stays on screen long enough to read', () => {
    for (const [scene, lines] of Object.entries(HEADLINES)) {
      for (const h of lines ?? []) {
        const words = h.text.split(/\s+/).length;
        const onScreen = SCENES[scene as SceneName] - h.at;
        expect(onScreen, h.text).toBeGreaterThanOrEqual(Math.ceil((words / WORDS_PER_SECOND) * FPS) + FADE_IN);
      }
    }
  });

  it('every restyle shot is on screen for at least half a second', () => {
    const starts = RESTYLE.starts.map((s) => s + RESTYLE.wipeAt);
    const ends = [...starts.slice(1), SCENES.restyle];
    starts.forEach((s, i) => expect(ends[i] - s, SHOTS[i].file).toBeGreaterThanOrEqual(15));
    expect(RESTYLE.starts).toHaveLength(SHOTS.length);
  });

  it('the opening wipe finishes before the first hard cut', () => {
    expect(RESTYLE.wipeAt + RESTYLE.wipeLen).toBeLessThanOrEqual(RESTYLE.wipeAt + RESTYLE.starts[1]);
  });

  it('agent terminal lines finish typing before the next line appears', () => {
    checkTerminal([...AGENT.before, ...AGENT.after], AGENT.cps, SCENES.agent);
  });

  it('css scroll and screenshot scan finish before the lines that follow them', () => {
    expect(AGENT.cssAt + AGENT.cssLen).toBeLessThanOrEqual(AGENT.after[0].at);
    expect(AGENT.scanAt + AGENT.scanLen).toBeLessThanOrEqual(AGENT.after[1].at);
  });

  it('skill beats happen in order and the tool call finishes before the card pops', () => {
    checkTerminal(SKILLS.lines, SKILLS.cps, SKILLS.cardAt);
    const beats = [SKILLS.promptAt, SKILLS.lines[0].at, SKILLS.cardAt, SKILLS.listAt, SKILLS.ioAt];
    expect([...beats].sort((a, b) => a - b)).toEqual(beats);
    expect(SKILLS.ioAt + 30).toBeLessThanOrEqual(SCENES.skills);
  });

  it('bridge install output finishes before the engine menu opens', () => {
    checkTerminal(ENGINES.lines, ENGINES.cps, ENGINES.menuAt);
  });

  it('each engine pick is visible for at least a second', () => {
    const picks = ENGINES.picks.map((p) => p + ENGINES.menuAt);
    const ends = [...picks.slice(1), SCENES.engines];
    picks.forEach((p, i) => expect(ends[i] - p, ENGINES.options[i]).toBeGreaterThanOrEqual(FPS));
    expect(ENGINES.picks).toHaveLength(ENGINES.options.length);
  });

  it('end card footer stays long enough to read', () => {
    const words = END.footer.split(/\s+/).length;
    expect(SCENES.end - END.footerAt).toBeGreaterThanOrEqual(Math.ceil((words / WORDS_PER_SECOND) * FPS) + FADE_IN);
  });

  it('the wipe reveals a shot captured at the same viewport as the original', () => {
    const before = jpegSize(`${publicDir}shots/${ORIGINAL_SHOT}`);
    const after = jpegSize(`${publicDir}shots/${SHOTS[0].file}`);
    expect(before.w / before.h).toBeCloseTo(after.w / after.h, 2);
  });

  it('monospace lines fit inside their boxes', () => {
    for (const l of [...AGENT.before, ...AGENT.after]) expect(termLen(l), l.text).toBeLessThanOrEqual(MAX_CHARS.agentLine);
    for (const l of AGENT.css) expect(l.length, l).toBeLessThanOrEqual(MAX_CHARS.agentCss);
    for (const l of SKILLS.lines) expect(termLen(l), l.text).toBeLessThanOrEqual(MAX_CHARS.skillCall);
    for (const l of SKILLS.card) expect(l.length, l).toBeLessThanOrEqual(MAX_CHARS.skillCard);
    for (const l of ENGINES.lines) expect(termLen(l), l.text).toBeLessThanOrEqual(MAX_CHARS.engineLine);
  });
});
