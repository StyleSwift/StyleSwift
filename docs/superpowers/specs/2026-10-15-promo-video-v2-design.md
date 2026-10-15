# StyleSwift 宣传片 v2 设计

> 日期：2026-10-15
> 状态：待评审
> 取代：`2026-10-15-promo-video-design.md`（v1 暖色终端版）

## 为什么重做

v1 是 Claude Code 式的暖色终端风格，画面里有终端、代码和工具名，看起来是给开发者的。但目标用户是**喜欢设计的普通人**（见 `docs/marketing-plan.md`）。v1 还是无声的，没有音乐和音效。

## 目标

做一支 45 秒的宣传片，发在 Twitter/X 和官网首屏。画面明亮、活泼、有设计感，配上律动强的背景音乐和恰到好处的音效，切点卡在音乐节拍上。

**成功标准**

- 画面里没有终端、代码和工具名，Agent 的工作过程用大白话和示意动画来表达
- 所有转场和元素出场都是平滑的弹簧动画，背景始终在缓慢流动，没有完全静止的画面
- 关键切点落在音乐节拍上，误差不超过 1 帧
- 配乐加音效，混音后峰值不超过 -1 dBFS（不爆音）
- 静音播放时，只看大标题也能看懂（Twitter 默认静音自动播放）
- 网页效果只用 `images/` 里的真实截图，不伪造产品效果
- 输出 1920×1080、30fps、H.264 视频 + AAC 音频的 MP4，能直接上传 Twitter/X

## 已定决策

| 项 | 决定 |
|---|---|
| 渠道 | Twitter/X、官网首屏 |
| 画幅 / 时长 | 16:9，45 秒（1350 帧 @30fps，正好 24 小节） |
| 语言 | 屏幕文字用英文 |
| 视觉 | 样帧 B「活泼多彩」，加上样帧 A 的炫彩光带作为变身转场 |
| 音乐 | Mixkit「Karma」（Michael Ramir C.，id 1183），128 BPM |
| 音效 | Mixkit 音效库，见下文清单 |
| 本机 Claude Code / Codex | 只在结尾卡上用一行小字带过 |
| 工具 | 沿用 `styleswift-intro-video/` 的 Remotion 项目，替换全部镜头 |

## 视觉语言

参考样帧：`assets/promo-v2-styleframe-b.jpg`（主体）、`assets/promo-v2-styleframe-a.jpg`（光带）；`assets/promo-v2-styleframe-c.jpg` 是未选中的杂志方向，仅存档。

**颜色**

| 名称 | 值 | 用途 |
|---|---|---|
| lilac | `#F1ECFF` | 背景底色 |
| ink | `#1B1033` | 标题、贴纸描边、硬阴影 |
| magenta | `#FF5FA2` | 色斑、贴纸 |
| violet | `#8B5CF6` | 色斑 |
| cyan | `#22D3EE` | 色斑、贴纸 |
| sun | `#FFD84D` | 色斑、贴纸 |
| white | `#FFFFFF` | 窗口、侧栏、卡片 |

这四种亮色取自蝴蝶 logo 的配色。

**字体**（通过 `@remotion/google-fonts` 加载）

- 标题与贴纸：Bricolage Grotesque，800 字重，字距 -0.04em，行高 0.92
- 副标题：Bricolage Grotesque 500
- 界面文字（侧栏、地址栏、卡片）：Inter 400/500/600

**元素**

- **背景**：lilac 底色上铺 4 个大色斑（magenta、violet、cyan、sun），高斯模糊 110px，透明度 0.6，沿各自的慢速正弦轨迹漂移
- **浏览器窗口**：白底，圆角 26px，2px ink 描边，加一层柔和的紫色投影；窗口左上角的三个圆点分别是 magenta、sun、cyan
- **侧栏**：重画的产品浅色侧栏，包括 logo、域名、用户气泡（`#FDECE6`）、三行大白话步骤（✓ Read the page / Picked a palette / Checked it's easy to read）和输入框
- **贴纸**：胶囊形，2.5px ink 描边，`4px 5px 0` ink 硬阴影，Bricolage 800 字重 30px，带轻微旋转
- **炫彩光带**：竖向的 magenta → violet → cyan → sun 渐变，倾斜约 5°，外层模糊发光，中间一条 6px 亮芯；扫过网页时，光带后面露出新风格的截图

## 动效规则

