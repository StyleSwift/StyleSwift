import type {CSSProperties} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';

type Props = {text: string; at: number; size?: number; style?: CSSProperties};

export const Headline = ({text, at, size = 88, style}: Props) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{fontFamily: FONT.serif, fontSize: size, lineHeight: 1.05, letterSpacing: '-0.01em', color: C.text, whiteSpace: 'nowrap', opacity: t, transform: `translateY(${(1 - t) * 12}px)`, ...style}}>
      {text}
    </div>
  );
};
