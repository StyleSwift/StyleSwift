# StyleSwift 宣传片 v2 设计

> 日期：2026-10-15
> 状态：已实现
> 取代：`2026-10-15-promo-video-design.md`（v1 暖色终端版）

## 为什么重做

v1 是 Claude Code 式的暖色终端风格，画面里有终端、代码和工具名，看起来是给开发者的。但目标用户是**喜欢设计的普通人**（见 `docs/marketing-plan.md`）。v1 还是无声的，没有音乐和音效。

## 目标

做一支约 46 秒的宣传片（100 拍），发在 Twitter/X 和官网首屏。画面明亮、活泼、有设计感，配上律动强的背景音乐和恰到好处的音效，切点卡在音乐节拍上。

**成功标准**

- 画面里没有终端、代码和工具名，Agent 的工作过程用大白话和示意动画来表达。例外：开场原始 GitHub 截图里能看清提交记录（含 Codex、ESLint 等字样），用户在 2026-10-15 看过后决定保留
- 所有转场和元素出场都是平滑的弹簧动画，背景始终在缓慢流动，没有完全静止的画面
- 关键切点落在音乐节拍上，误差不超过 1 帧
- 配乐加音效，混音后峰值不超过 -1 dBFS（不爆音）
- 静音播放时，只看大标题也能看懂（Twitter 默认静音自动播放）
- 网页效果只用 `images/` 里的真实截图，不伪造产品效果
- 侧栏是真实插件界面的截图（用户 2026-10-16 要求）。截图时插件、工具卡片和页面工具都是真的在跑，只有模型回复是脚本化的（没有 API Key），回复文字描述的是片中对应风格的真实截图
- 输出 1920×1080、30fps、H.264 视频 + AAC 音频的 MP4，能直接上传 Twitter/X

## 已定决策

| 项 | 决定 |
|---|---|
| 渠道 | Twitter/X、官网首屏 |
| 画幅 / 时长 | 16:9，100 拍 = 25 小节 ≈ 46.2 秒（1385 帧 @30fps，130 BPM）。开场比最初多 1 小节，用来展示「点击工具栏图标打开侧栏」（用户 2026-10-15 提出） |
| 语言 | 屏幕文字用英文 |
| 视觉 | 样帧 B「活泼多彩」，加上样帧 A 的炫彩光带作为变身转场 |
| 音乐 | Mixkit「Cherry on Top」（Michael Ramir C.，id 983），130 BPM。最初用的是「Karma」（id 1183，128 BPM），用户看完成片觉得它偏夜店 EDM，和糖果色画面不搭；对比了 3 支带画面的试看片后改用这首 |
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

- 标题与贴纸：Bricolage Grotesque，800 字重，字距 -0.04em，行高 0.95
- 副标题：Bricolage Grotesque 500
- 界面文字（侧栏、地址栏、卡片）：Inter 400/500/600

**元素**

- **背景**：lilac 底色上铺 4 个大色斑（magenta、violet、cyan、sun），高斯模糊 110px，透明度 0.6，沿各自的慢速正弦轨迹漂移
- **浏览器窗口**：白底，圆角 26px，2px ink 描边，加一层柔和的紫色投影；窗口左上角的三个圆点分别是 magenta、sun、cyan
- **侧栏**：真实插件侧栏的截图（英文界面），由 `scripts/capture-panel.cjs` 生成：在 Chromium 里加载真实扩展，目标网站开在另一个标签页，侧栏的「当前页面」指向它；模型请求被拦截，按脚本依次调用 View Page Structure → Search Page Elements → Apply Styles（三个工具真实执行），最后回复一句「Done! …」。每个运行的网站、指令和回复写在 `scripts/panel-runs.json`，测试会核对指令和片中一致。截图 400×940（2 倍），正好对应窗口里 320×752 的侧栏位置
- **贴纸**：胶囊形，2.5px ink 描边，`4px 5px 0` ink 硬阴影，Bricolage 800 字重 30px，带轻微旋转
- **炫彩光带**：竖向的 magenta → violet → cyan → sun 渐变，倾斜约 5°，外层模糊发光，中间一条 6px 亮芯；扫过网页时，光带后面露出新风格的截图

## 动效规则

- **弹出**：spring，damping 12，stiffness 180，有回弹，用于贴纸、卡片、拼贴格、logo
- **落定**：spring，damping 200，没有回弹，用于窗口和镜头移动
- **标题**：逐词入场，每个词相隔 3 帧，从下方 24px 弹起并淡入
- **鼓点放大**：S2 和 S5 中每个小节的第一拍，窗口或拼贴墙在 8 帧内放大一下再回到 1（S2 放大 2.5%，S5 放大 2%）
- **镜头退场**：S2–S5 的最后 6 帧整体缩小到 94% 并淡出，下一个镜头在拍子上弹入；S1 不退场（它的窗口直接延续到 S2），S6 停留到结尾
- **动态模糊**：只用在窗口飞入这类快速位移上，按元素每帧的位移量加 CSS 模糊（`speedBlur`）。不用 `@remotion/motion-blur`，因为它要把整棵子树渲染多遍，渲染耗时会成倍增加
- **背景**：色斑全程漂移，保证画面不会完全静止

