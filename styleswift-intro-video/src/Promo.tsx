import type {ComponentType, ReactNode} from 'react';
import {AbsoluteFill, Series, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from './components/Backdrop';
import {S1Hook} from './scenes/S1Hook';
import {S2Restyle} from './scenes/S2Restyle';
import {S3How} from './scenes/S3How';
import {S4Save} from './scenes/S4Save';
import {S5Mosaic} from './scenes/S5Mosaic';
import {S6End} from './scenes/S6End';
import {SCENE_ORDER, type SceneName, sceneLength} from './script';
import {Soundtrack} from './Soundtrack';

const SCENES: Record<SceneName, ComponentType> = {hook: S1Hook, restyle: S2Restyle, how: S3How, save: S4Save, mosaic: S5Mosaic, end: S6End};
// The hook flows straight into the restyle window and the end card holds, so neither shrinks away.
const NO_EXIT: readonly SceneName[] = ['hook', 'end'];
const EXIT_FRAMES = 6;

// Shrinks and fades a scene over its last frames, so every cut reads as out-then-in instead of a jump.
const Exit = ({length, children}: {length: number; children: ReactNode}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [length - EXIT_FRAMES, length], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: t, transform: `scale(${0.94 + 0.06 * t})`}}>{children}</AbsoluteFill>;
};

export const Promo = () => (
  <AbsoluteFill>
    <Backdrop />
    <Series>
      {SCENE_ORDER.map((name) => {
        const Scene = SCENES[name];
        const length = sceneLength(name);
        return (
          <Series.Sequence key={name} durationInFrames={length}>
            {NO_EXIT.includes(name) ? <Scene /> : <Exit length={length}><Scene /></Exit>}
          </Series.Sequence>
        );
      })}
    </Series>
    <Soundtrack />
  </AbsoluteFill>
);
