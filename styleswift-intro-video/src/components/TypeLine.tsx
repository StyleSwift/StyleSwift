import {useCurrentFrame, useVideoConfig} from 'remotion';
import {typedText} from '../lib/timing';
import {C} from '../theme';

type Props = {text: string; at: number; cps: number; cursor?: boolean; color?: string};

export const TypeLine = ({text, at, cps, cursor = false, color = C.text}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const shown = typedText(text, frame - at, fps, cps);
  const typing = frame >= at && shown.length < text.length;
  const cursorOn = typing || Math.floor(frame / 15) % 2 === 0;
  return (
    <span style={{color, whiteSpace: 'pre'}}>
      {shown}
      {cursor && cursorOn && (
        <span style={{display: 'inline-block', width: '0.6em', height: '1.1em', marginLeft: 4, background: C.accent, verticalAlign: 'text-bottom'}} />
      )}
    </span>
  );
};
