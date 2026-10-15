import type {ComponentType} from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {Backdrop} from './components/Backdrop';
import {SCENE_ORDER, type SceneName, sceneLength} from './script';
import {Soundtrack} from './Soundtrack';

const SCENES: Partial<Record<SceneName, ComponentType>> = {};

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