- **弹出**：spring，damping 12，stiffness 180，有回弹，用于贴纸、卡片、拼贴格、logo
- **落定**：spring，damping 200，没有回弹，用于窗口和镜头移动
- **标题**：逐词入场，每个词相隔 3 帧，从下方 24px 弹起并淡入
- **鼓点放大**：S2 和 S5 中每个小节的第一拍，窗口或拼贴墙在 8 帧内从 1 放大到 1.025 再回到 1
- **动态模糊**：只用在窗口飞入和卡片飞行这类快速位移上（`@remotion/motion-blur` 的 `CameraMotionBlur`）
- **背景**：色斑全程漂移，保证画面不会完全静止

## 音乐与节拍

- 音乐从原曲第 79.1645 秒（第 168 拍）开始，`trimBefore` 取 2375 帧
- 每拍 0.46875 秒；片中第 b 拍落在第 `round(b × 14.0625)` 帧，第 96 拍正好是第 1350 帧
- 原曲第 176 拍是鼓点全部进入的位置，对应片中第 8 拍（3.75 秒）；第 256 拍是最后一个重拍，对应片中第 88 拍（41.25 秒），之后是安静的尾音
- 音乐音量 0.8，最后 15 帧淡出到 0

## 分镜（单位：拍）

| 镜头 | 拍 | 时间 |
|---|---|---|
| S1 钩子 | 0–8 | 0–3.75s |
| S2 一句话换皮肤 | 8–40 | 3.75–18.75s |
| S3 它是怎么做到的 | 40–56 | 18.75–26.25s |
| S4 保存风格 | 56–72 | 26.25–33.75s |
| S5 拼贴高潮 | 72–84 | 33.75–39.375s |
| S6 结尾卡 | 84–96 | 39.375–45s |

下文的拍号都是相对镜头起点的。

### S1 钩子（音乐 build-up）

- 第 0 拍：背景色斑在流动，浏览器窗口从下方带动态模糊飞入并落定，里面是原始 GitHub 页，右边是侧栏
- 第 2 拍：鼠标从画面右下进入，移到侧栏输入框
- 第 3–6 拍：输入框里逐字打出 `make it Y2K`（打字声）
- 第 7 拍：鼠标点击发送（点击声），指令变成侧栏里的用户气泡

### S2 一句话换皮肤（鼓点进入）

- 第 0 拍：炫彩光带从左到右扫过网页，用 12 帧把原始页变成 Y2K（闪光嗖声）；贴纸「make it Y2K」弹出
- 第 2 拍：大标题「Any website. Any vibe.」在左侧逐词弹入；窗口缩小并移到右侧，变成样帧 B 的构图
- 后续 7 次换风格，每次都是光带扫过、贴纸弹出、侧栏气泡同步更换（嗖声 + 啵声）：

| 拍 | 指令贴纸 | 截图 |
|---|---|---|
| 8 | the Matrix | `github-matrix.jpg` |
| 12 | Windows XP | `github-xp.jpg` |
| 16 | old newspaper | `linuxdo-newspaper.jpg` |
| 20 | Bauhaus, please | `linuxdo-bauhaus.jpg` |
| 22 | cozy café vibes | `linuxdo-cozy.jpg` |
| 24 | e-ink reader | `douban-eink.jpg` |
| 26 | Wes Anderson | `bilibili-wes.jpg` |

- 节奏从每小节一次加快到每两拍一次。之前的贴纸不消失，越积越多，在窗口周围散成一圈
- 每个小节的第一拍，窗口轻微放大一下

### S3 它是怎么做到的

- 第 0 拍：镜头推近侧栏，侧栏放大到画面右侧；左上标题「Just describe it. It does the rest.」逐词弹入；左下是缩小的网页窗口（停在 S2 最后的韦斯·安德森风格）
- 第 4 拍：步骤 1「Reads the page」亮起，一个放大镜沿 Z 字路线扫过左下的小窗口（提示音）
- 第 8 拍：步骤 2「Picks colors & fonts」亮起，4 个色块和一个「Aa」字体块从页面里飞出，排成一排（提示音）
- 第 12 拍：步骤 3「Checks it's easy to read」亮起，可读性徽章「Easy to read ✓」带回弹出现（完成提示音）

### S4 保存风格

- 第 0 拍：当前页面（韦斯·安德森风格）缩成一张收藏卡，卡上有截图、风格名和「Saved」标记
- 第 2 拍：卡片飞到画面中央，和另外 4 张卡（Y2K、Bauhaus、Cozy、The Matrix）一起扇形展开，每张卡一声啵
- 第 4 拍：标题「Save a look. Use it anywhere.」逐词弹入
- 之后：卡组随每个小节的第一拍轻轻摇摆

### S5 拼贴高潮

