import {AbsoluteFill, Series} from 'remotion';
import {Grain} from './components/Grain';
import {S1Hook} from './scenes/S1Hook';
import {S2Restyle} from './scenes/S2Restyle';
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
    </Series>
    <Grain />
  </AbsoluteFill>
);
