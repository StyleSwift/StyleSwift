import type {CSSProperties} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, POP} from '../theme';

type Props = {text: string; at: number; size: number; weight?: 500 | 800; style?: CSSProperties};

// Words spring up one after another, 3 frames apart; "\n" breaks lines.
export const Headline = ({text, at, size, weight = 800, style}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let index = 0;
  return (
    <div style={{fontFamily: FONT.display, fontWeight: weight, fontSize: size, lineHeight: weight === 800 ? 0.95 : 1.25, letterSpacing: weight === 800 ? '-0.04em' : '-0.01em', color: C.ink, ...style}}>
      {text.split('\n').map((line) => (
        <div key={line} style={{whiteSpace: 'nowrap'}}>
          {line.split(' ').map((word, i) => {
            const s = spring({frame: frame - at - 3 * index++, fps, config: POP});
            return (
              <span key={i}>
                {i > 0 && ' '}
                <span style={{display: 'inline-block', opacity: Math.min(1, s), transform: `translateY(${(1 - s) * 24}px)`}}>{word}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
