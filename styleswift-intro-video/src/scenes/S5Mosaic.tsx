import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Shot} from '../components/Shot';
import {bump} from '../lib/timing';
import {MOSAIC, RESTYLE, at} from '../script';
import {C, POP} from '../theme';

const TILE = {width: 400, height: 250, gap: 28, left: 118, top: 300};

export const S5Mosaic = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const punch = Math.max(0, ...MOSAIC.punchBeats.map((b) => bump(frame - at('mosaic', b))));
  const headlineAt = at('mosaic', MOSAIC.headline.beat);
  const box = spring({frame: frame - headlineAt, fps, config: POP});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${1 + 0.02 * punch})`}}>
        {RESTYLE.shots.map((s, k) => {
          const start = at('mosaic', MOSAIC.tileBeats[k]);
          if (frame < start) return null;
          return (
            <div
              key={s.file}
              style={{position: 'absolute', left: TILE.left + (k % 4) * (TILE.width + TILE.gap), top: TILE.top + Math.floor(k / 4) * (TILE.height + TILE.gap), width: TILE.width, height: TILE.height, overflow: 'hidden', borderRadius: 18, border: `2.5px solid ${C.ink}`, boxShadow: `4px 5px 0 ${C.ink}`, transform: `scale(${spring({frame: frame - start, fps, config: POP})})`}}
            >
              <Shot file={s.file} />
            </div>
          );
        })}
      </AbsoluteFill>
      {frame >= headlineAt && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{padding: '30px 56px', borderRadius: 32, border: `3px solid ${C.ink}`, boxShadow: `6px 8px 0 ${C.ink}`, background: C.white, textAlign: 'center', transform: `scale(${box})`}}>
            <Headline text={MOSAIC.headline.text} at={headlineAt} size={96} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
