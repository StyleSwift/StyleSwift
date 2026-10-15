import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cursor} from '../components/Cursor';
import {Shot} from '../components/Shot';
import {SidePanel} from '../components/SidePanel';
import {Window} from '../components/Window';
import {HERO, SEND} from '../layout';
import {speedBlur, typedText} from '../lib/timing';
import {HOOK, ORIGINAL_SHOT, at, domainOf} from '../script';
import {SETTLE} from '../theme';

const FLY = 700; // px the window rises from
const CURSOR_FROM = {x: 1980, y: 1120};

export const S1Hook = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = (f: number) => (1 - spring({frame: f, fps, config: SETTLE, durationInFrames: 24})) * FLY;
  const cursorAt = at('hook', HOOK.cursorBeat);
  const clickAt = at('hook', HOOK.clickBeat);
  const move = spring({frame: frame - cursorAt, fps, config: SETTLE, durationInFrames: 20});
  const sent = frame >= clickAt + 3;
  const typed = sent ? '' : typedText(HOOK.prompt, frame - at('hook', HOOK.typeBeat), fps, HOOK.typeCps);
  return (
    <AbsoluteFill>
      <Window url={HOOK.url} width={HERO.width} height={HERO.height} style={{left: HERO.left, top: HERO.top, transform: `translateY(${rise(frame)}px)`, filter: `blur(${speedBlur(rise(frame - 1) - rise(frame))}px)`}}>
        <div style={{position: 'relative', flex: 1}}>
          <Shot file={ORIGINAL_SHOT} />
        </div>
        <SidePanel domain={domainOf(HOOK.url)} typed={typed} prompt={sent ? HOOK.prompt : undefined} />
      </Window>
      {frame >= cursorAt && (
        <Cursor
          x={interpolate(move, [0, 1], [CURSOR_FROM.x, SEND.x])}
          y={interpolate(move, [0, 1], [CURSOR_FROM.y, SEND.y])}
          pressed={frame >= clickAt && frame < clickAt + 4}
        />
      )}
    </AbsoluteFill>
  );
};
