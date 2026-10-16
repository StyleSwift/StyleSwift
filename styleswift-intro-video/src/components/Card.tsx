import type {CSSProperties} from 'react';
import {C, FONT} from '../theme';
import {Shot} from './Shot';

export const CARD = {width: 300, height: 256};

// labelEnd puts the name at the right end of the label, for cards whose left edge sits under another card.
export const Card = ({file, name, badge, labelEnd = false, style}: {file: string; name: string; badge?: string; labelEnd?: boolean; style?: CSSProperties}) => (
  <div
    style={{position: 'absolute', width: CARD.width, height: CARD.height, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 22, border: `2.5px solid ${C.ink}`, boxShadow: `5px 6px 0 ${C.ink}`, background: C.white, ...style}}
  >
    <div style={{position: 'relative', flex: 1}}>
      <Shot file={file} />
    </div>
    <div style={{height: 62, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: labelEnd ? 'flex-end' : 'space-between', padding: '0 16px', borderTop: `2.5px solid ${C.ink}`, fontFamily: FONT.display, fontWeight: 800, fontSize: 25, color: C.ink, whiteSpace: 'nowrap'}}>
      {name}
      {badge && <span style={{padding: '4px 10px', borderRadius: 999, border: `2px solid ${C.ink}`, background: C.sun, fontFamily: FONT.ui, fontWeight: 600, fontSize: 14}}>{badge}</span>}
    </div>
  </div>
);
