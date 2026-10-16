# StyleSwift 宣传片

约 46 秒（100 拍），1920×1080，30fps，带背景音乐和音效。用 [Remotion](https://www.remotion.dev/) 制作。设计文档见 `docs/superpowers/specs/2026-10-15-promo-video-v2-design.md`。

## 命令

```bash
npm install
npm run fetch-audio   # 从 Mixkit 下载音乐和音效到 public/audio/（dev 和 render 前会自动补齐缺失的文件）
npm run dev           # Remotion Studio 预览
npm test              # 校验时长、节拍、可读时间、素材
npm run render        # 输出 out/styleswift-promo.mp4
```

`npm run render` 先按 2 倍分辨率（3840×2160）渲染出 `out/promo-2x.mp4`，再用 Lanczos 缩回 1080p。窗口在片中缩小又倾斜，直接按 1080p 渲染时网页文字会出锯齿，看起来像被压缩过；超采样后边缘干净得多。不要直接用 `npx remotion render` 出成片。

文案、节奏和音效触发点都在 `src/script.ts`，时间单位是拍（130 BPM，每拍约 13.85 帧）。换背景音乐时只需改 `BPM` 和 `MUSIC`（曲子的第一拍位置、从第几拍开始截），所有切点和音效会自动落在新拍子上。改完跑一次 `npm test`。大标题是比例字体，测试量不到宽度，改了标题要渲染一帧看看，例如 `npx remotion still src/index.ts Promo out/check.png --frame=300`。

## 网页效果图

网页截图放在 `public/shots/`（只用真实截图），片中的顺序、贴纸指令和网址在 `src/script.ts` 的 `RESTYLE.shots`。文件名去掉扩展名就是它的侧栏截图键名，要和 `scripts/panel-runs.json` 里的 `key` 一致。同一种风格只换图，直接覆盖同名文件；换成新风格，要改 `RESTYLE.shots`（用到的话还有 `SAVE`）和 `panel-runs.json`，再按下面的方法重截侧栏。最后一张同时用在讲解场景：讲解先显示它的原图 `HOW.original`，在 Apply Styles 完成时扫成效果图。原图要在同一个页面上点侧栏顶部的 👁 关掉样式后截取，不要刷新，推荐内容才和效果图一致。换掉最后一张，要同时换原图，重新取 `HOW.swatches` 的颜色，并按原图版面调整 `src/scenes/S3How.tsx` 里 `FOUND` 虚线框的位置。"保存"场景（`SAVE`）展示同一种风格用在不同网站上：效果图按 `网站-风格` 命名（如 `x-paper.png`），测试会检查这几张风格相同、网站各不相同。开场原始页 `github-original.png` 要和第一张效果图用同样的尺寸、同样的登录状态截取，变身前后才对得上。

## 侧栏截图

片中的插件侧栏是真实界面的截图（`public/panel/`），由 `scripts/capture-panel.cjs` 在 Chromium 里加载真实扩展截取。截图时页面工具真实运行，只有模型回复是脚本化的，所以不需要 API Key。每个网站的指令和回复写在 `scripts/panel-runs.json`；改了片中的指令，要同步改这里，然后重新截图：

```bash
CHROME_PATH="<能加载扩展的完整 Chromium/Chrome>" node scripts/capture-panel.cjs           # 全部重截
CHROME_PATH="..." ONLY=linuxdo-cozy,douban-eink node scripts/capture-panel.cjs           # 只重截部分网站
```

需要代理才能打开目标网站时，设置 `HTTPS_PROXY`。`npm test` 会检查片中用到的每个侧栏状态都有截图，并且指令和截图时用的一致。

## 音频

| 键名 | 来源 | 用途 |
|---|---|---|
| music | Mixkit Stock Music #983 “Cherry on Top”（Michael Ramir C.），130 BPM，从原曲第 57.17 秒开始 | 背景音乐 |
| click | Mixkit SFX #1113 Mouse click close | 点工具栏图标、点发送 |
| typing | Mixkit SFX #1396 Soft typing on a digital keyboard | 输入指令 |
| sparkle | Mixkit SFX #2350 Magic sparkle whoosh | 第一次变身 |
| whoosh | Mixkit SFX #1490 Fast whoosh transition | 之后每次变身 |
| pop | Mixkit SFX #3005 Explainer video pops whoosh light pop | 侧栏滑出、贴纸、卡片、拼贴格、结尾 CTA |
| check | Mixkit SFX #2867 Confirmation tone | 步骤打勾 |
| done | Mixkit SFX #951 Positive notification | 三步完成 |
| shine | Mixkit SFX #2633 Sweeping sparkle presentation intro | 结尾 logo |

想换音效，就改 `src/audio.json` 里对应的 `id`、`volume` 和 `lead`，然后运行 `npm run fetch-audio`（文件名带 id，换了 id 会自动下载新文件）。`lead` 是音效从开头到最响那一刻的帧数，音效会提前这么多帧开始播放，让最响的部分落在画面动作上；换音效后要重新测。目前的混音峰值是 -1.8 dBFS，调大音量后要重新测一次，不要超过 -1 dBFS。

**授权**：音乐使用 [Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree)，可以商用，可以用于社交媒体和网络广告，不要求署名，不能用于 CD/DVD、游戏或电视广播。音效使用 [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree)。两者都不允许单独再分发，也不允许连同源文件一起分发，所以 `public/audio/` 不进 git。

Remotion 对个人和 3 人以内的公司免费，超过需要购买公司授权：https://www.remotion.dev/license
