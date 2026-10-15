import type {CSSProperties} from 'react';
import {Img, staticFile} from 'remotion';

// Fills its position:relative parent; screenshots keep their top-left corner and are never stretched.
export const Shot = ({file, style}: {file: string; style?: CSSProperties}) => (
  <Img src={staticFile(`shots/${file}`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left top', ...style}} />
);
