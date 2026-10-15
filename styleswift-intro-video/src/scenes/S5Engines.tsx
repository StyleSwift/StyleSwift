import {interpolate, useCurrentFrame} from 'remotion';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {TermLines} from '../components/TermLines';
import {Terminal} from '../components/Terminal';
import {activeIndex} from '../lib/timing';
import {ENGINES, HEADLINES} from '../script';
import {C, FONT} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const EngineMenu = ({picked}: {picked: number}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [ENGINES.menuAt, ENGINES.menuAt + 10], [0, 1], clamp);
  return (
    <div style={{opacity: t, transform: `translateY(${(1 - t) * 10}px)`, padding: 18, borderRadius: 14, background: C.panel, border: `1px solid ${C.line}`, fontFamily: FONT.sans}}>
      <div style={{marginBottom: 10, fontSize: 18, color: C.muted}}>{ENGINES.menuTitle}</div>
      {ENGINES.options.map((name, i) => (
        <div key={name} style={{display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, fontSize: 26, background: i === picked ? C.accentSoft : 'transparent', color: i === picked ? C.text : C.muted}}>
          {name}
          {i === picked && <span style={{color: C.accent}}>✓</span>}
        </div>
      ))}
    </div>
  );
};

export const S5Engines = () => {
  const frame = useCurrentFrame();
  const picked = activeIndex(ENGINES.picks, frame - ENGINES.menuAt);
  return (
    <Scene>
      <div style={{position: 'absolute', top: 90, width: '100%', display: 'flex', justifyContent: 'center'}}>
        {HEADLINES.engines?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={68} />)}
      </div>
      <Terminal title="~" style={{position: 'absolute', left: 160, top: 300, width: 900, height: 420}}>
        <TermLines lines={ENGINES.lines} cps={ENGINES.cps} />
      </Terminal>
      <div style={{position: 'absolute', left: 1160, top: 300, width: 600, display: 'flex', flexDirection: 'column', gap: 16}}>
        <div style={{height: 290}}>{frame >= ENGINES.menuAt && <EngineMenu picked={picked} />}</div>
        <div style={{height: 130, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 16, background: C.panel, border: `1px solid ${C.line}`, fontFamily: FONT.sans}}>
          <div style={{fontSize: 22, color: C.muted}}>{ENGINES.placeholder}</div>
          <div style={{alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 14, border: `1px solid ${C.line}`, fontSize: 18, color: C.text}}>
            {ENGINES.options[picked]} ▾
          </div>
        </div>
      </div>
    </Scene>
  );
};
