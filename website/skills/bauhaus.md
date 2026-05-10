---
name: BauhausStyle
description: Design DNA profile of the Bauhaus Dessau Foundation website (bauhaus-dessau.de) —   the digital embodiment of Bauhaus design principles. Features radical typography,   strict geometric grids, primary color accents on black/white base, asymmetric   compositions, and zero ornamentation. Use this as a reference when generating   designs inspired by the Bauhaus aesthetic: functional, geometric, typographic,   and unapologetically modernist.
---

# Bauhaus Dessau — Design DNA

Design profile extracted from [bauhaus-dessau.de/en/welcome/](https://bauhaus-dessau.de/en/welcome/), the official website of the Bauhaus Dessau Foundation.

## Overview

The Bauhaus Dessau website is a contemporary digital interpretation of Bauhaus design philosophy — where form follows function, typography is the primary visual element, and every pixel serves a purpose. The design strips away all decoration to reveal the raw structure: a strict grid, bold type, primary colors, and geometric precision. It is simultaneously a museum website and a living manifesto of Bauhaus principles.

**Key characteristics:**
- Radical oversized typography as the dominant visual element
- Strict geometric grid system with asymmetric compositions
- Primary color palette: red, blue, yellow accents on black/white/gray base
- Zero ornamentation — no gradients, no shadows, no rounded corners
- High-contrast black-and-white photography
- Typography-driven hierarchy — scale alone creates structure
- Functional minimalism — every element has a clear purpose

---

## Dimension 1: Design System (Measurable Tokens)

### Color

| Role | Hex | Usage |
|------|-----|-------|
| Primary Black | `#000000` | Text, backgrounds, dominant surface |
| Primary White | `#ffffff` | Text on dark, light section backgrounds |
| Accent Red | `#e60012` | Bauhaus red — CTAs, highlights, section dividers |
| Accent Blue | `#0057b8` | Bauhaus blue — links, secondary accents |
| Accent Yellow | `#ffd700` | Bauhaus yellow — decorative elements, emphasis |

**Neutral scale:**
```
#ffffff → #f2f2f2 → #cccccc → #999999 → #666666 → #333333 → #000000
```

**Semantic colors:**
- Success: `#0057b8` (blue serves as positive)
- Warning: `#ffd700`
- Error: `#e60012`
- Info: `#666666`

**Surface colors:**
- Background (primary): `#ffffff`
- Background (inverse): `#000000`
- Background (accent): `#f2f2f2`
- Card: `#ffffff` with 1px `#000000` border
- Elevated: No elevation — Bauhaus rejects shadow

**Palette type:** Primary triadic (red, blue, yellow on achromatic base)
**Contrast strategy:** Maximum contrast — pure black on pure white. No gray compromises. Color accents are small and deliberate.

### Typography

**Font families:**
- Heading: `Bauhaus Grotesk` or `DM Sans` / `Inter` (geometric grotesque)
- Body: Same as heading — Bauhaus uses one family throughout
- Mono: `JetBrains Mono` or `IBM Plex Mono`

**Type scale:**

| Level | Size | Weight | Line Height | Tracking |
|-------|------|--------|-------------|----------|
| Display | 96–144px | 700 | 0.9 | -0.04em |
| H1 | 64–96px | 700 | 0.95 | -0.03em |
| H2 | 48–64px | 700 | 1.0 | -0.025em |
| H3 | 32–42px | 700 | 1.1 | -0.02em |
| Body Large | 18–20px | 400 | 1.6 | 0 |
| Body | 14–16px | 400 | 1.6 | 0 |
| Body Small | 12–13px | 400 | 1.5 | 0.01em |
| Caption | 10–11px | 500 | 1.3 | 0.05em |
| Overline | 11px | 700 | 1.2 | 0.15em |

**Style notes:** Bauhaus typography is radical in scale — display text can fill the entire viewport width. Tight letter-spacing on large sizes creates a monolithic, architectural quality. Text is always set flush-left/ragged-right or fully justified. No centered text. Uppercase used extensively for headings and labels.

### Spacing

- **Base unit:** `8px`
- **Scale:** `0, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256`
- **Content density:** Variable — some sections are dense with stacked type, others are sparse with a single word filling the viewport
- **Section rhythm:** Large, deliberate gaps (96–192px). Sections are clearly separated by whitespace or horizontal rules.

### Layout

- **Grid:** Strict 12-column grid with visible grid lines in some sections. Asymmetric compositions within the grid.
- **Max width:** `1440px`
- **Columns:** 12 (sometimes 6 or 4 for content areas)
- **Gutter:** `24px`
- **Breakpoints:** 480px, 768px, 1024px, 1280px, 1440px
- **Alignment:** Left-aligned dominant. Grid-breaking intentional — text can span multiple columns or overflow deliberately.

### Shape

- **Border radius:** `0px` — no rounded corners, ever. Everything is sharp rectangles.
- **Border usage:** Bold 1–2px solid black borders on cards and containers. Thin horizontal rules as section dividers.
- **Dividers:** Thick horizontal lines (`2–4px solid #000000`) or color accent bars

### Elevation

- **Shadow style:** None — Bauhaus rejects shadow as ornamentation
- **Levels:** All flat — depth created through color contrast and spatial positioning, not shadow
- **Depth cues:** Color blocking, overlapping elements, scale contrast

### Motion

- **Easing:** `linear` or `cubic-bezier(0, 0, 1, 1)` — mechanical, precise
- **Duration scale:** micro `100ms`, normal `200ms`, macro `400ms`
- **Entrance:** Horizontal slide from left or right. No fade — elements appear sharply.
- **Exit:** Slide out or instant disappear
- **Philosophy:** Functional — motion communicates structure, not emotion. No bounce, no easing curves, no playfulness. Mechanical precision.

### Components

- **Buttons:** Rectangular, sharp corners, solid black fill with white text, or outlined with black border. No gradient, no rounded corners. Bold uppercase text.
- **Navigation:** Minimal top bar, often with hamburger menu. Text-only links, uppercase, tracked-out. No decorative underlines — just bold weight change or color swap on hover.
- **Cards:** Sharp rectangles with 1px black border. No shadow. Image on top, text below. Minimal padding.
- **Code blocks:** Monospace on light gray `#f2f2f2` background with black border. No syntax highlighting color — monochrome.
- **Horizontal rules:** `2px solid #000000` spanning full width. Used as primary section divider.
- **Lists:** No bullets — items separated by horizontal rules or grid positioning.

---

## Dimension 2: Design Style (Qualitative Perception)

### Aesthetic

- **Mood:** austere, intellectual, radical, precise, confrontational
- **Visual metaphor:** A manifesto printed on a wall — design as statement, not decoration
- **Era influence:** 1919–1933 Bauhaus school — Weimar/Dessau era modernism
- **Genre:** Cultural institution / Design museum / Art school archive
- **Personality:** disciplined, bold, uncompromising, cerebral, authoritative
- **Adjectives:** geometric, stark, typographic, grid-based, achromatic, modernist

### Visual Language

- **Complexity:** Minimal — stripped to absolute essentials
- **Ornamentation:** None — decoration is a sin in Bauhaus philosophy
- **Whitespace:** Generous but structural — empty space is a grid cell, not filler
- **Visual weight:** Typography carries all visual weight. Images are subservient to type.
- **Focal strategy:** Single dominant element per section — usually a word or phrase at massive scale
- **Contrast level:** Maximum — black/white binary with primary color punctuation
- **Texture usage:** None — surfaces are flat and clean. No noise, no grain, no pattern.

### Composition

- **Hierarchy:** Scale alone — the biggest element is the most important. No color tricks or shadow hierarchy.
- **Balance:** Asymmetric — Bauhaus composition deliberately avoids centering. Elements are placed at grid intersections.
- **Flow:** Left-to-right, top-to-bottom. Grid-based reading flow with intentional disruptions.
- **Grouping:** Grid cells — related content shares a column or row. Separated by rules or whitespace.
- **Negative space:** Structural — it's the space between grid cells, not decorative breathing room

### Imagery

- **Photo treatment:** High-contrast black-and-white. Architectural photography. Sharp, geometric compositions within photos.
- **Illustration style:** Geometric abstraction — circles, squares, triangles in primary colors. Inspired by Kandinsky, Klee, Moholy-Nagy.
- **Graphic elements:** Horizontal rules, color blocks, geometric shapes (pure circle, square, triangle)
- **Pattern usage:** None — no repeating patterns, no decorative fills
- **Image shape:** Sharp rectangles, full-bleed or grid-aligned. No rounded masks.

### Interaction Feel

- **Feedback:** Immediate and mechanical — color swap on hover, no transition or minimal (100ms)
- **Hover behavior:** Text color change (black → red or blue). Border highlight. No scale or lift.
- **Transitions:** Slide-in from side. No fade, no dissolve. Sharp, mechanical movement.
- **Loading style:** Content appears as loaded — no skeleton screens, no progressive reveal
- **Microinteractions density:** Minimal — interactions are functional, not decorative

### Brand Voice

- **Tone:** Authoritative and academic — speaks from a position of design authority
- **Formality:** Formal but modern — no casual language, no contractions
- **CTA style:** Direct imperative — "Visit", "Read more", "Apply". No friendly invitation.
- **Empty state approach:** Minimal — a single line of text, no illustration
- **Error tone:** Direct and factual — states the problem, suggests the fix

---

## Dimension 3: Visual Effects (Special Rendering)

### Overview

- **Effect intensity:** Subtle-accent — effects are minimal and functional
- **Performance tier:** Lightweight (CSS animations, simple JS)
- **Fallback:** Full functionality without any JavaScript effects
- **Primary technology:** CSS animations, vanilla JavaScript, IntersectionObserver

### Background Effects

- **Type:** None
- **Description:** Backgrounds are solid colors — black, white, or gray. No gradients, no patterns, no animated backgrounds. The radical simplicity IS the effect.
- **Technology:** CSS `background-color`
- **Params:**
  - Color palette: `#000000`, `#ffffff`, `#f2f2f2`
  - Speed: N/A
  - Density: N/A
  - Opacity: 1.0
  - Blend mode: N/A

### Particle Systems

- **Enabled:** false
- **Description:** No particles. Bauhaus rejects decorative effects entirely.

### 3D Elements

- **Enabled:** false
- **Description:** No 3D rendering. All imagery is 2D — photography, illustration, geometric shapes.

### Shader Effects

- **Enabled:** false
- **Description:** No shaders. Visual effects are limited to CSS transforms and transitions.

### Scroll Effects

- **Parallax:**
  - **Enabled:** false
  - **Description:** No parallax. Bauhaus considers parallax a decorative distraction.
- **Scroll-triggered animations:**
  - **Enabled:** true
  - **Trigger points:** Element enters viewport
  - **Animation type:** slide-in from left or right, instant appear
  - **Scrub behavior:** No scrub — triggered once, sharp entrance
- **Scroll morphing:**
  - **Enabled:** false

### Text Effects

- **Type:** Scale-dominant
- **Description:** Text at extreme scale IS the visual effect. A single word filling 80% of the viewport width creates impact through sheer size. No gradient fills, no animation, no distortion. The type does the work.
- **Technology:** CSS only — `font-size: clamp(48px, 12vw, 144px)`
- **Params:**
  - Split strategy: By word or phrase — key words are isolated at massive scale
  - Animation per unit: None — static placement
  - Stagger: N/A
  - Effect style: Pure scale contrast

### Cursor Effects

- **Enabled:** false
- **Description:** Default cursor. No custom cursor — Bauhaus functionality extends to the cursor.

### Image Effects

- **Type:** None
- **Description:** Images are displayed as-is — high-contrast B&W photography, no filters, no hover distortion, no reveal animation. The image quality and composition speak for themselves.
- **Technology:** CSS `filter: grayscale(1) contrast(1.2)` for B&W treatment
- **Params:**
  - Filter pipeline: grayscale + contrast boost
  - Hover transform: None
  - Reveal animation: None
  - Distortion type: None

### Glassmorphism

- **Enabled:** false
- **Style:** None — glassmorphism is too decorative for Bauhaus

### Canvas Drawings

- **Enabled:** false
- **Description:** No canvas elements. All graphics are CSS or SVG.

### SVG Animations

- **Enabled:** true
- **Type:** Decorative-loop
- **Description:** Geometric SVG shapes (circles, squares, triangles) with subtle rotation or position animations. Logo animations. These are the only "decorative" elements, and they're still strictly geometric.
- **Params:**
  - Animation method: CSS `@keyframes` on SVG `transform`
  - Path morphing: None
  - Stroke animation: Logo reveal (stroke-dashoffset)
  - Filter effects: None

### Composite Notes

The Bauhaus Dessau website achieves visual impact through restraint, not addition. Where other sites add effects, Bauhaus subtracts. The "visual effects" are:

1. **Typography as image** — Words at 100px+ become visual elements, not just content. A single German word filling the viewport is more impactful than any gradient blob.
2. **Grid as composition** — The strict grid creates visual rhythm. Asymmetric placement within the grid creates tension and interest.
3. **Primary color punctuation** — A single red bar, a blue link, a yellow accent — these tiny color moments have enormous impact precisely because everything else is achromatic.
4. **Horizontal rules as rhythm** — Thick black lines divide the page into clear sections. They're structural, not decorative, but they create a distinctive visual rhythm.
5. **B&W photography** — Grayscale images with boosted contrast feel architectural and timeless. They integrate seamlessly with the black/white typography.

The design philosophy is "less, but better" (Dieter Rams, a Bauhaus successor). Every element earns its place. Nothing is decorative. The result is a website that feels like a design manifesto — confrontational in its simplicity, authoritative in its clarity.

**Performance:** Extremely lightweight. No heavy JavaScript, no WebGL, no large media files. The site loads fast and runs on any device. This is Bauhaus efficiency applied to web performance.

---

## CSS Custom Properties (for implementation)

```css
:root {
  /* Color */
  --color-black: #000000;
  --color-white: #ffffff;
  --color-accent-red: #e60012;
  --color-accent-blue: #0057b8;
  --color-accent-yellow: #ffd700;

  /* Neutral Scale */
  --color-neutral-50: #ffffff;
  --color-neutral-100: #f2f2f2;
  --color-neutral-200: #cccccc;
  --color-neutral-300: #999999;
  --color-neutral-400: #666666;
  --color-neutral-500: #333333;
  --color-neutral-600: #000000;

  /* Semantic */
  --color-success: #0057b8;
  --color-warning: #ffd700;
  --color-error: #e60012;
  --color-info: #666666;

  /* Typography */
  --font-family: 'Bauhaus Grotesk', 'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif;
  --font-family-code: 'JetBrains Mono', 'IBM Plex Mono', Consolas, monospace;
  --font-size-display: clamp(72px, 10vw, 144px);
  --font-size-h1: clamp(48px, 7vw, 96px);
  --font-size-h2: clamp(36px, 5vw, 64px);
  --font-size-h3: clamp(24px, 3vw, 42px);
  --font-size-body-lg: 18px;
  --font-size-body: 15px;
  --font-size-body-sm: 13px;
  --font-size-caption: 11px;
  --font-weight-normal: 400;
  --font-weight-bold: 700;
  --letter-spacing-display: -0.04em;
  --letter-spacing-heading: -0.025em;
  --letter-spacing-overline: 0.15em;
  --text-transform-heading: uppercase;

  /* Spacing */
  --space-unit: 8px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;
  --space-5xl: 128px;
  --space-6xl: 192px;
  --space-7xl: 256px;
  --gutter: 24px;
  --max-width: 1440px;

  /* Shape */
  --radius: 0px;
  --border-thin: 1px solid #000000;
  --border-thick: 2px solid #000000;
  --border-accent: 4px solid #e60012;
  --divider: 2px solid #000000;

  /* Elevation */
  --shadow: none;

  /* Motion */
  --ease-default: cubic-bezier(0, 0, 1, 1);
  --duration-micro: 100ms;
  --duration-normal: 200ms;
  --duration-macro: 400ms;
  --transition-color: color 100ms linear, background-color 100ms linear;
}
```

---

## Design Principles (Bauhaus Manifesto for Digital)

1. **Form follows function** — Every visual choice must serve a purpose. If removing an element doesn't reduce comprehension, remove it.
2. **Typography is architecture** — Letters are building blocks. Scale them to build spatial hierarchy.
3. **The grid is the canvas** — Composition happens within the grid, and sometimes against it. But the grid is always there.
4. **Black and white is complete** — Achromatic is not incomplete. Color is a privilege, not a requirement.
5. **Sharpness is honesty** — Rounded corners soften. Shadows hide. Bauhaus is honest — everything is sharp, flat, and direct.
6. **Less, but better** — Every element must earn its place through function, not decoration.