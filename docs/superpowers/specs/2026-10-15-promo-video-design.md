# StyleSwift 宣传片设计

> 日期：2026-10-15
> 状态：已被 v2 取代（`2026-10-15-promo-video-v2-design.md`）

## 目标

做一支 45 秒的软件动画宣传片，发在 Twitter/X 和官网首屏。风格参考 Claude Code 发布片：暖黑底、终端感、大字排版，用模拟出来的 UI 动画讲产品，不拍真人。

**成功标准**

- 静音自动播放时，只看画面也能明白四件事：一句话换皮肤、Agent 自己干活、风格技能可复用、可以用本机的 Claude Code / Codex
- 输出 1920×1080、30fps、H.264 MP4，能直接上传 Twitter/X（≤140 秒、≤512MB）
- 每一行屏幕文字至少停留到能读完（按每秒约 3 个英文单词估算）
- 网页效果画面全部使用 `images/` 里的真实截图，不伪造产品效果

## 已定决策

| 项 | 决定 |
|---|---|
| 渠道 | Twitter/X、官网首屏 |
| 画幅 / 时长 | 16:9，45 秒（1350 帧 @30fps） |
| 语言 | 屏幕文字用英文 |
| 声音 | 无声导出，信息全靠画面；README 标注剪辑点，方便后期配乐 |
| 视觉 | Claude Code 式暖色终端感 |
| 卖点 | 一句话换皮肤、Agent 干活过程、风格技能复用、本机 Claude Code / Codex |
| 工具 | Remotion，独立子项目放在 `styleswift-intro-video/` |

## 视觉语言

**颜色**：直接沿用侧栏深色模式的 token（`extension/sidepanel/panel.css`），不使用 Anthropic 的品牌色。

| 用途 | 值 |
|---|---|
| 背景 | `oklch(15% 0.003 78)`，叠一层很淡的颗粒噪点 |
| 正文 / 标题 | 米白 `oklch(94% 0.01 78)` |
| 次要文字 | `oklch(62% 0.01 78)` |
| 强调（光标、`●`、高亮） | 产品主色 `oklch(75% 0.11 42)` |
| 成功 ✓ / 警告 ⚠ | 柔和绿 / 琥珀色，只在终端行里用 |

**字体**（通过 `@remotion/google-fonts` 加载）

- 标题：Instrument Serif，大字号，字距略收
- 终端和代码：JetBrains Mono
- 侧栏 UI 文本：Inter

**动效规则**

- 终端文字逐字打出（约 30 字符/秒），光标是闪烁的方块
- 工具调用沿用 Claude Code 的排版：`● tool(args)`，下一行缩进用 `⎿` 跟结果
- 标题淡入并上移 12px，用缓出曲线；不做弹跳，不做旋转
- 镜头之间用推近、斜向擦除或硬切，不用花哨转场

## 分镜

帧号按 30fps 计。

### S1 钩子 · 0:00–0:04（帧 0–120）

暖黑全屏，屏幕中间一个提示符和闪烁的方块光标，逐字打出：

```
> make this look like The Matrix
```

打完停 0.5 秒，回车，接 S2。

### S2 一句话换皮肤 · 0:04–0:13（帧 120–390）

- 镜头拉远，出现浏览器窗口（深色窗框、地址栏 `github.com/StyleSwift/StyleSwift`），里面是原始 GitHub 页面；右侧是重画的 StyleSwift 侧栏，S1 的指令以用户气泡的形式出现在侧栏里
- 斜向擦除，页面变成黑客帝国风格
- 接着加速硬切，每次切换时侧栏里的指令气泡同步更换：

| 顺序 | 指令 | 截图 |
|---|---|---|
| 1 | The Matrix | `黑客帝国风格.png` |
| 2 | Windows XP | `windowsXP风格.png` |
| 3 | Y2K | `github千禧风.png` |
| 4 | old newspaper | `报纸风格.png`（地址栏换成 linux.do） |
| 5 | Bauhaus | `包豪斯风格.png` |
| 6 | cozy and warm | `温馨风格.png` |
| 7 | e-ink reader | `豆瓣墨水屏风格.png`（地址栏换成 book.douban.com） |
| 8 | Wes Anderson | `B站韦斯安德森风格.png`（地址栏换成 bilibili.com） |

每张的停留时间从 1.2 秒递减到 0.6 秒。
- 叠加大字：**One sentence. Any website.**

### S3 Agent 干活 · 0:13–0:23（帧 390–690）

切到一块全屏终端面板，逐行出现下面的内容，工具名和参数结构与 `extension/sidepanel/tools/` 中的真实定义一致，数值只是示意：

