---
name: cyberpunk-2077
description: Design DNA profile of the Cyberpunk 2077 website (cyberpunk.net) — the definitive   digital expression of cyberpunk aesthetics. Features glitch effects, neon yellow   accent on deep black, scanline overlays, angular typography, HUD-like interface   elements, and dystopian atmosphere. Use this as a reference when generating designs   inspired by the Cyberpunk aesthetic: dark, neon-lit, glitchy, aggressive, and   unapologetically futuristic.
---
# Cyberpunk 2077 — Design DNA

Design profile extracted from [cyberpunk.net/cn/zh-cn/](https://www.cyberpunk.net/cn/zh-cn/), the official Cyberpunk 2077 website by CD Projekt Red.

## Overview

The Cyberpunk 2077 website is a digital portal into Night City — a dystopian future where technology and humanity collide. The design weaponizes glitch aesthetics, neon color, angular geometry, and aggressive typography to create an immersive experience that feels like browsing a hacker's terminal from 2077. Every pixel drips with attitude.

**Key characteristics:**
- Signature Cyberpunk Yellow (`#fcee09`) on deep black
- Glitch/distortion effects on text and imagery
- Scanline overlays and digital noise
- Angular, aggressive geometric shapes
- HUD-like interface elements with data overlays
- Video backgrounds with parallax depth
- Heavy, industrial typography
- Neon glow effects (cyan, magenta, yellow)

---

## Dimension 1: Design System (Measurable Tokens)

### Color

| Role | Hex | Usage |
|------|-----|-------|
| Primary Black | `#0a0a0a` | Deep black background — dominant surface |
| Primary Dark | `#1a1a1a` | Secondary dark surface, card backgrounds |
| Accent Yellow | `#fcee09` | Cyberpunk signature — CTAs, highlights, borders, glitch artifacts |
| Accent Cyan | `#00f0ff` | Neon cyan — links, data readouts, HUD elements |
| Accent Magenta | `#ff003c` | Neon red/magenta — warnings, aggressive highlights, blood effects |
| Accent Purple | `#9b00ff` | Neon purple — secondary glow, atmospheric accents |

**Neutral scale:**
```
#0a0a0a → #1a1a1a → #2a2a2a → #3a3a3a → #5a5a5a → #8a8a8a → #b0b0b0 → #e0e0e0
```

**Semantic colors:**
- Success: `#00f0ff`
- Warning: `#fcee09`
- Error: `#ff003c`
- Info: `#9b00ff`

**Surface colors:**
- Background (primary): `#0a0a0a`
- Background (secondary): `#1a1a1a`
- Card: `#1a1a1a` with 1px `#3a3a3a` border
- Elevated: `#2a2a2a` with yellow or cyan border accent
- Overlay: `rgba(10, 10, 10, 0.85)`

**Palette type:** Complementary (yellow + cyan on black)
**Contrast strategy:** Maximum — neon colors on pitch black create extreme contrast. Yellow text on black is the signature pairing.

### Typography

**Font families:**
- Heading: `Rajdhani`, `Orbitron`, or custom cyberpunk display font (geometric, angular)
- Body: `Rajdhani`, `Roboto Condensed`, or similar narrow sans-serif
- Mono/data: `Share Tech Mono`, `Courier New`, monospace
- Display: Custom glitch font for hero text

**Type scale:**

| Level | Size | Weight | Line Height | Tracking |
|-------|------|--------|-------------|----------|
| Display | 80–120px | 700 | 0.85 | 0.05em |
| H1 | 48–72px | 700 | 0.9 | 0.03em |
| H2 | 36–48px | 700 | 1.0 | 0.02em |
| H3 | 24–32px | 600 | 1.1 | 0.02em |
| Body Large | 18px | 400 | 1.6 | 0.01em |
| Body | 14–16px | 400 | 1.6 | 0.02em |
| Body Small | 12–13px | 400 | 1.5 | 0.03em |
| Caption | 10–11px | 500 | 1.3 | 0.08em |
| Data/readout | 12px | 400 | 1.2 | 0.15em |

**Style notes:** Typography is aggressive and angular. Wide letter-spacing on headings creates a futuristic, spaced-out feel. Uppercase dominates. Display text often has glitch/distortion effects — characters shift, duplicate, or flicker. Data/HUD text uses monospace with wide tracking, mimicking terminal readouts.

### Spacing

- **Base unit:** `8px`
- **Scale:** `0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128`
- **Content density:** High — cyberpunk aesthetic favors information density, like a cluttered HUD
- **Section rhythm:** Tight — sections bleed into each other with minimal whitespace. Separation through color/border, not space.

### Layout

- **Grid:** 12-column grid with visible grid lines in some sections. Angular/diagonal sections break the grid.
- **Max width:** `1400px`
- **Columns:** 12
- **Gutter:** `20px`
- **Breakpoints:** 480px, 768px, 1024px, 1280px
- **Alignment:** Left-aligned dominant. Some centered hero sections. Diagonal/angular layouts break convention.

### Shape

- **Border radius:** `0px` — sharp rectangles, or `2px` maximum. No rounded corners.
- **Border usage:** Thin 1px borders in `#3a3a3a` or accent colors. Yellow/cyan border highlights on interactive elements.
- **Dividers:** Angular clip-paths, diagonal cuts, or scanline separators. Not straight horizontal rules.
- **Angular cuts:** `clip-path: polygon()` used extensively for diagonal edges on sections and cards.

### Elevation

- **Shadow style:** Neon glow — not traditional shadows but colored glow effects
- **Levels:**
  - Low: `0 0 4px rgba(252, 238, 9, 0.3)`
  - Medium: `0 0 12px rgba(252, 238, 9, 0.5), 0 0 24px rgba(0, 240, 255, 0.2)`
  - High: `0 0 20px rgba(252, 238, 9, 0.8), 0 0 40px rgba(0, 240, 255, 0.4)`
- **Depth cues:** Neon glow, scanline overlays, parallax video backgrounds, layered transparency

### Motion

- **Easing:** `cubic-bezier(0.23, 1, 0.32, 1)` — aggressive ease-out
- **Duration scale:** micro `80ms`, normal `200ms`, macro `500ms`
- **Entrance:** Glitch-in — element appears with digital distortion artifacts, then stabilizes. Or scanline-wipe from top to bottom.
- **Exit:** Glitch-out — digital breakup, then disappear
- **Philosophy:** Aggressive and disruptive — motion should feel like system glitches, data corruption, or interface malfunction. Not smooth — intentionally jarring.

### Components

- **Buttons:** Rectangular with sharp corners. Yellow outline or fill. Uppercase tracked text. Hover: neon glow intensifies, border brightens, slight glitch effect.
- **Navigation:** Fixed top bar, semi-transparent dark. Text links in uppercase. Active state: yellow underline or glow. Mobile: full-screen overlay with angular design.
- **Cards:** Dark `#1a1a1a` background, thin `#3a3a3a` border. Yellow accent border on hover. Angular clip-path cuts on corners. Image with scanline overlay.
- **HUD elements:** Data readouts, status bars, coordinates — monospace text with wide tracking, cyan/yellow colors, positioned at screen edges.
- **Video players:** Full-width video with scanline overlay, glitch transition on play/pause, angular progress bar.

---

## Dimension 2: Design Style (Qualitative Perception)

### Aesthetic

- **Mood:** dark, aggressive, futuristic, rebellious, dystopian
- **Visual metaphor:** A hacker's terminal in a neon-lit megacity — technology as both weapon and playground
- **Era influence:** 1980s cyberpunk (Blade Runner, Neuromancer) filtered through 21st-century game design
- **Genre:** AAA video game / sci-fi entertainment
- **Personality:** rebellious, confident, dangerous, edgy, unapologetic
- **Adjectives:** neon-lit, glitchy, angular, industrial, dystopian, gritty, electric

### Visual Language

- **Complexity:** Rich — layered effects, multiple textures, information density
- **Ornamentation:** Functional decoration — scanlines, glitch artifacts, and HUD elements are decorative but feel purposeful within the cyberpunk world
- **Whitespace:** Minimal — the aesthetic favors density. Empty space is filled with noise, scanlines, or data overlays.
- **Visual weight:** Neon accents on black create extreme focal points. Yellow draws the eye immediately.
- **Focal strategy:** Multiple competing focal points — like a real cyberpunk city, everything demands attention. Hero sections are intense, with video + text + effects layered.
- **Contrast level:** Extreme — neon on black, yellow on dark gray, glowing text on shadow
- **Texture usage:** Heavy — digital noise, scanlines, grid patterns, circuit-board textures, grain overlays

### Composition

- **Hierarchy:** Color + glow — yellow elements dominate, then cyan, then white text on dark. Size is secondary to color intensity.
- **Balance:** Asymmetric and dynamic — elements are placed at angles, overlapping, breaking the grid
- **Flow:** Non-linear — like a cyberpunk city, the eye is pulled in multiple directions. HUD elements at edges, hero center, data readouts scattered.
- **Grouping:** Overlapping layers — cards overlap, text overlays images, HUD elements float above content
- **Negative space:** Filled — empty space feels incomplete. Noise, scanlines, or subtle data fills gaps.

### Imagery

- **Photo treatment:** High-contrast, desaturated with neon color cast. Game screenshots with cinematic grading. Heavy post-processing.
- **Illustration style:** Cyberpunk concept art — neon-lit cityscapes, augmented humans, technological augmentation
- **Graphic elements:** Scanline overlays, grid patterns, angular frames, circuit-board traces, data-stream graphics
- **Pattern usage:** Repeating scanlines (horizontal lines), dot-matrix patterns, hex-grid backgrounds
- **Image shape:** Angular clip-paths, diagonal cuts, irregular polygons. No simple rectangles.

### Interaction Feel

- **Feedback:** Aggressive — glitch effects on hover, neon glow intensification, sound effects (optional)
- **Hover behavior:** Border glow intensifies, yellow accent brightens, slight RGB shift or glitch artifact appears
- **Transitions:** Glitch-wipe — digital distortion between states. Scanline wipe top-to-bottom. No smooth fades.
- **Loading style:** Progress bar with glitch effect, loading text with flicker, percentage counter with data readout aesthetic
- **Microinteractions density:** High — everything responds, everything glows, everything has a digital artifact

### Brand Voice

- **Tone:** Rebellious and confrontational — speaks like a street kid from Night City
- **Formality:** Informal, slang-heavy, in-world language
- **CTA style:** Aggressive imperative — "Pre-order now", "Explore Night City", "Jack in"
- **Empty state approach:** Themed — "Connection lost", "System offline", in-world error messages
- **Error tone:** Cyberpunk-themed — "Neural link disrupted", "Data corruption detected"

---

## Dimension 3: Visual Effects (Special Rendering)

### Overview

- **Effect intensity:** Heavy-immersive
- **Performance tier:** Heavy (WebGL, video, complex CSS, GSAP)
- **Fallback:** Reduced effects on mobile — scanlines and glitch effects disabled, video replaced with static image
- **Primary technology:** WebGL, GSAP, HTML5 Video, CSS animations, Canvas 2D

### Background Effects

- **Type:** Video-bg + noise-field
- **Description:** Full-viewport video backgrounds showing Night City footage — neon streets, flying cars, cityscapes. Overlaid with digital noise, scanlines, and vignette. Some sections use dark gradient overlays on top of video.
- **Technology:** HTML5 Video + CSS overlays + Canvas noise
- **Params:**
  - Color palette: `#0a0a0a`, `#fcee09`, `#00f0ff`, `#ff003c`
  - Speed: Video plays at 1x speed, noise/static cycles at 2-4 fps
  - Density: High — multiple overlay layers
  - Opacity: Video 0.7, noise 0.1, scanlines 0.15, vignette 0.5
  - Blend mode: screen, overlay, multiply

### Particle Systems

- **Enabled:** true
- **Type:** floating-dots (data particles)
- **Description:** Tiny particles float across the screen like data fragments or digital dust. Some sections have particle streams flowing in one direction, like data flowing through a network.
- **Technology:** Canvas 2D or WebGL point sprites
- **Params:**
  - Count: 100-300
  - Shape: 1-2px dots, occasionally small squares
  - Size range: 1-3px
  - Movement pattern: Horizontal drift with slight vertical variation. Some particles follow paths.
  - Color behavior: Match accent colors — yellow, cyan, white
  - Interaction: Mouse-repel (particles scatter from cursor)
  - Spawn area: Full viewport

### 3D Elements

- **Enabled:** true
- **Type:** Abstract-geometry, hero-model
- **Description:** Some hero sections feature 3D rendered game assets — the protagonist, vehicles, weapons — rotating or floating. Abstract 3D geometric shapes (wireframe cubes, polyhedra) as decorative elements.
- **Technology:** WebGL (Three.js) for interactive 3D, pre-rendered video for complex models
- **Params:**
  - Renderer: WebGL 2.0
  - Lighting: Dramatic neon — colored point lights, rim lighting, minimal ambient
  - Materials: PBR with emissive neon accents, metallic surfaces
  - Geometry: High-poly game assets + low-poly wireframe decorative shapes
  - Post-processing: bloom, chromatic aberration, film grain, vignette
  - Interaction model: Orbital rotation on scroll, mouse parallax

### Shader Effects

- **Enabled:** true
- **Type:** glitch, noise-distortion, color-shift
- **Description:** Custom GLSL shaders for glitch effects — RGB channel splitting, horizontal line displacement, noise-based distortion. Used on text, images, and transitions.
- **Technology:** GLSL ES 3.0, WebGL 2.0
- **Params:**
  - Uniforms: `time`, `glitchIntensity`, `resolution`, `mouse`
  - Vertex manipulation: Slight vertex jitter on glitch trigger
  - Fragment output: RGB split (2-4px offset per channel), scanline darkening, noise overlay
  - Noise type: White noise, digital hash
  - Distortion: Horizontal line displacement (2-10px), periodic glitch bursts

### Scroll Effects

- **Parallax:**
  - **Enabled:** true
  - **Layers:** 4-5 (video bg, noise overlay, content, HUD elements, foreground glitch)
  - **Depth range:** Deep — background video moves slowly, foreground elements fast
  - **Speed curve:** Linear with occasional "stutter" effect at section boundaries
- **Scroll-triggered animations:**
  - **Enabled:** true
  - **Trigger points:** Element intersection + section boundaries
  - **Animation type:** glitch-in, slide-from-side, scanline-wipe, scale-in with chromatic aberration
  - **Scrub behavior:** No scrub — triggered once with glitch effect
- **Scroll morphing:**
  - **Enabled:** true
  - **Description:** Section transitions use clip-path morphing — angular shapes expand/contract to reveal next section. Like a viewport being hacked open.

### Text Effects

- **Type:** glitch, split-letter-animate
- **Description:** Hero text has glitch effect — characters randomly shift position, duplicate with RGB split, flicker between characters. On hover or scroll-triggered, text "types in" with a digital stutter. Some text has a persistent subtle glitch loop.
- **Technology:** CSS animations + JavaScript DOM manipulation + optional GLSL overlay
- **Params:**
  - Split strategy: By-char for glitch, by-word for reveal
  - Animation per unit: Random delay per character (0-500ms), position offset (±3px), opacity flicker
  - Stagger: 30-80ms per character
  - Effect style: RGB split, position jitter, opacity flicker, character substitution

### Cursor Effects

- **Enabled:** true
- **Type:** custom-cursor
- **Description:** Custom cursor that matches the cyberpunk aesthetic — could be a crosshair, a small yellow dot, or an angular cursor shape. Cursor trail with fading afterimages.
- **Params:**
  - Shape: Crosshair or angular pointer
  - Size: 20-32px
  - Blend mode: difference or exclusion (creates color-inversion effect on hover)
  - Trail: Yes — 3-5 fading copies following cursor with 100ms delay
  - Interaction zone: Full viewport, different cursor on interactive elements

### Image Effects

- **Type:** hover-distortion, rgb-shift
- **Description:** Images have scanline overlay by default. On hover: RGB channel split (chromatic aberration), slight zoom, glitch artifact flash. Some images have a "holographic" effect with shifting color.
- **Technology:** CSS filters + Canvas overlay + GLSL shaders
- **Params:**
  - Filter pipeline: `contrast(1.2) saturate(1.3)` + scanline overlay + optional chromatic aberration
  - Hover transform: scale(1.02) + RGB split animation (200ms)
  - Reveal animation: Clip-path reveal with glitch artifacts
  - Distortion type: Chromatic aberration, horizontal line displacement

### Glassmorphism

- **Enabled:** false
- **Style:** None — glassmorphism is too clean for cyberpunk. Effects are gritty, not smooth.

### Canvas Drawings

- **Enabled:** true
- **Type:** Interactive grid, data visualization, HUD overlays
- **Description:** Canvas elements draw HUD-like overlays — grid lines, data readouts, coordinate systems, targeting reticles. Some sections have interactive canvas elements that respond to mouse movement.
- **Technology:** Canvas 2D with requestAnimationFrame
- **Params:**
  - Draw method: Line drawing, text rendering, shape fills
  - Animation loop: Continuous 60fps
  - Color scheme: Cyan `#00f0ff`, yellow `#fcee09` on transparent/dark background
  - Responsiveness: Full viewport, adapts to scroll position
  - Interaction: Mouse position affects HUD element positioning/rotation

### SVG Animations

- **Enabled:** true
- **Type:** path-draw, decorative-loop
- **Description:** Logo and icon animations using SVG path drawing (stroke-dashoffset). Decorative SVG elements (circuit traces, angular shapes) with looping animations. Navigation icon morphing.
- **Params:**
  - Animation method: CSS stroke-dashoffset + GSAP timeline
  - Path morphing: Menu icon ↔ close icon morph
  - Stroke animation: Logo reveal, circuit trace animation
  - Filter effects: SVG feGaussianBlur for glow, feColorMatrix for color shift

### Composite Notes

The Cyberpunk 2077 website is a masterclass in immersive game marketing design. Key technical and artistic decisions:

1. **Layered composition** — The page stacks multiple layers: video background → noise/scanline overlay → content → HUD elements → glitch overlay. Each layer has different parallax speed and blend mode.

2. **Glitch as identity** — Glitch effects are not random — they're carefully choreographed. Text glitches on scroll, images glitch on hover, transitions glitch between sections. The glitch is as intentional as any animation easing.

3. **Neon glow system** — A consistent glow system ties the design together: yellow glow for primary CTAs, cyan for data/HUD, magenta for warnings. Glow is achieved through `box-shadow`, `text-shadow`, and WebGL bloom post-processing.

4. **Scanline overlay** — A persistent scanline effect (CSS repeating-linear-gradient of 1px lines at 50% opacity) covers the entire page, creating a CRT-screen feeling. This is subtle but essential to the aesthetic.

5. **Angular geometry** — The design avoids circles and rounded corners entirely. Clip-paths create angular sections, diagonal cuts, and irregular polygons. This creates visual tension and reinforces the aggressive aesthetic.

6. **Sound design integration** — The website integrates ambient sound and UI sound effects (hover clicks, glitch sounds, ambient Night City noise), creating a multi-sensory experience.

7. **Performance trade-offs** — The heavy effects (video, WebGL, particles, glitch shaders) are gracefully reduced on mobile. Scanlines are removed, particle count is halved, video is replaced with static images, and glitch effects are simplified.

---

## CSS Custom Properties (for implementation)

```css
:root {
  /* Color */
  --color-black: #0a0a0a;
  --color-dark: #1a1a1a;
  --color-dark-alt: #2a2a2a;
  --color-gray: #3a3a3a;
  --color-accent-yellow: #fcee09;
  --color-accent-cyan: #00f0ff;
  --color-accent-magenta: #ff003c;
  --color-accent-purple: #9b00ff;

  /* Neutral Scale */
  --color-neutral-50: #e0e0e0;
  --color-neutral-100: #b0b0b0;
  --color-neutral-200: #8a8a8a;
  --color-neutral-300: #5a5a5a;
  --color-neutral-400: #3a3a3a;
  --color-neutral-500: #2a2a2a;
  --color-neutral-600: #1a1a1a;
  --color-neutral-700: #0a0a0a;

  /* Semantic */
  --color-success: #00f0ff;
  --color-warning: #fcee09;
  --color-error: #ff003c;
  --color-info: #9b00ff;

  /* Typography */
  --font-family-heading: 'Rajdhani', 'Orbitron', 'Exo 2', sans-serif;
  --font-family-body: 'Rajdhani', 'Roboto Condensed', 'Exo 2', sans-serif;
  --font-family-code: 'Share Tech Mono', 'Courier New', monospace;
  --font-size-display: clamp(64px, 10vw, 120px);
  --font-size-h1: clamp(42px, 6vw, 72px);
  --font-size-h2: clamp(28px, 4vw, 48px);
  --font-size-h3: clamp(20px, 2.5vw, 32px);
  --font-size-body-lg: 18px;
  --font-size-body: 15px;
  --font-size-body-sm: 13px;
  --font-size-caption: 11px;
  --font-size-data: 12px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --letter-spacing-display: 0.05em;
  --letter-spacing-heading: 0.03em;
  --letter-spacing-data: 0.15em;
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
  --gutter: 20px;
  --max-width: 1400px;

  /* Shape */
  --radius: 0px;
  --radius-sm: 0px;
  --border-thin: 1px solid #3a3a3a;
  --border-accent: 1px solid #fcee09;
  --border-cyan: 1px solid #00f0ff;

  /* Elevation (Neon Glow) */
  --glow-yellow-sm: 0 0 4px rgba(252, 238, 9, 0.3);
  --glow-yellow-md: 0 0 12px rgba(252, 238, 9, 0.5), 0 0 24px rgba(252, 238, 9, 0.2);
  --glow-yellow-lg: 0 0 20px rgba(252, 238, 9, 0.8), 0 0 40px rgba(252, 238, 9, 0.4);
  --glow-cyan-sm: 0 0 4px rgba(0, 240, 255, 0.3);
  --glow-cyan-md: 0 0 12px rgba(0, 240, 255, 0.5), 0 0 24px rgba(0, 240, 255, 0.2);
  --glow-magenta-sm: 0 0 4px rgba(255, 0, 60, 0.3);
  --shadow: none;

  /* Motion */
  --ease-default: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-glitch: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-micro: 80ms;
  --duration-normal: 200ms;
  --duration-macro: 500ms;
  --duration-glitch: 150ms;

  /* Effects */
  --scanline-opacity: 0.15;
  --noise-opacity: 0.1;
  --vignette-opacity: 0.5;
}
```

---

## Design Principles (Cyberpunk Manifesto for Digital)

1. **Glitch is beauty** — Imperfection is aesthetic. Digital artifacts, noise, and distortion are features, not bugs.
2. **Neon on black** — The palette is black, with neon as punctuation. Yellow is the primary accent. Cyan is data. Magenta is danger.
3. **Angular everything** — No circles, no rounded corners. Clip-paths create angular sections. Geometry is aggressive.
4. **Density over whitespace** — Fill the space. HUD elements, data readouts, noise overlays. Empty space is a void to be filled.
5. **Sound is design** — The visual experience is incomplete without audio. Hover sounds, ambient noise, glitch effects.
6. **Layers create depth** — Stack video, noise, scanlines, content, HUD, glitch. Each layer at different opacity and speed.
7. **Disrupt the interface** — The best interaction is one that feels like the system is breaking. Glitch on hover, stutter on scroll, corrupt on transition.