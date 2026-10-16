// Every on-screen word and every timing lives here, so copy and pacing edits never touch scene code.
// Timings are in beats of the soundtrack (BPM below); scene data uses beats relative to the scene's first beat.

import audio from './audio.json';
import {beatFrame} from './lib/timing';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 130;
export const TOTAL_BEATS = 100; // 25 bars ≈ 46.2 s at 130 BPM

// Mixkit "Cherry on Top": its 130 BPM grid starts at 0.3971 s. Track beat 123 (57.17 s) opens the film, so its
// final downbeat (track beat 215, 99.63 s) lands on film beat 92, the call to action; the track tails off after.
// The track is evenly loud, so the hook ducks it and the drop on film beat 12 brings it to full level.
export const MUSIC = {firstBeatSec: 0.3971, startBeat: 123, trackSec: 105.5, dropBeat: 12, lastHitBeat: 92, fadeFrames: 15};
export const MUSIC_TRIM_BEFORE = Math.round((MUSIC.firstBeatSec + (MUSIC.startBeat * 60) / BPM) * FPS);

export type AudioKey = keyof typeof audio;
// The Mixkit id is part of the file name, so changing an id in audio.json fetches the new file.
export const audioFile = (key: AudioKey) => `${key}-${audio[key].id}.mp3`;

export const beat = (b: number) => beatFrame(b, FPS, BPM);
export const TOTAL_FRAMES = beat(TOTAL_BEATS);

export const SCENE_BEATS = {hook: 0, restyle: 12, how: 44, save: 60, mosaic: 76, end: 88} as const;
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
export const ORIGINAL_SHOT = 'github-original.png';
// The side panel is shown as real screenshots, captured by scripts/capture-panel.cjs from the real extension
// (panel-runs.json lists the runs). Files are named <run key>-<state>.png, and a run key is its shot file name.
export const panelFile = (key: string, state: string) => `${key}-${state}.png`;
export const typedFile = (key: string, chars: number) => panelFile(key, `type-${String(chars).padStart(2, '0')}`);

// The cursor clicks the pinned toolbar icon, the side panel slides open, then the prompt is typed and sent.
export const HOOK = {url: GITHUB, prompt: 'make it Y2K', iconBeat: 1.5, openBeat: 3, openFrames: 12, cursorBeat: 5, typeBeat: 6.5, typeCps: 9, clickBeat: 10};
const HOOK_CUES: Cue[] = [
  {sfx: 'click', scene: 'hook', beat: HOOK.openBeat, frames: 30},
  {sfx: 'pop', scene: 'hook', beat: HOOK.openBeat + 0.5, frames: 30},
  {sfx: 'typing', scene: 'hook', beat: HOOK.typeBeat, frames: Math.ceil((HOOK.prompt.length * FPS) / HOOK.typeCps)},
  {sfx: 'click', scene: 'hook', beat: HOOK.clickBeat, frames: 30},
];

export type Shot = {beat: number; file: string; prompt: string; url: string; sticker: {x: number; y: number; rotate: number; color: StickerColor}};

// Each shot: an iridescent seam sweeps the page into the new look and the prompt lands as a sticker.
export const RESTYLE = {
  sweepFrames: 12,
  moveBeat: 2,
  panelFrames: [2, 5, 8, 11] as readonly number[], // first shot: panel shows step1, step2, step3, done after the drop
  punchBeats: [4, 8, 12, 16, 20, 24, 28] as readonly number[],
  headline: {beat: 2, text: 'Any website.\nAny vibe.'},
  sub: {beat: 4, text: 'Type a feeling. Watch the page\nchange to match.'},
  shots: [
    {beat: 0, file: 'github-y2k.png', prompt: HOOK.prompt, url: GITHUB, sticker: {x: 1210, y: 900, rotate: 5, color: 'magenta'}},
    {beat: 8, file: 'github-matrix.png', prompt: 'the Matrix', url: GITHUB, sticker: {x: 140, y: 640, rotate: -6, color: 'sun'}},
    {beat: 12, file: 'github-xp.png', prompt: 'Windows XP', url: GITHUB, sticker: {x: 1500, y: 110, rotate: 4, color: 'cyan'}},
    {beat: 14, file: 'github-cyberpunk.png', prompt: 'Cyberpunk 2077', url: GITHUB, sticker: {x: 1000, y: 96, rotate: -4, color: 'sun'}},
    {beat: 16, file: 'github-eink.png', prompt: 'ink on paper', url: GITHUB, sticker: {x: 1440, y: 780, rotate: 3, color: 'white'}},
    {beat: 18, file: 'linuxdo-paper.jpg', prompt: 'old newspaper', url: 'linux.do', sticker: {x: 470, y: 790, rotate: 4, color: 'white'}},
    {beat: 20, file: 'linuxdo-bauhaus.jpg', prompt: 'Bauhaus, please', url: 'linux.do', sticker: {x: 180, y: 920, rotate: -3, color: 'cyan'}},
    {beat: 22, file: 'linuxdo-cozy.jpg', prompt: 'cozy café vibes', url: 'linux.do', sticker: {x: 780, y: 960, rotate: -5, color: 'sun'}},
    {beat: 24, file: 'douban-eink.jpg', prompt: 'e-ink reader', url: 'book.douban.com', sticker: {x: 1540, y: 960, rotate: -4, color: 'white'}},
    {beat: 26, file: 'bilibili-paper.png', prompt: 'vintage gazette', url: 'www.bilibili.com', sticker: {x: 560, y: 650, rotate: 6, color: 'magenta'}},
  ] as readonly Shot[],
};
export const shotKey = (s: {file: string}) => s.file.replace(/\.(jpg|png)$/, '');
const RESTYLE_CUES: Cue[] = RESTYLE.shots.flatMap((s, i): Cue[] => [
  {sfx: i === 0 ? 'sparkle' : 'whoosh', scene: 'restyle', beat: s.beat, frames: i === 0 ? 90 : 40},
  {sfx: 'pop', scene: 'restyle', beat: s.beat, frames: 30},
]);

