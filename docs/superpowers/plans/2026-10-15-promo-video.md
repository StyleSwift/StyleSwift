# StyleSwift 宣传片实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Remotion 做一支 45 秒、1920×1080、无声的 StyleSwift 宣传片，输出可直接上传 Twitter/X 的 H.264 MP4。

**Architecture:** `styleswift-intro-video/` 是独立子项目，不依赖插件代码。所有屏幕文案和帧时间表集中在纯数据文件 `src/script.ts`，由 vitest 校验时长、可读时间和素材是否存在；每个镜头是 `src/scenes/` 下的一个 React 组件，由 `src/Promo.tsx` 用 `<Series>` 顺序拼接。视觉效果靠 `npx remotion still` 渲染关键帧，再人工查看来验证。

**Tech Stack:** Remotion 4.0.535（remotion、@remotion/cli、@remotion/google-fonts）、React 19、TypeScript 5、vitest 4；素材处理用 Python PIL 和根目录已安装的 Playwright。

**Spec:** `docs/superpowers/specs/2026-10-15-promo-video-design.md`

## Global Constraints

- `remotion` 和所有 `@remotion/*` 包锁定在完全相同的版本 `4.0.535`（`--save-exact`），Remotion 要求这些包版本一致
- 成片规格：1920×1080，30fps，1350 帧（45 秒），H.264，无音轨
- 屏幕文字全部是英文；所有文案和帧时间只能写在 `src/script.ts`，镜头组件里不能出现硬编码文案
- 颜色只能用 `src/theme.ts` 里的 `C` token；字体只能用 `FONT.serif`（Instrument Serif）、`FONT.mono`（JetBrains Mono）、`FONT.sans`（Inter）
- 网页效果画面只能来自 `images/` 下的真实截图，加上 Task 2 截取的原始 GitHub 页；不得伪造任何产品效果
- 不修改 `extension/`、`bridge/`、`website/` 和根目录的 `package.json`
- 帧号一律相对于所在镜头的起点（`Series.Sequence` 内部的 `useCurrentFrame()`）
- 所有命令都在 `styleswift-intro-video/` 目录下运行（Git Bash），另有说明的除外

## Review Focus

1. **固定宽度盒子里文字溢出或换行**：大标题和终端最长的一行不能被截断或意外折行。由 Task 3–7 各自的关键帧检查步骤覆盖，检查帧都选在最长文字已完整出现的时刻。
2. **字形缺失**：`●` `⎿` `✓` `⚠` `↵` `›` `▾` 如果 JetBrains Mono 或 Inter 里没有，会显示成方块或彩色 emoji。Task 3 检查 `↵`，Task 4 检查 `✓ ›`，Task 5 检查 `● ⎿ ⚠ ✓`，Task 7 检查 `▾`，每处都写了替换字符。
3. **渲染时字体没加载上**：回落成 Times / Arial 后，片子的质感就没了。Task 4 的关键帧检查确认标题是 Instrument Serif（高对比衬线，`a` 是双层）。
4. **截图裁切或地址栏不符**：`object-fit: cover` 可能裁掉页面重点，地址栏也可能和截图里的网站对不上。Task 2 逐张核对网站，Task 4 逐个镜头检查。
5. **信息流里的可读性**：Twitter 时间线里视频大约只有 600px 宽，大标题必须仍然清楚。Task 8 把关键帧缩到 600px 宽再看。

---

### Task 1: 搭建项目骨架、时间工具函数和背景

**Files:**
- Create: `styleswift-intro-video/package.json`
- Create: `styleswift-intro-video/tsconfig.json`
- Create: `styleswift-intro-video/.gitignore`
- Create: `styleswift-intro-video/src/index.ts`
- Create: `styleswift-intro-video/src/Root.tsx`
- Create: `styleswift-intro-video/src/Promo.tsx`
- Create: `styleswift-intro-video/src/theme.ts`
- Create: `styleswift-intro-video/src/script.ts`
- Create: `styleswift-intro-video/src/lib/timing.ts`
- Create: `styleswift-intro-video/src/components/Grain.tsx`
- Test: `styleswift-intro-video/src/lib/timing.test.ts`
- Test: `styleswift-intro-video/src/script.test.ts`

**Interfaces:**
- Produces:
  - `typedText(text: string, frame: number, fps: number, cps: number): string`
  - `cutStarts(count: number, firstGap: number, lastGap: number): number[]`
  - `activeIndex(starts: readonly number[], frame: number): number`
  - `script.ts`：`FPS`、`WIDTH`、`HEIGHT`、`SCENES`（hook/restyle/agent/skills/engines/end）、`SceneName`、`TOTAL_FRAMES`
  - `theme.ts`：`C`（bg/panel/line/text/muted/accent/accentSoft/ok/warn）、`FONT`（serif/mono/sans）
  - `<Grain />`、`<Promo />`、Remotion 合成 id `Promo`

- [ ] **Step 1: 建分支，提交设计文档和本计划**

在仓库根目录运行：

```bash
git checkout -b feat/promo-video
git add docs/superpowers/specs/2026-10-15-promo-video-design.md docs/superpowers/plans/2026-10-15-promo-video.md
git commit -m "docs: promo video design and implementation plan"
```

只 add 这两个文件；工作区里其他未跟踪的文件（`CLAUDE.md`、`docs/blueprint/` 等）不要碰。

- [ ] **Step 2: 写 package.json、tsconfig.json、.gitignore**

`styleswift-intro-video/package.json`：

```json
{
  "name": "styleswift-intro-video",
  "private": true,
  "scripts": {
    "dev": "remotion studio src/index.ts",
    "render": "remotion render src/index.ts Promo out/styleswift-promo.mp4 --jpeg-quality=95",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

`styleswift-intro-video/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "noUnusedLocals": true
  },
  "include": ["src"]
}
```

`styleswift-intro-video/.gitignore`：

```
out/
```

- [ ] **Step 3: 安装依赖**

```bash
cd styleswift-intro-video
npm install --save-exact remotion@4.0.535 @remotion/cli@4.0.535 @remotion/google-fonts@4.0.535 react@19 react-dom@19
npm install -D vitest@^4.1.1 typescript@^5 @types/react@19 @types/node@^22
```

Expected: 两条命令都以 `added N packages` 结束，没有 ERR。

- [ ] **Step 4: 写会失败的测试**

`src/lib/timing.test.ts`：

```ts
import {describe, expect, it} from 'vitest';
import {activeIndex, cutStarts, typedText} from './timing';

describe('typedText', () => {
  it('shows nothing before typing starts', () => {
    expect(typedText('abcdef', 0, 30, 30)).toBe('');
    expect(typedText('abcdef', -10, 30, 30)).toBe('');
  });
  it('reveals cps characters per second', () => {
    expect(typedText('abcdef', 2, 30, 30)).toBe('ab');
    expect(typedText('abcdef', 1, 30, 60)).toBe('ab');
  });
  it('never overruns the text', () => {
    expect(typedText('abcdef', 999, 30, 30)).toBe('abcdef');
  });
});

describe('cutStarts', () => {
  it('shrinks gaps linearly from first to last', () => {
    expect(cutStarts(8, 36, 18)).toEqual([0, 36, 69, 99, 126, 150, 171, 189]);
  });
  it('handles two shots', () => {
    expect(cutStarts(2, 30, 10)).toEqual([0, 30]);
  });
});

describe('activeIndex', () => {
  const starts = [0, 36, 69];
  it('picks the last shot that has started', () => {
    expect(activeIndex(starts, -5)).toBe(0);
    expect(activeIndex(starts, 35)).toBe(0);
    expect(activeIndex(starts, 36)).toBe(1);
    expect(activeIndex(starts, 500)).toBe(2);
  });
});
```

`src/script.test.ts`：

```ts
import {describe, expect, it} from 'vitest';
import {FPS, TOTAL_FRAMES} from './script';

describe('script', () => {
  it('runs exactly 45 seconds', () => {
    expect(TOTAL_FRAMES).toBe(45 * FPS);
  });
});
```

- [ ] **Step 5: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，报错 `Failed to resolve import "./timing"` 和 `"./script"`。

- [ ] **Step 6: 写时间工具和 script 骨架**

`src/lib/timing.ts`：

```ts
// Pure frame math, free of Remotion imports so vitest can run it in Node.

