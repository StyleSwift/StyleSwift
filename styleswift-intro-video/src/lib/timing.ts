// Pure frame math, free of Remotion imports so vitest can run it in Node.

export const typedText = (text: string, frame: number, fps: number, cps: number): string => {
  if (frame <= 0) return '';
  return text.slice(0, Math.floor((frame * cps) / fps));
};

// Start frame of each shot; the gap between shots shrinks linearly from firstGap to lastGap.
export const cutStarts = (count: number, firstGap: number, lastGap: number): number[] => {
  const starts = [0];
  for (let i = 0; i < count - 1; i++) {
    const t = count > 2 ? i / (count - 2) : 0;
    starts.push(starts[i] + Math.round(firstGap + (lastGap - firstGap) * t));
  }
  return starts;
};

export const activeIndex = (starts: readonly number[], frame: number): number => {
  let idx = 0;
  starts.forEach((s, i) => {
    if (frame >= s) idx = i;
  });
  return idx;
};