// Swatches are colors sampled from the gazette screenshot itself.
export const HOW = {
  headline: {beat: 0, text: 'Just describe it.\nIt does the rest.'},
  shot: RESTYLE.shots[RESTYLE.shots.length - 1],
  // The same page with the look switched off (same window, same feed); the seam turns it into the look on Apply Styles.
  original: 'bilibili-original.png',
  // The real tool cards View Page Structure, Search Page Elements and Apply Styles finish on these beats, then the reply.
  stepBeats: [4, 8, 12] as readonly number[],
  doneBeat: 14,
  swatches: ['#F4F0E7', '#B6B1A7', '#802520', '#1A1A18'] as readonly string[],
  fontSample: 'Aa',
};
const HOW_CUES: Cue[] = [
  ...HOW.stepBeats.map((b): Cue => ({sfx: 'check', scene: 'how', beat: b, frames: 60})),
  {sfx: 'done', scene: 'how', beat: HOW.doneBeat, frames: 60},
];

export const SAVE = {
  savedBeat: 0,
  fanBeats: [2, 2.5, 3, 3.5] as readonly number[],
  swayBeats: [4, 8, 12] as readonly number[],
  headline: {beat: 4, text: 'Save a look.\nUse it anywhere.'},
  savedLabel: 'Saved',
  saved: {file: 'bilibili-paper.png', name: 'Vintage Gazette'},
  // The same saved look on other websites, named by site.
  others: [
    {file: 'deepseek-paper.png', name: 'deepseek.com'},
    {file: 'github-paper.png', name: 'github.com'},
    {file: 'x-paper.png', name: 'x.com'},
    {file: 'linuxdo-paper.jpg', name: 'linux.do'},
  ] as readonly {file: string; name: string}[],
};
const SAVE_CUES: Cue[] = [SAVE.savedBeat, ...SAVE.fanBeats].map((b): Cue => ({sfx: 'pop', scene: 'save', beat: b, frames: 30}));

export const MOSAIC = {
  tileBeats: RESTYLE.shots.map((_, k) => k / 4), // one tile per sixteenth note
  punchBeats: [0, 4, 8] as readonly number[],
  headline: {beat: 4, text: 'Make the web\nfeel like yours.'},
};
const MOSAIC_CUES: Cue[] = MOSAIC.tileBeats.filter(Number.isInteger).map((b): Cue => ({sfx: 'pop', scene: 'mosaic', beat: b, frames: 30}));

export const END = {
  logoBeat: 0,
  sweepFrames: 16,
  name: {beat: 1, text: 'StyleSwift'},
  tagline: {beat: 2, text: 'Restyle any website with one sentence.'},
  cta: {beat: 4, text: 'Free on the Chrome Web Store'},
  note: {beat: 4.5, text: 'Works with Claude Code, Codex and more.'},
};
const END_CUES: Cue[] = [
  {sfx: 'shine', scene: 'end', beat: END.logoBeat, frames: 60},
  {sfx: 'pop', scene: 'end', beat: END.cta.beat, frames: 30},
];

export const HEADLINES: readonly (Line & {scene: SceneName})[] = [
  {scene: 'restyle', ...RESTYLE.headline},
  {scene: 'restyle', ...RESTYLE.sub},
  {scene: 'how', ...HOW.headline},
  {scene: 'save', ...SAVE.headline},
  {scene: 'mosaic', ...MOSAIC.headline},
  {scene: 'end', ...END.name},
  {scene: 'end', ...END.tagline},
  {scene: 'end', ...END.cta},
  {scene: 'end', ...END.note},
];

export const CUES: readonly Cue[] = [...HOOK_CUES, ...RESTYLE_CUES, ...HOW_CUES, ...SAVE_CUES, ...MOSAIC_CUES, ...END_CUES];

const FIRST = shotKey(RESTYLE.shots[0]);
// Every panel screenshot the film shows, so a test can check they were all captured.
export const PANEL_FILES: readonly string[] = [
  panelFile(FIRST, 'empty'),
  ...Array.from({length: HOOK.prompt.length}, (_, i) => typedFile(FIRST, i + 1)),
  ...['sent', 'step1', 'step2', 'step3'].map((state) => panelFile(FIRST, state)),
  ...RESTYLE.shots.map((s) => panelFile(shotKey(s), 'done')),
  ...['sent', 'step1', 'step2', 'step3', 'done'].map((state) => panelFile(shotKey(HOW.shot), state)),
];
export const cueFrame = (c: Cue) => sceneStart(c.scene) + at(c.scene, c.beat);
// Sounds start early by their lead (frames to their loudest moment), so the peak lands on the visual.
export const soundStart = (c: Cue) => cueFrame(c) - audio[c.sfx].lead;
