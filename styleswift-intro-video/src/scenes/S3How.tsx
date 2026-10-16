import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {SeamReveal} from '../components/SeamReveal';
import {PanelShot} from '../components/PanelShot';
import {BAR, Window} from '../components/Window';
import {activeIndex, speedBlur} from '../lib/timing';
import {HOW, RESTYLE, at, panelFile, shotKey} from '../script';
import {C, FONT, POP, SETTLE} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const SMALL = {left: 110, top: 420, width: 820, height: 500};
const PAGE = {left: SMALL.left, top: SMALL.top + BAR, width: SMALL.width, height: SMALL.height - BAR};
// The real panel screenshot at 1.35×, cropped to the conversation (the input bar sits below the fold).
const PANEL = {left: 1210, top: 140, width: 540, height: 760};
const PANEL_STATES = ['sent', 'step1', 'step2', 'step3', 'done'];
// Regions Search Page Elements turns up on the original page (banner, carousel, video grid), as fractions of its size.
const FOUND = [
  {x: 0.02, y: 0.02, w: 0.96, h: 0.15},
  {x: 0.085, y: 0.3, w: 0.325, h: 0.42},
  {x: 0.415, y: 0.3, w: 0.49, h: 0.5},
];
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

const Found = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = at('how', HOW.stepBeats[1]);
  const end = at('how', HOW.stepBeats[2]);
  if (frame < start || frame > end + 8) return null;
  const fade = interpolate(frame, [end, end + 8], [1, 0], clamp);
  return (
    <>
      {FOUND.map((r, k) => (
        <div
          key={k}
          style={{position: 'absolute', left: PAGE.left + r.x * PAGE.width, top: PAGE.top + r.y * PAGE.height, width: r.w * PAGE.width, height: r.h * PAGE.height, boxSizing: 'border-box', borderRadius: 10, border: `3px dashed ${C.magenta}`, background: 'rgba(255,95,162,.08)', opacity: fade, transform: `scale(${spring({frame: frame - start - 3 * k, fps, config: POP})})`}}
        />
      ))}
    </>
  );
};

const Swatches = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = at('how', HOW.stepBeats[2]);
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
  const reveal = interpolate(frame - at('how', HOW.stepBeats[2]), [0, RESTYLE.sweepFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill>
      <Headline text={HOW.headline.text} at={at('how', HOW.headline.beat)} size={104} style={{position: 'absolute', left: 110, top: 110}} />
      <Window url={HOW.shot.url} width={SMALL.width} height={SMALL.height} style={{left: SMALL.left, top: SMALL.top, transform: `translateX(${-slide(frame)}px)`, filter: `blur(${speedBlur(slide(frame - 1) - slide(frame))}px)`}}>
        <SeamReveal from={HOW.original} to={HOW.shot.file} progress={reveal} width={PAGE.width} height={PAGE.height} />
      </Window>
      <PanelShot
        file={panelFile(shotKey(HOW.shot), PANEL_STATES[activeIndex([0, ...HOW.stepBeats, HOW.doneBeat].map((b) => at('how', b)), frame)])}
        width={PANEL.width}
        style={{position: 'absolute', left: PANEL.left, top: PANEL.top, height: PANEL.height, borderLeft: 'none', borderRadius: 22, boxShadow: `0 0 0 2px ${C.ink}, 6px 8px 0 ${C.ink}`, transform: `translateX(${(1 - panelIn) * 700}px)`, maskImage: 'linear-gradient(to bottom, #000 88%, transparent)'}}
      />
      <Magnifier />
      <Found />
      <Swatches />
    </AbsoluteFill>
  );
};
