import {describe, expect, it} from 'vitest';
import {activeIndex, cutStarts, typedText} from './timing';

describe('typedText', () => {
  it('shows nothing before typing starts', () => {
    expect(typedText('abcdef', 0, 30, 30)).toBe('');
    expect(typedText('abcdef', -10, 30, 30)).toBe('');
  });
  it('reveals cps characters per second', () => {
    expect(typedText('abcdef', 2, 30, 30)).toBe('ab');
    expect(typedText('abcdef', 1, 30, 60)).toBe('ab');
  });
  it('never overruns the text', () => {
    expect(typedText('abcdef', 999, 30, 30)).toBe('abcdef');
  });
});

describe('cutStarts', () => {
  it('shrinks gaps linearly from first to last', () => {
    expect(cutStarts(8, 36, 18)).toEqual([0, 36, 69, 99, 126, 150, 171, 189]);
  });
  it('handles two shots', () => {
    expect(cutStarts(2, 30, 10)).toEqual([0, 30]);
  });
});

describe('activeIndex', () => {
  const starts = [0, 36, 69];
  it('picks the last shot that has started', () => {
    expect(activeIndex(starts, -5)).toBe(0);
    expect(activeIndex(starts, 35)).toBe(0);
    expect(activeIndex(starts, 36)).toBe(1);
    expect(activeIndex(starts, 500)).toBe(2);
  });
});
