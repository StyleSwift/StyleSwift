# OpenAI API 格式迁移说明

## 概述

本次修改将 StyleSwift 的 API 调用从 Anthropic 格式迁移到 OpenAI 兼容格式，以支持 PPIO 等第三方 API 提供商。

## 主要修改

### 1. API 配置 (`extension/sidepanel/api.js`)

#### 默认配置更新
```javascript
// 旧配置
const DEFAULT_API_BASE = 'https://api.anthropic.com';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// 新配置
const DEFAULT_API_BASE = 'https://api.ppio.com/openai';
const DEFAULT_MODEL = 'deepseek/deepseek-r1';
```

#### 连接验证更新
- 端点从 `/v1/messages` 改为 `/v1/chat/completions`
- 请求头从 Anthropic 格式改为 OpenAI 格式：
  ```javascript
  // 旧格式
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
  
  // 新格式
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  }
  ```

### 2. 流式 API 调用 (`extension/sidepanel/agent-loop.js`)

#### 消息格式转换
实现了 Anthropic 格式到 OpenAI 格式的自动转换：

**系统消息**
```javascript
// Anthropic: 单独的 system 参数
{ system: "...", messages: [...] }

// OpenAI: 作为第一条消息
{ messages: [{ role: "system", content: "..." }, ...] }
```

**工具结果**
```javascript
// Anthropic 格式
{
  role: 'user',
  content: [
    { type: 'tool_result', tool_use_id: 'xxx', content: '...' }
  ]
}

// OpenAI 格式
{
  role: 'tool',
  tool_call_id: 'xxx',
  content: '...'
}
```

**工具调用**
```javascript
// Anthropic 格式
{
  role: 'assistant',
  content: [
    { type: 'tool_use', id: 'xxx', name: 'tool_name', input: {...} }
  ]
}

// OpenAI 格式
{
  role: 'assistant',
  tool_calls: [
    {
      id: 'xxx',
      type: 'function',
      function: { name: 'tool_name', arguments: '...' }
    }
  ]
}
```

#### 工具定义转换
```javascript
// Anthropic 格式
{
  name: 'tool_name',
  description: '...',
  input_schema: { type: 'object', properties: {...} }
}

// OpenAI 格式
{
  type: 'function',
  function: {
    name: 'tool_name',
    description: '...',
    parameters: { type: 'object', properties: {...} }
  }
}
```

#### 流式响应处理
- 从 Anthropic SDK 的事件监听改为原生 fetch + SSE 解析
- 支持 `data: [DONE]` 结束标记
- 正确处理 `finish_reason` 映射（`tool_calls` → `tool_use`）

### 3. UI 更新 (`extension/sidepanel/panel.js`)

更新了 `validateConnection` 调用，添加 model 参数：
```javascript
// 旧调用
await validateConnection(apiKey, apiBase);

// 新调用
await validateConnection(apiKey, apiBase, model);
```

## 兼容性说明

### 支持的 API 提供商
- PPIO (https://api.ppio.com/openai)
- OpenAI (https://api.openai.com)
- 任何 OpenAI 兼容的 API 服务

### 支持的模型
- DeepSeek 系列（如 `deepseek/deepseek-r1`）
- OpenAI 模型（如 `gpt-4`, `gpt-3.5-turbo`）
- 其他兼容模型

## 使用示例

### 配置 PPIO API
```javascript
await saveSettings({
  apiKey: 'your-api-key',
  apiBase: 'https://api.ppio.com/openai',
  model: 'deepseek/deepseek-r1'
});
```

### 配置 OpenAI API
```javascript
await saveSettings({
  apiKey: 'sk-...',
  apiBase: 'https://api.openai.com',
  model: 'gpt-4'
});
```

## 测试

运行测试验证 API 格式：
```bash
npm test extension/tests/openai-api.test.js
```

## 注意事项

1. **API Key 格式**：不同提供商的 API Key 格式可能不同
2. **模型名称**：确保使用提供商支持的模型名称
3. **速率限制**：不同提供商有不同的速率限制策略
4. **功能支持**：某些模型可能不支持工具调用（function calling）

## 迁移检查清单

- [x] 更新默认 API 配置
- [x] 修改连接验证逻辑
- [x] 实现消息格式转换
- [x] 实现工具格式转换
- [x] 处理流式响应
- [x] 更新 UI 调用
- [x] 添加测试用例
- [x] 更新文档

## 回滚方案

如需回滚到 Anthropic 格式，恢复以下文件：
- `extension/sidepanel/api.js`
- `extension/sidepanel/agent-loop.js`
- `extension/sidepanel/panel.js`

并重新安装 `@anthropic-ai/sdk` 依赖。
