-- 创建数据库
CREATE DATABASE IF NOT EXISTS style_changer_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 使用新创建的数据库
USE style_changer_db;

-- 样式表
CREATE TABLE styles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  style_url VARCHAR(255),
  style_code TEXT,
  style_type ENUM('default', 'minimalist', 'cute', 'custom') NOT NULL,
  preview_image_url VARCHAR(255),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 会员表
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  language VARCHAR(5),
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  verification_code VARCHAR(20),
  membership_level ENUM('free', 'premium', 'vip') DEFAULT 'free',
  is_active BOOLEAN DEFAULT TRUE,
  premium_expiry_date DATE,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户样式关联表
CREATE TABLE user_styles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  style_id INT,
  relationship_type ENUM('created', 'applied', 'shared', 'favorite') NOT NULL,
  applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 网站类型表
CREATE TABLE website_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 样式-网站类型关联表
CREATE TABLE style_website_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  style_id INT,
  website_type_id INT,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE CASCADE,
  FOREIGN KEY (website_type_id) REFERENCES website_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 添加外键约束
ALTER TABLE styles
ADD CONSTRAINT fk_styles_created_by
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;