# eBay Webhook + Supabase 集成指南

## 🚀 快速开始

本项目已经集成了 Supabase 作为数据库解决方案，用于处理 eBay 用户数据删除 Webhook。

### 1. 配置 Supabase

#### 创建 Supabase 项目
1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取项目 URL 和 API 密钥

#### 设置数据库
执行 [supabase-setup.md](./docs/supabase-setup.md) 中的 SQL 语句来创建必需的表。

### 2. 配置 Vercel 环境变量

在 Vercel Dashboard 的项目设置中添加以下环境变量：

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EBAY_VERIFICATION_TOKEN=your_ebay_verification_token
```

### 3. 测试连接

部署后，访问以下端点测试 Supabase 连接：

```
GET https://your-app.vercel.app/api/test-supabase
```

## 📁 项目结构

```
/api/
  ebay-webhook.js          # 主要的 Webhook 处理器
  test-supabase.js         # Supabase 连接测试端点
  oauth-authorize.js       # OAuth 授权
  oauth-callback.js        # OAuth 回调
  get-orders.js           # 获取订单
  search-products.js      # 搜索产品
  monitor-sellers.js      # 监控卖家

/lib/
  supabase.js             # Supabase 客户端配置和数据库操作

/docs/
  supabase-setup.md       # 数据库设置指南

.env.example              # 环境变量模板
package.json              # 项目依赖
vercel.json              # Vercel 配置
```

## 🔧 主要功能

### 用户数据管理
- **UserService.findUserByEbayData()** - 查找用户
- **UserService.createUser()** - 创建用户
- **UserService.updateUser()** - 更新用户信息
- **UserService.deleteUserData()** - 删除用户数据（GDPR 合规）

### OAuth Token 管理
- **OAuthService.saveToken()** - 保存访问令牌
- **OAuthService.getToken()** - 获取访问令牌
- **OAuthService.deleteToken()** - 删除访问令牌

### 数据库工具
- **DatabaseUtils.testConnection()** - 测试连接
- **DatabaseUtils.getStatus()** - 获取数据库状态

## 🛡️ GDPR 合规

当收到 eBay 的用户账户删除通知时，系统会：

1. 验证请求的合法性
2. 快速响应 eBay（防止重试）
3. 异步删除用户的所有个人数据：
   - 用户基本信息
   - OAuth tokens
   - 订单历史
   - 搜索历史
4. 记录删除操作的审计日志

## 🔍 调试和监控

### 测试 Supabase 连接
```bash
# 基本测试
curl https://your-app.vercel.app/api/test-supabase

# 详细测试（包括操作测试）
curl "https://your-app.vercel.app/api/test-supabase?test_operations=true"
```

### 查看日志
在 Vercel Dashboard 的 Functions 页面查看实时日志。

## 📋 数据库表结构

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| `users` | 用户基本信息 | `ebay_user_id`, `ebay_username`, `email` |
| `oauth_tokens` | OAuth 访问令牌 | `ebay_user_id`, `access_token`, `refresh_token` |
| `orders` | 订单历史 | `ebay_user_id`, `order_id`, `order_data` |
| `search_history` | 搜索历史 | `ebay_user_id`, `search_query`, `search_results` |
| `audit_logs` | 审计日志 | `event_type`, `ebay_user_id`, `status` |

## 🚨 故障排除

### 常见问题

1. **连接失败**
   - 检查环境变量是否正确配置
   - 确保 Supabase 项目正常运行

2. **权限错误**
   - 验证 RLS 策略设置
   - 确保使用正确的 API 密钥

3. **表不存在**
   - 执行 SQL 建表语句
   - 检查表名拼写

### 获取帮助

1. 查看 Vercel 函数日志
2. 访问 `/api/test-supabase` 检查连接状态
3. 查看 Supabase Dashboard 的日志

## 🔄 升级和迁移

如果从其他数据库（如 PostgreSQL）迁移到 Supabase：

1. 导出现有数据
2. 在 Supabase 中创建表结构
3. 导入数据
4. 更新环境变量
5. 测试所有功能

## 📚 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [Vercel 环境变量配置](https://vercel.com/docs/concepts/projects/environment-variables)
- [eBay Webhook 文档](https://developer.ebay.com/api-docs/commerce/notification/overview.html)

---

**注意**: 这是一个生产就绪的解决方案，包含了完整的错误处理、日志记录和 GDPR 合规功能。