export const typedText = (text: string, frame: number, fps: number, cps: number): string => {
  if (frame <= 0) return '';
  return text.slice(0, Math.floor((frame * cps) / fps));
};

// Start frame of each shot; the gap between shots shrinks linearly from firstGap to lastGap.
export const cutStarts = (count: number, firstGap: number, lastGap: number): number[] => {
  const starts = [0];
  for (let i = 0; i < count - 1; i++) {
    const t = count > 2 ? i / (count - 2) : 0;
    starts.push(starts[i] + Math.round(firstGap + (lastGap - firstGap) * t));
  }
  return starts;
};

export const activeIndex = (starts: readonly number[], frame: number): number => {
  let idx = 0;
  starts.forEach((s, i) => {
    if (frame >= s) idx = i;
  });
  return idx;
};
```

`src/script.ts`：

```ts
// Every on-screen word and every frame timing lives here, so copy edits never touch scene code.
// Frame numbers are relative to the start of their scene (30 fps).

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES = {hook: 120, restyle: 270, agent: 300, skills: 210, engines: 240, end: 210} as const;
export type SceneName = keyof typeof SCENES;
export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);
```

- [ ] **Step 7: 运行测试，确认通过**

Run: `npm test`
Expected: PASS，2 个测试文件、7 个测试全部通过。

- [ ] **Step 8: 写 theme、Grain、Promo、Root、入口**

`src/theme.ts`：

```ts
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
```

`src/components/Grain.tsx`：

```tsx
import {AbsoluteFill} from 'remotion';

// Static film grain over the whole frame; SVG noise stays sharp at any resolution.
export const Grain = () => (
  <AbsoluteFill style={{pointerEvents: 'none', opacity: 0.07, mixBlendMode: 'soft-light'}}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);
```

`src/Promo.tsx`：

```tsx
import {AbsoluteFill} from 'remotion';
import {Grain} from './components/Grain';
import {C} from './theme';

export const Promo = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Grain />
  </AbsoluteFill>
);
```

`src/Root.tsx`：

```tsx
import {Composition} from 'remotion';
import {Promo} from './Promo';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './script';

