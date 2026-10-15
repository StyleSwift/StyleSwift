import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import audio from './audio.json';
import {CUES, END, FPS, HEADLINES, HOOK, HOW, MOSAIC, MUSIC, MUSIC_TRIM_BEFORE, ORIGINAL_SHOT, RESTYLE, SAVE, SCENE_BEATS, SCENE_ORDER, TOTAL_FRAMES, at, beat, cueFrame, sceneLength, sceneStart} from './script';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

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

describe('hook', () => {
  it('types the prompt fully before the click', () => {
    const typingEnd = at('hook', HOOK.typeBeat) + Math.ceil((HOOK.prompt.length * FPS) / HOOK.typeCps);
    expect(typingEnd + 5).toBeLessThanOrEqual(at('hook', HOOK.clickBeat));
    expect(HOOK.clickBeat).toBeLessThan(SCENE_BEATS.restyle - SCENE_BEATS.hook);
  });

  it('plays typing and click sounds', () => {
    expect(CUES.filter((c) => c.scene === 'hook').map((c) => c.sfx)).toEqual(['typing', 'click']);
  });
});

describe('assets', () => {
  it('every referenced image exists in public/', () => {
    const files = ['logo.png', `shots/${ORIGINAL_SHOT}`, ...RESTYLE.shots.map((s) => `shots/${s.file}`), ...[SAVE.saved, ...SAVE.others].map((c) => `shots/${c.file}`)];
    for (const f of files) expect(existsSync(publicDir + f), f).toBe(true);
  });
});

const WORDS_PER_SECOND = 3;
const POP_IN = 15;

describe('copy', () => {
  it('every headline stays on screen long enough to read', () => {
    for (const h of HEADLINES) {
      const words = h.text.split(/\s+/).length;
      const onScreen = sceneLength(h.scene) - at(h.scene, h.beat);
      expect(onScreen, h.text).toBeGreaterThanOrEqual(Math.ceil((words / WORDS_PER_SECOND) * FPS) + POP_IN);
    }
  });
});

describe('restyle', () => {
  it('opens on the prompt typed in the hook', () => {
    expect(RESTYLE.shots[0].prompt).toBe(HOOK.prompt);
    expect(RESTYLE.shots[0].beat).toBe(0);
  });

  it('finishes each seam sweep before the next shot and keeps shots in order', () => {
    RESTYLE.shots.forEach((s, i) => {
      const next = RESTYLE.shots[i + 1]?.beat ?? SCENE_BEATS.how - SCENE_BEATS.restyle;
      expect(at('restyle', s.beat) + RESTYLE.sweepFrames, s.file).toBeLessThanOrEqual(at('restyle', next));
    });
  });

  it('plays a sparkle on the drop, then a whoosh per shot, with a pop for every sticker', () => {
    const cues = CUES.filter((c) => c.scene === 'restyle');
    expect(cues.filter((c) => c.sfx === 'sparkle').map((c) => c.beat)).toEqual([0]);
    expect(cues.filter((c) => c.sfx === 'whoosh')).toHaveLength(RESTYLE.shots.length - 1);
    expect(cues.filter((c) => c.sfx === 'pop')).toHaveLength(RESTYLE.shots.length);
  });
});

describe('how', () => {
  it('explains the look the montage ended on', () => {
    expect(HOW.shot).toBe(RESTYLE.shots[RESTYLE.shots.length - 1]);
  });

  it('lights one step per bar and chimes for each', () => {
    expect(HOW.stepBeats).toEqual([4, 8, 12]);
    expect(CUES.filter((c) => c.scene === 'how').map((c) => c.sfx)).toEqual(['check', 'check', 'done']);
  });
});

describe('save', () => {
  it('saves the look the montage ended on', () => {
    expect(SAVE.saved.file).toBe(RESTYLE.shots[RESTYLE.shots.length - 1].file);
  });

  it('pops every card in with a sound, before the headline', () => {
    const pops = CUES.filter((c) => c.scene === 'save' && c.sfx === 'pop');
    expect(pops).toHaveLength(1 + SAVE.others.length);
    expect(Math.max(...SAVE.fanBeats)).toBeLessThan(SAVE.headline.beat);
  });
});

describe('finale', () => {
  it('pops one tile per shot and a sound on each whole beat', () => {
    expect(MOSAIC.tileBeats).toHaveLength(RESTYLE.shots.length);
    expect(CUES.filter((c) => c.scene === 'mosaic').map((c) => c.beat)).toEqual([0, 1, 2, 3]);
  });

  it('puts the call to action on the last hit of the music', () => {
    expect(SCENE_BEATS.end + END.cta.beat).toBe(MUSIC.lastHitBeat);
    expect(CUES.filter((c) => c.scene === 'end').map((c) => c.sfx)).toEqual(['shine']);
  });

  it('mentions the local engines only in the end-card note', () => {
    expect(END.note.text).toMatch(/Claude Code/);
    expect(HEADLINES.filter((h) => /Claude Code|Codex/.test(h.text))).toEqual([{scene: 'end', ...END.note}]);
  });
});
