// Every on-screen word and every timing lives here, so copy and pacing edits never touch scene code.
// Timings are in beats of the soundtrack (128 BPM); scene data uses beats relative to the scene's first beat.

import {beatFrame} from './lib/timing';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 128;
export const TOTAL_BEATS = 96; // 24 bars = 45 s

// Mixkit "Karma": its 128 BPM grid starts at 0.4145 s. Track beat 168 (79.16 s) opens the film, the full
// drums land on track beat 176 (film beat 8) and the last hit is track beat 256 (film beat 88).
export const MUSIC = {firstBeatSec: 0.4145, startBeat: 168, dropBeat: 8, lastHitBeat: 88, fadeFrames: 15};
export const MUSIC_TRIM_BEFORE = Math.round((MUSIC.firstBeatSec + (MUSIC.startBeat * 60) / BPM) * FPS);

export const beat = (b: number) => beatFrame(b, FPS, BPM);
export const TOTAL_FRAMES = beat(TOTAL_BEATS);

export const SCENE_BEATS = {hook: 0, restyle: 8, how: 40, save: 56, mosaic: 72, end: 84} as const;
export type SceneName = keyof typeof SCENE_BEATS;
export const SCENE_ORDER: readonly SceneName[] = ['hook', 'restyle', 'how', 'save', 'mosaic', 'end'];

export const sceneStart = (s: SceneName) => beat(SCENE_BEATS[s]);
export const sceneLength = (s: SceneName) => {
  const next = SCENE_ORDER[SCENE_ORDER.indexOf(s) + 1];
  return (next ? sceneStart(next) : TOTAL_FRAMES) - sceneStart(s);
};
// Frame of a scene-relative beat, counted from the scene's first frame.
export const at = (s: SceneName, b: number) => beat(SCENE_BEATS[s] + b) - sceneStart(s);

export const domainOf = (url: string) => url.split('/')[0];

export type Line = {beat: number; text: string};
export type StickerColor = 'sun' | 'cyan' | 'magenta' | 'white';
export type SfxKey = 'click' | 'typing' | 'sparkle' | 'whoosh' | 'pop' | 'check' | 'done' | 'shine';
export type Cue = {sfx: SfxKey; scene: SceneName; beat: number; frames: number};

const GITHUB = 'github.com/StyleSwift/StyleSwift';
export const ORIGINAL_SHOT = 'github-original.jpg';
export const PLACEHOLDER = 'Describe a look…';
// The side panel's steps, in plain words (no tool names).
export const PANEL_STEPS: readonly string[] = ['Reads the page', 'Picks colors & fonts', "Checks it's easy to read"];

export const HOOK = {url: GITHUB, prompt: 'make it Y2K', cursorBeat: 2, typeBeat: 3, typeCps: 9, clickBeat: 7};
const HOOK_CUES: Cue[] = [
  {sfx: 'typing', scene: 'hook', beat: HOOK.typeBeat, frames: Math.ceil((HOOK.prompt.length * FPS) / HOOK.typeCps)},
  {sfx: 'click', scene: 'hook', beat: HOOK.clickBeat, frames: 30},
];

export type Shot = {beat: number; file: string; prompt: string; url: string; sticker: {x: number; y: number; rotate: number; color: StickerColor}};

// Each shot: an iridescent seam sweeps the page into the new look and the prompt lands as a sticker.
export const RESTYLE = {
  sweepFrames: 12,
  moveBeat: 2,
  punchBeats: [4, 8, 12, 16, 20, 24, 28] as readonly number[],
  headline: {beat: 2, text: 'Any website.\nAny vibe.'},
  sub: {beat: 4, text: 'Type a feeling. Watch the page\nchange to match.'},
  shots: [
    {beat: 0, file: 'github-y2k.jpg', prompt: HOOK.prompt, url: GITHUB, sticker: {x: 1210, y: 900, rotate: 5, color: 'magenta'}},
    {beat: 8, file: 'github-matrix.jpg', prompt: 'the Matrix', url: GITHUB, sticker: {x: 140, y: 640, rotate: -6, color: 'sun'}},
    {beat: 12, file: 'github-xp.jpg', prompt: 'Windows XP', url: GITHUB, sticker: {x: 1500, y: 110, rotate: 4, color: 'cyan'}},
    {beat: 16, file: 'linuxdo-newspaper.jpg', prompt: 'old newspaper', url: 'linux.do', sticker: {x: 470, y: 790, rotate: 4, color: 'white'}},
    {beat: 20, file: 'linuxdo-bauhaus.jpg', prompt: 'Bauhaus, please', url: 'linux.do', sticker: {x: 180, y: 920, rotate: -3, color: 'cyan'}},
    {beat: 22, file: 'linuxdo-cozy.jpg', prompt: 'cozy café vibes', url: 'linux.do', sticker: {x: 780, y: 960, rotate: -5, color: 'sun'}},
    {beat: 24, file: 'douban-eink.jpg', prompt: 'e-ink reader', url: 'book.douban.com', sticker: {x: 1540, y: 960, rotate: -4, color: 'white'}},
    {beat: 26, file: 'bilibili-wes.jpg', prompt: 'Wes Anderson', url: 'www.bilibili.com', sticker: {x: 560, y: 650, rotate: 6, color: 'magenta'}},
  ] as readonly Shot[],
};
const RESTYLE_CUES: Cue[] = RESTYLE.shots.flatMap((s, i): Cue[] => [
  {sfx: i === 0 ? 'sparkle' : 'whoosh', scene: 'restyle', beat: s.beat, frames: i === 0 ? 90 : 40},
  {sfx: 'pop', scene: 'restyle', beat: s.beat, frames: 30},
]);

export const HEADLINES: readonly (Line & {scene: SceneName})[] = [
  {scene: 'restyle', ...RESTYLE.headline},
  {scene: 'restyle', ...RESTYLE.sub},
];

export const CUES: readonly Cue[] = [...HOOK_CUES, ...RESTYLE_CUES];
export const cueFrame = (c: Cue) => sceneStart(c.scene) + at(c.scene, c.beat);
