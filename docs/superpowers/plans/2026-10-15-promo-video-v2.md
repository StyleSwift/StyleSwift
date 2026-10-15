# StyleSwift 宣传片 v2 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 v1 暖色终端版宣传片重做成明亮活泼的 v2：样帧 B 的构图 + A 的炫彩光带，配 Karma 背景音乐和 Mixkit 音效，切点卡在 128 BPM 的拍子上。

**Architecture:** 沿用 `styleswift-intro-video/` 的 Remotion 项目。所有文案、拍号和音效触发点放在纯数据文件 `src/script.ts`，由 vitest 校验；`src/lib/timing.ts` 放拍号换算等纯函数；音频清单放 `src/audio.json`，由 `scripts/fetch-audio.mjs` 下载到被 gitignore 的 `public/audio/`。背景色斑 `Backdrop` 和音轨 `Soundtrack` 铺满全片，6 个镜头用 `<Series>` 串起来。

**Tech Stack:** Remotion 4.0.535（新增 `@remotion/media` 4.0.535）、React 19、TypeScript 5、vitest 4；Python PIL/numpy 用于混音峰值检查。

**Spec:** `docs/superpowers/specs/2026-10-15-promo-video-v2-design.md`

## Global Constraints

- `remotion` 和所有 `@remotion/*` 包锁定在 `4.0.535`（`--save-exact`）
- 成片 1920×1080、30fps、1350 帧（96 拍 × 14.0625 帧）、H.264 + AAC
- 所有文案、拍号、音效触发点只写在 `src/script.ts`；镜头里的像素布局常量可以写在镜头文件或 `src/layout.ts`
- 拍号换算统一用 `beat(b) = Math.round(b × 60 × 30 / 128)`；镜头内用 `at(scene, b)`，得到相对镜头起点的帧号
- 颜色只用 `src/theme.ts` 的 `C`、`STICKER`、`IRIDESCENT*`；字体只用 `FONT.display`（Bricolage Grotesque）和 `FONT.ui`（Inter）
- 音频文件不进 git（Mixkit 授权禁止单独再分发，也禁止连同源文件一起分发）
- 画面里不出现终端、代码、工具名；网页效果只用 `public/shots/` 里的真实截图
- 不改 `extension/`、`bridge/`、`website/` 和根目录 `package.json`
- 命令都在 `styleswift-intro-video/` 下运行（Git Bash），另有说明的除外
- 用户已同意直接执行，计划写完不再等审阅

## Review Focus

1. **大字或贴纸互相遮挡、超出画面**：贴纸位置是手写的像素坐标。Task 3、5、6 的关键帧检查专门看遮挡。
2. **音效和画面不同步，或某个音效刺耳**：测试只能保证触发帧在拍子上，听感要靠成片试听。Task 7 测峰值，并交给用户试听。
3. **音频缺失时渲染失败**：`prerender` / `predev` 会自动运行 `fetch-audio --if-missing`，Task 1 验证一次。
4. **渲染时字体没加载**：Bricolage 回落成系统字体后风格全没了。Task 2 的关键帧检查确认字形。
5. **镜头之间跳变**：S1→S2 的窗口位置必须连续，S2→S3 等是换构图，靠弹簧入场衔接。Task 7 检查每个镜头交界处前后各一帧。

---

### Task 1: 地基：音频、节拍、背景，清理 v1

**Files:**
- Modify: `styleswift-intro-video/package.json`（scripts、新增依赖）
- Modify: `styleswift-intro-video/.gitignore`、`styleswift-intro-video/tsconfig.json`
- Create: `styleswift-intro-video/src/audio.json`、`styleswift-intro-video/scripts/fetch-audio.mjs`
- Create: `styleswift-intro-video/src/layout.ts`、`styleswift-intro-video/src/Soundtrack.tsx`、`styleswift-intro-video/src/components/Backdrop.tsx`
- Rewrite: `styleswift-intro-video/src/lib/timing.ts`、`src/lib/timing.test.ts`、`src/script.ts`、`src/script.test.ts`、`src/theme.ts`、`src/Promo.tsx`
- Delete: `src/components/{Bubble,BrowserFrame,Dots,Grain,Headline,Scene,SidePanel,TermLines,Terminal,TypeLine}.tsx`、`src/scenes/*.tsx`
- Modify: `docs/superpowers/specs/2026-10-15-promo-video-v2-design.md`（动态模糊一行，见 Step 1）

**Interfaces:**
- Produces:
  - `timing.ts`：`beatFrame(beat, fps, bpm)`、`typedText(text, frame, fps, cps)`、`activeIndex(starts, frame)`、`bump(frame, rise = 3, fall = 8)`（0→1→0 的三角脉冲）、`speedBlur(delta, pxPerUnit = 12, max = 14)`
  - `script.ts`：`FPS`、`WIDTH`、`HEIGHT`、`BPM`、`TOTAL_BEATS`、`MUSIC`、`MUSIC_TRIM_BEFORE`、`beat(b)`、`TOTAL_FRAMES`、`SCENE_BEATS`、`SceneName`、`SCENE_ORDER`、`sceneStart(s)`、`sceneLength(s)`、`at(s, b)`、`domainOf(url)`、类型 `Line`、`StickerColor`、`SfxKey`、`Cue`、`cueFrame(c)`、`CUES`（本任务为空数组）
  - `theme.ts`：`C`、`STICKER`、`IRIDESCENT`、`IRIDESCENT_CORE`、`FONT`、`POP`、`SETTLE`
  - `layout.ts`：`HERO`、`STAGE_B`、`PANEL_W`
  - `<Backdrop />`、`<Soundtrack />`、`Promo` 里的 `SCENES: Partial<Record<SceneName, ComponentType>>`

- [ ] **Step 1: 改设计文档里的动态模糊做法**

把 v2 设计文档「动效规则」里这一行

```
- **动态模糊**：只用在窗口飞入和卡片飞行这类快速位移上（`@remotion/motion-blur` 的 `CameraMotionBlur`）
```

改成

```
- **动态模糊**：只用在窗口飞入这类快速位移上，按元素每帧的位移量加 CSS 模糊（`speedBlur`）。不用 `@remotion/motion-blur`，因为它要把整棵子树渲染多遍，渲染耗时会成倍增加
```

- [ ] **Step 2: 安装依赖，改配置**

```bash
npm install --save-exact @remotion/media@4.0.535
```

在 `package.json` 的 `scripts` 里加三项（保留原有的 `dev`、`render`、`test`、`typecheck`）：

```json
"fetch-audio": "node scripts/fetch-audio.mjs",
"predev": "node scripts/fetch-audio.mjs --if-missing",
"prerender": "node scripts/fetch-audio.mjs --if-missing",
```

`.gitignore` 改成：

```
out/
public/audio/
```

`tsconfig.json` 的 `compilerOptions` 里加 `"resolveJsonModule": true`。

- [ ] **Step 3: 音频清单和下载脚本**

`src/audio.json`：

```json
{
  "music": {"kind": "music", "id": 1183, "file": "karma.mp3", "volume": 0.8, "title": "Karma (Michael Ramir C.)"},
  "click": {"kind": "sfx", "id": 1113, "file": "click.mp3", "volume": 0.7, "title": "Mouse click close"},
  "typing": {"kind": "sfx", "id": 1396, "file": "typing.mp3", "volume": 0.5, "title": "Soft typing on a digital keyboard"},
  "sparkle": {"kind": "sfx", "id": 2350, "file": "sparkle.mp3", "volume": 0.7, "title": "Magic sparkle whoosh"},
  "whoosh": {"kind": "sfx", "id": 1490, "file": "whoosh.mp3", "volume": 0.45, "title": "Fast whoosh transition"},
  "pop": {"kind": "sfx", "id": 3005, "file": "pop.mp3", "volume": 0.5, "title": "Explainer video pops whoosh light pop"},
  "check": {"kind": "sfx", "id": 2867, "file": "check.mp3", "volume": 0.6, "title": "Confirmation tone"},
  "done": {"kind": "sfx", "id": 951, "file": "done.mp3", "volume": 0.6, "title": "Positive notification"},
  "shine": {"kind": "sfx", "id": 2633, "file": "shine.mp3", "volume": 0.7, "title": "Sweeping sparkle presentation intro"}
}
```

`scripts/fetch-audio.mjs`：

```js
// Downloads the Mixkit music and sound effects listed in src/audio.json into public/audio/.
// The files are not committed: Mixkit's licenses forbid redistributing them on their own or with source files.
// curl does the download so HTTPS_PROXY is honoured.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(`${root}src/audio.json`, 'utf8'));
const ifMissing = process.argv.includes('--if-missing');

const sourceUrl = ({kind, id}) =>
  kind === 'music'
    ? `https://assets.mixkit.co/music/${id}/${id}.mp3`
    : `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;

mkdirSync(`${root}public/audio`, {recursive: true});
for (const [key, item] of Object.entries(manifest)) {
  const dest = `${root}public/audio/${item.file}`;
  if (ifMissing && existsSync(dest)) continue;
  execFileSync('curl', ['-fsSL', '--retry', '2', '-o', dest, sourceUrl(item)], {stdio: 'inherit'});
  console.log(`${key}: ${item.title} -> public/audio/${item.file}`);
}
```

