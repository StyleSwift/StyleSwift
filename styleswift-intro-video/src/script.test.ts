import {describe, expect, it} from 'vitest';
import {FPS, TOTAL_FRAMES} from './script';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ORIGINAL_SHOT, SHOTS} from './script';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

describe('script', () => {
  it('runs exactly 45 seconds', () => {
    expect(TOTAL_FRAMES).toBe(45 * FPS);
  });

  it('every referenced image exists in public/', () => {
    const files = ['logo.png', `shots/${ORIGINAL_SHOT}`, ...SHOTS.map((s) => `shots/${s.file}`)];
    for (const f of files) expect(existsSync(publicDir + f), f).toBe(true);
  });
});
