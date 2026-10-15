import {describe, expect, it} from 'vitest';
import {FPS, TOTAL_FRAMES} from './script';

describe('script', () => {
  it('runs exactly 45 seconds', () => {
    expect(TOTAL_FRAMES).toBe(45 * FPS);
  });
});
