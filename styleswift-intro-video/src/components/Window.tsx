import type {CSSProperties, ReactNode} from 'react';
import {Img, staticFile} from 'remotion';
import {C, FONT} from '../theme';

export const BAR = 48; // title bar height, including its 2px rule
export const ICON = 32; // the pinned StyleSwift toolbar button, at the right end of the bar

type Props = {url: string; width: number; height: number; children: ReactNode; iconPressed?: boolean; style?: CSSProperties};

export const Window = ({url, width, height, children, iconPressed = false, style}: Props) => (
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
      <div
        style={{marginLeft: 'auto', width: ICON, height: ICON, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: iconPressed ? C.panelLine : 'transparent', transform: `scale(${iconPressed ? 0.86 : 1})`}}
      >
        <Img src={staticFile('logo.png')} style={{width: 22, height: 22}} />
      </div>
    </div>
    <div style={{flex: 1, minHeight: 0, display: 'flex'}}>{children}</div>
  </div>
);
