import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cursor} from '../components/Cursor';
import {Headline} from '../components/Headline';
import {SeamReveal} from '../components/SeamReveal';
import {PanelShot} from '../components/PanelShot';
import {Sticker} from '../components/Sticker';
import {BAR, Window} from '../components/Window';
import {HERO, PANEL_W, SEND, STAGE_B} from '../layout';
import {activeIndex, bump} from '../lib/timing';
import {ORIGINAL_SHOT, RESTYLE, at, panelFile, shotKey} from '../script';
import {SETTLE} from '../theme';

const PAGE = {width: HERO.width - PANEL_W, height: HERO.height - BAR};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FIRST_STATES = ['sent', 'step1', 'step2', 'step3', 'done'];

export const S2Restyle = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const starts = RESTYLE.shots.map((s) => at('restyle', s.beat));
  const i = activeIndex(starts, frame);
  const shot = RESTYLE.shots[i];
  const progress = interpolate(frame - starts[i], [0, RESTYLE.sweepFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const move = spring({frame: frame - at('restyle', RESTYLE.moveBeat), fps, config: SETTLE});
  const punch = Math.max(0, ...RESTYLE.punchBeats.map((b) => bump(frame - at('restyle', b))));
  const scale = interpolate(move, [0, 1], [1, STAGE_B.scale]) * (1 + 0.025 * punch);
  return (
    <AbsoluteFill>
      <Window
        url={shot.url}
        width={HERO.width}
        height={HERO.height}
        style={{
          left: interpolate(move, [0, 1], [HERO.left, STAGE_B.left]),
          top: interpolate(move, [0, 1], [HERO.top, STAGE_B.top]),
          transformOrigin: 'top left',
          transform: `rotate(${interpolate(move, [0, 1], [0, STAGE_B.rotate])}deg) scale(${scale})`,
        }}
      >
        <SeamReveal from={i === 0 ? ORIGINAL_SHOT : RESTYLE.shots[i - 1].file} to={shot.file} progress={progress} width={PAGE.width} height={PAGE.height} />
        <PanelShot file={panelFile(shotKey(shot), i === 0 ? FIRST_STATES[activeIndex([0, ...RESTYLE.panelFrames], frame)] : 'done')} />
      </Window>
      <Headline text={RESTYLE.headline.text} at={at('restyle', RESTYLE.headline.beat)} size={124} style={{position: 'absolute', left: 110, top: 150}} />
      <Headline text={RESTYLE.sub.text} at={at('restyle', RESTYLE.sub.beat)} size={34} weight={500} style={{position: 'absolute', left: 116, top: 430}} />
      {frame < 8 && (
        <div style={{opacity: interpolate(frame, [0, 8], [1, 0], clamp)}}>
          <Cursor x={SEND.x} y={SEND.y} pressed={false} />
        </div>
      )}
      {RESTYLE.shots.map((s, k) => (
        <Sticker key={s.prompt} text={s.prompt} at={starts[k]} color={s.sticker.color} rotate={s.sticker.rotate} style={{left: s.sticker.x, top: s.sticker.y}} />
      ))}
    </AbsoluteFill>
  );
};