运行：

```bash
npm run fetch-audio && ls -la public/audio
```

Expected: 打印 9 行 `key: title -> public/audio/...`，`public/audio` 里有 9 个非空 mp3；`git status --short public/audio` 没有输出（已被忽略）。

- [ ] **Step 4: 写会失败的测试**

`src/lib/timing.test.ts` 整个替换为：

```ts
import {describe, expect, it} from 'vitest';
import {activeIndex, beatFrame, bump, speedBlur, typedText} from './timing';

describe('beatFrame', () => {
  it('maps 128 BPM beats onto 30 fps frames', () => {
    expect(beatFrame(96, 30, 128)).toBe(1350);
    expect(beatFrame(8, 30, 128)).toBe(113);
    expect(beatFrame(2.5, 30, 128)).toBe(35);
  });
});

describe('typedText', () => {
  it('shows nothing before typing starts', () => {
    expect(typedText('abcdef', 0, 30, 30)).toBe('');
    expect(typedText('abcdef', -10, 30, 30)).toBe('');
  });
  it('reveals cps characters per second and never overruns', () => {
    expect(typedText('abcdef', 2, 30, 30)).toBe('ab');
    expect(typedText('abcdef', 999, 30, 30)).toBe('abcdef');
  });
});

describe('activeIndex', () => {
  it('picks the last shot that has started', () => {
    expect(activeIndex([0, 36, 69], -5)).toBe(0);
    expect(activeIndex([0, 36, 69], 36)).toBe(1);
    expect(activeIndex([0, 36, 69], 500)).toBe(2);
  });
});

describe('bump', () => {
  it('rises to 1 and falls back to 0', () => {
    expect(bump(-1)).toBe(0);
    expect(bump(0)).toBe(0);
    expect(bump(3)).toBe(1);
    expect(bump(5.5)).toBeCloseTo(0.5);
    expect(bump(8)).toBe(0);
    expect(bump(20)).toBe(0);
  });
});

describe('speedBlur', () => {
  it('grows with speed in either direction and is capped', () => {
    expect(speedBlur(0)).toBe(0);
    expect(speedBlur(24)).toBe(2);
    expect(speedBlur(-24)).toBe(2);
    expect(speedBlur(1000)).toBe(14);
  });
});
```

`src/script.test.ts` 整个替换为：

```ts
import {describe, expect, it} from 'vitest';
import audio from './audio.json';
import {CUES, MUSIC, MUSIC_TRIM_BEFORE, SCENE_BEATS, SCENE_ORDER, TOTAL_FRAMES, at, beat, cueFrame, sceneLength, sceneStart} from './script';

describe('timeline', () => {
  it('runs 96 beats, exactly 45 seconds', () => {
    expect(TOTAL_FRAMES).toBe(1350);
  });

  it('scenes tile the film in order with no gaps', () => {
    expect([...SCENE_ORDER]).toEqual(Object.keys(SCENE_BEATS));
    expect(SCENE_ORDER.reduce((sum, s) => sum + sceneLength(s), 0)).toBe(TOTAL_FRAMES);
  });

  it('starts the music on the planned track beat and lands the drop on the second scene', () => {
    expect(MUSIC_TRIM_BEFORE).toBe(2375);
    expect(SCENE_BEATS.restyle).toBe(MUSIC.dropBeat);
  });

  it('scene-relative beats land on the absolute beat grid', () => {
    for (const s of SCENE_ORDER) {
      for (const b of [0, 0.5, 1, 2.5, 4]) expect(sceneStart(s) + at(s, b), `${s}@${b}`).toBe(beat(SCENE_BEATS[s] + b));
    }
  });
});

describe('sound', () => {
  it('every cue plays inside the film', () => {
    for (const c of CUES) {
      expect(cueFrame(c), `${c.sfx}@${c.scene}`).toBeGreaterThanOrEqual(0);
      expect(cueFrame(c) + c.frames, `${c.sfx}@${c.scene}`).toBeLessThanOrEqual(TOTAL_FRAMES);
    }
  });

  it('every cue has a sound file with a sane volume', () => {
    for (const [key, item] of Object.entries(audio)) {
      expect(item.file, key).toMatch(/\.mp3$/);
      expect(item.volume, key).toBeGreaterThan(0);
      expect(item.volume, key).toBeLessThanOrEqual(1);
    }
    for (const c of CUES) expect(Object.keys(audio)).toContain(c.sfx);
  });
});
```

- [ ] **Step 5: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`beatFrame`、`bump`、`speedBlur` 不存在（`is not a function`），`script.test.ts` 报 `MUSIC` 等未导出。

- [ ] **Step 6: 写 timing.ts 和 script.ts**

`src/lib/timing.ts` 整个替换为：

```ts
// Pure frame math, free of Remotion imports so vitest can run it in Node.

export const beatFrame = (beat: number, fps: number, bpm: number): number => Math.round((beat * 60 * fps) / bpm);

export const typedText = (text: string, frame: number, fps: number, cps: number): string => {
  if (frame <= 0) return '';
  return text.slice(0, Math.floor((frame * cps) / fps));
};

export const activeIndex = (starts: readonly number[], frame: number): number => {
  let idx = 0;
  starts.forEach((s, i) => {
    if (frame >= s) idx = i;
  });
  return idx;
};

// Triangle pulse: 0 → 1 over `rise` frames, back to 0 by `fall`. Used for on-beat punches.
export const bump = (frame: number, rise = 3, fall = 8): number => {
  if (frame <= 0 || frame >= fall) return 0;
  return frame <= rise ? frame / rise : 1 - (frame - rise) / (fall - rise);
};

// Blur radius for an element that moved `delta` px since the last frame: reads as motion blur at no render cost.
export const speedBlur = (delta: number, pxPerUnit = 12, max = 14): number => Math.min(max, Math.abs(delta) / pxPerUnit);
```

`src/script.ts` 整个替换为：

```ts
// Every on-screen word and every timing lives here, so copy and pacing edits never touch scene code.
// Timings are in beats of the soundtrack (128 BPM); scene data uses beats relative to the scene's first beat.

import {beatFrame} from './lib/timing';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 128;
export const TOTAL_BEATS = 96; // 24 bars = 45 s

// Mixkit "Karma": its 128 BPM grid starts at 0.4145 s. Track beat 168 (79.16 s) opens the film, the full
// drums land on track beat 176 (film beat 8) and the last hit is track beat 256 (film beat 88).
export const MUSIC = {firstBeatSec: 0.4145, startBeat: 168, dropBeat: 8, lastHitBeat: 88, fadeFrames: 15};
export const MUSIC_TRIM_BEFORE = Math.round((MUSIC.firstBeatSec + (MUSIC.startBeat * 60) / BPM) * FPS);

export const beat = (b: number) => beatFrame(b, FPS, BPM);
export const TOTAL_FRAMES = beat(TOTAL_BEATS);

export const SCENE_BEATS = {hook: 0, restyle: 8, how: 40, save: 56, mosaic: 72, end: 84} as const;
export type SceneName = keyof typeof SCENE_BEATS;
export const SCENE_ORDER: readonly SceneName[] = ['hook', 'restyle', 'how', 'save', 'mosaic', 'end'];

export const sceneStart = (s: SceneName) => beat(SCENE_BEATS[s]);
export const sceneLength = (s: SceneName) => {
  const next = SCENE_ORDER[SCENE_ORDER.indexOf(s) + 1];
  return (next ? sceneStart(next) : TOTAL_FRAMES) - sceneStart(s);
};
// Frame of a scene-relative beat, counted from the scene's first frame.
export const at = (s: SceneName, b: number) => beat(SCENE_BEATS[s] + b) - sceneStart(s);

export const domainOf = (url: string) => url.split('/')[0];

export type Line = {beat: number; text: string};
export type StickerColor = 'sun' | 'cyan' | 'magenta' | 'white';
export type SfxKey = 'click' | 'typing' | 'sparkle' | 'whoosh' | 'pop' | 'check' | 'done' | 'shine';
export type Cue = {sfx: SfxKey; scene: SceneName; beat: number; frames: number};

export const CUES: readonly Cue[] = [];
export const cueFrame = (c: Cue) => sceneStart(c.scene) + at(c.scene, c.beat);
```

- [ ] **Step 7: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（timing 6 组、script 6 个测试；`CUES` 为空时两个 sound 测试也通过）。

- [ ] **Step 8: 删 v1 文件，写主题、布局、背景、音轨、Promo**

```bash
git rm -q src/components/Bubble.tsx src/components/BrowserFrame.tsx src/components/Dots.tsx src/components/Grain.tsx src/components/Headline.tsx src/components/Scene.tsx src/components/SidePanel.tsx src/components/TermLines.tsx src/components/Terminal.tsx src/components/TypeLine.tsx src/scenes/*.tsx
```

`src/theme.ts` 整个替换为：

