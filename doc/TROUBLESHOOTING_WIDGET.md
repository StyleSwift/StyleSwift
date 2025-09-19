# 🔧 自定义挂件故障排除指南

## ❌ 常见问题及解决方案

### 1. **404错误：POST /api/save_custom_widget_code**

#### 问题现象：
```
127.0.0.1 - - [04/Jun/2025 15:32:14] "POST /api/save_custom_widget_code HTTP/1.1" 404 -
```

#### 原因分析：
- Flask服务器地址不一致（localhost vs 127.0.0.1）
- 路由注册失败
- 服务器未完全启动

#### 解决方案：

##### ✅ **方法一：统一使用127.0.0.1**
1. 确保Chrome扩展中所有API调用都使用 `127.0.0.1:5000`
2. 在 `background.js` 中检查API base URL

##### ✅ **方法二：重启服务器**
```bash
# 1. 强制关闭所有Python进程
taskkill /F /IM python.exe

# 2. 重新启动Flask服务器
python app.py
```

##### ✅ **方法三：验证路由**
```bash
# 运行路由测试脚本
python test_routes.py
```

### 2. **数据库字段错误**

#### 问题现象：
```
Unknown column 'widgets.combined_code_hash' in 'field list'
```

#### 解决方案：
```bash
# 运行数据库迁移
python migrate_database.py
```

### 3. **服务器名称警告**

#### 问题现象：
```
Current server name 'localhost:5000' doesn't match configured server name '127.0.0.1:5000'
```

#### 解决方案：
已在 `app.py` 中修复：
```python
app.config['SERVER_NAME'] = None  # 允许任何主机名
```

## 🧪 **测试步骤**

### 1. **基本连接测试**
```bash
python test_routes.py
```
应该看到：
```
✅ 路由测试成功!
响应内容: {'is_duplicate': False, 'message': 'Custom widget code saved successfully', 'widget_id': 'test-widget-123'}
```

### 2. **Chrome扩展测试**
1. 打开Chrome扩展
2. 进入"挂件模式"
3. 选择"自定义代码"
4. 输入测试代码并保存

### 3. **数据库验证**
```sql
-- 检查数据是否保存成功
SELECT widget_id, name, widget_type FROM widgets WHERE widget_id = 'test-widget-123';
```

## 📋 **检查清单**

- [ ] Flask服务器在 `http://127.0.0.1:5000` 运行
- [ ] 数据库字段已正确迁移
- [ ] 路由测试通过
- [ ] Chrome扩展使用正确的API地址
- [ ] 无服务器名称警告

## 🔍 **调试命令**

### 查看Flask进程
```bash
# Windows
tasklist | findstr python

# 查看端口占用
netstat -ano | findstr :5000
```

### 手动API测试
```bash
curl -X POST http://127.0.0.1:5000/api/save_custom_widget_code \
  -H "Content-Type: application/json" \
  -d '{"widgetId":"test-123","html":"<div>test</div>","css":"div{color:red;}","js":"console.log(\"test\");"}'
```

## 📞 **获取帮助**

如果问题持续存在：

1. **检查Flask日志**：查看控制台输出
2. **运行完整测试**：`python test_routes.py`
3. **数据库状态**：`python migrate_database.py`
4. **提供错误信息**：包括完整的错误日志和请求详情

---

## 🎯 **成功指标**

当所有问题解决后，你应该能够：
- ✅ 成功保存自定义挂件代码
- ✅ 在页面上看到挂件正常显示
- ✅ 无404或数据库错误
- ✅ 路由测试100%通过 