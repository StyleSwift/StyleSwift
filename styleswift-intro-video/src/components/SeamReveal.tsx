import {IRIDESCENT, IRIDESCENT_CORE} from '../theme';
import {Shot} from './Shot';

type Props = {from: string; to: string; progress: number; width: number; height: number};

// `to` is uncovered behind a leaning iridescent seam that sweeps left to right as progress goes 0 → 1.
export const SeamReveal = ({from, to, progress, width, height}: Props) => {
  const lean = height * 0.09;
  const x = -lean + progress * (width + 2 * lean);
  const skew = `skewX(${(-Math.atan(lean / height) * 180) / Math.PI}deg)`;
  return (
    <div style={{position: 'relative', width, height, flexShrink: 0, overflow: 'hidden'}}>
      {progress < 1 && <Shot file={from} />}
      <Shot file={to} style={{clipPath: `polygon(0 0, ${x + lean / 2}px 0, ${x - lean / 2}px 100%, 0 100%)`}} />
      {progress > 0 && progress < 1 && (
        <>
          <div style={{position: 'absolute', top: -40, bottom: -40, left: x - 70, width: 140, background: IRIDESCENT, filter: 'blur(28px)', opacity: 0.85, transform: skew}} />
          <div style={{position: 'absolute', top: -40, bottom: -40, left: x - 3, width: 6, background: IRIDESCENT_CORE, transform: skew}} />
        </>
      )}
    </div>
  );
};
