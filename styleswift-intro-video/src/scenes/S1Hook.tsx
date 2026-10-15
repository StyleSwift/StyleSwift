import {interpolate, useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {TypeLine} from '../components/TypeLine';
import {HOOK} from '../script';
import {C, FONT} from '../theme';

export const S1Hook = () => {
  const frame = useCurrentFrame();
  const sent = frame >= HOOK.enterAt;
  const opacity = interpolate(frame, [HOOK.fadeAt, HOOK.fadeAt + 15], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene style={{alignItems: 'center', justifyContent: 'center'}}>
      {/* Fixed width (prompt + "> " + "  ↵") so the centered line doesn't drift left while typing. */}
      <div style={{width: `${HOOK.prompt.length + 5}ch`, fontFamily: FONT.mono, fontSize: 56, opacity}}>
        <span style={{color: C.accent}}>{'> '}</span>
        <TypeLine text={HOOK.prompt} at={HOOK.typeAt} cps={HOOK.cps} cursor={!sent} color={sent ? C.muted : C.text} />
        {sent && <span style={{color: C.accent}}>{'  ↵'}</span>}
      </div>
    </Scene>
  );
};
