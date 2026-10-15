import {describe, expect, it} from 'vitest';
import audio from './audio.json';
import {CUES, MUSIC, MUSIC_TRIM_BEFORE, SCENE_BEATS, SCENE_ORDER, TOTAL_FRAMES, at, beat, cueFrame, sceneLength, sceneStart} from './script';

describe('timeline', () => {
  it('runs 96 beats, exactly 45 seconds', () => {
    expect(TOTAL_FRAMES).toBe(1350);
  });

  it('scenes tile the film in order with no gaps', () => {
    expect([...SCENE_ORDER]).toEqual(Object.keys(SCENE_BEATS));
    expect(SCENE_ORDER.reduce((sum, s) => sum + sceneLength(s), 0)).toBe(TOTAL_FRAMES);
  });

  it('starts the music on the planned track beat and lands the drop on the second scene', () => {
    expect(MUSIC_TRIM_BEFORE).toBe(2375);
    expect(SCENE_BEATS.restyle).toBe(MUSIC.dropBeat);
  });

  it('scene-relative beats land on the absolute beat grid', () => {
    for (const s of SCENE_ORDER) {
      for (const b of [0, 0.5, 1, 2.5, 4]) expect(sceneStart(s) + at(s, b), `${s}@${b}`).toBe(beat(SCENE_BEATS[s] + b));
    }
  });
});

describe('sound', () => {
  it('every cue plays inside the film', () => {
    for (const c of CUES) {
      expect(cueFrame(c), `${c.sfx}@${c.scene}`).toBeGreaterThanOrEqual(0);
      expect(cueFrame(c) + c.frames, `${c.sfx}@${c.scene}`).toBeLessThanOrEqual(TOTAL_FRAMES);
    }
  });

  it('every cue has a sound file with a sane volume', () => {
    for (const [key, item] of Object.entries(audio)) {
      expect(item.file, key).toMatch(/\.mp3$/);
      expect(item.volume, key).toBeGreaterThan(0);
      expect(item.volume, key).toBeLessThanOrEqual(1);
    }
    for (const c of CUES) expect(Object.keys(audio)).toContain(c.sfx);
  });
});
