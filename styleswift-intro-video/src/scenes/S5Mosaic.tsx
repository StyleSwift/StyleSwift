import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Shot} from '../components/Shot';
import {bump} from '../lib/timing';
import {MOSAIC, RESTYLE, WIDTH, at} from '../script';
import {C, POP} from '../theme';

// Two rows of 16:10 tiles, as many columns as the shots need, centred a little below the middle.
const COLS = Math.ceil(RESTYLE.shots.length / 2);
const GAP = 24;
const TILE_W = Math.floor((WIDTH - 2 * 112 - (COLS - 1) * GAP) / COLS);
const TILE = {width: TILE_W, height: TILE_W * 0.625, gap: GAP, left: (WIDTH - COLS * TILE_W - (COLS - 1) * GAP) / 2, top: 564 - TILE_W * 0.625 - GAP / 2};

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
              style={{position: 'absolute', left: TILE.left + (k % COLS) * (TILE.width + TILE.gap), top: TILE.top + Math.floor(k / COLS) * (TILE.height + TILE.gap), width: TILE.width, height: TILE.height, overflow: 'hidden', borderRadius: 18, border: `2.5px solid ${C.ink}`, boxShadow: `4px 5px 0 ${C.ink}`, transform: `scale(${spring({frame: frame - start, fps, config: POP})})`}}
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
