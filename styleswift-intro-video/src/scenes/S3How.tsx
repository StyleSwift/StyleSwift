import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Shot} from '../components/Shot';
import {SidePanel} from '../components/SidePanel';
import {Sticker} from '../components/Sticker';
import {BAR, Window} from '../components/Window';
import {speedBlur} from '../lib/timing';
import {HOW, at, domainOf} from '../script';
import {C, FONT, POP, SETTLE} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const SMALL = {left: 110, top: 420, width: 820, height: 500};
const PAGE = {left: SMALL.left, top: SMALL.top + BAR, width: SMALL.width, height: SMALL.height - BAR};
const PANEL = {left: 1200, top: 110, width: 420, height: 600, scale: 1.4};
// Magnifier route over the page, as fractions of its size: a Z.
const ROUTE = [
  [0.15, 0.2],
  [0.85, 0.2],
  [0.15, 0.8],
  [0.85, 0.8],
];
const SWATCH = {size: 64, x: 1010, y: 470, gap: 14};

const Magnifier = () => {
  const frame = useCurrentFrame();
  const start = at('how', HOW.stepBeats[0]);
  const end = at('how', HOW.stepBeats[1]);
  if (frame < start || frame > end + 10) return null;
  const p = interpolate(frame, [start, end], [0, ROUTE.length - 1], clamp);
  const k = Math.min(ROUTE.length - 2, Math.floor(p));
  const t = p - k;
  const fx = ROUTE[k][0] + (ROUTE[k + 1][0] - ROUTE[k][0]) * t;
  const fy = ROUTE[k][1] + (ROUTE[k + 1][1] - ROUTE[k][1]) * t;
  const opacity = interpolate(frame, [start, start + 6, end, end + 10], [0, 1, 1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: PAGE.left + fx * PAGE.width - 55, top: PAGE.top + fy * PAGE.height - 55, opacity}}>
      <div style={{width: 110, height: 110, boxSizing: 'border-box', borderRadius: '50%', border: `7px solid ${C.ink}`, background: 'rgba(255,255,255,.28)', boxShadow: `4px 5px 0 ${C.ink}`}} />
      <div style={{position: 'absolute', left: 92, top: 92, width: 46, height: 14, borderRadius: 7, background: C.ink, transform: 'rotate(45deg)', transformOrigin: 'left center'}} />
    </div>
  );
};

const Swatches = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = at('how', HOW.stepBeats[1]);
  const from = {x: PAGE.left + PAGE.width / 2, y: PAGE.top + PAGE.height / 2};
  const blocks = [...HOW.swatches.map((c) => ({bg: c, label: ''})), {bg: C.white, label: HOW.fontSample}];
  return (
    <>
      {blocks.map((b, k) => {
        const s = spring({frame: frame - start - 3 * k, fps, config: POP});
        if (frame < start + 3 * k) return null;
        const x = interpolate(s, [0, 1], [from.x, SWATCH.x]);
        const y = interpolate(s, [0, 1], [from.y, SWATCH.y + k * (SWATCH.size + SWATCH.gap)]);
        return (
          <div
            key={k}
            style={{position: 'absolute', left: x, top: y, width: SWATCH.size, height: SWATCH.size, boxSizing: 'border-box', borderRadius: 14, border: `2.5px solid ${C.ink}`, boxShadow: `3px 4px 0 ${C.ink}`, background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontWeight: 800, fontSize: 28, color: C.ink}}
          >
            {b.label}
          </div>
        );
      })}
    </>
  );
};

export const S3How = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const slide = (f: number) => (1 - spring({frame: f, fps, config: SETTLE, durationInFrames: 20})) * 900;
  const panelIn = spring({frame: frame - 4, fps, config: SETTLE, durationInFrames: 20});
  return (
    <AbsoluteFill>
      <Headline text={HOW.headline.text} at={at('how', HOW.headline.beat)} size={104} style={{position: 'absolute', left: 110, top: 110}} />
      <Window url={HOW.shot.url} width={SMALL.width} height={SMALL.height} style={{left: SMALL.left, top: SMALL.top, transform: `translateX(${-slide(frame)}px)`, filter: `blur(${speedBlur(slide(frame - 1) - slide(frame))}px)`}}>
        <div style={{position: 'relative', flex: 1}}>
          <Shot file={HOW.shot.file} />
        </div>
      </Window>
      <div
        style={{position: 'absolute', left: PANEL.left, top: PANEL.top, width: PANEL.width, height: PANEL.height, display: 'flex', overflow: 'hidden', borderRadius: 22, boxShadow: `0 0 0 2px ${C.ink}, 6px 8px 0 ${C.ink}`, transformOrigin: 'top left', transform: `translateX(${(1 - panelIn) * 700}px) scale(${PANEL.scale})`}}
      >
        <SidePanel domain={domainOf(HOW.shot.url)} prompt={HOW.shot.prompt} stepsAt={HOW.stepBeats.map((b) => at('how', b))} width={PANEL.width} />
      </div>
      <Magnifier />
      <Swatches />
      <Sticker text={HOW.badge} at={at('how', HOW.stepBeats[2])} color="sun" rotate={-4} size={34} style={{left: 640, top: 384}} />
    </AbsoluteFill>
  );
};
