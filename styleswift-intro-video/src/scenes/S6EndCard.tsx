import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {END, HEADLINES} from '../script';
import {C, FONT} from '../theme';

export const S6EndCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 200}});
  return (
    <Scene style={{alignItems: 'center', justifyContent: 'center', gap: 28}}>
      <Img src={staticFile('logo.png')} style={{width: 150, height: 150, opacity: pop, transform: `scale(${0.85 + 0.15 * pop})`}} />
      <Headline text={END.name} at={END.nameAt} size={128} />
      {HEADLINES.end?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={48} />)}
      <Headline text={END.footer} at={END.footerAt} size={24} style={{marginTop: 24, fontFamily: FONT.mono, color: C.muted}} />
    </Scene>
  );
};
