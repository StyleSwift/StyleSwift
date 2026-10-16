import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CARD, Card} from '../components/Card';
import {Headline} from '../components/Headline';
import {bump} from '../lib/timing';
import {SAVE, at} from '../script';
import {POP, SETTLE} from '../theme';

const CENTER = {x: 960, y: 640};
// Fan slots left to right; the saved card takes the middle slot (index 2). Cards nearer the middle sit on top.
const SLOTS = [
  {dx: -430, dy: 70, rotate: -22},
  {dx: -215, dy: 18, rotate: -11},
  {dx: 0, dy: 0, rotate: 0},
  {dx: 215, dy: 18, rotate: 11},
  {dx: 430, dy: 70, rotate: 22},
];
const OTHER_SLOTS = [0, 1, 3, 4];

export const S4Save = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sway = Math.max(0, ...SAVE.swayBeats.map((b) => bump(frame - at('save', b), 4, 14)));
  const place = (slot: number, s: number, scale: number) => {
    const {dx, dy, rotate} = SLOTS[slot];
    const spread = rotate + Math.sign(rotate) * 2 * sway;
    return {
      left: CENTER.x - CARD.width / 2 + dx * s,
      top: CENTER.y - CARD.height / 2 + dy * s,
      transform: `rotate(${spread * s}deg) scale(${scale})`,
      zIndex: 2 - Math.abs(slot - 2),
    };
  };
  const saved = spring({frame: frame - at('save', SAVE.savedBeat), fps, config: SETTLE, durationInFrames: 18});
  return (
    <AbsoluteFill>
      <Headline text={SAVE.headline.text} at={at('save', SAVE.headline.beat)} size={104} style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center'}} />
      {SAVE.others.map((c, k) => {
        const start = at('save', SAVE.fanBeats[k]);
        if (frame < start) return null;
        return <Card key={c.name} file={c.file} name={c.name} labelEnd={SLOTS[OTHER_SLOTS[k]].dx > 0} style={place(OTHER_SLOTS[k], spring({frame: frame - start, fps, config: POP}), 1)} />;
      })}
      <Card
        file={SAVE.saved.file}
        name={SAVE.saved.name}
        badge={SAVE.savedLabel}
        style={{...place(2, 1, interpolate(saved, [0, 1], [2.4, 1])), opacity: Math.min(1, saved * 3)}}
      />
    </AbsoluteFill>
  );
};
