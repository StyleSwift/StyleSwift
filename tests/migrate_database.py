#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本 - 添加重复检测所需的哈希字段
"""

import os
import sys
import logging
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import create_engine, inspect, text

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_engine():
    """获取数据库引擎"""
    database_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')
    if not database_uri:
        raise ValueError("未找到 SQLALCHEMY_DATABASE_URI 环境变量")
    
    return create_engine(database_uri)

def check_column_exists(engine, table_name, column_name):
    """检查表中是否存在指定列"""
    try:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception as e:
        logger.error(f"检查列 {table_name}.{column_name} 时出错: {e}")
        return False

def add_column_if_not_exists(engine, table_name, column_name, column_definition):
    """如果列不存在则添加"""
    if check_column_exists(engine, table_name, column_name):
        logger.info(f"列 {table_name}.{column_name} 已存在，跳过")
        return True
    
    try:
        with engine.connect() as conn:
            sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
            conn.execute(text(sql))
            conn.commit()
            logger.info(f"成功添加列 {table_name}.{column_name}")
            return True
    except Exception as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            logger.info(f"列 {table_name}.{column_name} 已存在，跳过")
            return True
        else:
            logger.error(f"添加列 {table_name}.{column_name} 失败: {e}")
            return False

def create_index_if_not_exists(engine, table_name, column_name, index_name):
    """如果索引不存在则创建"""
    try:
        with engine.connect() as conn:
            sql = f"CREATE INDEX {index_name} ON {table_name}({column_name})"
            conn.execute(text(sql))
            conn.commit()
            logger.info(f"成功创建索引 {index_name}")
            return True
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower() or "key name" in str(e).lower():
            logger.info(f"索引 {index_name} 已存在，跳过")
            return True
        else:
            logger.warning(f"创建索引 {index_name} 失败: {e}")
            return False

def migrate_database():
    """执行数据库迁移"""
    logger.info("开始数据库迁移...")
    
    try:
        engine = get_database_engine()
        logger.info("数据库连接成功")
        
        # 迁移 styles 表
        logger.info("迁移 styles 表...")
        success1 = add_column_if_not_exists(
            engine, 
            'styles', 
            'style_code_hash', 
            'VARCHAR(64)'
        )
        
        if success1:
            create_index_if_not_exists(
                engine, 
                'styles', 
                'style_code_hash', 
                'idx_styles_hash'
            )
        
        # 迁移 widgets 表
        logger.info("迁移 widgets 表...")
        success2 = add_column_if_not_exists(
            engine, 
            'widgets', 
            'combined_code_hash', 
            'VARCHAR(64)'
        )
        
        if success2:
            create_index_if_not_exists(
                engine, 
                'widgets', 
                'combined_code_hash', 
                'idx_widgets_hash'
            )
        
        if success1 and success2:
            logger.info("数据库迁移完成！")
            return True
        else:
            logger.error("数据库迁移部分失败")
            return False
            
    except Exception as e:
        logger.error(f"数据库迁移失败: {e}")
        return False

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1) 