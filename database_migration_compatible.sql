-- StyleSwift 数据库迁移脚本 (兼容版本)
-- 用于添加重复检测功能所需的哈希字段
-- 请逐条执行以下SQL语句

-- 步骤1: 添加 styles 表的 style_code_hash 字段
ALTER TABLE styles ADD COLUMN style_code_hash VARCHAR(64);

-- 步骤2: 为 styles 表的哈希字段创建索引
CREATE INDEX idx_styles_hash ON styles(style_code_hash);

-- 步骤3: 添加 widgets 表的 combined_code_hash 字段
ALTER TABLE widgets ADD COLUMN combined_code_hash VARCHAR(64);

-- 步骤4: 为 widgets 表的哈希字段创建索引
CREATE INDEX idx_widgets_hash ON widgets(combined_code_hash);

-- 步骤5: 验证迁移结果
SHOW COLUMNS FROM styles LIKE 'style_code_hash';
SHOW COLUMNS FROM widgets LIKE 'combined_code_hash';
SHOW INDEX FROM styles WHERE Key_name = 'idx_styles_hash';
SHOW INDEX FROM widgets WHERE Key_name = 'idx_widgets_hash'; 