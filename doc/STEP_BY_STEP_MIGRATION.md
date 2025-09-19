# 逐步数据库迁移指南

## 问题原因
MySQL 某些版本不支持 `IF NOT EXISTS` 语法，导致 SQL 执行失败。

## 解决方案：逐步执行

### 第1步：添加 styles 表的哈希字段
```sql
ALTER TABLE styles ADD COLUMN style_code_hash VARCHAR(64);
```

**如果出现 "Duplicate column name" 错误，说明字段已存在，可以忽略。**

### 第2步：为 styles 表创建索引
```sql
CREATE INDEX idx_styles_hash ON styles(style_code_hash);
```

**如果出现 "Duplicate key name" 错误，说明索引已存在，可以忽略。**

### 第3步：添加 widgets 表的哈希字段
```sql
ALTER TABLE widgets ADD COLUMN combined_code_hash VARCHAR(64);
```

**如果出现 "Duplicate column name" 错误，说明字段已存在，可以忽略。**

### 第4步：为 widgets 表创建索引
```sql
CREATE INDEX idx_widgets_hash ON widgets(combined_code_hash);
```

**如果出现 "Duplicate key name" 错误，说明索引已存在，可以忽略。**

### 第5步：验证迁移结果
```sql
-- 检查字段是否已添加
SHOW COLUMNS FROM styles LIKE 'style_code_hash';
SHOW COLUMNS FROM widgets LIKE 'combined_code_hash';

-- 检查索引是否已创建
SHOW INDEX FROM styles WHERE Key_name = 'idx_styles_hash';
SHOW INDEX FROM widgets WHERE Key_name = 'idx_widgets_hash';
```

## 预期结果
- 每个 SHOW COLUMNS 查询应该返回一行结果
- 每个 SHOW INDEX 查询应该返回一行结果

## 注意事项
1. **逐条执行**：每次只执行一条 SQL 语句
2. **忽略重复错误**：如果提示字段或索引已存在，这是正常的
3. **记录错误**：如果出现其他错误，请记录具体错误信息

## 完成确认
执行完所有步骤后，重启 Flask 应用即可使用重复检测功能。 