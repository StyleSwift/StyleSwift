import {AbsoluteFill, Series} from 'remotion';
import {Grain} from './components/Grain';
import {S1Hook} from './scenes/S1Hook';
import {SCENES} from './script';
import {C} from './theme';

export const Promo = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Series>
      <Series.Sequence durationInFrames={SCENES.hook}>
        <S1Hook />
      </Series.Sequence>
    </Series>
    <Grain />
  </AbsoluteFill>
);
