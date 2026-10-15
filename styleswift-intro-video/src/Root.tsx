import {Composition} from 'remotion';
import {Promo} from './Promo';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './script';

export const RemotionRoot = () => (
  <Composition id="Promo" component={Promo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
