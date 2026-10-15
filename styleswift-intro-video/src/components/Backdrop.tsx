import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C} from '../theme';

// Four blurred blobs drifting on slow, different periods so the frame is never fully still.
const BLOBS = [
  {color: C.magenta, size: 700, x: -120, y: 520, dx: 70, dy: 40, period: 9},
  {color: C.cyan, size: 640, x: 1300, y: -200, dx: -60, dy: 60, period: 11},
  {color: C.sun, size: 520, x: 820, y: 700, dx: 80, dy: -40, period: 8},
  {color: C.violet, size: 600, x: 420, y: -260, dx: -50, dy: 50, period: 13},
];

export const Backdrop = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.lilac, overflow: 'hidden'}}>
      {BLOBS.map((b) => {
        const t = ((frame / fps) * 2 * Math.PI) / b.period;
        return (
          <div
            key={b.color}
            style={{position: 'absolute', left: b.x + Math.sin(t) * b.dx, top: b.y + Math.cos(t) * b.dy, width: b.size, height: b.size, borderRadius: '50%', background: b.color, filter: 'blur(110px)', opacity: 0.6}}
          />
        );
      })}
    </AbsoluteFill>
  );
};
