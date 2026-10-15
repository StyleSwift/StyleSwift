# StyleSwift 宣传片

约 44 秒（96 拍），1920×1080，30fps，带背景音乐和音效。用 [Remotion](https://www.remotion.dev/) 制作。设计文档见 `docs/superpowers/specs/2026-10-15-promo-video-v2-design.md`。

## 命令

```bash
npm install
npm run fetch-audio   # 从 Mixkit 下载音乐和音效到 public/audio/（dev 和 render 前会自动补齐缺失的文件）
npm run dev           # Remotion Studio 预览
npm test              # 校验时长、节拍、可读时间、素材
npm run render        # 输出 out/styleswift-promo.mp4
```

文案、节奏和音效触发点都在 `src/script.ts`，时间单位是拍（130 BPM，每拍约 13.85 帧）。换背景音乐时只需改 `BPM` 和 `MUSIC`（曲子的第一拍位置、从第几拍开始截），所有切点和音效会自动落在新拍子上。改完跑一次 `npm test`。大标题是比例字体，测试量不到宽度，改了标题要渲染一帧看看，例如 `npx remotion still src/index.ts Promo out/check.png --frame=300`。

## 音频

| 键名 | 来源 | 用途 |
|---|---|---|
| music | Mixkit Stock Music #983 “Cherry on Top”（Michael Ramir C.），130 BPM，从原曲第 59.01 秒开始 | 背景音乐 |
| click | Mixkit SFX #1113 Mouse click close | 点发送 |
| typing | Mixkit SFX #1396 Soft typing on a digital keyboard | 输入指令 |
| sparkle | Mixkit SFX #2350 Magic sparkle whoosh | 第一次变身 |
| whoosh | Mixkit SFX #1490 Fast whoosh transition | 之后每次变身 |
| pop | Mixkit SFX #3005 Explainer video pops whoosh light pop | 贴纸、卡片、拼贴格 |
| check | Mixkit SFX #2867 Confirmation tone | 步骤打勾 |
| done | Mixkit SFX #951 Positive notification | 三步完成 |
| shine | Mixkit SFX #2633 Sweeping sparkle presentation intro | 结尾 logo |

想换音效，就改 `src/audio.json` 里对应的 `id`、`volume` 和 `lead`，然后运行 `npm run fetch-audio`（文件名带 id，换了 id 会自动下载新文件）。`lead` 是音效从开头到最响那一刻的帧数，音效会提前这么多帧开始播放，让最响的部分落在画面动作上；换音效后要重新测。目前的混音峰值是 -1.9 dBFS，调大音量后要重新测一次，不要超过 -1 dBFS。

**授权**：音乐使用 [Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree)，可以商用，可以用于社交媒体和网络广告，不要求署名，不能用于 CD/DVD、游戏或电视广播。音效使用 [Mixkit Sound Effects Free License](https://mixkit.co/license/#sfxFree)。两者都不允许单独再分发，也不允许连同源文件一起分发，所以 `public/audio/` 不进 git。

Remotion 对个人和 3 人以内的公司免费，超过需要购买公司授权：https://www.remotion.dev/license
