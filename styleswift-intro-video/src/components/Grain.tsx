import {AbsoluteFill} from 'remotion';

// Static film grain over the whole frame; SVG noise stays sharp at any resolution.
export const Grain = () => (
  <AbsoluteFill style={{pointerEvents: 'none', opacity: 0.07, mixBlendMode: 'soft-light'}}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);
