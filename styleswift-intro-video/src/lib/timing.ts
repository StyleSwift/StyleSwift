// Pure frame math, free of Remotion imports so vitest can run it in Node.

export const beatFrame = (beat: number, fps: number, bpm: number): number => Math.round((beat * 60 * fps) / bpm);

export const typedText = (text: string, frame: number, fps: number, cps: number): string => {
  if (frame <= 0) return '';
  return text.slice(0, Math.floor((frame * cps) / fps));
};

export const activeIndex = (starts: readonly number[], frame: number): number => {
  let idx = 0;
  starts.forEach((s, i) => {
    if (frame >= s) idx = i;
  });
  return idx;
};

// Triangle pulse: 0 → 1 over `rise` frames, back to 0 by `fall`. Used for on-beat punches.
export const bump = (frame: number, rise = 3, fall = 8): number => {
  if (frame <= 0 || frame >= fall) return 0;
  return frame <= rise ? frame / rise : 1 - (frame - rise) / (fall - rise);
};

// Blur radius for an element that moved `delta` px since the last frame: reads as motion blur at no render cost.
export const speedBlur = (delta: number, pxPerUnit = 12, max = 14): number => Math.min(max, Math.abs(delta) / pxPerUnit);
