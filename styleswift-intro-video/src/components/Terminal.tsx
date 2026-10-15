import type {CSSProperties, ReactNode} from 'react';
import {C, FONT} from '../theme';
import {Dots} from './Dots';

type Props = {title?: string; style?: CSSProperties; children: ReactNode};

export const Terminal = ({title = 'styleswift', style, children}: Props) => (
  <div style={{overflow: 'hidden', borderRadius: 16, background: C.panel, border: `1px solid ${C.line}`, boxShadow: '0 30px 80px rgba(0,0,0,0.45)', color: C.text, fontFamily: FONT.mono, fontSize: 26, lineHeight: 1.6, ...style}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: `1px solid ${C.line}`, color: C.muted, fontSize: 18}}>
      <Dots />
      {title}
    </div>
    <div style={{padding: '28px 36px'}}>{children}</div>
  </div>
);