- 第 0–7 拍：8 张风格截图，每拍弹出一张，拼成 4×2 的墙（每张一声啵）
- 第 8 拍：标题「Make the web feel like yours.」压在墙前，带白色描边的贴纸式底衬

### S6 结尾卡

- 第 0 拍：炫彩光带扫过蝴蝶 logo（闪光音），logo 带回弹放大出现
- 第 1 拍：StyleSwift 字标弹入
- 第 2 拍：标语「Restyle any website with one sentence.」
- 第 4 拍（音乐最后一个重拍，之后是尾音）：贴纸式按钮「Free on the Chrome Web Store」，下方一行小字「Works with the AI you already use, including Claude Code and Codex.」
- 停留到结束，音乐尾音淡出

## 音效清单

全部来自 Mixkit Sound Effects Free License。

| 键名 | Mixkit id | 名称 | 用在哪里 | 音量 |
|---|---|---|---|---|
| click | 1113 | Mouse click close | S1 点发送 | 0.7 |
| typing | 1396 | Soft typing on a digital keyboard | S1 输入，截前 1.5 秒 | 0.5 |
| sparkle | 2350 | Magic sparkle whoosh | S2 第一次变身 | 0.7 |
| whoosh | 1490 | Fast whoosh transition | S2 之后每次光带扫过 | 0.45 |
| pop | 3005 | Explainer video pops whoosh light pop | 贴纸、收藏卡、拼贴格 | 0.5 |
| check | 2867 | Confirmation tone | S3 步骤 1、2 | 0.6 |
| done | 951 | Positive notification | S3 步骤 3 | 0.6 |
| shine | 2633 | Sweeping sparkle presentation intro | S6 光带扫过 logo | 0.7 |

音量是初始值，混音时可以调整。

## 素材与授权

- **音乐**：Mixkit Stock Music Free License（2026-10-15 读过原文）。允许用于社交媒体视频和网络营销广告，可以商用，不要求署名；不允许用于 CD/DVD、游戏或电视广播，不允许单独再分发或重新混音成纯音乐作品
- **音效**：Mixkit Sound Effects Free License（同日读过原文）。可以商用，不要求署名；不能单独再分发，也不能「连同源文件一起」分发
- 结论：音频文件**不能进这个开源仓库**。放在 `public/audio/`（加入 gitignore），由 `npm run fetch-audio` 从 Mixkit 官方地址下载。README 写明来源和授权链接
- 截图沿用 v1 的 `public/shots/`

## 工程结构

沿用 v1 的 Remotion 项目，保留 `lib/timing.ts`、`script.ts`、测试的组织方式，替换主题和全部镜头。

```
styleswift-intro-video/
  scripts/fetch-audio.mjs   # 按 src/audio.ts 的清单下载音乐和音效到 public/audio/
  public/audio/             # gitignore
  src/
    audio.ts                # 音频清单：键名 → Mixkit 下载地址、文件名、音量（纯数据）
    script.ts               # 文案、拍号时间表（纯数据）
    lib/timing.ts           # beatFrame()、typedText()、activeIndex() 等纯函数
    theme.ts                # 颜色、字体、弹簧参数
    components/             # Backdrop、Window、SidePanel、Sticker、Seam、Headline、Cursor、Card
    scenes/                 # S1Hook … S6EndCard
    Soundtrack.tsx          # 音乐 + 所有音效，时间点都从 script.ts 读
```

v1 不再用到的组件（Terminal、TermLines、Grain 等）删除。

## 验证

1. 单元测试
   - 总长 96 拍、1350 帧
   - 所有切点都落在拍子上
   - 每个音效的触发帧都在片长范围内
   - 引用的截图都存在
   - 大标题停留时间够读完
2. 每个镜头渲染 2–3 张关键帧逐张检查：文字有没有溢出或互相遮挡，构图是否接近样帧 B
3. 渲染成片，用 ffprobe 确认视频 H.264 1920×1080 30fps、音频 AAC、时长 45 秒
4. 把成片音轨解码，测峰值不超过 -1 dBFS
5. 交给用户带声音看一遍，确认音效好听、混音平衡；音效不合适就在 `src/audio.ts` 换 id

## 不做的事

- 旁白、竖屏版、中文版
- 伪造任何产品效果截图，包括“同一个风格用在另一个网站上”的画面

## 风险

- **音效是按名字挑的，我听不到**：成片要由用户试听，不满意就换 id，然后重新运行 `fetch-audio`
- **Remotion 授权**：个人和 3 人以内的公司免费
- **渲染耗时**：大面积模糊加动态模糊会拖慢渲染；动态模糊只用在快速位移上
