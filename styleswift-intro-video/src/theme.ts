import {loadFont as loadSerif} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadSans} from '@remotion/google-fonts/Inter';

// Dark-mode tokens from extension/sidepanel/panel.css, so the film matches the product.
export const C = {
  bg: 'oklch(15% 0.003 78)',
  panel: 'oklch(19% 0.004 78)',
  line: 'oklch(28% 0.005 78)',
  text: 'oklch(94% 0.01 78)',
  muted: 'oklch(62% 0.01 78)',
  accent: 'oklch(75% 0.11 42)',
  accentSoft: 'oklch(75% 0.11 42 / 0.18)',
  ok: 'oklch(78% 0.12 150)',
  warn: 'oklch(80% 0.13 80)',
};

export const FONT = {
  serif: loadSerif('normal', {weights: ['400'], subsets: ['latin']}).fontFamily,
  mono: loadMono('normal', {weights: ['400', '700'], subsets: ['latin']}).fontFamily,
  sans: loadSans('normal', {weights: ['400', '500', '600'], subsets: ['latin']}).fontFamily,
};
