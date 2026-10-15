import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

// Every scene fades in over its first 8 frames so cuts never flash.
export const Scene = ({children, style}: {children: ReactNode; style?: CSSProperties}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity, ...style}}>{children}</AbsoluteFill>;
};
