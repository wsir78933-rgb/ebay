# eBay 用户账户删除 Webhook 处理器

基于 Vercel Serverless Functions 的 eBay 用户账户删除通知处理系统，符合 GDPR 等数据隐私法规要求。

## 📋 项目概述

当 eBay 用户删除其主账户时，eBay 平台会向已授权的应用发送 Webhook 通知。本项目实现了一个安全、高效的端点来接收这些通知，并自动处理用户数据删除流程。

### 核心功能

- ✅ **安全验证**：验证请求来自 eBay 官方平台
- ✅ **快速响应**：立即返回 200 OK，避免 eBay 重试机制
- ✅ **异步处理**：后台异步删除用户数据
- ✅ **审计日志**：完整记录所有删除操作
- ✅ **符合 GDPR**：满足数据保护法规要求

## 🏗️ 项目结构

```
src/ebay_webhook/
├── api/
│   └── ebay-webhook.js        # Webhook 处理器（主文件）
├── package.json               # 项目配置
├── vercel.json                # Vercel 部署配置
├── .env.example               # 环境变量模板
└── README.md                  # 本文档
```

## 🚀 快速开始

### 1. 环境要求

- Node.js 18.x 或更高版本
- Vercel 账号
- eBay Developer 账号

### 2. 安装依赖

```bash
cd src/ebay_webhook
npm install
```

### 3. 配置环境变量

复制 `.env.example` 并创建本地 `.env` 文件（仅用于本地测试）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入实际值：

```env
EBAY_VERIFICATION_TOKEN=your_actual_token
DATABASE_URL=your_database_url
```

### 4. 本地测试

```bash
npm run dev
```

访问 `http://localhost:3000/api/ebay-webhook?challenge_code=test123` 测试端点验证。

### 5. 部署到 Vercel

```bash
# 安装 Vercel CLI（如果未安装）
npm install -g vercel

# 部署到生产环境
npm run deploy
```

## ⚙️ Vercel 环境变量配置

在 Vercel Dashboard 中配置以下环境变量：

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `EBAY_VERIFICATION_TOKEN` | eBay Webhook 验证令牌 | `abc123xyz...` |
| `DATABASE_URL` | 数据库连接字符串 | `postgresql://user:pass@host/db` |
| `NODE_ENV` | 运行环境（可选） | `production` |
| `LOG_LEVEL` | 日志级别（可选） | `info` |

## 🔧 eBay Developer Portal 配置

### 1. 创建 eBay 应用

1. 访问 [eBay Developer Portal](https://developer.ebay.com/)
2. 登录并进入 **My Account** → **Applications**
3. 创建新应用或选择现有应用

### 2. 配置 Webhook 订阅

1. 在应用页面，进入 **Notifications** 标签
2. 点击 **Create a Subscription**
3. 填写以下信息：
   - **Topic**: 选择 `MARKETPLACE_ACCOUNT_DELETION`
   - **Delivery Address**: 你的 Vercel 端点 URL
     ```
     https://your-domain.vercel.app/api/ebay-webhook
     ```
   - **Verification Token**: 生成一个安全令牌（与环境变量一致）
4. 点击 **Save** 保存配置

### 3. 验证端点

eBay 会向你的端点发送一个包含 `challenge_code` 的 GET 请求。如果配置正确，端点会自动响应验证请求。

## 🧪 测试方法

### 端点验证测试

```bash
curl "https://your-domain.vercel.app/api/ebay-webhook?challenge_code=test123"
```

预期响应：

```json
{
  "challengeResponse": "test123"
}
```

### 删除通知测试

```bash
curl -X POST https://your-domain.vercel.app/api/ebay-webhook \
  -H "Content-Type: application/json" \
  -H "x-ebay-verification-token: your_token" \
  -d '{
    "metadata": {
      "topic": "MARKETPLACE_ACCOUNT_DELETION",
      "notificationId": "test-123"
    },
    "notification": {
      "data": {
        "username": "testuser",
        "userId": "12345"
      }
    }
  }'
```

预期响应：

```json
{
  "success": true,
  "message": "Notification received and queued for processing",
  "notificationId": "test-123"
}
```

## 🔒 安全机制

### 1. Verification Token 验证

每个请求必须在请求头中包含正确的 `x-ebay-verification-token`，否则会被拒绝。

### 2. HTTPS 强制

Vercel 默认提供 HTTPS，确保所有通信加密传输。

### 3. 请求体验证

验证请求格式和必需字段，防止恶意或格式错误的请求。

### 4. 环境变量隔离

敏感信息存储在 Vercel 环境变量中，不暴露在代码库中。

## 📊 数据删除流程

```
1. [接收请求] → 验证 Token
2. [解析数据] → 提取用户标识（username/userId）
3. [快速响应] → 立即返回 200 OK
4. [异步处理] → 后台删除用户数据
5. [审计日志] → 记录删除操作
```

### 需要删除的数据范围

根据 GDPR 第17条"被遗忘权"，必须删除以下数据：

- ✅ 用户基本信息（姓名、邮箱、地址等）
- ✅ OAuth tokens 和授权信息
- ✅ 订单历史和交易记录
- ✅ 搜索历史和浏览记录
- ✅ 个人偏好设置
- ✅ 所有包含个人身份信息的关联数据

### 数据库删除实现

**⚠️ 重要**：代码中的 `deleteUserData()` 函数是示例代码，必须根据实际数据库结构实现。

示例（PostgreSQL）：

```javascript
async function deleteUserData(username, userId) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 删除 OAuth tokens
    await client.query(
      'DELETE FROM oauth_tokens WHERE ebay_user_id = $1 OR ebay_username = $2',
      [userId, username]
    );

    // 删除用户信息
    await client.query(
      'DELETE FROM users WHERE ebay_user_id = $1 OR ebay_username = $2',
      [userId, username]
    );

    // 删除其他相关数据...

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
```

## 🚨 生产环境注意事项

### 1. 异步处理优化

Vercel Serverless Functions 在响应返回后可能会立即终止。对于耗时操作，建议：

- 使用消息队列（AWS SQS、Redis、RabbitMQ）
- 触发另一个后台任务处理器
- 使用 Vercel 的后台函数（Pro 计划）

### 2. 幂等性处理

可能收到重复的删除通知，建议在删除前检查用户是否存在：

```javascript
const userExists = await checkUserExists(userId);
if (!userExists) {
  console.log('[数据删除] 用户已删除，跳过重复操作');
  return;
}
```

### 3. 错误处理和重试

- 记录所有删除失败的情况
- 实现重试机制（指数退避）
- 发送告警通知管理员

### 4. 监控和日志

- 配置错误监控服务（Sentry、Datadog）
- 设置告警规则
- 定期审查审计日志

## 📚 相关文档

- [eBay Notification API 文档](https://developer.ebay.com/api-docs/commerce/notification/overview.html)
- [Vercel Serverless Functions 文档](https://vercel.com/docs/functions/serverless-functions)
- [GDPR 第17条 - 被遗忘权](https://gdpr-info.eu/art-17-gdpr/)

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## ⚠️ 免责声明

本项目提供的代码仅供参考，实际部署前请：

1. 根据实际业务需求调整代码
2. 实现真实的数据库删除逻辑
3. 进行充分的测试
4. 咨询法律顾问确保合规性