# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并登录
2. 点击 "New Project"
3. 选择组织和输入项目名称
4. 选择数据库密码
5. 选择地区（建议选择亚洲地区如新加坡）

## 2. 创建数据库表

在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL：

```sql
-- 创建用户表
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ebay_user_id VARCHAR(100) UNIQUE,
    ebay_username VARCHAR(100) UNIQUE,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建 OAuth tokens 表
CREATE TABLE oauth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ebay_user_id VARCHAR(100) NOT NULL,
    ebay_username VARCHAR(100),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(ebay_user_id)
);

-- 创建订单表
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ebay_user_id VARCHAR(100) NOT NULL,
    ebay_username VARCHAR(100),
    order_id VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2),
    status VARCHAR(50),
    order_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建搜索历史表
CREATE TABLE search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ebay_user_id VARCHAR(100) NOT NULL,
    ebay_username VARCHAR(100),
    search_query VARCHAR(255) NOT NULL,
    search_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建审计日志表
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    ebay_user_id VARCHAR(100),
    ebay_username VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    source VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建索引以优化查询性能
CREATE INDEX idx_users_ebay_user_id ON users(ebay_user_id);
CREATE INDEX idx_users_ebay_username ON users(ebay_username);
CREATE INDEX idx_oauth_tokens_ebay_user_id ON oauth_tokens(ebay_user_id);
CREATE INDEX idx_orders_ebay_user_id ON orders(ebay_user_id);
CREATE INDEX idx_search_history_ebay_user_id ON search_history(ebay_user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要更新时间的表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON oauth_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 3. 配置行级安全 (RLS)

```sql
-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 创建策略（允许服务角色访问所有数据）
CREATE POLICY "Enable full access for service role" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable full access for service role" ON oauth_tokens
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable full access for service role" ON orders
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable full access for service role" ON search_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable full access for service role" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');
```

## 4. 获取 API 密钥

1. 在 Supabase Dashboard 中，转到 Settings > API
2. 复制以下信息：
   - Project URL
   - anon public API key
   - service_role secret API key

## 5. 在 Vercel 中配置环境变量

在 Vercel Dashboard 的项目设置中添加以下环境变量：

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 6. 测试连接

创建一个测试 API 端点来验证连接：

```javascript
// /api/test-supabase.js
import { DatabaseUtils } from '../lib/supabase.js';

export default async function handler(req, res) {
  try {
    const isConnected = await DatabaseUtils.testConnection();
    const status = await DatabaseUtils.getStatus();

    res.status(200).json({
      connected: isConnected,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connected: false
    });
  }
}
```

## 7. 部署和验证

1. 将代码推送到 GitHub
2. Vercel 会自动部署
3. 访问 `/api/test-supabase` 来验证连接

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 SUPABASE_URL 和 SUPABASE_ANON_KEY 是否正确
   - 确保环境变量在 Vercel 中正确配置

2. **权限错误**
   - 检查 RLS 策略是否正确设置
   - 确保使用了 service_role 密钥进行管理员操作

3. **表不存在**
   - 在 Supabase SQL Editor 中执行上述建表语句
   - 检查表名是否正确

4. **导入错误**
   - 确保文件路径正确
   - 检查 ES6 模块导入语法

### 有用的 Supabase CLI 命令

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 初始化项目
supabase init

# 启动本地开发环境
supabase start

# 生成类型定义
supabase gen types typescript --project-id "your-project-id" > types/supabase.ts
```