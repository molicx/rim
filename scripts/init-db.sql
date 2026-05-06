-- 初始化数据库脚本
-- 此脚本在 PostgreSQL 容器首次启动时自动执行

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 数据库已由环境变量创建，这里只需要确认
SELECT 'Database initialized successfully' AS status;
