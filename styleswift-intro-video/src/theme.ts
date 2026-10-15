import {loadFont as loadDisplay} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadUi} from '@remotion/google-fonts/Inter';
import type {StickerColor} from './script';

// Butterfly-logo colors on a lilac ground (style frame B).
export const C = {
  lilac: '#F1ECFF',
  ink: '#1B1033',
  inkSoft: '#5B4F73',
  magenta: '#FF5FA2',
  violet: '#8B5CF6',
  cyan: '#22D3EE',
  sun: '#FFD84D',
  white: '#FFFFFF',
  // Side panel, redrawn from the product's light theme.
  panelText: '#1D1D1F',
  panelMuted: '#86868B',
  panelLine: '#ECECF0',
  bubble: '#FDECE6',
  bubbleText: '#3A2219',
  ok: '#2E9D57',
  okSoft: '#E8F6EC',
  send: '#E8735A',
};

export const STICKER: Record<StickerColor, {bg: string; fg: string}> = {
  sun: {bg: C.sun, fg: C.ink},
  cyan: {bg: C.cyan, fg: C.ink},
  magenta: {bg: C.magenta, fg: C.white},
  white: {bg: C.white, fg: C.ink},
};

// The restyle seam (style frame A): a soft glow plus a bright core.
export const IRIDESCENT = `linear-gradient(180deg, ${C.magenta}, ${C.violet} 45%, ${C.cyan} 80%, ${C.sun})`;
export const IRIDESCENT_CORE = 'linear-gradient(180deg, #FFB3D4, #C4B5FD 45%, #A5F3FC 80%, #FFF1B8)';

export const FONT = {
  display: loadDisplay('normal', {weights: ['500', '800'], subsets: ['latin']}).fontFamily,
  ui: loadUi('normal', {weights: ['400', '500', '600'], subsets: ['latin']}).fontFamily,
};

// POP overshoots (stickers, cards, tiles); SETTLE glides to rest (windows, camera moves).
export const POP = {damping: 12, stiffness: 180};
export const SETTLE = {damping: 200};
