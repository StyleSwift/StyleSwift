import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Sticker} from '../components/Sticker';
import {END, WIDTH, at} from '../script';
import {C, FONT, IRIDESCENT_CORE, POP} from '../theme';

const LOGO = 200;
const logo = staticFile('logo.png');
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S6End = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logoAt = at('end', END.logoBeat);
  const pop = spring({frame: frame - logoAt, fps, config: POP});
  const sweep = interpolate(frame - logoAt, [0, END.sweepFrames], [-80, LOGO + 80], clamp);
  const centered = {position: 'absolute', left: 0, right: 0, textAlign: 'center'} as const;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: (WIDTH - LOGO) / 2, top: 150, width: LOGO, height: LOGO, transform: `scale(${pop})`}}>
        <Img src={logo} style={{width: LOGO, height: LOGO}} />
        {frame - logoAt < END.sweepFrames && (
          // Masked by the logo's own alpha, so the shine crosses the butterfly instead of a box around it.
          <div style={{position: 'absolute', inset: 0, overflow: 'hidden', WebkitMaskImage: `url(${logo})`, maskImage: `url(${logo})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%'}}>
            <div style={{position: 'absolute', top: -20, bottom: -20, left: sweep, width: 50, background: IRIDESCENT_CORE, filter: 'blur(6px)', opacity: 0.95, transform: 'skewX(-12deg)'}} />
          </div>
        )}
      </div>
      <Headline text={END.name.text} at={at('end', END.name.beat)} size={150} style={{...centered, top: 390}} />
      <Headline text={END.tagline.text} at={at('end', END.tagline.beat)} size={52} weight={500} style={{...centered, top: 560}} />
      <div style={{position: 'absolute', top: 680, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Sticker text={END.cta.text} at={at('end', END.cta.beat)} color="sun" size={36} style={{position: 'relative'}} />
      </div>
      <Headline text={END.note.text} at={at('end', END.note.beat)} size={26} weight={500} style={{...centered, top: 800, fontFamily: FONT.ui, color: C.inkSoft}} />
    </AbsoluteFill>
  );
};
