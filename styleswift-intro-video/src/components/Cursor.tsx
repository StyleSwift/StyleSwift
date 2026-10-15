import {C} from '../theme';

export const Cursor = ({x, y, pressed}: {x: number; y: number; pressed: boolean}) => (
  <svg viewBox="0 0 24 24" style={{position: 'absolute', left: x, top: y, width: 34, transformOrigin: '4px 3px', transform: `scale(${pressed ? 0.82 : 1})`, filter: 'drop-shadow(0 4px 6px rgba(27,16,51,.3))'}}>
    <path d="M3 2l7.5 19 2.2-7.3L20 11.5z" fill={C.ink} stroke={C.white} strokeWidth={1.5} strokeLinejoin="round" />
  </svg>
);
