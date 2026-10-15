import type {CSSProperties, ReactNode} from 'react';
import {C, FONT} from '../theme';

export const BAR = 48; // title bar height, including its 2px rule

type Props = {url: string; width: number; height: number; children: ReactNode; style?: CSSProperties};

export const Window = ({url, width, height, children, style}: Props) => (
  <div
    style={{position: 'absolute', width, height, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 26, background: C.white, boxShadow: `0 40px 80px -20px rgba(60,20,120,.35), 0 0 0 2px ${C.ink}`, ...style}}
  >
    <div style={{height: BAR, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', borderBottom: `2px solid ${C.ink}`}}>
      <div style={{display: 'flex', gap: 8}}>
        {[C.magenta, C.sun, C.cyan].map((c) => (
          <span key={c} style={{width: 13, height: 13, boxSizing: 'border-box', borderRadius: '50%', border: `2px solid ${C.ink}`, background: c}} />
        ))}
      </div>
      <div style={{fontFamily: FONT.ui, fontSize: 16, color: C.inkSoft}}>{url}</div>
    </div>
    <div style={{flex: 1, minHeight: 0, display: 'flex'}}>{children}</div>
  </div>
);