## 音乐与节拍

- 原曲是 130 BPM，第一拍在 0.3971 秒；从原曲第 123 拍（57.17 秒）开始截，`trimBefore` 取 1715 帧
- 每拍约 0.4615 秒；片中第 b 拍落在第 `round(b × 60 × 30 / 130)` 帧，第 100 拍是第 1385 帧
- 原曲最后一个重拍（第 215 拍，99.63 秒）对应片中第 92 拍，也就是结尾卡 CTA 出现的那一拍；之后音乐逐渐收尾
- 这首曲子从头到尾都很满，没有安静的前奏，所以钩子段把音乐压到约一半音量，到第 12 拍（第一次变身）时升回全音量
- 音乐音量 0.85（这首比 Karma 整体轻约 5 dB），最后 15 帧淡出到 0；成片峰值约 -1.8 dBFS
- 换曲时只需改 `src/script.ts` 的 `BPM` 和 `MUSIC`：所有镜头和音效都以拍为单位，切点会自动落在新拍子上，片长随 BPM 变化

## 分镜（单位：拍）

| 镜头 | 拍 | 时间 |
|---|---|---|
| S1 钩子 | 0–12 | 0–5.54s |
| S2 一句话换皮肤 | 12–44 | 5.54–20.31s |
| S3 它是怎么做到的 | 44–60 | 20.31–27.69s |
| S4 保存风格 | 60–76 | 27.69–35.08s |
| S5 拼贴高潮 | 76–88 | 35.08–40.62s |
| S6 结尾卡 | 88–100 | 40.62–46.15s |

下文的拍号都是相对镜头起点的。

### S1 钩子（音乐 build-up）

- 第 0 拍：背景色斑在流动，浏览器窗口从下方带动态模糊飞入并落定，里面是原始 GitHub 页，网页占满窗口；地址栏右端是已固定的 StyleSwift 蝴蝶图标（和真实产品一样，欢迎页会引导用户固定图标）
- 第 1.5 拍：鼠标从画面右下进入，移到蝴蝶图标上
- 第 3 拍：点击图标（点击声），图标按下，一圈粉色涟漪从图标扩散开（14 帧，让小图标在信息流里也看得到）；侧栏用 12 帧从右侧滑出，把网页挤窄，和 Chrome 侧栏的行为一致（第 3.5 拍一声啵）
- 第 5 拍：鼠标移到侧栏输入框
- 第 6.5–9 拍：输入框里逐字打出 `make it Y2K`（打字声）
- 第 10 拍：鼠标点击发送（点击声），指令变成侧栏里的用户气泡

### S2 一句话换皮肤（鼓点进入）

- 第 0 拍（片中第 12 拍）：炫彩光带从左到右扫过网页，用 12 帧把原始页变成 Y2K（闪光嗖声）；贴纸「make it Y2K」弹出；S1 留在发送按钮上的鼠标在 8 帧内淡出；侧栏依次切换真实截图：已发送 → 三个工具卡片逐个完成（第 2、5、8 帧）→ 回复出现（第 11 帧），不会一下子跳到完成状态
- 第 2 拍：大标题「Any website. Any vibe.」在左侧逐词弹入；窗口缩小并移到右侧，变成样帧 B 的构图
- 后续 9 次换风格，每次都是光带扫过、贴纸弹出、侧栏气泡同步更换（嗖声 + 啵声）：

| 拍 | 指令贴纸 | 截图 |
|---|---|---|
| 8 | the Matrix | `github-matrix.png` |
| 12 | Windows XP | `github-xp.png` |
| 14 | Cyberpunk 2077 | `github-cyberpunk.png` |
| 16 | ink on paper | `github-eink.png` |
| 18 | old newspaper | `linuxdo-paper.jpg` |
| 20 | Bauhaus, please | `linuxdo-bauhaus.jpg` |
| 22 | cozy café vibes | `linuxdo-cozy.jpg` |
| 24 | e-ink reader | `douban-eink.jpg` |
| 26 | vintage gazette | `bilibili-paper.png` |

- 节奏从每小节一次加快到每两拍一次（第 12 拍起）。之前的贴纸不消失，越积越多，在窗口周围散成一圈
- 每个小节的第一拍，窗口轻微放大一下

### S3 它是怎么做到的