```ts
import {loadFont as loadDisplay} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadUi} from '@remotion/google-fonts/Inter';
import type {StickerColor} from './script';

// Butterfly-logo colors on a lilac ground (style frame B).
export const C = {
  lilac: '#F1ECFF',
  ink: '#1B1033',
  inkSoft: '#5B4F73',
  magenta: '#FF5FA2',
  violet: '#8B5CF6',
  cyan: '#22D3EE',
  sun: '#FFD84D',
  white: '#FFFFFF',
  // Side panel, redrawn from the product's light theme.
  panelText: '#1D1D1F',
  panelMuted: '#86868B',
  panelLine: '#ECECF0',
  bubble: '#FDECE6',
  bubbleText: '#3A2219',
  ok: '#2E9D57',
  okSoft: '#E8F6EC',
  send: '#E8735A',
};

export const STICKER: Record<StickerColor, {bg: string; fg: string}> = {
  sun: {bg: C.sun, fg: C.ink},
  cyan: {bg: C.cyan, fg: C.ink},
  magenta: {bg: C.magenta, fg: C.white},
  white: {bg: C.white, fg: C.ink},
};

// The restyle seam (style frame A): a soft glow plus a bright core.
export const IRIDESCENT = `linear-gradient(180deg, ${C.magenta}, ${C.violet} 45%, ${C.cyan} 80%, ${C.sun})`;
export const IRIDESCENT_CORE = 'linear-gradient(180deg, #FFB3D4, #C4B5FD 45%, #A5F3FC 80%, #FFF1B8)';

export const FONT = {
  display: loadDisplay('normal', {weights: ['500', '800'], subsets: ['latin']}).fontFamily,
  ui: loadUi('normal', {weights: ['400', '500', '600'], subsets: ['latin']}).fontFamily,
};

// POP overshoots (stickers, cards, tiles); SETTLE glides to rest (windows, camera moves).
export const POP = {damping: 12, stiffness: 180};
export const SETTLE = {damping: 200};
```

`src/layout.ts`：

```ts
// Stage positions (px on 1920×1080) for elements that carry across scenes.
export const HERO = {left: 210, top: 140, width: 1500, height: 800}; // S1 window, and S2's until it moves aside
export const STAGE_B = {left: 870, top: 180, scale: 0.64, rotate: -2.5}; // S2 window after the move (style frame B)
export const PANEL_W = 320;
```

`src/components/Backdrop.tsx`：

```tsx
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C} from '../theme';

// Four blurred blobs drifting on slow, different periods so the frame is never fully still.
const BLOBS = [
  {color: C.magenta, size: 700, x: -120, y: 520, dx: 70, dy: 40, period: 9},
  {color: C.cyan, size: 640, x: 1300, y: -200, dx: -60, dy: 60, period: 11},
  {color: C.sun, size: 520, x: 820, y: 700, dx: 80, dy: -40, period: 8},
  {color: C.violet, size: 600, x: 420, y: -260, dx: -50, dy: 50, period: 13},
];

export const Backdrop = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.lilac, overflow: 'hidden'}}>
      {BLOBS.map((b) => {
        const t = ((frame / fps) * 2 * Math.PI) / b.period;
        return (
          <div
            key={b.color}
            style={{position: 'absolute', left: b.x + Math.sin(t) * b.dx, top: b.y + Math.cos(t) * b.dy, width: b.size, height: b.size, borderRadius: '50%', background: b.color, filter: 'blur(110px)', opacity: 0.6}}
          />
        );
      })}
    </AbsoluteFill>
  );
};
```

`src/Soundtrack.tsx`：

```tsx
import {Audio} from '@remotion/media';
import {Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import audio from './audio.json';
import {CUES, MUSIC, MUSIC_TRIM_BEFORE, TOTAL_FRAMES, cueFrame} from './script';

export const Soundtrack = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [TOTAL_FRAMES - MUSIC.fadeFrames, TOTAL_FRAMES], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <Audio src={staticFile(`audio/${audio.music.file}`)} trimBefore={MUSIC_TRIM_BEFORE} volume={audio.music.volume * fade} />
      {CUES.map((c, i) => (
        <Sequence key={i} from={cueFrame(c)} durationInFrames={c.frames} layout="none">
          <Audio src={staticFile(`audio/${audio[c.sfx].file}`)} volume={audio[c.sfx].volume} />
        </Sequence>
      ))}
    </>
  );
};
```

`src/Promo.tsx` 整个替换为：

```tsx
import type {ComponentType} from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {Backdrop} from './components/Backdrop';
import {SCENE_ORDER, type SceneName, sceneLength} from './script';
import {Soundtrack} from './Soundtrack';

const SCENES: Partial<Record<SceneName, ComponentType>> = {};

export const Promo = () => (
  <AbsoluteFill>
    <Backdrop />
    <Series>
      {SCENE_ORDER.map((name) => {
        const Scene = SCENES[name];
        return (
          <Series.Sequence key={name} durationInFrames={sceneLength(name)}>
            {Scene ? <Scene /> : null}
          </Series.Sequence>
        );
      })}
    </Series>
    <Soundtrack />
  </AbsoluteFill>
);
```

- [ ] **Step 9: 验证背景和音轨**

```bash
npm test && npm run typecheck
npx remotion still src/index.ts Promo out/v2-t1.png --frame=200
npx remotion render src/index.ts Promo out/v2-t1.mp4 --frames=0-149
npx remotion ffprobe out/v2-t1.mp4
```

Expected: 测试和类型检查通过；`out/v2-t1.png` 是淡紫底上 4 团模糊色斑，和样帧 B 的底色一致；ffprobe 输出里有 `Audio: aac` 流。如果 `@remotion/media` 的 `<Audio>` 类型检查或渲染出错，改用 `remotion` 包里的 `Html5Audio`（参数相同），并在 ledger 记一条 Ruling。

- [ ] **Step 10: 提交**

```bash
git add -A .gitignore package.json package-lock.json tsconfig.json scripts src ../docs/superpowers/specs/2026-10-15-promo-video-v2-design.md
git commit -m "feat(video): v2 foundation with beat grid, audio manifest and backdrop"
```

---

### Task 2: 共享组件和 S1 钩子

**Files:**
- Create: `src/components/{Window,Shot,SeamReveal,Sticker,Headline,Cursor,SidePanel}.tsx`（`Shot.tsx` 若仍存在就保留不动）
- Create: `src/scenes/S1Hook.tsx`
- Modify: `src/script.ts`（`ORIGINAL_SHOT`、`PLACEHOLDER`、`PANEL_STEPS`、`HOOK`、`CUES`）、`src/script.test.ts`、`src/Promo.tsx`

**Interfaces:**
- Consumes: Task 1 全部导出
- Produces:
  - `<Window url width height style?>{children}</Window>`（默认 `position: absolute`）、`BAR = 48`
  - `<Shot file style? />`（铺满 `position: relative` 的父元素，左上对齐裁切）
  - `<SeamReveal from to progress width height />`
  - `<Sticker text at color rotate? size? style? />`（`at` 是出现帧，带 POP 弹出）
  - `<Headline text at size weight? style? />`（`\n` 换行，逐词弹入，每词间隔 3 帧）
  - `<Cursor x y pressed />`
  - `<SidePanel domain prompt? typed? stepsAt? width? />`、`STEPS_DONE`
  - `script.ts`：`ORIGINAL_SHOT`、`PLACEHOLDER`、`PANEL_STEPS`、`HOOK = {url, prompt, cursorBeat, typeBeat, typeCps, clickBeat}`

- [ ] **Step 1: 写会失败的测试**

`src/script.test.ts` 的 import 改为：

```ts
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import audio from './audio.json';
import {CUES, FPS, HOOK, MUSIC, MUSIC_TRIM_BEFORE, ORIGINAL_SHOT, SCENE_BEATS, SCENE_ORDER, TOTAL_FRAMES, at, beat, cueFrame, sceneLength, sceneStart} from './script';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
```

文件末尾加：

```ts
describe('hook', () => {
  it('types the prompt fully before the click', () => {
    const typingEnd = at('hook', HOOK.typeBeat) + Math.ceil((HOOK.prompt.length * FPS) / HOOK.typeCps);
    expect(typingEnd + 5).toBeLessThanOrEqual(at('hook', HOOK.clickBeat));
    expect(HOOK.clickBeat).toBeLessThan(SCENE_BEATS.restyle - SCENE_BEATS.hook);
  });

  it('plays typing and click sounds', () => {
    expect(CUES.filter((c) => c.scene === 'hook').map((c) => c.sfx)).toEqual(['typing', 'click']);
  });
});

describe('assets', () => {
  it('every referenced image exists in public/', () => {
    for (const f of ['logo.png', `shots/${ORIGINAL_SHOT}`]) expect(existsSync(publicDir + f), f).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`HOOK` / `ORIGINAL_SHOT` 未定义。

- [ ] **Step 3: 在 script.ts 加 S1 数据**

把 `export const CUES: readonly Cue[] = [];` 这一行替换为：

```ts
const GITHUB = 'github.com/StyleSwift/StyleSwift';
export const ORIGINAL_SHOT = 'github-original.jpg';
export const PLACEHOLDER = 'Describe a look…';
// The side panel's steps, in plain words (no tool names).
export const PANEL_STEPS: readonly string[] = ['Reads the page', 'Picks colors & fonts', "Checks it's easy to read"];

