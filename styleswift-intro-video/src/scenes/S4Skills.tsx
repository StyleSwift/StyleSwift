import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bubble} from '../components/Bubble';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {TermLines} from '../components/TermLines';
import {Terminal} from '../components/Terminal';
import {HEADLINES, SKILLS} from '../script';
import {C, FONT} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const fadeFrom = (frame: number, at: number) => interpolate(frame, [at, at + 12], [0, 1], clamp);

const SkillList = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [SKILLS.listAt, SKILLS.listAt + 15], [-16, 0], clamp);
  return (
    <div style={{opacity: fadeFrom(frame, SKILLS.listAt), fontFamily: FONT.sans, color: C.text}}>
      <div style={{marginBottom: 14, fontSize: 18, color: C.muted}}>Style skills</div>
      {SKILLS.list.map((name, i) => (
        <div
          key={name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 10,
            padding: '14px 18px',
            borderRadius: 10,
            border: `1px solid ${i === 0 ? C.accent : C.line}`,
            background: i === 0 ? C.accentSoft : 'transparent',
            fontSize: 22,
            transform: i === 0 ? `translateY(${slide}px)` : undefined,
          }}
        >
          {name}
          {i === 0 && <span style={{fontSize: 16, color: C.accent}}>new</span>}
        </div>
      ))}
      <div style={{display: 'flex', gap: 12, marginTop: 18, opacity: fadeFrom(frame, SKILLS.ioAt)}}>
        {SKILLS.io.map((label) => (
          <div key={label} style={{padding: '10px 16px', borderRadius: 20, border: `1px solid ${C.line}`, fontFamily: FONT.mono, fontSize: 18, color: C.muted}}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export const S4Skills = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: frame - SKILLS.cardAt, fps, config: {damping: 200}});
  return (
    <Scene>
      <div style={{position: 'absolute', top: 90, width: '100%', display: 'flex', justifyContent: 'center'}}>
        {HEADLINES.skills?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={76} />)}
      </div>
      <div style={{position: 'absolute', left: 140, top: 370, width: 560, display: 'flex', flexDirection: 'column', gap: 24}}>
        <div style={{display: 'flex', flexDirection: 'column', opacity: fadeFrom(frame, SKILLS.promptAt)}}>
          <Bubble text={SKILLS.prompt} fontSize={24} />
        </div>
        <div style={{fontFamily: FONT.mono, fontSize: 22, lineHeight: 1.6}}>
          <TermLines lines={SKILLS.lines} cps={SKILLS.cps} />
        </div>
      </div>
      {frame >= SKILLS.cardAt && (
        <Terminal title="the-matrix.md" style={{position: 'absolute', left: 740, top: 340, width: 580, fontSize: 20, opacity: pop, transform: `scale(${0.92 + 0.08 * pop})`}}>
          {SKILLS.card.map((line, i) => (
            <div key={i} style={{whiteSpace: 'pre', color: line.startsWith('#') || line.startsWith('name') ? C.text : C.muted}}>
              {line}
            </div>
          ))}
        </Terminal>
      )}
      <div style={{position: 'absolute', left: 1340, top: 340, width: 440}}>
        <SkillList />
      </div>
    </Scene>
  );
};
