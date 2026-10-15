import {Img, staticFile} from 'remotion';
import {PANEL_CARDS} from '../script';
import {C, FONT} from '../theme';
import {Bubble} from './Bubble';

// Simplified redraw of the real side panel in its dark theme.
export const SidePanel = ({prompt, domain}: {prompt: string; domain: string}) => (
  <div style={{width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: 22, background: C.bg, borderLeft: `1px solid ${C.line}`, color: C.text, fontFamily: FONT.sans}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 21, fontWeight: 600}}>
      <Img src={staticFile('logo.png')} style={{width: 28, height: 28}} />
      StyleSwift
    </div>
    <div style={{marginBottom: 6, fontSize: 15, color: C.muted}}>{domain}</div>
    <Bubble text={prompt} />
    {PANEL_CARDS.map((label) => (
      <div key={label} style={{display: 'flex', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 16, color: C.muted}}>
        <span>
          <span style={{color: C.ok}}>✓</span> {label}
        </span>
        <span>›</span>
      </div>
    ))}
  </div>
);
