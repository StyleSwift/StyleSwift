import {AbsoluteFill} from 'remotion';
import {Grain} from './components/Grain';
import {C} from './theme';

export const Promo = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Grain />
  </AbsoluteFill>
);
