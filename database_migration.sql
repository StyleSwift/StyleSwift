-- StyleSwift 数据库迁移脚本
-- 用于添加重复检测功能所需的哈希字段

-- 检查并添加 styles 表的 style_code_hash 字段
ALTER TABLE styles ADD COLUMN IF NOT EXISTS style_code_hash VARCHAR(64);

-- 为 styles 表的哈希字段创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_styles_hash ON styles(style_code_hash);

-- 检查并添加 widgets 表的 combined_code_hash 字段
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS combined_code_hash VARCHAR(64);

-- 为 widgets 表的哈希字段创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_widgets_hash ON widgets(combined_code_hash);

-- 显示迁移完成信息
SELECT 'Database migration completed successfully' AS status; 