import type {CSSProperties} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {StickerColor} from '../script';
import {C, FONT, POP, STICKER} from '../theme';

type Props = {text: string; at: number; color: StickerColor; rotate?: number; size?: number; style?: CSSProperties};

export const Sticker = ({text, at, color, rotate = 0, size = 30, style}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const s = spring({frame: frame - at, fps, config: POP});
  return (
    <div
      style={{position: 'absolute', padding: `${size * 0.45}px ${size * 0.85}px`, borderRadius: 999, border: `2.5px solid ${C.ink}`, boxShadow: `4px 5px 0 ${C.ink}`, background: STICKER[color].bg, color: STICKER[color].fg, fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap', transform: `rotate(${rotate}deg) scale(${s})`, ...style}}
    >
      {text}
    </div>
  );
};
