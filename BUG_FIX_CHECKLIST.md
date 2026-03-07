# StyleSwift Bug 修复清单

## 📊 测试结果总结

- ✅ 单元测试: 9/9 通过 (100%)
- ⚠️ 集成测试: 1/2 失败 (50%)
- 📈 总体通过率: 455/480 (94.8%)

---

## 🔴 P0 - 核心功能阻塞 (立即修复)

### Bug #1: 扩展消息通信超时

**文件:** `extension/tests/integration/extension.test.js:201`

**错误信息:**
```
Error: Could not establish connection. Receiving end does not exist.
```

**影响范围:** Side Panel 无法与 Content Script 通信

**修复步骤:**

#### 步骤 1: 验证 Content Script 注入
```bash
# 在 extension/content/content.js 顶部添加日志
console.log('[StyleSwift Content Script] Loaded at:', new Date().toISOString());
```

#### 步骤 2: 添加消息监听器就绪标志
```javascript
// 在 content.js 末尾添加
window.__STYLESWIFT_READY__ = true;
console.log('[StyleSwift] Message listener registered');
```

#### 步骤 3: 测试环境等待 Content Script 就绪
```javascript
// 在测试中添加等待逻辑
await page.waitForFunction(() => window.__STYLESWIFT_READY__ === true, {
  timeout: 5000
});
```

#### 步骤 4: 验证修复
```bash
cd extension
npm test -- tests/integration/extension.test.js
```

**预期结果:** 测试通过,消息通信正常

---

### Bug #2: 集成测试环境 Service Worker 未找到

**文件:** `extension/tests/integration/core-flow.test.js:54`

**错误信息:**
```
Error: 未找到扩展 Service Worker
```

**影响范围:** 核心流程集成测试无法运行

**修复步骤:**

#### 步骤 1: 检查测试设置
```javascript
// 查看 extension/tests/integration/setup.js:75
// 确认 getExtensionId 函数的实现
```

#### 步骤 2: 增加等待时间
```javascript
// 在 beforeAll 中增加等待时间
await waitForExtensionReady(browser, 60000); // 从 30s 增加到 60s
```

#### 步骤 3: 添加重试逻辑
```javascript
// 在 getExtensionId 中添加重试
let retries = 3;
while (retries > 0) {
  try {
    const extensionId = await getExtensionId(browser);
    if (extensionId) return extensionId;
  } catch (e) {
    retries--;
    await sleep(2000);
  }
}
```

---

## 🟡 P1 - 重要但不阻塞 (本周修复)

### 优化 #1: 跳过的测试用例

**数量:** 24 个测试被跳过

**位置:** `tests/integration/core-flow.test.js`

**原因:** 这些测试依赖于扩展环境,当前被标记为 skipped

**建议:** 
1. 修复 Bug #2 后,移除 skip 标记
2. 逐个启用测试,确保通过

---

## 🟢 P2 - 优化改进 (有时间再做)

### 优化 #2: 测试覆盖率提升

**当前覆盖率:** 94.8%

**建议:**
1. 为 `agent-loop.js` 添加更多边界情况测试
2. 为 `css-merge.js` 添加性能测试
3. 为 `tools.js` 添加错误处理测试

---

## 📝 修复流程建议

### 第一天: 修复 P0 Bug

1. ✅ 运行测试识别问题 (已完成)
2. ⏳ 修复 Bug #1: 消息通信超时
3. ⏳ 修复 Bug #2: Service Worker 未找到
4. ⏳ 验证所有测试通过

### 第二天: 处理 P1 优化

1. 启用跳过的测试
2. 修复新发现的问题
3. 确保集成测试稳定

### 第三天: P2 优化 (可选)

1. 提升测试覆盖率
2. 添加性能测试
3. 优化测试执行速度

---

## 🔍 调试技巧

### 1. 查看 Chrome 扩展日志
```
chrome://extensions/ → 开发者模式 → 背景页 → 控制台
```

### 2. 查看 Content Script 日志
```
F12 → Console → 筛选 "[StyleSwift]"
```

### 3. 手动测试消息通信
```javascript
// 在 Side Panel 控制台执行
chrome.tabs.query({active: true}, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {tool: 'get_domain'}, (response) => {
    console.log('Domain:', response);
  });
});
```

### 4. 运行单个测试
```bash
npm test -- tests/integration/extension.test.js -t "应该能获取域名"
```

---

## ✅ 验证清单

修复完成后,确保以下所有项通过:

- [ ] 所有单元测试通过 (9/9)
- [ ] 所有集成测试通过 (2/2)
- [ ] 手动测试扩展功能正常
- [ ] Chrome 控制台无错误日志
- [ ] 测试覆盖率 ≥ 95%

---

## 📚 相关文档

- 设计方案: `doc/StyleSwift设计方案.md`
- 测试设置: `extension/tests/integration/setup.js`
- Content Script: `extension/content/content.js`
- Service Worker: `extension/background/service-worker.js`