- 第 0 拍：右侧滑入放大的真实侧栏截图（Bilibili 上「vintage gazette」那次运行，1.35 倍，只露出对话部分，底部渐隐）；左上标题「Just describe it. It does the rest.」逐词弹入；左下是缩小的网页窗口，先显示B站原图（同一页面关掉样式后截的 `bilibili-original.png`，推荐视频和效果图一致），因为这时插件还没动手
- 第 4 拍：真实卡片「View Page Structure」完成（提示音），一个放大镜沿 Z 字路线扫过左下的小窗口
- 第 8 拍：真实卡片「Search Page Elements」完成（提示音），原图上弹出三个粉色虚线框，标出找到的页面区域（顶部横幅、轮播大图、视频卡片）
- 第 12 拍：真实卡片「Apply Styles」完成（提示音），炫彩光带扫过小窗口，原图变成复古报纸风格；同时 4 个色块（从效果图里取的颜色）和一个「Aa」字体块从页面里飞出，排成一列
- 第 14 拍：侧栏出现回复「Done! Cream newsprint, a serif masthead and sepia-toned photos.」（完成提示音）
- 原先的大白话步骤和「Easy to read ✓」徽章去掉了：真实界面里没有这几个字，可读性检查这次运行也没有展示

### S4 保存风格

- 第 0 拍：当前页面（复古报纸风格，卡名「Vintage Gazette」）缩成一张收藏卡，卡上有截图、风格名和「Saved」标记
- 第 2 拍：卡片飞到画面中央，另外 4 张卡扇形展开，每张卡一声啵：同一种复古报纸风格用在 deepseek.com、github.com、x.com、linux.do 上，卡上标的是网站名，表达「存下来的风格可以用到任何网站」。越靠中间的卡越在上层；名字最长的放最外侧，右侧卡片的网站名靠右放，避免被中间的卡挡住
- 第 4 拍：标题「Save a look. Use it anywhere.」逐词弹入
- 之后：卡组随每个小节的第一拍轻轻摇摆

### S5 拼贴高潮

- 第 0–2.25 拍：10 张风格截图每 1/4 拍弹出一张，拼成 5×2 的墙（列数按截图张数算）；整拍上的 3 张各配一声啵
- 第 4 拍：标题「Make the web feel like yours.」压在墙前，带白色描边的贴纸式底衬（原定第 8 拍只剩 56 帧，读不完，所以提前）

### S6 结尾卡

- 第 0 拍：logo 带回弹放大出现，一道光扫过蝴蝶（用 logo 自身形状做遮罩，只照亮蝴蝶，不出现方块）（闪光音）
- 第 1 拍：StyleSwift 字标弹入
- 第 2 拍：标语「Restyle any website with one sentence.」
- 第 4 拍（音乐最后一个重拍）：贴纸式按钮「Free on the Chrome Web Store」弹出（啵）
- 第 4.5 拍：下方一行小字「Works with Claude Code, Codex and more.」（原文 12 个词读不完，缩短到 7 个词）
- 停留到结束，音乐尾音淡出

## 音效清单

全部来自 Mixkit Sound Effects Free License。

| 键名 | Mixkit id | 名称 | 用在哪里 | 音量 | 提前量（帧） |
|---|---|---|---|---|---|
| click | 1113 | Mouse click close | S1 点工具栏图标、点发送 | 0.7 | 4 |
| typing | 1396 | Soft typing on a digital keyboard | S1 输入，截前约 1.2 秒 | 0.5 | 0 |
| sparkle | 2350 | Magic sparkle whoosh | S2 第一次变身 | 0.7 | 13 |
| whoosh | 1490 | Fast whoosh transition | S2 之后每次光带扫过 | 0.45 | 21 |
| pop | 3005 | Explainer video pops whoosh light pop | S1 侧栏滑出、贴纸、收藏卡、拼贴格、结尾 CTA | 0.5 | 1 |
| check | 2867 | Confirmation tone | S3 步骤 1、2 | 0.6 | 7 |
| done | 951 | Positive notification | S3 步骤 3 | 0.6 | 6 |
| shine | 2633 | Sweeping sparkle presentation intro | S6 光带扫过 logo | 0.7 | 27 |

**提前量**是从音效文件开头到它最响那一刻的帧数（逐帧测量 RMS 得出）。音效会提前这么多帧开始播放，让最响的部分正好落在画面动作上。whoosh 和 shine 是渐强型音效，不提前的话会比画面晚 0.3–0.9 秒。

## 素材与授权

- **音乐**：Mixkit Stock Music Free License（2026-10-15 读过原文）。允许用于社交媒体视频和网络营销广告，可以商用，不要求署名；不允许用于 CD/DVD、游戏或电视广播，不允许单独再分发或重新混音成纯音乐作品
- **音效**：Mixkit Sound Effects Free License（同日读过原文）。可以商用，不要求署名；不能单独再分发，也不能「连同源文件一起」分发
- 结论：音频文件**不能进这个开源仓库**。放在 `public/audio/`（加入 gitignore），由 `npm run fetch-audio` 从 Mixkit 官方地址下载，文件名是「键名-Mixkit id.mp3」（换 id 会自动下载新文件）；先下载到 `.part` 文件，成功后再改名，中断不会留下残缺文件。README 写明来源和授权链接
- 网页截图沿用 v1 的 `public/shots/`；侧栏截图在 `public/panel/`（我们自己产品的界面，可以提交进仓库），重新截取用 `CHROME_PATH=<完整 Chromium> node scripts/capture-panel.cjs`

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
