import type {ReactNode} from 'react';
import {C, FONT} from '../theme';
import {Dots} from './Dots';

type Props = {url: string; width: number; height: number; children: ReactNode};

export const BrowserFrame = ({url, width, height, children}: Props) => (
  <div style={{width, height, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 14, background: C.panel, border: `1px solid ${C.line}`, boxShadow: '0 40px 100px rgba(0,0,0,0.5)'}}>
    <div style={{height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', borderBottom: `1px solid ${C.line}`}}>
      <Dots />
      <div style={{flex: 1, maxWidth: 640, height: 32, display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 16, background: C.bg, color: C.muted, fontFamily: FONT.sans, fontSize: 17}}>
        {url}
      </div>
    </div>
    <div style={{flex: 1, minHeight: 0, display: 'flex'}}>{children}</div>
  </div>
);