export const HOOK = {url: GITHUB, prompt: 'make it Y2K', cursorBeat: 2, typeBeat: 3, typeCps: 9, clickBeat: 7};
const HOOK_CUES: Cue[] = [
  {sfx: 'typing', scene: 'hook', beat: HOOK.typeBeat, frames: Math.ceil((HOOK.prompt.length * FPS) / HOOK.typeCps)},
  {sfx: 'click', scene: 'hook', beat: HOOK.clickBeat, frames: 30},
];

export const CUES: readonly Cue[] = [...HOOK_CUES];
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（打字在第 79 帧结束，点击在第 98 帧）。

- [ ] **Step 5: 写共享组件**

`src/components/Shot.tsx`（v1 已有就保持原样）：

```tsx
import type {CSSProperties} from 'react';
import {Img, staticFile} from 'remotion';

// Fills its position:relative parent; screenshots keep their top-left corner and are never stretched.
export const Shot = ({file, style}: {file: string; style?: CSSProperties}) => (
  <Img src={staticFile(`shots/${file}`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left top', ...style}} />
);
```

`src/components/Window.tsx`：

```tsx
import type {CSSProperties, ReactNode} from 'react';
import {C, FONT} from '../theme';

export const BAR = 48; // title bar height, including its 2px rule

type Props = {url: string; width: number; height: number; children: ReactNode; style?: CSSProperties};

export const Window = ({url, width, height, children, style}: Props) => (
  <div
    style={{position: 'absolute', width, height, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 26, background: C.white, boxShadow: `0 40px 80px -20px rgba(60,20,120,.35), 0 0 0 2px ${C.ink}`, ...style}}
  >
    <div style={{height: BAR, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', borderBottom: `2px solid ${C.ink}`}}>
      <div style={{display: 'flex', gap: 8}}>
        {[C.magenta, C.sun, C.cyan].map((c) => (
          <span key={c} style={{width: 13, height: 13, boxSizing: 'border-box', borderRadius: '50%', border: `2px solid ${C.ink}`, background: c}} />
        ))}
      </div>
      <div style={{fontFamily: FONT.ui, fontSize: 16, color: C.inkSoft}}>{url}</div>
    </div>
    <div style={{flex: 1, minHeight: 0, display: 'flex'}}>{children}</div>
  </div>
);
```

`src/components/SeamReveal.tsx`：

```tsx
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
```

`src/components/Sticker.tsx`：

```tsx
import type {CSSProperties} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {StickerColor} from '../script';
import {C, FONT, POP, STICKER} from '../theme';

type Props = {text: string; at: number; color: StickerColor; rotate?: number; size?: number; style?: CSSProperties};

export const Sticker = ({text, at, color, rotate = 0, size = 30, style}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const s = spring({frame: frame - at, fps, config: POP});
  return (
    <div
      style={{position: 'absolute', padding: `${size * 0.45}px ${size * 0.85}px`, borderRadius: 999, border: `2.5px solid ${C.ink}`, boxShadow: `4px 5px 0 ${C.ink}`, background: STICKER[color].bg, color: STICKER[color].fg, fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap', transform: `rotate(${rotate}deg) scale(${s})`, ...style}}
    >
      {text}
    </div>
  );
};
```

`src/components/Headline.tsx`：

```tsx
import type {CSSProperties} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, POP} from '../theme';

type Props = {text: string; at: number; size: number; weight?: 500 | 800; style?: CSSProperties};

// Words spring up one after another, 3 frames apart; "\n" breaks lines.
export const Headline = ({text, at, size, weight = 800, style}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let index = 0;
  return (
    <div style={{fontFamily: FONT.display, fontWeight: weight, fontSize: size, lineHeight: weight === 800 ? 0.95 : 1.25, letterSpacing: weight === 800 ? '-0.04em' : '-0.01em', color: C.ink, ...style}}>
      {text.split('\n').map((line) => (
        <div key={line} style={{whiteSpace: 'nowrap'}}>
          {line.split(' ').map((word, i) => {
            const s = spring({frame: frame - at - 3 * index++, fps, config: POP});
            return (
              <span key={i}>
                {i > 0 && ' '}
                <span style={{display: 'inline-block', opacity: Math.min(1, s), transform: `translateY(${(1 - s) * 24}px)`}}>{word}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
```

`src/components/Cursor.tsx`：

```tsx
import {C} from '../theme';

export const Cursor = ({x, y, pressed}: {x: number; y: number; pressed: boolean}) => (
  <svg viewBox="0 0 24 24" style={{position: 'absolute', left: x, top: y, width: 34, transformOrigin: '4px 3px', transform: `scale(${pressed ? 0.82 : 1})`, filter: 'drop-shadow(0 4px 6px rgba(27,16,51,.3))'}}>
    <path d="M3 2l7.5 19 2.2-7.3L20 11.5z" fill={C.ink} stroke={C.white} strokeWidth={1.5} strokeLinejoin="round" />
  </svg>
);
```

`src/components/SidePanel.tsx`：

```tsx
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
```

- [ ] **Step 6: 写 S1Hook，接入 Promo**

`src/scenes/S1Hook.tsx`：

```tsx
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cursor} from '../components/Cursor';
import {Shot} from '../components/Shot';
import {SidePanel} from '../components/SidePanel';
import {Window} from '../components/Window';
import {HERO} from '../layout';
import {speedBlur, typedText} from '../lib/timing';
import {HOOK, ORIGINAL_SHOT, at, domainOf} from '../script';
import {SETTLE} from '../theme';

const FLY = 700; // px the window rises from
const CURSOR_FROM = {x: 1980, y: 1120};
const SEND = {x: 1655, y: 886}; // cursor position with its tip on the panel's send button

export const S1Hook = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = (f: number) => (1 - spring({frame: f, fps, config: SETTLE, durationInFrames: 24})) * FLY;
  const cursorAt = at('hook', HOOK.cursorBeat);
  const clickAt = at('hook', HOOK.clickBeat);
  const move = spring({frame: frame - cursorAt, fps, config: SETTLE, durationInFrames: 20});
  const sent = frame >= clickAt + 3;
  const typed = sent ? '' : typedText(HOOK.prompt, frame - at('hook', HOOK.typeBeat), fps, HOOK.typeCps);
  return (
    <AbsoluteFill>
      <Window url={HOOK.url} width={HERO.width} height={HERO.height} style={{left: HERO.left, top: HERO.top, transform: `translateY(${rise(frame)}px)`, filter: `blur(${speedBlur(rise(frame - 1) - rise(frame))}px)`}}>
        <div style={{position: 'relative', flex: 1}}>
          <Shot file={ORIGINAL_SHOT} />
        </div>
        <SidePanel domain={domainOf(HOOK.url)} typed={typed} prompt={sent ? HOOK.prompt : undefined} />
      </Window>
      {frame >= cursorAt && (
        <Cursor
          x={interpolate(move, [0, 1], [CURSOR_FROM.x, SEND.x])}
          y={interpolate(move, [0, 1], [CURSOR_FROM.y, SEND.y])}
          pressed={frame >= clickAt && frame < clickAt + 4}
        />
      )}
    </AbsoluteFill>
  );
};
```

`src/Promo.tsx`：加 `import {S1Hook} from './scenes/S1Hook';`，`SCENES` 改为 `{hook: S1Hook}`。

- [ ] **Step 7: 类型检查，渲染关键帧并查看**

```bash
npm run typecheck
for f in 8 60 104; do npx remotion still src/index.ts Promo out/v2-s1-$f.png --frame=$f; done
```

逐张查看：
- `v2-s1-8`：窗口正在升起，带模糊
- `v2-s1-60`：窗口落定在画面中央；鼠标停在发送按钮上，箭头尖端对准按钮（偏了就改 `SEND`）；输入框里打出 `make it`；标题字体是 Bricolage（字形圆润的粗体，不是 Arial）
- `v2-s1-104`：输入框恢复占位文字，侧栏出现用户气泡 “make it Y2K”

- [ ] **Step 8: 提交**

```bash
git add src
git commit -m "feat(video): v2 shared components and S1 hook"
```

---

### Task 3: S2 一句话换皮肤

**Files:**
- Create: `src/scenes/S2Restyle.tsx`
- Modify: `src/script.ts`（`Shot`、`RESTYLE`、`HEADLINES`、`CUES`）、`src/script.test.ts`、`src/Promo.tsx`

**Interfaces:**
- Consumes: Task 2 的组件、`HERO`、`STAGE_B`、`PANEL_W`、`BAR`、`bump`、`activeIndex`
- Produces:
  - `type Shot = {beat, file, prompt, url, sticker: {x, y, rotate, color}}`
  - `RESTYLE = {sweepFrames, moveBeat, punchBeats, headline: Line, sub: Line, shots: readonly Shot[]}`
  - `HEADLINES: readonly (Line & {scene: SceneName})[]`（后续任务往里加）

- [ ] **Step 1: 写会失败的测试**

import 里加上 `HEADLINES, RESTYLE`。`describe('assets')` 里的文件清单改为：

```ts
    const files = ['logo.png', `shots/${ORIGINAL_SHOT}`, ...RESTYLE.shots.map((s) => `shots/${s.file}`)];
    for (const f of files) expect(existsSync(publicDir + f), f).toBe(true);
```

