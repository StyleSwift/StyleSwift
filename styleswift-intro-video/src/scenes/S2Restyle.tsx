import {interpolate, useCurrentFrame} from 'remotion';
import {BrowserFrame} from '../components/BrowserFrame';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {Shot} from '../components/Shot';
import {SidePanel} from '../components/SidePanel';
import {activeIndex} from '../lib/timing';
import {HEADLINES, ORIGINAL_SHOT, RESTYLE, SHOTS} from '../script';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S2Restyle = () => {
  const frame = useCurrentFrame();
  const shot = SHOTS[activeIndex(RESTYLE.starts, frame - RESTYLE.wipeAt)];
  const scale = interpolate(frame, [0, 20], [1.06, 1], clamp);
  // Diagonal wipe: the leading edge leans 20% so the reveal reads as a sweep, not a slide.
  const edge = interpolate(frame, [RESTYLE.wipeAt, RESTYLE.wipeAt + RESTYLE.wipeLen], [0, 120], clamp);
  return (
    <Scene>
      <div style={{position: 'absolute', top: 56, width: '100%', display: 'flex', justifyContent: 'center'}}>
        {HEADLINES.restyle?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={76} />)}
      </div>
      <div style={{position: 'absolute', left: 140, top: 190, transform: `scale(${scale})`}}>
        <BrowserFrame url={shot.url} width={1640} height={848}>
          <div style={{position: 'relative', flex: 1}}>
            <Shot file={ORIGINAL_SHOT} />
            <Shot file={shot.file} style={{clipPath: `polygon(0% 0%, ${edge}% 0%, ${edge - 20}% 100%, 0% 100%)`}} />
          </div>
          <SidePanel prompt={shot.prompt} domain={shot.url.split('/')[0]} />
        </BrowserFrame>
      </div>
    </Scene>
  );
};
