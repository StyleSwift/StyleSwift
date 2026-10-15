import {AbsoluteFill, Series} from 'remotion';
import {Grain} from './components/Grain';
import {S1Hook} from './scenes/S1Hook';
import {S2Restyle} from './scenes/S2Restyle';
import {S3Agent} from './scenes/S3Agent';
import {S4Skills} from './scenes/S4Skills';
import {S5Engines} from './scenes/S5Engines';
import {S6EndCard} from './scenes/S6EndCard';
import {SCENES} from './script';
import {C} from './theme';

export const Promo = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Series>
      <Series.Sequence durationInFrames={SCENES.hook}>
        <S1Hook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.restyle}>
        <S2Restyle />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.agent}>
        <S3Agent />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.skills}>
        <S4Skills />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.engines}>
        <S5Engines />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.end}>
        <S6EndCard />
      </Series.Sequence>
    </Series>
    <Grain />
  </AbsoluteFill>
);