```
● get_page_structure()
  ⎿ header · repo-nav · file-list · readme · sidebar
● grep(query: ".Box-row", scope: "subtree")
  ⎿ 14 matches
● apply_styles(mode: "save")
  ⎿ +128 lines of CSS            ← 这里有一段 CSS 快速滚过
● QualityAudit · capture_screenshot()
  ⎿ ⚠ contrast 2.9:1 on .Link--muted
● edit_css(old_css, new_css)
  ⎿ ✓ contrast 7.4:1
```

画面左上角是小尺寸的黑客帝国效果截图，在 QualityAudit 那一步出现一个扫描框掠过。
大字分三拍出现：**It reads the page. / Writes the CSS. / Checks its own work.**

### S4 风格技能 · 0:23–0:30（帧 690–900）

- 左栏：用户气泡 “Save this as a skill”，接着出现一行 `● save_style_skill(name: "The Matrix")`。产品里没有“保存”按钮，保存技能是让 Agent 调用这个工具完成的
- 中间弹出一张文件卡 `the-matrix.md`，格式和 `extension/skills/*.md` 一致：frontmatter（name、description）加几行样式要点
- 右栏出现技能列表，The Matrix 带 new 标记滑入顶部，下面是 Old Newspaper、Bauhaus、E-ink Reader、Wes Anderson；最后出现 Export .md / Import .md 两个按钮
- 大字：**Save a look. Reuse it anywhere.**
- 没有“同一个技能用在第二个网站上”的真实截图，所以这一段不放应用到其他网站的效果。用户补充截图后，再加一个“拖过去，生效”的镜头

### S5 本机引擎 · 0:30–0:38（帧 900–1140）

终端里逐行出现：

```
$ npx -y styleswift-bridge@latest install
  ✓ bridge installed
  ✓ Claude Code found
  ✓ Codex found
```

终端在左；右边是侧栏输入框，输入框旁边的引擎按钮弹出真实菜单 “Choose AI engine”，高亮依次移动：`Built-in` → `Claude Code` → `Codex`，按钮上的文字跟着变（文案取自 `extension/_locales/en/messages.json`）。
大字：**No API key? Bring your own Claude Code or Codex.**

### S6 结尾卡 · 0:38–0:45（帧 1140–1350）

居中显示蝴蝶 logo、**StyleSwift**，标语 **Restyle any website with one sentence.**，小字 *Free on the Chrome Web Store · Open source on GitHub*。最后停留 3 秒，方便阅读和循环播放。

## 工程结构

```
styleswift-intro-video/
  package.json            # remotion, @remotion/cli, @remotion/google-fonts, react, vitest
  README.md               # 预览 / 渲染命令 + 剪辑点时间表（配乐用）
  public/shots/           # 从 images/ 选出的截图，缩到 1600px 宽的 JPG
  public/logo.png         # 蝴蝶 logo，复制 extension/icons/icon-128.png（实际为 1372×1372）
  src/
    index.ts              # registerRoot
    Root.tsx              # 一个 Composition：Promo，1920×1080，30fps，1350 帧
    Promo.tsx             # 用 <Series> 按分镜顺序排 S1–S6
    script.ts             # 全片的文案和帧时间表（纯数据，改文案只改这里），有单测
    lib/timing.ts         # 打字、剪辑点的纯函数，有单测
    theme.ts              # 颜色、字体
    components/           # Terminal、TypeLine、BrowserFrame、SidePanel、Headline、Grain
    scenes/               # S1Hook … S6EndCard，每个镜头一个文件
  out/                    # 渲染产物，加入 .gitignore
```

**素材**

- 截图缩到 1600px 宽、转成 JPG 再放进 `public/shots/`，避免把 20MB 的原图复制进仓库
- 原始（未换样式）的 GitHub 页面目前没有截图，需要用 Playwright 截一张 `github.com/StyleSwift/StyleSwift`（视口 1560×952，2 倍像素）。这是未登录状态的页面，按钮和已登录截图略有不同，硬切节奏下看不出来
- 各截图比例在 1.60–1.64 之间，统一放进 16:10 的浏览器窗口，用 `object-fit: cover` 裁切

**命令**

- 预览：`npm run dev`（Remotion Studio）
- 渲染：`npx remotion render Promo out/styleswift-promo.mp4`

## 验证

1. 每个镜头渲染 1–2 张关键帧（`npx remotion still`），逐张检查：文字有没有溢出或被截断、对比度、截图有没有拉伸变形
2. 渲染完整 MP4，用 `npx remotion ffprobe` 确认 1920×1080、30fps、45 秒、H.264
3. 静音从头看一遍，确认每行大字都来得及读完

## 不做的事

- 旁白、配乐、音效（后期自行添加）
- 竖屏版、中文版（需要时另做一个 Composition 复用镜头组件）
- 伪造任何产品效果截图

## 风险

- **Remotion 授权**：个人和 3 人以内的公司免费，超过需要购买公司授权
- **终端面板是示意**：真实产品里工具调用显示为侧栏卡片，片子里改用终端风格表现
