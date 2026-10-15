// Every on-screen word and every frame timing lives here, so copy edits never touch scene code.
// Frame numbers are relative to the start of their scene (30 fps).

import {cutStarts} from './lib/timing';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES = {hook: 120, restyle: 270, agent: 300, skills: 210, engines: 240, end: 210} as const;
export type SceneName = keyof typeof SCENES;
export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);

export type Shot = {file: string; prompt: string; url: string};

const GITHUB = 'github.com/StyleSwift/StyleSwift';

// Real screenshots from images/, in playback order for the restyle montage.
export const ORIGINAL_SHOT = 'github-original.jpg';
export const SHOTS: readonly Shot[] = [
  {file: 'github-matrix.jpg', prompt: 'make this look like The Matrix', url: GITHUB},
  {file: 'github-xp.jpg', prompt: 'Windows XP', url: GITHUB},
  {file: 'github-y2k.jpg', prompt: 'Y2K', url: GITHUB},
  {file: 'linuxdo-newspaper.jpg', prompt: 'old newspaper', url: 'linux.do'},
  {file: 'linuxdo-bauhaus.jpg', prompt: 'Bauhaus', url: 'linux.do'},
  {file: 'linuxdo-cozy.jpg', prompt: 'cozy and warm', url: 'linux.do'},
  {file: 'douban-eink.jpg', prompt: 'e-ink reader', url: 'book.douban.com'},
  {file: 'bilibili-wes.jpg', prompt: 'Wes Anderson', url: 'www.bilibili.com'},
];

export const HOOK = {prompt: SHOTS[0].prompt, typeAt: 30, cps: 30, enterAt: 80, fadeAt: 100};

export type Headline = {text: string; at: number};

export const HEADLINES: {[K in SceneName]?: readonly Headline[]} = {
  restyle: [{text: 'One sentence. Any website.', at: 100}],
};

// The first shot wipes in over the original page; the rest hard-cut, faster each time (1.2s → 0.6s).
export const RESTYLE = {wipeAt: 60, wipeLen: 24, starts: cutStarts(SHOTS.length, 36, 18)};

// Tool card labels, from extension/_locales/en/messages.json.
export const PANEL_CARDS: readonly string[] = ['View Page Structure', 'Search Page Elements', 'Apply Styles'];