文件末尾加：

```ts
const WORDS_PER_SECOND = 3;
const POP_IN = 15;

describe('copy', () => {
  it('every headline stays on screen long enough to read', () => {
    for (const h of HEADLINES) {
      const words = h.text.split(/\s+/).length;
      const onScreen = sceneLength(h.scene) - at(h.scene, h.beat);
      expect(onScreen, h.text).toBeGreaterThanOrEqual(Math.ceil((words / WORDS_PER_SECOND) * FPS) + POP_IN);
    }
  });
});

describe('restyle', () => {
  it('opens on the prompt typed in the hook', () => {
    expect(RESTYLE.shots[0].prompt).toBe(HOOK.prompt);
    expect(RESTYLE.shots[0].beat).toBe(0);
  });

  it('finishes each seam sweep before the next shot and keeps shots in order', () => {
    RESTYLE.shots.forEach((s, i) => {
      const next = RESTYLE.shots[i + 1]?.beat ?? SCENE_BEATS.how - SCENE_BEATS.restyle;
      expect(at('restyle', s.beat) + RESTYLE.sweepFrames, s.file).toBeLessThanOrEqual(at('restyle', next));
    });
  });

  it('plays a sparkle on the drop, then a whoosh per shot, with a pop for every sticker', () => {
    const cues = CUES.filter((c) => c.scene === 'restyle');
    expect(cues.filter((c) => c.sfx === 'sparkle').map((c) => c.beat)).toEqual([0]);
    expect(cues.filter((c) => c.sfx === 'whoosh')).toHaveLength(RESTYLE.shots.length - 1);
    expect(cues.filter((c) => c.sfx === 'pop')).toHaveLength(RESTYLE.shots.length);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`RESTYLE` / `HEADLINES` 未定义。

- [ ] **Step 3: 在 script.ts 加 S2 数据**

在 `export const CUES` 这一行之前加：

```ts
export type Shot = {beat: number; file: string; prompt: string; url: string; sticker: {x: number; y: number; rotate: number; color: StickerColor}};

// Each shot: an iridescent seam sweeps the page into the new look and the prompt lands as a sticker.
export const RESTYLE = {
  sweepFrames: 12,
  moveBeat: 2,
  punchBeats: [4, 8, 12, 16, 20, 24, 28] as readonly number[],
  headline: {beat: 2, text: 'Any website.\nAny vibe.'},
  sub: {beat: 4, text: 'Type a feeling. Watch the page\nchange to match.'},
  shots: [
    {beat: 0, file: 'github-y2k.jpg', prompt: HOOK.prompt, url: GITHUB, sticker: {x: 1210, y: 900, rotate: 5, color: 'magenta'}},
    {beat: 8, file: 'github-matrix.jpg', prompt: 'the Matrix', url: GITHUB, sticker: {x: 140, y: 640, rotate: -6, color: 'sun'}},
    {beat: 12, file: 'github-xp.jpg', prompt: 'Windows XP', url: GITHUB, sticker: {x: 1500, y: 110, rotate: 4, color: 'cyan'}},
    {beat: 16, file: 'linuxdo-newspaper.jpg', prompt: 'old newspaper', url: 'linux.do', sticker: {x: 470, y: 790, rotate: 4, color: 'white'}},
    {beat: 20, file: 'linuxdo-bauhaus.jpg', prompt: 'Bauhaus, please', url: 'linux.do', sticker: {x: 180, y: 920, rotate: -3, color: 'cyan'}},
    {beat: 22, file: 'linuxdo-cozy.jpg', prompt: 'cozy café vibes', url: 'linux.do', sticker: {x: 780, y: 960, rotate: -5, color: 'sun'}},
    {beat: 24, file: 'douban-eink.jpg', prompt: 'e-ink reader', url: 'book.douban.com', sticker: {x: 1540, y: 960, rotate: -4, color: 'white'}},
    {beat: 26, file: 'bilibili-wes.jpg', prompt: 'Wes Anderson', url: 'www.bilibili.com', sticker: {x: 560, y: 650, rotate: 6, color: 'magenta'}},
  ] as readonly Shot[],
};
const RESTYLE_CUES: Cue[] = RESTYLE.shots.flatMap((s, i): Cue[] => [
  {sfx: i === 0 ? 'sparkle' : 'whoosh', scene: 'restyle', beat: s.beat, frames: i === 0 ? 90 : 40},
  {sfx: 'pop', scene: 'restyle', beat: s.beat, frames: 30},
]);

export const HEADLINES: readonly (Line & {scene: SceneName})[] = [
  {scene: 'restyle', ...RESTYLE.headline},
  {scene: 'restyle', ...RESTYLE.sub},
];
```

`CUES` 改为 `[...HOOK_CUES, ...RESTYLE_CUES]`。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: 写 S2Restyle，接入 Promo**

`src/scenes/S2Restyle.tsx`：

```tsx
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {SeamReveal} from '../components/SeamReveal';
import {SidePanel, STEPS_DONE} from '../components/SidePanel';
import {Sticker} from '../components/Sticker';
import {BAR, Window} from '../components/Window';
import {HERO, PANEL_W, STAGE_B} from '../layout';
import {activeIndex, bump} from '../lib/timing';
import {ORIGINAL_SHOT, RESTYLE, at, domainOf} from '../script';
import {SETTLE} from '../theme';