export const RemotionRoot = () => (
  <Composition id="Promo" component={Promo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
```

`src/index.ts`：

```ts
import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
```

- [ ] **Step 9: 类型检查，渲染第一帧**

```bash
npm run typecheck
npx remotion still src/index.ts Promo out/t1-f0.png --frame=0
```

Expected: typecheck 无输出；still 输出 `out/t1-f0.png`。第一次运行会下载 Chrome Headless Shell。如果下载失败，在 still/render 命令后加
`--browser-executable="$LOCALAPPDATA/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe"`（本机 Playwright 已装的那份）。

打开 `out/t1-f0.png`：应该是整屏暖黑，带非常淡的颗粒。看不出颗粒就把 Grain 的 `opacity` 调到 `0.1`；颗粒抢眼就降到 `0.05`。

- [ ] **Step 10: 提交**

```bash
git add package.json package-lock.json tsconfig.json .gitignore src
git commit -m "feat(video): scaffold Remotion project with timing helpers"
```

---

### Task 2: 准备素材

**Files:**
- Create: `styleswift-intro-video/public/shots/*.jpg`（9 张）
- Create: `styleswift-intro-video/public/logo.png`
- Modify: `styleswift-intro-video/src/script.ts`（追加 `Shot`、`ORIGINAL_SHOT`、`SHOTS`）
- Test: `styleswift-intro-video/src/script.test.ts`

**Interfaces:**
- Consumes: `script.ts` 里已有的常量
- Produces:
  - `type Shot = {file: string; prompt: string; url: string}`
  - `ORIGINAL_SHOT: string`（`'github-original.jpg'`）
  - `SHOTS: readonly Shot[]`（8 个，顺序就是 S2 的播放顺序；`SHOTS[0]` 是黑客帝国，S1、S3 也用它）
  - 静态文件：`public/shots/<file>`、`public/logo.png`

- [ ] **Step 1: 写会失败的测试**

在 `src/script.test.ts` 顶部的 import 后面加：

```ts
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ORIGINAL_SHOT, SHOTS} from './script';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
```

在 `describe('script', ...)` 里加：

```ts
  it('every referenced image exists in public/', () => {
    const files = ['logo.png', `shots/${ORIGINAL_SHOT}`, ...SHOTS.map((s) => `shots/${s.file}`)];
    for (const f of files) expect(existsSync(publicDir + f), f).toBe(true);
  });
```

- [ ] **Step 2: 在 script.ts 末尾追加镜头清单**

```ts
export type Shot = {file: string; prompt: string; url: string};

const GITHUB = 'github.com/StyleSwift/StyleSwift';

// Real screenshots from images/, in playback order for the restyle montage.
export const ORIGINAL_SHOT = 'github-original.jpg';
export const SHOTS: readonly Shot[] = [
  {file: 'github-matrix.jpg', prompt: 'make this look like The Matrix', url: GITHUB},
  {file: 'github-xp.jpg', prompt: 'Windows XP', url: GITHUB},
  {file: 'github-y2k.jpg', prompt: 'Y2K', url: GITHUB},
  {file: 'linuxdo-newspaper.jpg', prompt: 'old newspaper', url: 'linux.do'},
  {file: 'linuxdo-bauhaus.jpg', prompt: 'Bauhaus', url: 'linux.do'},
  {file: 'linuxdo-cozy.jpg', prompt: 'cozy and warm', url: 'linux.do'},
  {file: 'douban-eink.jpg', prompt: 'e-ink reader', url: 'book.douban.com'},
  {file: 'bilibili-wes.jpg', prompt: 'Wes Anderson', url: 'www.bilibili.com'},
];
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`every referenced image exists in public/` 报 `logo.png: expected false to be true`。

- [ ] **Step 4: 截取原始 GitHub 页面**

```bash
mkdir -p out public/shots
node -e "
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1560, height: 952}, deviceScaleFactor: 2, colorScheme: 'light'});
  await page.goto('https://github.com/StyleSwift/StyleSwift', {waitUntil: 'load'});
  await page.waitForTimeout(2500);
  await page.screenshot({path: 'out/github-original.png'});
  await browser.close();
})();
"
```

Expected: 生成 `out/github-original.png`（3120×1904）。`playwright` 由 Node 从根目录的 `node_modules` 解析到。

- [ ] **Step 5: 缩图转 JPG，复制 logo**

```bash
PYTHONUTF8=1 python - <<'EOF'
from PIL import Image
import os

pairs = [
    ('out/github-original.png', 'github-original.jpg'),
    ('../images/黑客帝国风格.png', 'github-matrix.jpg'),
    ('../images/windowsXP风格.png', 'github-xp.jpg'),
    ('../images/github千禧风.png', 'github-y2k.jpg'),
    ('../images/报纸风格.png', 'linuxdo-newspaper.jpg'),
    ('../images/包豪斯风格.png', 'linuxdo-bauhaus.jpg'),
    ('../images/温馨风格.png', 'linuxdo-cozy.jpg'),
    ('../images/豆瓣墨水屏风格.png', 'douban-eink.jpg'),
    ('../images/B站韦斯安德森风格.png', 'bilibili-wes.jpg'),
]
for src, out in pairs:
    im = Image.open(src).convert('RGB')
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(os.path.join('public/shots', out), quality=88)
    print(out, im.size, os.path.getsize(os.path.join('public/shots', out)) // 1024, 'KB')
EOF
cp ../extension/icons/icon-128.png public/logo.png
```

Expected: 打印 9 行，每张宽 ≤1600，大小都在 600KB 以内。

- [ ] **Step 6: 运行测试，确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 7: 逐张核对截图内容**

逐张打开 `public/shots/` 下的 9 张图，确认：
- `github-original.jpg` 是未换样式的 GitHub 仓库页（浅色，未登录）。如果有 cookie 横幅或登录弹窗挡住页面，在 Step 4 的 `waitForTimeout` 后面加 `await page.keyboard.press('Escape');`，然后重新截图
- `github-*.jpg` 都是 StyleSwift 仓库页
- `linuxdo-*.jpg` 的页面标题都是 “Where possible begins”（linux.do）。如果 `报纸风格.png` 不是 linux.do，把 `SHOTS` 里对应的 `url` 改成截图地址栏里的实际域名
- `douban-eink.jpg` 是豆瓣读书，`bilibili-wes.jpg` 是 B 站

- [ ] **Step 8: 提交**

```bash
git add public src/script.ts src/script.test.ts
git commit -m "feat(video): add screenshot assets and shot list"
```

---

### Task 3: S1 钩子镜头

**Files:**
- Create: `styleswift-intro-video/src/components/Scene.tsx`
- Create: `styleswift-intro-video/src/components/TypeLine.tsx`
- Create: `styleswift-intro-video/src/scenes/S1Hook.tsx`
- Modify: `styleswift-intro-video/src/script.ts`（追加 `HOOK`）
- Modify: `styleswift-intro-video/src/Promo.tsx`（引入 `<Series>`）
- Test: `styleswift-intro-video/src/script.test.ts`

**Interfaces:**
- Consumes: `typedText`、`SHOTS[0].prompt`、`C`、`FONT`、`SCENES`
- Produces:
  - `<Scene style?>{children}</Scene>`：AbsoluteFill，前 8 帧淡入
  - `<TypeLine text at cps cursor? color? />`：从第 `at` 帧开始逐字打出，`cursor` 为 true 时带闪烁方块光标
  - `HOOK = {prompt, typeAt, cps, enterAt, fadeAt}`

- [ ] **Step 1: 写会失败的测试**

`src/script.test.ts` 的 import 里加上 `HOOK, SCENES`，在 describe 里加：

```ts
  it('hook prompt finishes typing well before enter, and fades out inside the scene', () => {
    const typedEnd = HOOK.typeAt + Math.ceil((HOOK.prompt.length * FPS) / HOOK.cps);
    expect(typedEnd + 10).toBeLessThanOrEqual(HOOK.enterAt);
    expect(HOOK.fadeAt + 15).toBeLessThanOrEqual(SCENES.hook);
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`HOOK` 未导出（`Cannot read properties of undefined`）。

- [ ] **Step 3: 在 script.ts 末尾追加 HOOK**

```ts
export const HOOK = {prompt: SHOTS[0].prompt, typeAt: 30, cps: 30, enterAt: 80, fadeAt: 100};
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（30 + 30 + 10 = 70 ≤ 80；100 + 15 ≤ 120）。

- [ ] **Step 5: 写 Scene、TypeLine、S1Hook**

`src/components/Scene.tsx`：

```tsx
import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

// Every scene fades in over its first 8 frames so cuts never flash.
export const Scene = ({children, style}: {children: ReactNode; style?: CSSProperties}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity, ...style}}>{children}</AbsoluteFill>;
};
```

`src/components/TypeLine.tsx`：

```tsx
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
```

`src/scenes/S1Hook.tsx`：

```tsx
import {interpolate, useCurrentFrame} from 'remotion';
import {Scene} from '../components/Scene';
import {TypeLine} from '../components/TypeLine';
import {HOOK} from '../script';
import {C, FONT} from '../theme';

export const S1Hook = () => {
  const frame = useCurrentFrame();
  const sent = frame >= HOOK.enterAt;
  const opacity = interpolate(frame, [HOOK.fadeAt, HOOK.fadeAt + 15], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT.mono, fontSize: 56, opacity}}>
        <span style={{color: C.accent}}>{'> '}</span>
        <TypeLine text={HOOK.prompt} at={HOOK.typeAt} cps={HOOK.cps} cursor={!sent} color={sent ? C.muted : C.text} />
        {sent && <span style={{color: C.accent}}>{'  ↵'}</span>}
      </div>
    </Scene>
  );
};
```

- [ ] **Step 6: 用 Series 接入 Promo**

把 `src/Promo.tsx` 整个替换为：

```tsx
import {AbsoluteFill, Series} from 'remotion';
import {Grain} from './components/Grain';
import {S1Hook} from './scenes/S1Hook';
import {SCENES} from './script';
import {C} from './theme';

export const Promo = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Series>
      <Series.Sequence durationInFrames={SCENES.hook}>
        <S1Hook />
      </Series.Sequence>
    </Series>
    <Grain />
  </AbsoluteFill>
);
```

- [ ] **Step 7: 类型检查，渲染关键帧并查看**

```bash
npm run typecheck
npx remotion still src/index.ts Promo out/s1-f10.png --frame=10
npx remotion still src/index.ts Promo out/s1-f70.png --frame=70
npx remotion still src/index.ts Promo out/s1-f90.png --frame=90
```

逐张查看：
- `s1-f10`：屏幕中间只有 `> ` 和一个珊瑚色方块光标
- `s1-f70`：`> make this look like The Matrix` 完整一行，没有折行，光标在行尾
- `s1-f90`：文字变灰，行尾是 `↵`，没有光标。如果 `↵` 显示成方块，把 S1Hook 里的 `'  ↵'` 换成 `'  ⏎'`；还是方块就换成 `'  [enter]'`

- [ ] **Step 8: 提交**

```bash
git add src
git commit -m "feat(video): S1 hook scene with typed prompt"
```

---

### Task 4: S2 一句话换皮肤

**Files:**
- Create: `styleswift-intro-video/src/components/Headline.tsx`
- Create: `styleswift-intro-video/src/components/Dots.tsx`
- Create: `styleswift-intro-video/src/components/BrowserFrame.tsx`
- Create: `styleswift-intro-video/src/components/Shot.tsx`
- Create: `styleswift-intro-video/src/components/Bubble.tsx`
- Create: `styleswift-intro-video/src/components/SidePanel.tsx`
- Create: `styleswift-intro-video/src/scenes/S2Restyle.tsx`
- Modify: `styleswift-intro-video/src/script.ts`（追加 `Headline` 类型、`HEADLINES`、`RESTYLE`、`PANEL_CARDS`）
- Modify: `styleswift-intro-video/src/Promo.tsx`
- Test: `styleswift-intro-video/src/script.test.ts`

**Interfaces:**
- Consumes: `cutStarts`、`activeIndex`、`SHOTS`、`ORIGINAL_SHOT`、`Scene`
- Produces:
  - `type Headline = {text: string; at: number}`
  - `HEADLINES: {[K in SceneName]?: readonly Headline[]}`（后续任务往这个对象里加 key）
  - `RESTYLE = {wipeAt, wipeLen, starts}`
  - `PANEL_CARDS: readonly string[]`
  - `<Headline text at size? style? />`：衬线大字，18 帧淡入并上移 12px
  - `<Dots />`：窗口左上角三个灰点
  - `<BrowserFrame url width height>{children}</BrowserFrame>`：内容区是横向 flex
  - `<Shot file style? />`：`position: absolute; inset: 0` 铺满，`cover` 裁切并顶部对齐，父元素必须是 `position: relative`
  - `<Bubble text fontSize? />`：右对齐的用户气泡
  - `<SidePanel prompt domain />`：宽 380px

- [ ] **Step 1: 写会失败的测试**

`src/script.test.ts` 的 import 里加上 `HEADLINES, RESTYLE, type SceneName`，在 describe 里加：

```ts
  const WORDS_PER_SECOND = 3;
  const FADE_IN = 15;

  it('every headline stays on screen long enough to read', () => {
    for (const [scene, lines] of Object.entries(HEADLINES)) {
      for (const h of lines ?? []) {
        const words = h.text.split(/\s+/).length;
        const onScreen = SCENES[scene as SceneName] - h.at;
        expect(onScreen, h.text).toBeGreaterThanOrEqual(Math.ceil((words / WORDS_PER_SECOND) * FPS) + FADE_IN);
      }
    }
  });

  it('every restyle shot is on screen for at least half a second', () => {
    const starts = RESTYLE.starts.map((s) => s + RESTYLE.wipeAt);
    const ends = [...starts.slice(1), SCENES.restyle];
    starts.forEach((s, i) => expect(ends[i] - s, SHOTS[i].file).toBeGreaterThanOrEqual(15));
    expect(RESTYLE.starts).toHaveLength(SHOTS.length);
  });

  it('the opening wipe finishes before the first hard cut', () => {
    expect(RESTYLE.wipeAt + RESTYLE.wipeLen).toBeLessThanOrEqual(RESTYLE.wipeAt + RESTYLE.starts[1]);
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`HEADLINES` / `RESTYLE` 未定义。

- [ ] **Step 3: 在 script.ts 追加**

文件顶部加：

```ts
import {cutStarts} from './lib/timing';
```

文件末尾加：

```ts
export type Headline = {text: string; at: number};

export const HEADLINES: {[K in SceneName]?: readonly Headline[]} = {
  restyle: [{text: 'One sentence. Any website.', at: 100}],
};

// The first shot wipes in over the original page; the rest hard-cut, faster each time (1.2s → 0.6s).
export const RESTYLE = {wipeAt: 60, wipeLen: 24, starts: cutStarts(SHOTS.length, 36, 18)};

// Tool card labels, from extension/_locales/en/messages.json.
export const PANEL_CARDS: readonly string[] = ['View Page Structure', 'Search Page Elements', 'Apply Styles'];
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（最后一个镜头从第 249 帧开始，停留 21 帧；擦除在第 84 帧结束，第一次硬切在第 96 帧）。

- [ ] **Step 5: 写共享组件**

`src/components/Headline.tsx`：

```tsx
import type {CSSProperties} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';

type Props = {text: string; at: number; size?: number; style?: CSSProperties};

export const Headline = ({text, at, size = 88, style}: Props) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{fontFamily: FONT.serif, fontSize: size, lineHeight: 1.05, letterSpacing: '-0.01em', color: C.text, whiteSpace: 'nowrap', opacity: t, transform: `translateY(${(1 - t) * 12}px)`, ...style}}>
      {text}
    </div>
  );
};
```

`src/components/Dots.tsx`：

```tsx
import {C} from '../theme';

export const Dots = () => (
  <div style={{display: 'flex', gap: 8}}>
    {[0, 1, 2].map((i) => (
      <span key={i} style={{width: 12, height: 12, borderRadius: 6, background: C.line}} />
    ))}
  </div>
);
```

`src/components/BrowserFrame.tsx`：

```tsx
import type {ReactNode} from 'react';
import {C, FONT} from '../theme';
import {Dots} from './Dots';

type Props = {url: string; width: number; height: number; children: ReactNode};

export const BrowserFrame = ({url, width, height, children}: Props) => (
  <div style={{width, height, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 14, background: C.panel, border: `1px solid ${C.line}`, boxShadow: '0 40px 100px rgba(0,0,0,0.5)'}}>
    <div style={{height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', borderBottom: `1px solid ${C.line}`}}>
      <Dots />
      <div style={{flex: 1, maxWidth: 640, height: 32, display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 16, background: C.bg, color: C.muted, fontFamily: FONT.sans, fontSize: 17}}>
        {url}
      </div>
    </div>
    <div style={{flex: 1, minHeight: 0, display: 'flex'}}>{children}</div>
  </div>
);
```

`src/components/Shot.tsx`：

```tsx
import type {CSSProperties} from 'react';
import {Img, staticFile} from 'remotion';

// Fills its position:relative parent; screenshots are cropped from the top, never stretched.
export const Shot = ({file, style}: {file: string; style?: CSSProperties}) => (
  <Img src={staticFile(`shots/${file}`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', ...style}} />
);
```

`src/components/Bubble.tsx`：

```tsx
import {C, FONT} from '../theme';

export const Bubble = ({text, fontSize = 19}: {text: string; fontSize?: number}) => (
  <div style={{alignSelf: 'flex-end', maxWidth: '88%', padding: '12px 16px', borderRadius: 14, background: C.accentSoft, color: C.text, fontFamily: FONT.sans, fontSize, lineHeight: 1.35}}>
    {text}
  </div>
);
```

`src/components/SidePanel.tsx`：

```tsx
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
```

- [ ] **Step 6: 写 S2Restyle**

`src/scenes/S2Restyle.tsx`：

```tsx
import {interpolate, useCurrentFrame} from 'remotion';
import {BrowserFrame} from '../components/BrowserFrame';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {Shot} from '../components/Shot';
import {SidePanel} from '../components/SidePanel';
import {activeIndex} from '../lib/timing';
import {HEADLINES, ORIGINAL_SHOT, RESTYLE, SHOTS} from '../script';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S2Restyle = () => {
  const frame = useCurrentFrame();
  const shot = SHOTS[activeIndex(RESTYLE.starts, frame - RESTYLE.wipeAt)];
  const scale = interpolate(frame, [0, 20], [1.06, 1], clamp);
  // Diagonal wipe: the leading edge leans 20% so the reveal reads as a sweep, not a slide.
  const edge = interpolate(frame, [RESTYLE.wipeAt, RESTYLE.wipeAt + RESTYLE.wipeLen], [0, 120], clamp);
  return (
    <Scene>
      <div style={{position: 'absolute', top: 56, width: '100%', display: 'flex', justifyContent: 'center'}}>
        {HEADLINES.restyle?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={76} />)}
      </div>
      <div style={{position: 'absolute', left: 140, top: 190, transform: `scale(${scale})`}}>
        <BrowserFrame url={shot.url} width={1640} height={848}>
          <div style={{position: 'relative', flex: 1}}>
            <Shot file={ORIGINAL_SHOT} />
            <Shot file={shot.file} style={{clipPath: `polygon(0% 0%, ${edge}% 0%, ${edge - 20}% 100%, 0% 100%)`}} />
          </div>
          <SidePanel prompt={shot.prompt} domain={shot.url.split('/')[0]} />
        </BrowserFrame>
      </div>
    </Scene>
  );
};
```

- [ ] **Step 7: 接入 Promo**

在 `src/Promo.tsx` 里加 import：

```tsx
import {S2Restyle} from './scenes/S2Restyle';
```

在 hook 那个 `Series.Sequence` 后面加：

```tsx
      <Series.Sequence durationInFrames={SCENES.restyle}>
        <S2Restyle />
      </Series.Sequence>
```

- [ ] **Step 8: 类型检查，渲染关键帧并查看**

S2 从全片第 120 帧开始。

```bash
npm run typecheck
npx remotion still src/index.ts Promo out/s2-a.png --frame=150
npx remotion still src/index.ts Promo out/s2-b.png --frame=192
npx remotion still src/index.ts Promo out/s2-c.png --frame=250
npx remotion still src/index.ts Promo out/s2-d.png --frame=310
npx remotion still src/index.ts Promo out/s2-e.png --frame=385
```

逐张查看：
- `s2-a`：原始 GitHub 页 + 右侧侧栏；气泡里是 “make this look like The Matrix”，三行工具卡片的 `✓` 和 `›` 显示正常（如果是方块，`✓` 换成 `•`，`›` 换成 `>`）；还没有大标题
- `s2-b`：斜向擦除进行到一半，左边是黑客帝国，右边是原始页，分界线是斜的；大标题还没出现（它在 S2 第 100 帧才出）
- `s2-c`（Y2K）/ `s2-d`（包豪斯）：地址栏域名和截图里的网站一致，气泡文字跟着换了，截图没有被拉伸；顶部大标题 “One sentence. Any website.” 已完整显示，字体是高对比衬线体（Instrument Serif，小写 `a` 是双层），不是 Times
- `s2-e`：最后一张 B 站韦斯·安德森，地址栏是 `www.bilibili.com`
- 所有帧里：浏览器窗口没有超出画面底边，大标题没有和窗口重叠

- [ ] **Step 9: 提交**

```bash
git add src
git commit -m "feat(video): S2 restyle montage with browser frame and side panel"
```

---

### Task 5: S3 Agent 干活

**Files:**
- Create: `styleswift-intro-video/src/components/Terminal.tsx`
- Create: `styleswift-intro-video/src/components/TermLines.tsx`
- Create: `styleswift-intro-video/src/scenes/S3Agent.tsx`
- Modify: `styleswift-intro-video/src/script.ts`（追加 `TermLine` 类型、`AGENT`，并给 `HEADLINES` 加 `agent`）
- Modify: `styleswift-intro-video/src/Promo.tsx`
- Test: `styleswift-intro-video/src/script.test.ts`

**Interfaces:**
- Consumes: `TypeLine`、`Headline`、`Shot`、`Dots`、`Scene`、`SHOTS[0]`
- Produces:
  - `type TermLine = {at: number; kind: 'cmd' | 'call' | 'result' | 'warn' | 'ok' | 'check'; text: string}`
  - `AGENT = {cps, thumb, scanAt, scanLen, cssAt, cssLen, before, after, css}`
  - `<Terminal title? style?>{children}</Terminal>`：等宽 26px、行高 1.6，`style` 可以覆盖 fontSize 和位置
  - `<TermLines lines cps />`：只渲染 `at` 已到的行；`cmd` 和 `call` 类型逐字打出，其余整行出现
  - 测试辅助函数 `checkTerminal(lines, cps, sceneLen)`（只在 `script.test.ts` 里定义）

- [ ] **Step 1: 写会失败的测试**

`src/script.test.ts` 的 import 里加上 `AGENT, type TermLine`，在 describe 外面（文件顶层、import 之后）加：

```ts
const typedEnd = (l: TermLine, cps: number) => l.at + Math.ceil((l.text.length * FPS) / cps);

// Each typed line must finish before the next line appears, and lines must be strictly ordered
// (their `at` doubles as the React key).
const checkTerminal = (lines: readonly TermLine[], cps: number, sceneLen: number) => {
  lines.forEach((l, i) => {
    const next = lines[i + 1]?.at ?? sceneLen;
    const end = l.kind === 'cmd' || l.kind === 'call' ? typedEnd(l, cps) : l.at;
    expect(l.at, l.text).toBeLessThan(next);
    expect(end, l.text).toBeLessThanOrEqual(next);
  });
};
```

在 describe 里加：

```ts
  it('agent terminal lines finish typing before the next line appears', () => {
    checkTerminal([...AGENT.before, ...AGENT.after], AGENT.cps, SCENES.agent);
  });

  it('css scroll and screenshot scan finish before the lines that follow them', () => {
    expect(AGENT.cssAt + AGENT.cssLen).toBeLessThanOrEqual(AGENT.after[0].at);
    expect(AGENT.scanAt + AGENT.scanLen).toBeLessThanOrEqual(AGENT.after[1].at);
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`AGENT` 未定义。

- [ ] **Step 3: 在 script.ts 追加**

给 `HEADLINES` 对象加一个 key（放在 `restyle` 后面）：

```ts
  agent: [
    {text: 'It reads the page.', at: 15},
    {text: 'Writes the CSS.', at: 100},
    {text: 'Checks its own work.', at: 175},
  ],
```

文件末尾加：

```ts
export type TermLine = {at: number; kind: 'cmd' | 'call' | 'result' | 'warn' | 'ok' | 'check'; text: string};

// Tool names and argument shapes match extension/sidepanel/tools/; the numbers are illustrative.
export const AGENT = {
  cps: 60,
  thumb: SHOTS[0].file,
  scanAt: 185,
  scanLen: 30,
  cssAt: 110,
  cssLen: 50,
  before: [
    {at: 10, kind: 'call', text: 'get_page_structure()'},
    {at: 32, kind: 'result', text: 'header · repo-nav · file-list · readme · sidebar'},
    {at: 50, kind: 'call', text: 'grep(query: ".Box-row", scope: "subtree")'},
    {at: 75, kind: 'result', text: '14 matches'},
    {at: 92, kind: 'call', text: 'apply_styles(mode: "save")'},
    {at: 110, kind: 'result', text: '+128 lines of CSS'},
  ] as readonly TermLine[],
  after: [
    {at: 165, kind: 'call', text: 'QualityAudit · capture_screenshot()'},
    {at: 215, kind: 'warn', text: 'contrast 2.9:1 on .Link--muted'},
    {at: 230, kind: 'call', text: 'edit_css(old_css, new_css)'},
    {at: 252, kind: 'ok', text: 'contrast 7.4:1'},
  ] as readonly TermLine[],
  // .Link--muted is deliberately low-contrast so the QualityAudit beat has something to catch.
  css: [
    'body { background: #000 !important; }',
    'body, p, span { color: #00ff41 !important; }',
    '* { font-family: "JetBrains Mono", monospace !important; }',
    'a, .Link--primary { color: #39ff14 !important; }',
    '.Box-row { border-color: #0f3d0f !important; }',
    '.Header { background: #010a01 !important; }',
    '.btn { background: transparent !important; }',
    '.btn { border: 1px solid #00ff41 !important; }',
    '.Label { color: #00ff41 !important; }',
    '.Counter { background: #0a2a0a !important; }',
    '.Link--muted { color: #1f5f1f !important; }',
    '.markdown-body h1 { text-shadow: 0 0 8px #00ff41; }',
  ] as readonly string[],
};
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（打字最紧的一行是 grep，第 71 帧打完，结果在第 75 帧出现）。

- [ ] **Step 5: 写 Terminal 和 TermLines**

`src/components/Terminal.tsx`：

```tsx
import type {CSSProperties, ReactNode} from 'react';
import {C, FONT} from '../theme';
import {Dots} from './Dots';

type Props = {title?: string; style?: CSSProperties; children: ReactNode};

export const Terminal = ({title = 'styleswift', style, children}: Props) => (
  <div style={{overflow: 'hidden', borderRadius: 16, background: C.panel, border: `1px solid ${C.line}`, boxShadow: '0 30px 80px rgba(0,0,0,0.45)', color: C.text, fontFamily: FONT.mono, fontSize: 26, lineHeight: 1.6, ...style}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: `1px solid ${C.line}`, color: C.muted, fontSize: 18}}>
      <Dots />
      {title}
    </div>
    <div style={{padding: '28px 36px'}}>{children}</div>
  </div>
);
```

`src/components/TermLines.tsx`：

```tsx
import {useCurrentFrame} from 'remotion';
import type {TermLine} from '../script';
import {C} from '../theme';
import {TypeLine} from './TypeLine';

// Claude Code-style transcript: ● for tool calls, ⎿ for their results.
const PREFIX: Record<TermLine['kind'], string> = {
  cmd: '$ ',
  call: '● ',
  result: '  ⎿  ',
  warn: '  ⎿  ⚠ ',
  ok: '  ⎿  ✓ ',
  check: '  ✓ ',
};

const COLOR: Record<TermLine['kind'], string> = {
  cmd: C.text,
  call: C.text,
  result: C.muted,
  warn: C.warn,
  ok: C.ok,
  check: C.ok,
};

export const TermLines = ({lines, cps}: {lines: readonly TermLine[]; cps: number}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {lines
        .filter((l) => frame >= l.at)
        .map((l) => (
          <div key={l.at} style={{whiteSpace: 'pre', color: COLOR[l.kind]}}>
            <span style={{color: l.kind === 'call' ? C.accent : COLOR[l.kind]}}>{PREFIX[l.kind]}</span>
            {l.kind === 'cmd' || l.kind === 'call' ? <TypeLine text={l.text} at={l.at} cps={cps} color={COLOR[l.kind]} /> : l.text}
          </div>
        ))}
    </>
  );
};
```

- [ ] **Step 6: 写 S3Agent**

`src/scenes/S3Agent.tsx`：

```tsx
import {interpolate, useCurrentFrame} from 'remotion';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {Shot} from '../components/Shot';
import {TermLines} from '../components/TermLines';
import {Terminal} from '../components/Terminal';
import {AGENT, HEADLINES} from '../script';
import {C} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const CSS_LINE = 34;
const CSS_VISIBLE = 4;

const CssScroll = () => {
  const frame = useCurrentFrame();
  if (frame < AGENT.cssAt) return null;
  const y = interpolate(frame, [AGENT.cssAt, AGENT.cssAt + AGENT.cssLen], [0, -(AGENT.css.length - CSS_VISIBLE) * CSS_LINE], clamp);
  return (
    <div style={{height: CSS_LINE * CSS_VISIBLE, overflow: 'hidden', margin: '6px 0 10px 64px', paddingLeft: 16, borderLeft: `2px solid ${C.line}`}}>
      <div style={{transform: `translateY(${y}px)`, fontSize: 20, lineHeight: `${CSS_LINE}px`, color: C.muted}}>
        {AGENT.css.map((line, i) => (
          <div key={i} style={{whiteSpace: 'pre'}}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

const Thumb = () => {
  const frame = useCurrentFrame();
  const scanning = frame >= AGENT.scanAt && frame <= AGENT.scanAt + AGENT.scanLen;
  const top = interpolate(frame, [AGENT.scanAt, AGENT.scanAt + AGENT.scanLen], [0, 100], clamp);
  return (
    <div style={{position: 'relative', width: 600, height: 375, overflow: 'hidden', borderRadius: 12, border: `1px solid ${C.line}`}}>
      <Shot file={AGENT.thumb} />
      {scanning && <div style={{position: 'absolute', left: 0, right: 0, top: `${top}%`, height: 3, background: C.accent, boxShadow: `0 0 24px ${C.accent}`}} />}
    </div>
  );
};

export const S3Agent = () => (
  <Scene>
    <div style={{position: 'absolute', left: 120, top: 150, width: 600}}>
      <Thumb />
      <div style={{marginTop: 64, display: 'flex', flexDirection: 'column', gap: 18}}>
        {HEADLINES.agent?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={64} />)}
      </div>
    </div>
    <Terminal title="styleswift · agent" style={{position: 'absolute', left: 780, top: 150, width: 1020, height: 780}}>
      <TermLines lines={AGENT.before} cps={AGENT.cps} />
      <CssScroll />
      <TermLines lines={AGENT.after} cps={AGENT.cps} />
    </Terminal>
  </Scene>
);
```

- [ ] **Step 7: 接入 Promo**

`src/Promo.tsx` 加 import `import {S3Agent} from './scenes/S3Agent';`，在 restyle 那个 `Series.Sequence` 后面加：

```tsx
      <Series.Sequence durationInFrames={SCENES.agent}>
        <S3Agent />
      </Series.Sequence>
```

- [ ] **Step 8: 类型检查，渲染关键帧并查看**

S3 从全片第 390 帧开始。

```bash
npm run typecheck
npx remotion still src/index.ts Promo out/s3-a.png --frame=520
npx remotion still src/index.ts Promo out/s3-b.png --frame=590
npx remotion still src/index.ts Promo out/s3-c.png --frame=685
```

逐张查看：
- `s3-a`（S3 第 130 帧）：终端里 6 行加一个正在滚动的 CSS 窗口；`●` 是珊瑚色实心圆，`⎿` 正常显示。如果 `⎿` 是方块，把 TermLines 的 PREFIX 里所有 `⎿` 换成 `└`；`●` 是方块就换成 `•`
- `s3-b`（S3 第 200 帧）：左上缩略图上有一条珊瑚色扫描线；左侧三行大标题都完整、没有折行
- `s3-c`（S3 第 295 帧）：终端共 10 行加 CSS 窗口，最后一行是绿色的 `⎿  ✓ contrast 7.4:1`，`⚠` 那行是琥珀色。如果 `⚠` 渲染成彩色 emoji 或方块，换成 `!`。终端最底下一行离面板底边至少还有一行的空间，最长的行（`header · repo-nav …`）没有超出面板右边

- [ ] **Step 9: 提交**

```bash
git add src
git commit -m "feat(video): S3 agent terminal scene"
```

---

### Task 6: S4 风格技能

**Files:**
- Create: `styleswift-intro-video/src/scenes/S4Skills.tsx`
- Modify: `styleswift-intro-video/src/script.ts`（追加 `SKILLS`，并给 `HEADLINES` 加 `skills`）
- Modify: `styleswift-intro-video/src/Promo.tsx`
- Test: `styleswift-intro-video/src/script.test.ts`

**Interfaces:**
- Consumes: `Bubble`、`Terminal`、`TermLines`、`Headline`、`Scene`、`TermLine`
- Produces: `SKILLS = {cps, promptAt, prompt, lines, cardAt, card, listAt, list, ioAt, io}`

- [ ] **Step 1: 写会失败的测试**

`src/script.test.ts` 的 import 里加上 `SKILLS`，在 describe 里加：

```ts
  it('skill beats happen in order and the tool call finishes before the card pops', () => {
    checkTerminal(SKILLS.lines, SKILLS.cps, SKILLS.cardAt);
    const beats = [SKILLS.promptAt, SKILLS.lines[0].at, SKILLS.cardAt, SKILLS.listAt, SKILLS.ioAt];
    expect([...beats].sort((a, b) => a - b)).toEqual(beats);
    expect(SKILLS.ioAt + 30).toBeLessThanOrEqual(SCENES.skills);
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`SKILLS` 未定义。

- [ ] **Step 3: 在 script.ts 追加**

给 `HEADLINES` 加：

```ts
  skills: [{text: 'Save a look. Reuse it anywhere.', at: 20}],
```

文件末尾加：

```ts
// Skills are saved by asking the agent (save_style_skill); the card mirrors extension/skills/*.md.
export const SKILLS = {
  cps: 60,
  promptAt: 10,
  prompt: 'Save this as a skill',
  lines: [{at: 35, kind: 'call', text: 'save_style_skill(name: "The Matrix")'}] as readonly TermLine[],
  cardAt: 70,
  card: [
    '---',
    'name: The Matrix',
    'description: Green-on-black terminal look',
    '---',
    '# The Matrix',
    '- background: #000000',
    '- text: #00ff41',
    '- font: JetBrains Mono',
  ] as readonly string[],
  listAt: 120,
  list: ['The Matrix', 'Old Newspaper', 'Bauhaus', 'E-ink Reader', 'Wes Anderson'] as readonly string[],
  ioAt: 160,
  io: ['Export .md', 'Import .md'] as readonly string[],
};
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（工具调用第 53 帧打完，文件卡第 70 帧出现）。

- [ ] **Step 5: 写 S4Skills**

`src/scenes/S4Skills.tsx`：

```tsx
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bubble} from '../components/Bubble';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {TermLines} from '../components/TermLines';
import {Terminal} from '../components/Terminal';
import {HEADLINES, SKILLS} from '../script';
import {C, FONT} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const fadeFrom = (frame: number, at: number) => interpolate(frame, [at, at + 12], [0, 1], clamp);

const SkillList = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [SKILLS.listAt, SKILLS.listAt + 15], [-16, 0], clamp);
  return (
    <div style={{opacity: fadeFrom(frame, SKILLS.listAt), fontFamily: FONT.sans, color: C.text}}>
      <div style={{marginBottom: 14, fontSize: 18, color: C.muted}}>Style skills</div>
      {SKILLS.list.map((name, i) => (
        <div
          key={name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 10,
            padding: '14px 18px',
            borderRadius: 10,
            border: `1px solid ${i === 0 ? C.accent : C.line}`,
            background: i === 0 ? C.accentSoft : 'transparent',
            fontSize: 22,
            transform: i === 0 ? `translateY(${slide}px)` : undefined,
          }}
        >
          {name}
          {i === 0 && <span style={{fontSize: 16, color: C.accent}}>new</span>}
        </div>
      ))}
      <div style={{display: 'flex', gap: 12, marginTop: 18, opacity: fadeFrom(frame, SKILLS.ioAt)}}>
        {SKILLS.io.map((label) => (
          <div key={label} style={{padding: '10px 16px', borderRadius: 20, border: `1px solid ${C.line}`, fontFamily: FONT.mono, fontSize: 18, color: C.muted}}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export const S4Skills = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: frame - SKILLS.cardAt, fps, config: {damping: 200}});
  return (
    <Scene>
      <div style={{position: 'absolute', top: 90, width: '100%', display: 'flex', justifyContent: 'center'}}>
        {HEADLINES.skills?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={76} />)}
      </div>
      <div style={{position: 'absolute', left: 140, top: 330, width: 560, display: 'flex', flexDirection: 'column', gap: 24}}>
        <div style={{display: 'flex', flexDirection: 'column', opacity: fadeFrom(frame, SKILLS.promptAt)}}>
          <Bubble text={SKILLS.prompt} fontSize={24} />
        </div>
        <div style={{fontFamily: FONT.mono, fontSize: 22, lineHeight: 1.6}}>
          <TermLines lines={SKILLS.lines} cps={SKILLS.cps} />
        </div>
      </div>
      {frame >= SKILLS.cardAt && (
        <Terminal title="the-matrix.md" style={{position: 'absolute', left: 760, top: 300, width: 500, fontSize: 22, opacity: pop, transform: `scale(${0.92 + 0.08 * pop})`}}>
          {SKILLS.card.map((line, i) => (
            <div key={i} style={{whiteSpace: 'pre', color: line.startsWith('#') || line.startsWith('name') ? C.text : C.muted}}>
              {line}
            </div>
          ))}
        </Terminal>
      )}
      <div style={{position: 'absolute', left: 1340, top: 300, width: 440}}>
        <SkillList />
      </div>
    </Scene>
  );
};
```

- [ ] **Step 6: 接入 Promo**

`src/Promo.tsx` 加 import `import {S4Skills} from './scenes/S4Skills';`，在 agent 那个 `Series.Sequence` 后面加：

```tsx
      <Series.Sequence durationInFrames={SCENES.skills}>
        <S4Skills />
      </Series.Sequence>
```

- [ ] **Step 7: 类型检查，渲染关键帧并查看**

S4 从全片第 690 帧开始。

```bash
npm run typecheck
npx remotion still src/index.ts Promo out/s4-a.png --frame=750
npx remotion still src/index.ts Promo out/s4-b.png --frame=890
```

逐张查看：
- `s4-a`（S4 第 60 帧）：大标题、左边的气泡、打完的 `● save_style_skill(name: "The Matrix")` 一行；还没有文件卡和列表。工具调用这一行如果在 560px 内折行或溢出，把左栏宽度改成 600，或者把 TermLines 外层的 `fontSize` 降到 20
- `s4-b`（S4 第 200 帧）：三栏都出现了，彼此不重叠；文件卡里 `description: Green-on-black terminal look` 这一行没有超出卡片右边（超出就把卡片宽度改成 540、`left` 改成 740）；列表第一项 The Matrix 带珊瑚色边框和 `new`；下面有 Export .md / Import .md 两个按钮

- [ ] **Step 8: 提交**

```bash
git add src
git commit -m "feat(video): S4 style skills scene"
```

---

### Task 7: S5 本机引擎和 S6 结尾卡

**Files:**
- Create: `styleswift-intro-video/src/scenes/S5Engines.tsx`
- Create: `styleswift-intro-video/src/scenes/S6EndCard.tsx`
- Modify: `styleswift-intro-video/src/script.ts`（追加 `ENGINES`、`END`，并给 `HEADLINES` 加 `engines`、`end`）
- Modify: `styleswift-intro-video/src/Promo.tsx`
- Test: `styleswift-intro-video/src/script.test.ts`

**Interfaces:**
- Consumes: `Terminal`、`TermLines`、`Headline`、`Scene`、`activeIndex`、`checkTerminal`（测试）
- Produces:
  - `ENGINES = {cps, lines, placeholder, menuAt, menuTitle, options, picks}`，其中 `picks` 是相对 `menuAt` 的帧号
  - `END = {name, nameAt, footer, footerAt}`

- [ ] **Step 1: 写会失败的测试**

`src/script.test.ts` 的 import 里加上 `ENGINES, END`，在 describe 里加：

```ts
  it('bridge install output finishes before the engine menu opens', () => {
    checkTerminal(ENGINES.lines, ENGINES.cps, ENGINES.menuAt);
  });

  it('each engine pick is visible for at least a second', () => {
    const picks = ENGINES.picks.map((p) => p + ENGINES.menuAt);
    const ends = [...picks.slice(1), SCENES.engines];
    picks.forEach((p, i) => expect(ends[i] - p, ENGINES.options[i]).toBeGreaterThanOrEqual(FPS));
    expect(ENGINES.picks).toHaveLength(ENGINES.options.length);
  });

  it('end card footer stays long enough to read', () => {
    const words = END.footer.split(/\s+/).length;
    expect(SCENES.end - END.footerAt).toBeGreaterThanOrEqual(Math.ceil((words / WORDS_PER_SECOND) * FPS) + FADE_IN);
  });
```

（`WORDS_PER_SECOND` 和 `FADE_IN` 是 Task 4 在 describe 里定义的常量。）

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL，`ENGINES` / `END` 未定义。

- [ ] **Step 3: 在 script.ts 追加**

给 `HEADLINES` 加：

```ts
  engines: [{text: 'No API key? Bring your own Claude Code or Codex.', at: 100}],
  end: [{text: 'Restyle any website with one sentence.', at: 35}],
```

文件末尾加：

```ts
// Menu labels and placeholder come from extension/_locales/en/messages.json.
export const ENGINES = {
  cps: 30,
  lines: [
    {at: 10, kind: 'cmd', text: 'npx -y styleswift-bridge@latest install'},
    {at: 60, kind: 'check', text: 'bridge installed'},
    {at: 76, kind: 'check', text: 'Claude Code found'},
    {at: 92, kind: 'check', text: 'Codex found'},
  ] as readonly TermLine[],
  placeholder: 'Enter style description',
  menuAt: 120,
  menuTitle: 'Choose AI engine',
  options: ['Built-in', 'Claude Code', 'Codex'] as readonly string[],
  picks: [0, 35, 70] as readonly number[],
};

export const END = {
  name: 'StyleSwift',
  nameAt: 15,
  footer: 'Free on the Chrome Web Store · Open source on GitHub',
  footerAt: 55,
};
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（安装命令第 49 帧打完；最后一次高亮从第 190 帧开始，停留 50 帧；页脚停留 155 帧，11 个词需要 125 帧）。

- [ ] **Step 5: 写 S5Engines**

`src/scenes/S5Engines.tsx`：

```tsx
import {interpolate, useCurrentFrame} from 'remotion';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {TermLines} from '../components/TermLines';
import {Terminal} from '../components/Terminal';
import {activeIndex} from '../lib/timing';
import {ENGINES, HEADLINES} from '../script';
import {C, FONT} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const EngineMenu = ({picked}: {picked: number}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [ENGINES.menuAt, ENGINES.menuAt + 10], [0, 1], clamp);
  return (
    <div style={{opacity: t, transform: `translateY(${(1 - t) * 10}px)`, padding: 18, borderRadius: 14, background: C.panel, border: `1px solid ${C.line}`, fontFamily: FONT.sans}}>
      <div style={{marginBottom: 10, fontSize: 18, color: C.muted}}>{ENGINES.menuTitle}</div>
      {ENGINES.options.map((name, i) => (
        <div key={name} style={{display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, fontSize: 26, background: i === picked ? C.accentSoft : 'transparent', color: i === picked ? C.text : C.muted}}>
          {name}
          {i === picked && <span style={{color: C.accent}}>✓</span>}
        </div>
      ))}
    </div>
  );
};

export const S5Engines = () => {
  const frame = useCurrentFrame();
  const picked = activeIndex(ENGINES.picks, frame - ENGINES.menuAt);
  return (
    <Scene>
      <div style={{position: 'absolute', top: 90, width: '100%', display: 'flex', justifyContent: 'center'}}>
        {HEADLINES.engines?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={68} />)}
      </div>
      <Terminal title="~" style={{position: 'absolute', left: 160, top: 300, width: 900, height: 420}}>
        <TermLines lines={ENGINES.lines} cps={ENGINES.cps} />
      </Terminal>
      <div style={{position: 'absolute', left: 1160, top: 300, width: 600, display: 'flex', flexDirection: 'column', gap: 16}}>
        <div style={{height: 290}}>{frame >= ENGINES.menuAt && <EngineMenu picked={picked} />}</div>
        <div style={{height: 130, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 16, background: C.panel, border: `1px solid ${C.line}`, fontFamily: FONT.sans}}>
          <div style={{fontSize: 22, color: C.muted}}>{ENGINES.placeholder}</div>
          <div style={{alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 14, border: `1px solid ${C.line}`, fontSize: 18, color: C.text}}>
            {ENGINES.options[picked]} ▾
          </div>
        </div>
      </div>
    </Scene>
  );
};
```

- [ ] **Step 6: 写 S6EndCard**

`src/scenes/S6EndCard.tsx`：

```tsx
import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Headline} from '../components/Headline';
import {Scene} from '../components/Scene';
import {END, HEADLINES} from '../script';
import {C, FONT} from '../theme';

export const S6EndCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 200}});
  return (
    <Scene style={{alignItems: 'center', justifyContent: 'center', gap: 28}}>
      <Img src={staticFile('logo.png')} style={{width: 150, height: 150, opacity: pop, transform: `scale(${0.85 + 0.15 * pop})`}} />
      <Headline text={END.name} at={END.nameAt} size={128} />
      {HEADLINES.end?.map((h) => <Headline key={h.text} text={h.text} at={h.at} size={48} />)}
      <Headline text={END.footer} at={END.footerAt} size={24} style={{marginTop: 24, fontFamily: FONT.mono, color: C.muted}} />
    </Scene>
  );
};
```

- [ ] **Step 7: 接入 Promo**

`src/Promo.tsx` 加 import：

```tsx
import {S5Engines} from './scenes/S5Engines';
import {S6EndCard} from './scenes/S6EndCard';
```

在 skills 那个 `Series.Sequence` 后面加：

```tsx
      <Series.Sequence durationInFrames={SCENES.engines}>
        <S5Engines />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENES.end}>
        <S6EndCard />
      </Series.Sequence>
```

- [ ] **Step 8: 类型检查，渲染关键帧并查看**

S5 从全片第 900 帧开始，S6 从第 1140 帧开始。

```bash
npm run typecheck
npx remotion still src/index.ts Promo out/s5-a.png --frame=1010
npx remotion still src/index.ts Promo out/s5-b.png --frame=1100
npx remotion still src/index.ts Promo out/s6-a.png --frame=1340
```

逐张查看：
- `s5-a`（S5 第 110 帧）：终端里一条命令加三行绿色 `✓`；大标题正在淡入，一行放得下，没有超出 1920 宽（如果超出，把 `size` 从 68 降到 60）；右边只有输入框，按钮显示 `Built-in ▾`。`▾` 如果是方块，换成 `v`
- `s5-b`（S5 第 200 帧）：菜单出现，高亮在 Codex 上，输入框按钮显示 `Codex ▾`
- `s6-a`（S6 第 200 帧）：logo、StyleSwift、标语、页脚垂直居中排列，四样都完整显示

- [ ] **Step 9: 提交**

```bash
git add src
git commit -m "feat(video): S5 local engines and S6 end card"
```

---

### Task 8: 渲染成片，验证，写 README

**Files:**
- Create: `styleswift-intro-video/README.md`
- Modify: `docs/superpowers/specs/2026-10-15-promo-video-design.md`（状态改为“已实现”）

**Interfaces:**
- Consumes: 完整的 `Promo` 合成
- Produces: `styleswift-intro-video/out/styleswift-promo.mp4`（被 gitignore，不提交）

- [ ] **Step 1: 跑全部测试和类型检查**

```bash
npm test && npm run typecheck
```

Expected: 所有测试 PASS，typecheck 无输出。

- [ ] **Step 2: 检查镜头衔接处**

```bash
for f in 117 125 387 395 687 695 897 905 1137 1145; do npx remotion still src/index.ts Promo out/cut-$f.png --frame=$f; done
```

逐张查看：每个镜头起点（125、395、695、905、1145）的画面在淡入，不是一片空白；每个镜头末尾（117、387、687、897、1137）的画面完整，没有提前消失的元素。S1 的末尾（117）应该接近全黑，这是 S1 自己的淡出。

- [ ] **Step 3: 检查信息流尺寸下的可读性**

```bash
PYTHONUTF8=1 python - <<'EOF'
from PIL import Image
for name in ['s2-d', 's3-c', 's4-b', 's5-b', 's6-a']:
    im = Image.open(f'out/{name}.png')
    im.resize((600, 338), Image.LANCZOS).save(f'out/feed-{name}.png')
EOF
```

逐张查看 `out/feed-*.png`：每张图的大标题在 600px 宽下仍然能轻松读出来。读不清的镜头，把对应 Headline 的 `size` 调大 8–12px，重新渲染那张关键帧确认。

- [ ] **Step 4: 渲染成片**

```bash
npm run render
```

Expected: 输出 `out/styleswift-promo.mp4`。

- [ ] **Step 5: 核对规格**

```bash
npx remotion ffprobe out/styleswift-promo.mp4
ls -la out/styleswift-promo.mp4
```

Expected: 输出里有 `Duration: 00:00:45.00`、`Video: h264`、`1920x1080`、`30 fps`，没有 `Audio:` 流；文件远小于 512MB。

- [ ] **Step 6: 写 README**

`styleswift-intro-video/README.md`：

````markdown
# StyleSwift 宣传片

45 秒，1920×1080，30fps，无声。用 [Remotion](https://www.remotion.dev/) 制作。设计文档见 `docs/superpowers/specs/2026-10-15-promo-video-design.md`。

## 命令

```bash
npm install
npm run dev      # Remotion Studio 预览，可拖时间轴
npm test         # 校验时长、可读时间、素材是否存在
npm run render   # 输出 out/styleswift-promo.mp4
```

改文案或节奏只需要改 `src/script.ts`，改完跑一次 `npm test`。

## 剪辑点（配乐对拍用）

| 时间 | 帧 | 事件 |
|---|---|---|
| 0:00.0 | 0 | S1 开场，光标闪动 |
| 0:01.0 | 30 | 开始打字 |
| 0:02.7 | 80 | 回车 |
| 0:04.0 | 120 | S2 浏览器出现 |
| 0:06.0 | 180 | 斜向擦除，变成黑客帝国风格 |
| 0:07.2 | 216 | 硬切 1：Windows XP |
| 0:08.3 | 249 | 硬切 2：Y2K |
| 0:09.3 | 279 | 硬切 3：旧报纸 |
| 0:10.2 | 306 | 硬切 4：包豪斯 |
| 0:11.0 | 330 | 硬切 5：温馨 |
| 0:11.7 | 351 | 硬切 6：墨水屏 |
| 0:12.3 | 369 | 硬切 7：韦斯·安德森 |
| 0:13.0 | 390 | S3 Agent 终端 |
| 0:19.2 | 575 | QualityAudit 扫描 |
| 0:23.0 | 690 | S4 风格技能 |
| 0:25.3 | 760 | 技能文件卡弹出 |
| 0:30.0 | 900 | S5 本机引擎 |
| 0:34.0 | 1020 | 引擎菜单打开 |
| 0:38.0 | 1140 | S6 结尾卡 |
| 0:45.0 | 1350 | 结束 |

## 授权

Remotion 对个人和 3 人以内的公司免费，超过需要购买公司授权：https://www.remotion.dev/license
````

- [ ] **Step 7: 更新设计文档状态**

把 `docs/superpowers/specs/2026-10-15-promo-video-design.md` 第 4 行的 `> 状态：待评审` 改成 `> 状态：已实现`。

- [ ] **Step 8: 提交**

```bash
git add README.md ../docs/superpowers/specs/2026-10-15-promo-video-design.md
git commit -m "docs(video): README with cut points; mark spec implemented"
```

- [ ] **Step 9: 交给用户静音通看**

告诉用户成片的路径 `styleswift-intro-video/out/styleswift-promo.mp4`，请他们静音从头看一遍，确认每行大字都来得及读完，节奏也合适。根据反馈改 `src/script.ts` 里的帧号，然后重新渲染。
