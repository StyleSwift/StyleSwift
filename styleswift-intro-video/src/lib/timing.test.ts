import {describe, expect, it} from 'vitest';
import {activeIndex, beatFrame, bump, speedBlur, typedText} from './timing';

describe('beatFrame', () => {
  it('maps 128 BPM beats onto 30 fps frames', () => {
    expect(beatFrame(96, 30, 128)).toBe(1350);
    expect(beatFrame(8, 30, 128)).toBe(113);
    expect(beatFrame(2.5, 30, 128)).toBe(35);
  });
});

describe('typedText', () => {
  it('shows nothing before typing starts', () => {
    expect(typedText('abcdef', 0, 30, 30)).toBe('');
    expect(typedText('abcdef', -10, 30, 30)).toBe('');
  });
  it('reveals cps characters per second and never overruns', () => {
    expect(typedText('abcdef', 2, 30, 30)).toBe('ab');
    expect(typedText('abcdef', 999, 30, 30)).toBe('abcdef');
  });
});

describe('activeIndex', () => {
  it('picks the last shot that has started', () => {
    expect(activeIndex([0, 36, 69], -5)).toBe(0);
    expect(activeIndex([0, 36, 69], 36)).toBe(1);
    expect(activeIndex([0, 36, 69], 500)).toBe(2);
  });
});

describe('bump', () => {
  it('rises to 1 and falls back to 0', () => {
    expect(bump(-1)).toBe(0);
    expect(bump(0)).toBe(0);
    expect(bump(3)).toBe(1);
    expect(bump(5.5)).toBeCloseTo(0.5);
    expect(bump(8)).toBe(0);
    expect(bump(20)).toBe(0);
  });
});

describe('speedBlur', () => {
  it('grows with speed in either direction and is capped', () => {
    expect(speedBlur(0)).toBe(0);
    expect(speedBlur(24)).toBe(2);
    expect(speedBlur(-24)).toBe(2);
    expect(speedBlur(1000)).toBe(14);
  });
});
