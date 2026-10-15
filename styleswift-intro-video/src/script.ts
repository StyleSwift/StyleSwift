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
  agent: [
    {text: 'It reads the page.', at: 15},
    {text: 'Writes the CSS.', at: 100},
    {text: 'Checks its own work.', at: 175},
  ],
};

// The first shot wipes in over the original page; the rest hard-cut, faster each time (1.2s → 0.6s).
export const RESTYLE = {wipeAt: 60, wipeLen: 24, starts: cutStarts(SHOTS.length, 36, 18)};

// Tool card labels, from extension/_locales/en/messages.json.
export const PANEL_CARDS: readonly string[] = ['View Page Structure', 'Search Page Elements', 'Apply Styles'];

export type TermLine = {at: number; kind: 'cmd' | 'call' | 'result' | 'warn' | 'ok' | 'check'; text: string};

// Tool names and argument shapes match extension/sidepanel/tools/; the numbers are illustrative.
export const AGENT = {
  cps: 60,
  thumb: SHOTS[0].file,
  scanAt: 185,
  scanLen: 30,
  cssAt: 110,
  cssLen: 50,
  before: [
    {at: 10, kind: 'call', text: 'get_page_structure()'},
    {at: 32, kind: 'result', text: 'header · repo-nav · file-list · readme · sidebar'},
    {at: 50, kind: 'call', text: 'grep(query: ".Box-row", scope: "subtree")'},
    {at: 75, kind: 'result', text: '14 matches'},
    {at: 92, kind: 'call', text: 'apply_styles(mode: "save")'},
    {at: 110, kind: 'result', text: '+128 lines of CSS'},
  ] as readonly TermLine[],
  after: [
    {at: 165, kind: 'call', text: 'QualityAudit · capture_screenshot()'},
    {at: 215, kind: 'warn', text: 'contrast 2.9:1 on .Link--muted'},
    {at: 230, kind: 'call', text: 'edit_css(old_css, new_css)'},
    {at: 252, kind: 'ok', text: 'contrast 7.4:1'},
  ] as readonly TermLine[],
  // .Link--muted is deliberately low-contrast so the QualityAudit beat has something to catch.
  css: [
    'body { background: #000 !important; }',
    'body, p, span { color: #00ff41 !important; }',
    '* { font-family: "JetBrains Mono", monospace !important; }',
    'a, .Link--primary { color: #39ff14 !important; }',
    '.Box-row { border-color: #0f3d0f !important; }',
    '.Header { background: #010a01 !important; }',
    '.btn { background: transparent !important; }',
    '.btn { border: 1px solid #00ff41 !important; }',
    '.Label { color: #00ff41 !important; }',
    '.Counter { background: #0a2a0a !important; }',
    '.Link--muted { color: #1f5f1f !important; }',
    '.markdown-body h1 { text-shadow: 0 0 8px #00ff41; }',
  ] as readonly string[],
};
