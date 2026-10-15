import {C, FONT} from '../theme';

export const Bubble = ({text, fontSize = 19}: {text: string; fontSize?: number}) => (
  <div style={{alignSelf: 'flex-end', maxWidth: '88%', padding: '12px 16px', borderRadius: 14, background: C.accentSoft, color: C.text, fontFamily: FONT.sans, fontSize, lineHeight: 1.35}}>
    {text}
  </div>
);
