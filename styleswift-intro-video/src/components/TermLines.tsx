import {useCurrentFrame} from 'remotion';
import {TERM_PREFIX, type TermLine} from '../script';
import {C} from '../theme';
import {TypeLine} from './TypeLine';

const COLOR: Record<TermLine['kind'], string> = {
  cmd: C.text,
  call: C.text,
  result: C.muted,
  warn: C.warn,
  ok: C.ok,
  check: C.ok,
};

export const TermLines = ({lines, cps}: {lines: readonly TermLine[]; cps: number}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {lines
        .filter((l) => frame >= l.at)
        .map((l) => (
          <div key={l.at} style={{whiteSpace: 'pre', color: COLOR[l.kind]}}>
            <span style={{color: l.kind === 'call' ? C.accent : COLOR[l.kind]}}>{TERM_PREFIX[l.kind]}</span>
            {l.kind === 'cmd' || l.kind === 'call' ? <TypeLine text={l.text} at={l.at} cps={cps} color={COLOR[l.kind]} /> : l.text}
          </div>
        ))}
    </>
  );
};
