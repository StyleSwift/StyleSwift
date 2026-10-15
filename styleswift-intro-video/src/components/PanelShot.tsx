import type {CSSProperties} from 'react';
import {Img, staticFile} from 'remotion';
import {PANEL_W} from '../layout';
import {C} from '../theme';

// A screenshot of the real side panel (scripts/capture-panel.cjs), pinned top-left so a shorter slot crops the bottom.
export const PanelShot = ({file, width = PANEL_W, style}: {file: string; width?: number; style?: CSSProperties}) => (
  <div style={{position: 'relative', width, flexShrink: 0, overflow: 'hidden', borderLeft: `1px solid ${C.panelLine}`, background: C.white, ...style}}>
    <Img src={staticFile(`panel/${file}`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left top'}} />
  </div>
);
