# 数据库迁移说明

## 问题描述

在实现重复检测功能时，我们添加了新的数据库字段但数据库表结构还没有更新，导致以下错误：

```
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (1054, "Unknown column 'widgets.combined_code_hash' in 'field list'")
```

## 解决方案

### 方法一：自动迁移（推荐）

重启 Flask 应用，代码中已经添加了自动迁移逻辑，会在应用启动时自动检查并添加缺失的字段。

### 方法二：手动运行迁移脚本

```bash
python migrate_database.py
```

### 方法三：手动执行 SQL

在数据库中执行以下 SQL 语句：

```sql
-- 添加 styles 表的哈希字段
ALTER TABLE styles ADD COLUMN style_code_hash VARCHAR(64);
CREATE INDEX idx_styles_hash ON styles(style_code_hash);

-- 添加 widgets 表的哈希字段
ALTER TABLE widgets ADD COLUMN combined_code_hash VARCHAR(64);
CREATE INDEX idx_widgets_hash ON widgets(combined_code_hash);
```

## 新字段说明

### styles.style_code_hash
- 类型：VARCHAR(64)
- 用途：存储样式代码的 SHA256 哈希值，用于重复检测
- 索引：idx_styles_hash

### widgets.combined_code_hash
- 类型：VARCHAR(64)
- 用途：存储挂件组合代码（HTML+CSS+JS）的 SHA256 哈希值，用于重复检测
- 索引：idx_widgets_hash

## 重复检测功能

添加这些字段后，系统将能够：

1. **检测重复样式**：当用户生成或保存样式时，系统会检查是否已存在相同的样式代码
2. **检测重复挂件**：当用户生成或保存挂件时，系统会检查是否已存在相同的挂件代码
3. **返回现有记录**：如果发现重复，系统会返回现有记录的ID而不是创建新记录
4. **节省存储空间**：避免存储重复的代码内容
5. **提升性能**：减少数据库查询和存储操作

## 验证迁移

迁移完成后，可以通过访问 `test_duplicate_detection.html` 页面来测试重复检测功能。 