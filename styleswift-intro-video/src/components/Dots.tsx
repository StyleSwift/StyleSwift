import {C} from '../theme';

export const Dots = () => (
  <div style={{display: 'flex', gap: 8}}>
    {[0, 1, 2].map((i) => (
      <span key={i} style={{width: 12, height: 12, borderRadius: 6, background: C.line}} />
    ))}
  </div>
);