const PAGE = {width: HERO.width - PANEL_W, height: HERO.height - BAR};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S2Restyle = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const starts = RESTYLE.shots.map((s) => at('restyle', s.beat));
  const i = activeIndex(starts, frame);
  const shot = RESTYLE.shots[i];
  const progress = interpolate(frame - starts[i], [0, RESTYLE.sweepFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const move = spring({frame: frame - at('restyle', RESTYLE.moveBeat), fps, config: SETTLE});
  const punch = Math.max(0, ...RESTYLE.punchBeats.map((b) => bump(frame - at('restyle', b))));
  const scale = interpolate(move, [0, 1], [1, STAGE_B.scale]) * (1 + 0.025 * punch);
  return (
    <AbsoluteFill>
      <Window
        url={shot.url}
        width={HERO.width}
        height={HERO.height}
        style={{
          left: interpolate(move, [0, 1], [HERO.left, STAGE_B.left]),
          top: interpolate(move, [0, 1], [HERO.top, STAGE_B.top]),
          transformOrigin: 'top left',
          transform: `rotate(${interpolate(move, [0, 1], [0, STAGE_B.rotate])}deg) scale(${scale})`,
        }}
      >
        <SeamReveal from={i === 0 ? ORIGINAL_SHOT : RESTYLE.shots[i - 1].file} to={shot.file} progress={progress} width={PAGE.width} height={PAGE.height} />
        <SidePanel domain={domainOf(shot.url)} prompt={shot.prompt} stepsAt={STEPS_DONE} />
      </Window>
      <Headline text={RESTYLE.headline.text} at={at('restyle', RESTYLE.headline.beat)} size={124} style={{position: 'absolute', left: 110, top: 150}} />
      <Headline text={RESTYLE.sub.text} at={at('restyle', RESTYLE.sub.beat)} size={34} weight={500} style={{position: 'absolute', left: 116, top: 430}} />
      {RESTYLE.shots.map((s, k) => (
        <Sticker key={s.prompt} text={s.prompt} at={starts[k]} color={s.sticker.color} rotate={s.sticker.rotate} style={{left: s.sticker.x, top: s.sticker.y}} />
      ))}
    </AbsoluteFill>
  );
};
```

`src/Promo.tsx`：加 `import {S2Restyle} from './scenes/S2Restyle';`，`SCENES` 加 `restyle: S2Restyle`。

- [ ] **Step 6: 类型检查，渲染关键帧并查看**

S2 从第 113 帧开始（第 8 拍）。

```bash
npm run typecheck
for f in 112 119 140 250 345 445 560; do npx remotion still src/index.ts Promo out/v2-s2-$f.png --frame=$f; done
```

逐张查看：
- `v2-s2-112` 和 `v2-s2-119`：S1 最后一帧和 S2 第 6 帧的窗口位置完全一样；第 119 帧炫彩光带正扫过页面，左边是 Y2K，右边是原始页
- `v2-s2-140`：窗口正在往右下缩，标题开始逐词弹入
- `v2-s2-250` 到 `v2-s2-560`：构图接近样帧 B（左侧大标题和副标题，右侧倾斜的窗口），贴纸越积越多；**逐张检查贴纸有没有压住标题、副标题，或者彼此重叠、超出画面**。有冲突就在 `RESTYLE.shots[].sticker` 里改坐标，每改一次都重新渲染这一帧确认
- 地址栏域名和截图里的网站一致

- [ ] **Step 7: 提交**

```bash
git add src
git commit -m "feat(video): v2 S2 restyle montage with iridescent seam and stickers"
```

---

### Task 4: S3 它是怎么做到的

**Files:**
- Create: `src/scenes/S3How.tsx`
- Modify: `src/script.ts`（`HOW`、`HEADLINES`、`CUES`）、`src/script.test.ts`、`src/Promo.tsx`

**Interfaces:**
- Consumes: `Window`、`Shot`、`SidePanel`、`Sticker`、`Headline`、`speedBlur`、`RESTYLE.shots`
- Produces: `HOW = {headline: Line, shot: Shot, stepBeats, swatches, fontSample, badge}`

- [ ] **Step 1: 写会失败的测试**

import 里加上 `HOW`，文件末尾加：

```ts
describe('how', () => {
  it('explains the look the montage ended on', () => {
    expect(HOW.shot).toBe(RESTYLE.shots[RESTYLE.shots.length - 1]);
  });

  it('lights one step per bar and chimes for each', () => {
    expect(HOW.stepBeats).toEqual([4, 8, 12]);
    expect(CUES.filter((c) => c.scene === 'how').map((c) => c.sfx)).toEqual(['check', 'check', 'done']);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`HOW` 未定义。

- [ ] **Step 3: 在 script.ts 加 S3 数据**

在 `export const HEADLINES` 之前加：

```ts
// Swatches are colors sampled from the Wes Anderson screenshot itself.
export const HOW = {
  headline: {beat: 0, text: 'Just describe it.\nIt does the rest.'},
  shot: RESTYLE.shots[RESTYLE.shots.length - 1],
  stepBeats: [4, 8, 12] as readonly number[],
  swatches: ['#F9F0E9', '#D4BC7C', '#A8744F', '#344165'] as readonly string[],
  fontSample: 'Aa',
  badge: 'Easy to read ✓',
};
const HOW_CUES: Cue[] = HOW.stepBeats.map((b, i): Cue => ({sfx: i < 2 ? 'check' : 'done', scene: 'how', beat: b, frames: 60}));
```

`HEADLINES` 加一项 `{scene: 'how', ...HOW.headline}`；`CUES` 改为 `[...HOOK_CUES, ...RESTYLE_CUES, ...HOW_CUES]`。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: 写 S3How，接入 Promo**

`src/scenes/S3How.tsx`：

```tsx
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Shot} from '../components/Shot';
import {SidePanel} from '../components/SidePanel';
import {Sticker} from '../components/Sticker';
import {BAR, Window} from '../components/Window';
import {speedBlur} from '../lib/timing';
import {HOW, at, domainOf} from '../script';
import {C, FONT, POP, SETTLE} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const SMALL = {left: 110, top: 420, width: 820, height: 500};
const PAGE = {left: SMALL.left, top: SMALL.top + BAR, width: SMALL.width, height: SMALL.height - BAR};
const PANEL = {left: 1200, top: 110, width: 420, height: 600, scale: 1.4};
// Magnifier route over the page, as fractions of its size: a Z.
const ROUTE = [
  [0.15, 0.2],
  [0.85, 0.2],
  [0.15, 0.8],
  [0.85, 0.8],
];
const SWATCH = {size: 64, x: 1010, y: 470, gap: 14};

const Magnifier = () => {
  const frame = useCurrentFrame();
  const start = at('how', HOW.stepBeats[0]);
  const end = at('how', HOW.stepBeats[1]);
  if (frame < start || frame > end + 10) return null;
  const p = interpolate(frame, [start, end], [0, ROUTE.length - 1], clamp);
  const k = Math.min(ROUTE.length - 2, Math.floor(p));
  const t = p - k;
  const fx = ROUTE[k][0] + (ROUTE[k + 1][0] - ROUTE[k][0]) * t;
  const fy = ROUTE[k][1] + (ROUTE[k + 1][1] - ROUTE[k][1]) * t;
  const opacity = interpolate(frame, [start, start + 6, end, end + 10], [0, 1, 1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: PAGE.left + fx * PAGE.width - 55, top: PAGE.top + fy * PAGE.height - 55, opacity}}>
      <div style={{width: 110, height: 110, boxSizing: 'border-box', borderRadius: '50%', border: `7px solid ${C.ink}`, background: 'rgba(255,255,255,.28)', boxShadow: `4px 5px 0 ${C.ink}`}} />
      <div style={{position: 'absolute', left: 92, top: 92, width: 46, height: 14, borderRadius: 7, background: C.ink, transform: 'rotate(45deg)', transformOrigin: 'left center'}} />
    </div>
  );
};

const Swatches = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = at('how', HOW.stepBeats[1]);
  const from = {x: PAGE.left + PAGE.width / 2, y: PAGE.top + PAGE.height / 2};
  const blocks = [...HOW.swatches.map((c) => ({bg: c, label: ''})), {bg: C.white, label: HOW.fontSample}];
  return (
    <>
      {blocks.map((b, k) => {
        const s = spring({frame: frame - start - 3 * k, fps, config: POP});
        if (frame < start + 3 * k) return null;
        const x = interpolate(s, [0, 1], [from.x, SWATCH.x]);
        const y = interpolate(s, [0, 1], [from.y, SWATCH.y + k * (SWATCH.size + SWATCH.gap)]);
        return (
          <div
            key={k}
            style={{position: 'absolute', left: x, top: y, width: SWATCH.size, height: SWATCH.size, boxSizing: 'border-box', borderRadius: 14, border: `2.5px solid ${C.ink}`, boxShadow: `3px 4px 0 ${C.ink}`, background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontWeight: 800, fontSize: 28, color: C.ink}}
          >
            {b.label}
          </div>
        );
      })}
    </>
  );
};

export const S3How = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const slide = (f: number) => (1 - spring({frame: f, fps, config: SETTLE, durationInFrames: 20})) * 900;
  const panelIn = spring({frame: frame - 4, fps, config: SETTLE, durationInFrames: 20});
  return (
    <AbsoluteFill>
      <Headline text={HOW.headline.text} at={at('how', HOW.headline.beat)} size={104} style={{position: 'absolute', left: 110, top: 110}} />
      <Window url={HOW.shot.url} width={SMALL.width} height={SMALL.height} style={{left: SMALL.left, top: SMALL.top, transform: `translateX(${-slide(frame)}px)`, filter: `blur(${speedBlur(slide(frame - 1) - slide(frame))}px)`}}>
        <div style={{position: 'relative', flex: 1}}>
          <Shot file={HOW.shot.file} />
        </div>
      </Window>
      <div
        style={{position: 'absolute', left: PANEL.left, top: PANEL.top, width: PANEL.width, height: PANEL.height, display: 'flex', overflow: 'hidden', borderRadius: 22, boxShadow: `0 0 0 2px ${C.ink}, 6px 8px 0 ${C.ink}`, transformOrigin: 'top left', transform: `translateX(${(1 - panelIn) * 700}px) scale(${PANEL.scale})`}}
      >
        <SidePanel domain={domainOf(HOW.shot.url)} prompt={HOW.shot.prompt} stepsAt={HOW.stepBeats.map((b) => at('how', b))} width={PANEL.width} />
      </div>
      <Magnifier />
      <Swatches />
      <Sticker text={HOW.badge} at={at('how', HOW.stepBeats[2])} color="sun" rotate={-4} size={34} style={{left: 640, top: 384}} />
    </AbsoluteFill>
  );
};
```

`src/Promo.tsx`：加 `import {S3How} from './scenes/S3How';`，`SCENES` 加 `how: S3How`。

- [ ] **Step 6: 类型检查，渲染关键帧并查看**

S3 从第 563 帧开始。

```bash
npm run typecheck
for f in 575 650 735 785; do npx remotion still src/index.ts Promo out/v2-s3-$f.png --frame=$f; done
```

逐张查看：
- `v2-s3-575`：标题在弹入，左下小窗口正在滑入，右侧放大的侧栏正在飞入
- `v2-s3-650`：放大镜在小窗口上，侧栏第一步 “Reads the page” 已出现
- `v2-s3-735`：5 个色块（4 色 +「Aa」）排成竖列，在小窗口和侧栏之间，不压住两边
- `v2-s3-785`：三步都打勾；黄色徽章 “Easy to read ✓” 压在小窗口右上角，`✓` 字形正常（如果显示成方块，在 `HOW.badge` 里去掉 ✓）；放大的侧栏没有超出画面底边

- [ ] **Step 7: 提交**

```bash
git add src
git commit -m "feat(video): v2 S3 how-it-works in plain words"
```

---

### Task 5: S4 保存风格

**Files:**
- Create: `src/components/Card.tsx`、`src/scenes/S4Save.tsx`
- Modify: `src/script.ts`（`SAVE`、`HEADLINES`、`CUES`）、`src/script.test.ts`、`src/Promo.tsx`

**Interfaces:**
- Consumes: `Shot`、`Headline`、`bump`
- Produces: `<Card file name badge? style? />`；`SAVE = {savedBeat, fanBeats, swayBeats, headline, savedLabel, saved, others}`

- [ ] **Step 1: 写会失败的测试**

import 里加上 `SAVE`。`describe('assets')` 的文件清单加上 `...[SAVE.saved, ...SAVE.others].map((c) => \`shots/${c.file}\`)`。文件末尾加：

```ts
describe('save', () => {
  it('saves the look the montage ended on', () => {
    expect(SAVE.saved.file).toBe(RESTYLE.shots[RESTYLE.shots.length - 1].file);
  });

  it('pops every card in with a sound, before the headline', () => {
    const pops = CUES.filter((c) => c.scene === 'save' && c.sfx === 'pop');
    expect(pops).toHaveLength(1 + SAVE.others.length);
    expect(Math.max(...SAVE.fanBeats)).toBeLessThan(SAVE.headline.beat);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`SAVE` 未定义。

- [ ] **Step 3: 在 script.ts 加 S4 数据**

在 `export const HEADLINES` 之前加：

```ts
export const SAVE = {
  savedBeat: 0,
  fanBeats: [2, 2.5, 3, 3.5] as readonly number[],
  swayBeats: [4, 8, 12] as readonly number[],
  headline: {beat: 4, text: 'Save a look.\nUse it anywhere.'},
  savedLabel: 'Saved',
  saved: {file: 'bilibili-wes.jpg', name: 'Wes Anderson'},
  others: [
    {file: 'github-y2k.jpg', name: 'Y2K'},
    {file: 'linuxdo-bauhaus.jpg', name: 'Bauhaus'},
    {file: 'linuxdo-cozy.jpg', name: 'Cozy'},
    {file: 'github-matrix.jpg', name: 'The Matrix'},
  ] as readonly {file: string; name: string}[],
};
const SAVE_CUES: Cue[] = [SAVE.savedBeat, ...SAVE.fanBeats].map((b): Cue => ({sfx: 'pop', scene: 'save', beat: b, frames: 30}));
```

`HEADLINES` 加 `{scene: 'save', ...SAVE.headline}`；`CUES` 末尾加 `...SAVE_CUES`。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: 写 Card 和 S4Save，接入 Promo**

`src/components/Card.tsx`：

```tsx
import type {CSSProperties} from 'react';
import {C, FONT} from '../theme';
import {Shot} from './Shot';

export const CARD = {width: 300, height: 256};

export const Card = ({file, name, badge, style}: {file: string; name: string; badge?: string; style?: CSSProperties}) => (
  <div
    style={{position: 'absolute', width: CARD.width, height: CARD.height, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 22, border: `2.5px solid ${C.ink}`, boxShadow: `5px 6px 0 ${C.ink}`, background: C.white, ...style}}
  >
    <div style={{position: 'relative', flex: 1}}>
      <Shot file={file} />
    </div>
    <div style={{height: 62, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderTop: `2.5px solid ${C.ink}`, fontFamily: FONT.display, fontWeight: 800, fontSize: 25, color: C.ink, whiteSpace: 'nowrap'}}>
      {name}
      {badge && <span style={{padding: '4px 10px', borderRadius: 999, border: `2px solid ${C.ink}`, background: C.sun, fontFamily: FONT.ui, fontWeight: 600, fontSize: 14}}>{badge}</span>}
    </div>
  </div>
);
```

`src/scenes/S4Save.tsx`：

```tsx
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CARD, Card} from '../components/Card';
import {Headline} from '../components/Headline';
import {bump} from '../lib/timing';
import {SAVE, at} from '../script';
import {POP, SETTLE} from '../theme';

const CENTER = {x: 960, y: 660};
// Fan slots left to right; the saved card takes the middle slot (index 2) and sits on top.
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
    };
  };
  const saved = spring({frame: frame - at('save', SAVE.savedBeat), fps, config: SETTLE, durationInFrames: 18});
  return (
    <AbsoluteFill>
      <Headline text={SAVE.headline.text} at={at('save', SAVE.headline.beat)} size={104} style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center'}} />
      {SAVE.others.map((c, k) => {
        const start = at('save', SAVE.fanBeats[k]);
        if (frame < start) return null;
        return <Card key={c.name} file={c.file} name={c.name} style={place(OTHER_SLOTS[k], spring({frame: frame - start, fps, config: POP}), 1)} />;
      })}
      <Card
        file={SAVE.saved.file}
        name={SAVE.saved.name}
        badge={SAVE.savedLabel}
        style={{...place(2, 1, interpolate(saved, [0, 1], [2.4, 1])), opacity: Math.min(1, saved * 3), zIndex: 1}}
      />
    </AbsoluteFill>
  );
};
```

`src/Promo.tsx`：加 `import {S4Save} from './scenes/S4Save';`，`SCENES` 加 `save: S4Save`。

- [ ] **Step 6: 类型检查，渲染关键帧并查看**

S4 从第 788 帧开始。

```bash
npm run typecheck
for f in 795 830 900 1000; do npx remotion still src/index.ts Promo out/v2-s4-$f.png --frame=$f; done
```

逐张查看：
- `v2-s4-795`：中间的 “Wes Anderson” 卡正在从大缩小
- `v2-s4-830`：其他卡正在扇形展开
- `v2-s4-900`：5 张卡完整展开，标题在上方居中、和卡片不重叠；中间卡 “Wes Anderson” 和 “Saved” 标签都在卡内（放不下就把 `Card` 的 `fontSize` 改成 22）
- `v2-s4-1000`：卡组仍完整，没有超出画面

- [ ] **Step 7: 提交**

```bash
git add src
git commit -m "feat(video): v2 S4 saved looks as a fanned card deck"
```

---

### Task 6: S5 拼贴高潮和 S6 结尾卡

**Files:**
- Create: `src/scenes/S5Mosaic.tsx`、`src/scenes/S6End.tsx`
- Modify: `src/script.ts`（`MOSAIC`、`END`、`HEADLINES`、`CUES`）、`src/script.test.ts`、`src/Promo.tsx`

**Interfaces:**
- Consumes: `Shot`、`Headline`、`Sticker`、`bump`、`IRIDESCENT`、`RESTYLE.shots`
- Produces: `MOSAIC = {tileBeats, punchBeats, headline}`；`END = {logoBeat, sweepFrames, name, tagline, cta, note}`

- [ ] **Step 1: 写会失败的测试**

import 里加上 `END, MOSAIC`，文件末尾加：

```ts
describe('finale', () => {
  it('pops one tile per shot and a sound on each whole beat', () => {
    expect(MOSAIC.tileBeats).toHaveLength(RESTYLE.shots.length);
    expect(CUES.filter((c) => c.scene === 'mosaic').map((c) => c.beat)).toEqual([0, 1, 2, 3]);
  });

  it('puts the call to action on the last hit of the music', () => {
    expect(SCENE_BEATS.end + END.cta.beat).toBe(MUSIC.lastHitBeat);
    expect(CUES.filter((c) => c.scene === 'end').map((c) => c.sfx)).toEqual(['shine']);
  });

  it('mentions the local engines only in the end-card note', () => {
    expect(END.note.text).toMatch(/Claude Code/);
    expect(HEADLINES.filter((h) => /Claude Code|Codex/.test(h.text))).toEqual([{scene: 'end', ...END.note}]);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`MOSAIC` / `END` 未定义。

- [ ] **Step 3: 在 script.ts 加 S5、S6 数据**

在 `export const HEADLINES` 之前加：

```ts
export const MOSAIC = {
  tileBeats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] as readonly number[],
  punchBeats: [0, 4, 8] as readonly number[],
  headline: {beat: 4, text: 'Make the web\nfeel like yours.'},
};
const MOSAIC_CUES: Cue[] = MOSAIC.tileBeats.filter(Number.isInteger).map((b): Cue => ({sfx: 'pop', scene: 'mosaic', beat: b, frames: 30}));

export const END = {
  logoBeat: 0,
  sweepFrames: 16,
  name: {beat: 1, text: 'StyleSwift'},
  tagline: {beat: 2, text: 'Restyle any website with one sentence.'},
  cta: {beat: 4, text: 'Free on the Chrome Web Store'},
  note: {beat: 4.5, text: 'Works with Claude Code, Codex and more.'},
};
const END_CUES: Cue[] = [{sfx: 'shine', scene: 'end', beat: END.logoBeat, frames: 60}];
```

`HEADLINES` 末尾加：

```ts
  {scene: 'mosaic', ...MOSAIC.headline},
  {scene: 'end', ...END.name},
  {scene: 'end', ...END.tagline},
  {scene: 'end', ...END.cta},
  {scene: 'end', ...END.note},
```

`CUES` 改为 `[...HOOK_CUES, ...RESTYLE_CUES, ...HOW_CUES, ...SAVE_CUES, ...MOSAIC_CUES, ...END_CUES]`。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（页脚小字 7 个词需要 85 帧，实际停留 105 帧）。

- [ ] **Step 5: 写 S5Mosaic 和 S6End，接入 Promo**

`src/scenes/S5Mosaic.tsx`：

```tsx
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Shot} from '../components/Shot';
import {bump} from '../lib/timing';
import {MOSAIC, RESTYLE, at} from '../script';
import {C, POP} from '../theme';

const TILE = {width: 400, height: 250, gap: 28, left: 118, top: 300};

export const S5Mosaic = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const punch = Math.max(0, ...MOSAIC.punchBeats.map((b) => bump(frame - at('mosaic', b))));
  const headlineAt = at('mosaic', MOSAIC.headline.beat);
  const box = spring({frame: frame - headlineAt, fps, config: POP});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${1 + 0.02 * punch})`}}>
        {RESTYLE.shots.map((s, k) => {
          const start = at('mosaic', MOSAIC.tileBeats[k]);
          if (frame < start) return null;
          return (
            <div
              key={s.file}
              style={{position: 'absolute', left: TILE.left + (k % 4) * (TILE.width + TILE.gap), top: TILE.top + Math.floor(k / 4) * (TILE.height + TILE.gap), width: TILE.width, height: TILE.height, overflow: 'hidden', borderRadius: 18, border: `2.5px solid ${C.ink}`, boxShadow: `4px 5px 0 ${C.ink}`, transform: `scale(${spring({frame: frame - start, fps, config: POP})})`}}
            >
              <Shot file={s.file} />
            </div>
          );
        })}
      </AbsoluteFill>
      {frame >= headlineAt && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{padding: '30px 56px', borderRadius: 32, border: `3px solid ${C.ink}`, boxShadow: `6px 8px 0 ${C.ink}`, background: C.white, textAlign: 'center', transform: `scale(${box})`}}>
            <Headline text={MOSAIC.headline.text} at={headlineAt} size={96} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
```

`src/scenes/S6End.tsx`：

```tsx
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Sticker} from '../components/Sticker';
import {END, at} from '../script';
import {C, FONT, IRIDESCENT, POP} from '../theme';

const LOGO = 200;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S6End = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logoAt = at('end', END.logoBeat);
  const pop = spring({frame: frame - logoAt, fps, config: POP});
  const sweep = interpolate(frame - logoAt, [0, END.sweepFrames], [-80, LOGO + 80], clamp);
  const centered = {position: 'absolute', left: 0, right: 0, textAlign: 'center'} as const;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: (1920 - LOGO) / 2, top: 150, width: LOGO, height: LOGO, overflow: 'hidden', transform: `scale(${pop})`}}>
        <Img src={staticFile('logo.png')} style={{width: LOGO, height: LOGO}} />
        {frame - logoAt < END.sweepFrames && (
          <div style={{position: 'absolute', top: -20, bottom: -20, left: sweep, width: 50, background: IRIDESCENT, filter: 'blur(8px)', opacity: 0.9, mixBlendMode: 'screen', transform: 'skewX(-12deg)'}} />
        )}
      </div>
      <Headline text={END.name.text} at={at('end', END.name.beat)} size={150} style={{...centered, top: 390}} />
      <Headline text={END.tagline.text} at={at('end', END.tagline.beat)} size={52} weight={500} style={{...centered, top: 560}} />
      <div style={{position: 'absolute', top: 680, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Sticker text={END.cta.text} at={at('end', END.cta.beat)} color="sun" size={36} style={{position: 'relative'}} />
      </div>
      <Headline text={END.note.text} at={at('end', END.note.beat)} size={26} weight={500} style={{...centered, top: 800, fontFamily: FONT.ui, color: C.inkSoft}} />
    </AbsoluteFill>
  );
};
```

`src/Promo.tsx`：加 `S5Mosaic`、`S6End` 两个 import；`SCENES` 的类型从 `Partial<Record<SceneName, ComponentType>>` 改成 `Record<SceneName, ComponentType>`，内容是全部 6 个镜头；渲染处的 `{Scene ? <Scene /> : null}` 改成 `<Scene />`。

- [ ] **Step 6: 类型检查，渲染关键帧并查看**

S5 从第 1013 帧开始，S6 从第 1181 帧开始。

```bash
npm run typecheck
for f in 1030 1100 1160 1188 1260 1340; do npx remotion still src/index.ts Promo out/v2-s56-$f.png --frame=$f; done
```

逐张查看：
- `v2-s56-1030`：拼贴墙的格子正在逐个弹出
- `v2-s56-1100` 和 `v2-s56-1160`：8 格完整的墙，中间压着白底标题框，标题框没有超出画面
- `v2-s56-1188`：炫彩光带正扫过蝴蝶 logo
- `v2-s56-1260` 和 `v2-s56-1340`：logo、StyleSwift、标语、黄色 CTA 贴纸、小字依次排列、都居中，彼此不重叠

- [ ] **Step 7: 提交**

```bash
git add src
git commit -m "feat(video): v2 S5 mosaic and S6 end card"
```

---

### Task 7: 成片、混音检查、README

**Files:**
- Rewrite: `styleswift-intro-video/README.md`
- Modify: `docs/superpowers/specs/2026-10-15-promo-video-v2-design.md`（状态改为“已实现”）

- [ ] **Step 1: 测试、类型检查、镜头交界**

```bash
npm test && npm run typecheck
for f in 112 113 562 563 787 788 1012 1013 1180 1181; do npx remotion still src/index.ts Promo out/v2-cut-$f.png --frame=$f; done
```

把 10 张拼成一张缩略图查看：S1→S2（112/113）窗口位置不跳；其他交界处，前一个镜头的最后一帧画面完整，后一个镜头的第一帧元素正在入场，没有整屏空白超过半拍。

- [ ] **Step 2: 渲染成片，核对规格**

```bash
npm run render
npx remotion ffprobe out/styleswift-promo.mp4
```

Expected: `Duration: 00:00:45.0x`，视频 `h264 yuv420p(tv, bt709) 1920x1080 30 fps`，音频 `aac`。

- [ ] **Step 3: 测混音峰值**

```bash
npx remotion ffmpeg -y -loglevel error -i out/styleswift-promo.mp4 -vn -ac 2 -ar 44100 out/mix.wav
python -I -c "
import wave, numpy as np
w = wave.open('out/mix.wav'); x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, 2) / 32768
sr = w.getframerate()
peak = 20 * np.log10(np.abs(x).max())
print(f'peak {peak:.2f} dBFS')
for s in range(0, len(x) // sr):
    p = 20 * np.log10(np.abs(x[s*sr:(s+1)*sr]).max() + 1e-9)
    if p > -1: print(f'  second {s}: {p:.2f} dBFS')
"
```

Expected: `peak` ≤ -1.00 dBFS。如果超了，看打印出的是哪几秒：如果全片都超，把 `audio.json` 里 `music.volume` 降 0.1；如果只有某几秒超，降那几秒对应音效的 `volume`。改完重新执行 Step 2 和 Step 3。

- [ ] **Step 4: README**

`README.md` 整个替换为：

````markdown
# StyleSwift 宣传片

45 秒，1920×1080，30fps，带背景音乐和音效。用 [Remotion](https://www.remotion.dev/) 制作。设计文档见 `docs/superpowers/specs/2026-10-15-promo-video-v2-design.md`。

## 命令

```bash
npm install
npm run fetch-audio   # 从 Mixkit 下载音乐和音效到 public/audio/（dev 和 render 前会自动补齐缺失的文件）
npm run dev           # Remotion Studio 预览
npm test              # 校验时长、节拍、可读时间、素材
npm run render        # 输出 out/styleswift-promo.mp4
```

文案、节奏和音效触发点都在 `src/script.ts`，时间单位是拍（128 BPM，每拍 14.0625 帧）。改完跑一次 `npm test`。大标题是比例字体，测试量不到宽度，改了标题要渲染一帧看看，例如 `npx remotion still src/index.ts Promo out/check.png --frame=300`。

## 音频

| 键名 | 来源 | 用途 |
|---|---|---|
| music | Mixkit Stock Music #1183 “Karma”（Michael Ramir C.），从原曲第 79.16 秒开始 | 背景音乐 |
| click | Mixkit SFX #1113 Mouse click close | 点发送 |
| typing | Mixkit SFX #1396 Soft typing on a digital keyboard | 输入指令 |
| sparkle | Mixkit SFX #2350 Magic sparkle whoosh | 第一次变身 |
| whoosh | Mixkit SFX #1490 Fast whoosh transition | 之后每次变身 |
| pop | Mixkit SFX #3005 Explainer video pops whoosh light pop | 贴纸、卡片、拼贴格 |
| check | Mixkit SFX #2867 Confirmation tone | 步骤打勾 |
| done | Mixkit SFX #951 Positive notification | 三步完成 |
| shine | Mixkit SFX #2633 Sweeping sparkle presentation intro | 结尾 logo |

想换音效，就改 `src/audio.json` 里对应的 `id` 和 `volume`，然后运行 `npm run fetch-audio`。

**授权**：音乐使用 [Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree)，可以商用，可以用于社交媒体和网络广告，不要求署名，不能用于 CD/DVD、游戏或电视广播。音效使用 [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree)。两者都不允许单独再分发，也不允许连同源文件一起分发，所以 `public/audio/` 不进 git。

Remotion 对个人和 3 人以内的公司免费，超过需要购买公司授权：https://www.remotion.dev/license
````

- [ ] **Step 5: 更新设计文档状态，提交**

把 v2 设计文档第 4 行的 `> 状态：待评审` 改成 `> 状态：已实现`。

```bash
git add README.md ../docs/superpowers/specs/2026-10-15-promo-video-v2-design.md
git commit -m "docs(video): v2 README with audio sources and licenses"
```

- [ ] **Step 6: 交给用户带声音看一遍**

告诉用户成片路径 `styleswift-intro-video/out/styleswift-promo.mp4`，请他们带声音看一遍，重点听音效是否合适、音乐和音效的音量是否平衡。不满意的音效在 `src/audio.json` 里换 `id` 或调 `volume`。
