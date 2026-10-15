import type {ComponentType} from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {Backdrop} from './components/Backdrop';
import {S1Hook} from './scenes/S1Hook';
import {S2Restyle} from './scenes/S2Restyle';
import {S3How} from './scenes/S3How';
import {S4Save} from './scenes/S4Save';
import {SCENE_ORDER, type SceneName, sceneLength} from './script';
import {Soundtrack} from './Soundtrack';

const SCENES: Partial<Record<SceneName, ComponentType>> = {hook: S1Hook, restyle: S2Restyle, how: S3How, save: S4Save};

export const Promo = () => (
  <AbsoluteFill>
    <Backdrop />
    <Series>
      {SCENE_ORDER.map((name) => {
        const Scene = SCENES[name];
        return (
          <Series.Sequence key={name} durationInFrames={sceneLength(name)}>
            {Scene ? <Scene /> : null}
          </Series.Sequence>
        );
      })}
    </Series>
    <Soundtrack />
  </AbsoluteFill>
);
