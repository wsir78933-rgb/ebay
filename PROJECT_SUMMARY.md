# eBay Webhook 项目总结

## 📁 项目位置
```
/home/wcp/项目集合/自动化测试/src/ebay_webhook/
```

## 📋 已创建的文件

### 1. 核心代码文件
- **`api/ebay-webhook.js`** - Webhook 处理器主程序
  - 处理 eBay 端点验证（GET 请求 + challenge_code）
  - 处理用户删除通知（POST 请求）
  - Token 验证机制
  - 异步数据删除逻辑

### 2. 配置文件
- **`package.json`** - 项目依赖和脚本配置
- **`vercel.json`** - Vercel 部署配置
- **`.env.example`** - 环境变量模板

### 3. 文档文件
- **`README.md`** - 完整的项目说明文档

### 4. 辅助脚本
- **`deploy.sh`** - 快速部署脚本

---

## 🚀 快速部署步骤

### 步骤 1：命令行部署到 Vercel

由于你已经登录 Vercel，可以直接在终端运行：

```bash
# 进入项目目录
cd /home/wcp/项目集合/自动化测试/src/ebay_webhook

# 执行部署（会提示登录，在浏览器中完成授权）
vercel login

# 部署到生产环境
vercel --prod
```

部署完成后，Vercel 会返回类似这样的 URL：
```
https://ebay-webhook-xxxxx.vercel.app
```

你的 Webhook 端点将是：
```
https://ebay-webhook-xxxxx.vercel.app/api/ebay-webhook
```

### 步骤 2：配置 Vercel 环境变量

1. 访问你的 Vercel Dashboard（已在浏览器中打开）
2. 找到刚部署的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

```
EBAY_VERIFICATION_TOKEN=your_32_to_80_character_token
DATABASE_URL=your_database_connection_string
NODE_ENV=production
```

**重要**：添加环境变量后需要重新部署：
```bash
vercel --prod
```

### 步骤 3：在 eBay Developer Portal 配置 Webhook

#### 3.1 创建 Alert Configuration
```bash
curl -X PUT https://api.ebay.com/commerce/notification/v1/config \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alertEmail": "your-email@example.com"
  }'
```

#### 3.2 创建 Destination
```bash
curl -X POST https://api.ebay.com/commerce/notification/v1/destination \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "eBay Webhook Endpoint",
    "deliveryConfig": {
      "endpoint": "https://your-vercel-url.vercel.app/api/ebay-webhook",
      "verificationToken": "your_32_to_80_character_token"
    }
  }'
```

**此时 eBay 会自动发送验证请求**到你的端点。

#### 3.3 创建 Subscription
```bash
curl -X POST https://api.ebay.com/commerce/notification/v1/subscription \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "MARKETPLACE_ACCOUNT_DELETION",
    "destinationId": "destination_id_from_step_3.2",
    "status": "ENABLED"
  }'
```

---

## 🧪 测试方法

### 测试 1：端点验证
```bash
curl "https://your-vercel-url.vercel.app/api/ebay-webhook?challenge_code=test123"
```

**预期响应**：
```json
{
  "challengeResponse": "hashed_value"
}
```

### 测试 2：模拟删除通知
```bash
curl -X POST https://your-vercel-url.vercel.app/api/ebay-webhook \
  -H "Content-Type: application/json" \
  -H "x-ebay-verification-token: YOUR_TOKEN" \
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

**预期响应**：
```json
{
  "success": true,
  "message": "Notification received and queued for processing",
  "notificationId": "test-123"
}
```

---

## ⚠️ 重要提醒

### 1. 数据库删除逻辑
代码中的 `deleteUserData()` 函数是**示例代码**，必须根据实际数据库结构实现真实的删除逻辑。

**需要删除的数据**（符合 GDPR 要求）：
- ✅ 用户基本信息
- ✅ OAuth tokens
- ✅ 订单历史
- ✅ 搜索记录
- ✅ 个人偏好设置
- ✅ 所有包含个人身份信息的数据

### 2. Verification Token 要求
- 长度：32-80 字符
- 允许字符：字母、数字、下划线(_)、连字符(-)
- 示例：`abc123def456_ghi789-jkl012_mno345`

### 3. OAuth Scopes
根据订阅类型选择：

**应用级订阅**：
- Scope: `https://api.ebay.com/oauth/api_scope`
- OAuth 流程：Client Credentials Grant

**用户级订阅**：
- Scope: `https://api.ebay.com/oauth/api_scope/commerce.notification.subscription`
- OAuth 流程: Authorization Code Grant

### 4. 响应时间
- **必须在 10 秒内**返回 200 OK
- 实际数据删除操作应该异步处理
- 如果超时，eBay 会重试发送通知

---

## 📚 相关资源

- [eBay Notification API 文档](https://developer.ebay.com/api-docs/commerce/notification/overview.html)
- [MARKETPLACE_ACCOUNT_DELETION Schema](https://developer.ebay.com/api-docs/master/commerce/notification/asyncapi/marketplace_account_deletion.yaml)
- [eBay Developer Portal](https://developer.ebay.com/)
- [Vercel Dashboard](https://vercel.com/wsir78933-rgbs-projects)

---

## ✅ 部署检查清单

- [ ] 代码已部署到 Vercel
- [ ] Vercel URL 已获取
- [ ] 环境变量已配置（EBAY_VERIFICATION_TOKEN, DATABASE_URL）
- [ ] 端点验证测试通过
- [ ] eBay Alert Configuration 已创建
- [ ] eBay Destination 已创建并验证成功
- [ ] eBay Subscription 已创建并启用
- [ ] 数据库删除逻辑已实现
- [ ] 测试通知接收成功
- [ ] 审计日志机制已实现

---

**下一步：请运行 `vercel login` 和 `vercel --prod` 完成部署！**