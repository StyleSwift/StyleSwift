// Every on-screen word and every frame timing lives here, so copy edits never touch scene code.
// Frame numbers are relative to the start of their scene (30 fps).

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
