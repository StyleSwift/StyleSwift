// Every on-screen word and every frame timing lives here, so copy edits never touch scene code.
// Frame numbers are relative to the start of their scene (30 fps).

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES = {hook: 120, restyle: 270, agent: 300, skills: 210, engines: 240, end: 210} as const;
export type SceneName = keyof typeof SCENES;
export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);
