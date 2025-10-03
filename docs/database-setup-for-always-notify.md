# 数据库设置 - 始终通知功能

## 📋 新增数据库表

新的"始终通知"功能需要以下额外的Supabase数据库表：

### 1. seller_monitor_meta 表
**用途：** 存储监控元数据和统计信息

```sql
CREATE TABLE seller_monitor_meta (
  id INTEGER PRIMARY KEY,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_checks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入初始数据
INSERT INTO seller_monitor_meta (id, start_date, total_checks)
VALUES (1, NOW(), 0);
```

### 2. seller_monitor_history 表
**用途：** 存储每次检查的变化历史记录

```sql
CREATE TABLE seller_monitor_history (
  id SERIAL PRIMARY KEY,
  changes_summary JSONB NOT NULL,
  monitoring_day INTEGER NOT NULL,
  total_checks INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引提高查询性能
CREATE INDEX idx_seller_monitor_history_created_at
ON seller_monitor_history(created_at);

CREATE INDEX idx_seller_monitor_history_monitoring_day
ON seller_monitor_history(monitoring_day);
```

## 🔧 设置步骤

### 步骤 1: 在Supabase控制台创建表

1. 访问你的 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目的 **SQL Editor**
3. 复制并执行上面的SQL语句

### 步骤 2: 验证表创建

运行以下查询确认表已创建：

```sql
-- 检查表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('seller_monitor_meta', 'seller_monitor_history');

-- 检查meta表初始数据
SELECT * FROM seller_monitor_meta;
```

### 步骤 3: 配置RLS (Row Level Security) - 可选

如果你启用了RLS，需要添加策略：

```sql
-- 允许服务读写seller_monitor_meta
ALTER TABLE seller_monitor_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service access" ON seller_monitor_meta
FOR ALL USING (true);

-- 允许服务读写seller_monitor_history
ALTER TABLE seller_monitor_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service access" ON seller_monitor_history
FOR ALL USING (true);
```

## 📊 数据结构说明

### seller_monitor_meta 字段
- `id`: 固定为1，单例记录
- `start_date`: 首次监控开始时间
- `total_checks`: 累计检查次数
- `created_at`: 记录创建时间
- `updated_at`: 记录更新时间

### seller_monitor_history 字段
- `id`: 自增主键
- `changes_summary`: 变化摘要JSON，包含：
  ```json
  {
    "hasChanges": true,
    "totalChanges": 5,
    "priceChanges": 3,
    "newListings": 1,
    "removedListings": 1,
    "titleChanges": 0,
    "imageChanges": 0,
    "ratingChanges": 0
  }
  ```
- `monitoring_day`: 监控天数
- `total_checks`: 当时的总检查次数
- `created_at`: 记录创建时间

## 🧪 测试新功能

设置完成后，可以运行以下测试：

```bash
# 测试无变化通知
curl https://your-vercel-url.vercel.app/api/test-no-changes-notification

# 测试有变化通知
curl https://your-vercel-url.vercel.app/api/test-with-changes-notification

# 运行实际监控（会根据实际情况发送邮件）
curl https://your-vercel-url.vercel.app/api/monitor-sellers
```

## ⚠️ 重要提醒

1. **数据库权限**: 确保Supabase项目的`SUPABASE_ANON_KEY`有足够权限访问新表
2. **备份**: 在生产环境中创建表之前，请先备份现有数据
3. **监控**: 新功能会将监控数据持久化，注意存储空间使用
4. **历史数据**: `seller_monitor_history`表会持续增长，建议定期清理旧数据

## 🎯 功能特性

新功能提供：
- ✅ 每天定时发送状态报告（即使无变化）
- ✅ 显示监控天数和总检查次数
- ✅ 过去7天变化统计汇总
- ✅ 系统健康状态报告
- ✅ 简化版HTML邮件模板
- ✅ AI智能内容生成

完成设置后，系统将每天23点发送邮件通知，不管是否有变化都会发送相应的报告。