import {describe, expect, it} from 'vitest';
import {FPS, TOTAL_FRAMES} from './script';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {HEADLINES, HOOK, ORIGINAL_SHOT, RESTYLE, SCENES, SHOTS, type SceneName} from './script';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

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
});
