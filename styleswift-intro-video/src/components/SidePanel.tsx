import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {PANEL_STEPS, PLACEHOLDER} from '../script';
import {C, FONT, POP} from '../theme';

// Pass as `stepsAt` to show every step already finished.
export const STEPS_DONE: readonly number[] = [-100, -100, -100];

type Props = {domain: string; prompt?: string; typed?: string; stepsAt?: readonly number[]; width?: number};

// The product's light side panel, redrawn. `stepsAt[i]` is the frame step i pops in; omit to hide the steps.
export const SidePanel = ({domain, prompt, typed = '', stepsAt, width = 320}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{width, flexShrink: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14, padding: '22px 20px', background: C.white, borderLeft: `1px solid ${C.panelLine}`, color: C.panelText, fontFamily: FONT.ui}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 19, fontWeight: 600}}>
        <Img src={staticFile('logo.png')} style={{width: 26, height: 26}} />
        StyleSwift
      </div>
      <div style={{fontSize: 14, color: C.panelMuted}}>{domain}</div>
      {prompt && (
        <div style={{alignSelf: 'flex-end', maxWidth: '88%', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', background: C.bubble, color: C.bubbleText, fontSize: 18, lineHeight: 1.35}}>{prompt}</div>
      )}
      <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6}}>
        {PANEL_STEPS.map((label, i) => {
          const start = stepsAt?.[i];
          if (start === undefined || frame < start) return null;
          const s = spring({frame: frame - start, fps, config: POP});
          return (
            <div key={label} style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: '#515154', transform: `scale(${s})`, transformOrigin: 'left center'}}>
              <span style={{width: 20, height: 20, borderRadius: '50%', background: C.okSoft, color: C.ok, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✓</span>
              {label}
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, border: '1px solid #E5E5EA', fontSize: 16, color: typed ? C.panelText : '#A1A1A6'}}>
        <span>{typed || PLACEHOLDER}</span>
        <span style={{width: 30, height: 30, borderRadius: '50%', background: C.send}} />
      </div>
    </div>
  );
};
