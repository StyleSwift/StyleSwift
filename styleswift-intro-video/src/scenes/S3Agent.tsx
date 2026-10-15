import {interpolate, useCurrentFrame} from 'remotion';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {Shot} from '../components/Shot';
import {TermLines} from '../components/TermLines';
import {Terminal} from '../components/Terminal';
import {AGENT, HEADLINES} from '../script';
import {C} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const CSS_LINE = 34;
const CSS_VISIBLE = 4;

const CssScroll = () => {
  const frame = useCurrentFrame();
  if (frame < AGENT.cssAt) return null;
  const y = interpolate(frame, [AGENT.cssAt, AGENT.cssAt + AGENT.cssLen], [0, -(AGENT.css.length - CSS_VISIBLE) * CSS_LINE], clamp);
  return (
    <div style={{height: CSS_LINE * CSS_VISIBLE, overflow: 'hidden', margin: '6px 0 10px 64px', paddingLeft: 16, borderLeft: `2px solid ${C.line}`}}>
      <div style={{transform: `translateY(${y}px)`, fontSize: 20, lineHeight: `${CSS_LINE}px`, color: C.muted}}>
        {AGENT.css.map((line, i) => (
          <div key={i} style={{whiteSpace: 'pre'}}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

const Thumb = () => {
  const frame = useCurrentFrame();
  const scanning = frame >= AGENT.scanAt && frame <= AGENT.scanAt + AGENT.scanLen;
  const top = interpolate(frame, [AGENT.scanAt, AGENT.scanAt + AGENT.scanLen], [0, 100], clamp);
  return (
    <div style={{position: 'relative', width: 600, height: 375, overflow: 'hidden', borderRadius: 12, border: `1px solid ${C.line}`}}>
      <Shot file={AGENT.thumb} />
      {scanning && <div style={{position: 'absolute', left: 0, right: 0, top: `${top}%`, height: 3, background: C.accent, boxShadow: `0 0 24px ${C.accent}`}} />}
    </div>
  );
};

export const S3Agent = () => (
  <Scene>
    <div style={{position: 'absolute', left: 120, top: 150, width: 600}}>
      <Thumb />
      <div style={{marginTop: 64, display: 'flex', flexDirection: 'column', gap: 18}}>
        {HEADLINES.agent?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={64} />)}
      </div>
    </div>
    <Terminal title="styleswift · agent" style={{position: 'absolute', left: 780, top: 150, width: 1020, height: 780}}>
      <TermLines lines={AGENT.before} cps={AGENT.cps} />
      <CssScroll />
      <TermLines lines={AGENT.after} cps={AGENT.cps} />
    </Terminal>
  </Scene>
);
