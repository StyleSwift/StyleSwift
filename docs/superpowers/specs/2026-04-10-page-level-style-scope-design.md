# 页面级样式范围控制设计

> 版本：v1.0
> 日期：2026-04-10
> 状态：待实现

---

## 一、背景与需求

### 问题

当前 StyleSwift 的样式按域名隔离，样式会应用到该域名下的所有页面。但用户有时只想将样式应用到特定页面（如只改 `/pulls` 页面的样式），而不是整个域名。

### 需求

1. 用户可通过 UI 开关手动选择样式应用范围（域名级或页面级）
2. 页面级样式持久化到具体 URL 路径，刷新后自动恢复
3. 单个会话只能有一种模式，切换时保留样式但改变应用范围
4. 会话列表按 URL 分组展示域名级和页面级会话

---

## 二、设计决策

### 方案选择：会话模式标记法

在现有结构基础上扩展，不在存储键层面引入新层级：

- 存储键保持 `sessions:{domain}:...`（不变）
- Meta 增加 scope 标记和 path 字段
- Active_styles 扩展存储键支持 scope

**优点**：改动最小，兼容现有逻辑，索引结构不变。

---

## 三、存储结构变化

### 3.1 会话 Meta 扩展

现有结构：
```javascript
{
  title: string | null,
  created_at: number,
  message_count: number,
  activeStylesSummary: string
}
```

新增字段：
```javascript
{
  scope: "domain" | "page",  // 会话模式
  path: string | null        // 页面级时存储路径，域名级为 null
}
```

### 3.2 Active Styles 存储键扩展

现有：
- `active_styles:{domain}` — 域名级活跃样式

新增：
- `active_styles:{domain}:domain` — 域名级活跃样式（等价于旧键）
- `active_styles:{domain}:page:{path}` — 页面级活跃样式

保留旧键兼容，迁移时自动映射。

### 3.3 索引项扩展

索引键不变：`sessions:{domain}:index`

索引项增加 scope 和 path 字段：
```javascript
[
  { id: "session-1", created_at: 123, scope: "domain", path: null },
  { id: "session-2", created_at: 456, scope: "page", path: "/pulls" }
]
```

---

## 四、会话管理逻辑

### 4.1 创建新会话

根据当前 UI 开关状态决定 scope：

- 开关关闭（默认）：`scope: "domain"`，`path: null`
- 开关打开：`scope: "page"`，`path: extractPath(currentUrl)`

### 4.2 切换模式

用户在会话中切换开关时：

- 更新 meta：`{scope: newScope, path: newPath}`
- 保留当前会话样式（不清空）
- 清除旧的 active_styles 键，写入新键
- 更新索引项的 scope 和 path

### 4.3 会话切换

用户从列表选择会话时：

- 读取会话 meta 的 scope 和 path
- 将样式同步到对应 active_styles 键
- 若 scope 为 "page"，验证当前页面路径是否匹配
- 不匹配时提示用户：「此会话样式适用于 {path}，当前页面为 {currentPath}」

### 4.4 样式应用

`apply_styles` 工具根据会话 scope 写入：

- 域名级：`active_styles:{domain}:domain`
- 页面级：`active_styles:{domain}:page:{path}`

### 4.5 early-inject.js 逻辑

页面加载时按优先级查找：

1. 提取当前路径 `currentPath`
2. 检查页面级：`active_styles:{domain}:page:{currentPath}`
3. 若无，检查域名级：`active_styles:{domain}:domain`（或兼容旧键）
4. 找到则预注入

---

## 五、会话列表 UI 展示

### 5.1 分组结构

```
github.com
├── 域名级样式
│   ├── 深色模式
│   └── 极简风格
│
├── /pulls
│   └── 列表页优化
│
└── /issues
    └── 问题页高亮
```

### 5.2 分组规则

- 域名级分组：scope="domain" 的会话，标题显示 "域名级样式"
- 页面级分组：scope="page" 且相同 path 的会话，标题显示 path
- 空分组不显示
- 域名级无会话时，页面级分组直接显示在域名下

### 5.3 当前页面高亮

- 当前页面路径匹配的页面级分组高亮
- 当前活动的会话项高亮

---

## 六、开关 UI 设计

### 6.1 位置

发送按钮旁边的工具栏区域，与上传图片按钮并列。

### 6.2 样式

Toggle Switch：
- 关闭状态：显示 "域名级"
- 打开状态：显示 "页面级"

### 6.3 交互行为

- 点击切换，立即生效
- 切换时保留样式，只改变应用范围
- 切换到已有会话时，根据该会话 scope 自动同步开关状态

### 6.4 状态持久

- 不持久化开关状态
- 新建会话默认关闭（域名级）
- 切换会话时同步该会话的 scope

---

## 七、边界情况处理

### 7.1 路径提取规则

```
https://github.com/pulls          → /pulls
https://github.com/pulls?q=open   → /pulls（忽略查询参数）
https://github.com/pulls#section  → /pulls（忽略锚点）
https://github.com/               → /
https://github.com                → /
```

### 7.2 页面路径不匹配

用户打开页面级会话但当前路径不匹配：

- 提示：「此会话样式适用于 {path}，当前页面为 {currentPath}」
- 用户可选择关闭会话或切换模式

### 7.3 SPA 导航

SPA 应用 URL 变化不刷新页面：

- 监听 URL 变化事件
- 页面级会话路径变化时检查匹配性
- 不匹配时提示用户

### 7.4 历史会话迁移

现有会话无 scope 字段：

- 迁移时设置 `scope: "domain"`，`path: null`
- 保持兼容

### 7.5 受限页面

`chrome://`、`edge://` 等受限页面：

- 无法获取路径，默认域名级
- 无法应用样式（现有逻辑已处理）

---

## 八、实现范围

### 模块改动

| 模块 | 改动内容 |
|------|----------|
| session/context.js | 新增 scope 和 path 属性 |
| session/manager.js | 扩展会话创建、切换、meta 更新逻辑 |
| session/storage.js | 扩展 active_styles 存储键逻辑 |
| content/early-inject.js | 按优先级查找页面级和域名级样式 |
| sidepanel/panel.js | 新增开关 UI，会话列表分组展示 |
| tools/registry.js | apply_styles 工具支持 scope |

### 不改动

- 索引键结构（`sessions:{domain}:index`）
- 会话样式键（`sessions:{domain}:{sessionId}:styles`）
- IndexedDB 对话历史结构
- Agent Loop 核心逻辑

---

## 九、验收标准

1. 开关 UI 正常显示和交互
2. 创建会话时 scope 和 path 正确写入
3. 切换模式时样式保留，范围正确更新
4. 页面级样式刷新后自动恢复
5. 会话列表按分组正确展示
6. early-inject 按优先级正确预注入样式
7. SPA 导航时正确处理路径变化
8. 历史会话迁移兼容