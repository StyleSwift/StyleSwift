import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cursor} from '../components/Cursor';
import {Shot} from '../components/Shot';
import {SidePanel} from '../components/SidePanel';
import {Window} from '../components/Window';
import {HERO, ICON_CENTER, ICON_TIP, PANEL_W, SEND} from '../layout';
import {speedBlur, typedText} from '../lib/timing';
import {HOOK, ORIGINAL_SHOT, at, domainOf} from '../script';
import {C, SETTLE} from '../theme';

const FLY = 700; // px the window rises from
const CURSOR_FROM = {x: 1980, y: 1120};
const RIPPLE_FRAMES = 14;

export const S1Hook = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = (f: number) => (1 - spring({frame: f, fps, config: SETTLE, durationInFrames: 24})) * FLY;
  const iconAt = at('hook', HOOK.iconBeat);
  const openAt = at('hook', HOOK.openBeat);
  const cursorAt = at('hook', HOOK.cursorBeat);
  const clickAt = at('hook', HOOK.clickBeat);
  const toIcon = spring({frame: frame - iconAt, fps, config: SETTLE, durationInFrames: 20});
  const toSend = spring({frame: frame - cursorAt, fps, config: SETTLE, durationInFrames: 20});
  const open = spring({frame: frame - openAt, fps, config: SETTLE, durationInFrames: HOOK.openFrames});
  const [from, to, move] = frame < cursorAt ? [CURSOR_FROM, ICON_TIP, toIcon] : [ICON_TIP, SEND, toSend];
  const pressed = (start: number) => frame >= start && frame < start + 4;
  const sent = frame >= clickAt + 3;
  const typed = sent ? '' : typedText(HOOK.prompt, frame - at('hook', HOOK.typeBeat), fps, HOOK.typeCps);
  return (
    <AbsoluteFill>
      <Window
        url={HOOK.url}
        width={HERO.width}
        height={HERO.height}
        iconPressed={pressed(openAt)}
        style={{left: HERO.left, top: HERO.top, transform: `translateY(${rise(frame)}px)`, filter: `blur(${speedBlur(rise(frame - 1) - rise(frame))}px)`}}
      >
        <div style={{position: 'relative', flex: 1}}>
          <Shot file={ORIGINAL_SHOT} />
        </div>
        {/* Like Chrome's side panel, it slides in from the right and pushes the page narrower. */}
        <div style={{width: PANEL_W * open, flexShrink: 0, display: 'flex', overflow: 'hidden'}}>
          <SidePanel domain={domainOf(HOOK.url)} typed={typed} prompt={sent ? HOOK.prompt : undefined} />
        </div>
      </Window>
      {/* A ring ripples out of the toolbar icon on the click, so the small button reads even at feed size. */}
      {frame >= openAt && frame < openAt + RIPPLE_FRAMES && (
        <div
          style={{position: 'absolute', left: ICON_CENTER.x, top: ICON_CENTER.y, width: 0, height: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
        >
          <div
            style={{flexShrink: 0, width: interpolate(frame - openAt, [0, RIPPLE_FRAMES], [24, 110]), height: interpolate(frame - openAt, [0, RIPPLE_FRAMES], [24, 110]), borderRadius: '50%', border: `4px solid ${C.magenta}`, opacity: interpolate(frame - openAt, [0, RIPPLE_FRAMES], [1, 0])}}
          />
        </div>
      )}
      {frame >= iconAt && (
        <Cursor x={interpolate(move, [0, 1], [from.x, to.x])} y={interpolate(move, [0, 1], [from.y, to.y])} pressed={pressed(openAt) || pressed(clickAt)} />
      )}
    </AbsoluteFill>
  );
};
