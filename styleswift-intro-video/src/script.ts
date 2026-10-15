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

export const CUES: readonly Cue[] = [...HOOK_CUES];
export const cueFrame = (c: Cue) => sceneStart(c.scene) + at(c.scene, c.beat);
