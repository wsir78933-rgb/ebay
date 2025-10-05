# 🤖 RUBE MCP邮件解决方案

## 问题分析

您完全正确！当前的`rube-email.js`**并非真正的RUBE MCP集成**，而是：
- ❌ 使用nodemailer + Gmail SMTP
- ❌ 需要`GMAIL_USER`和`GMAIL_APP_PASSWORD`环境变量
- ❌ 只是包装了传统邮件发送方式

**真正的RUBE MCP应该**：
- ✅ 使用您已授权的Gmail连接（`wsir78933@gmail.com`）
- ✅ 通过Composio API调用GMAIL_SEND_EMAIL工具
- ✅ 无需配置SMTP凭证

## 当前架构问题

```
monitor-sellers.js → rube-email.js → nodemailer → Gmail SMTP (需要密码❌)
```

**应该是**：
```
monitor-sellers.js → RUBE MCP → Composio API → 已授权的Gmail ✅
```

## 解决方案选项

### 方案1: 使用Composio API直接调用 (推荐)

在Vercel环境变量中添加：
```bash
COMPOSIO_API_KEY=your_composio_api_key
```

然后修改邮件发送逻辑为：

```javascript
async function sendEmailViaRubeMCP(subject, body, recipient) {
  const response = await fetch('https://backend.composio.dev/api/v1/actions/GMAIL_SEND_EMAIL/execute', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.COMPOSIO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient_email: recipient,
      subject: subject,
      body: body,
      is_html: true,
      connectedAccountId: 'ca_IPx7uQ2-stYV' // 您的Gmail连接ID
    })
  });

  return await response.json();
}
```

### 方案2: 使用现有nodemailer (快速修复)

**优点**: 立即可用，无需架构改动
**缺点**: 需要Gmail应用专用密码

只需在Vercel配置：
```bash
GMAIL_USER=wsir78933@gmail.com
GMAIL_APP_PASSWORD=your_16_digit_password
```

## 推荐实施步骤

### 🚀 方案1: 完整RUBE MCP集成

#### 步骤1: 获取Composio API Key

1. 访问: https://app.composio.dev/settings/api-keys
2. 创建新的API Key
3. 复制密钥

#### 步骤2: 配置Vercel环境变量

```bash
# 在Vercel Dashboard添加
COMPOSIO_API_KEY=your_api_key_here
GMAIL_CONNECTED_ACCOUNT_ID=ca_IPx7uQ2-stYV  # 您的Gmail连接ID
```

#### 步骤3: 替换rube-email.js

使用我创建的`rube-email-v2.js`，或者修改现有文件：

```javascript
// api/rube-email.js
export default async function handler(req, res) {
  const { changes, monitoringStats } = req.body;

  const emailContent = generateEmailContent(changes, monitoringStats);
  const subject = generateSubject(changes);

  // 真正的RUBE MCP调用
  const response = await fetch('https://backend.composio.dev/api/v1/actions/GMAIL_SEND_EMAIL/execute', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.COMPOSIO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient_email: '3277193856@qq.com',
      subject: subject,
      body: emailContent,
      is_html: true,
      connectedAccountId: process.env.GMAIL_CONNECTED_ACCOUNT_ID
    })
  });

  const result = await response.json();

  return res.status(200).json({
    success: true,
    result,
    integration: 'real_rube_mcp'
  });
}
```

#### 步骤4: 重新部署

```bash
git add .
git commit -m "切换到真正的RUBE MCP邮件集成"
git push origin main
```

### 📧 方案2: 快速修复 (保持nodemailer)

如果您想快速解决问题，只需：

1. **获取Gmail应用专用密码**
   - 访问: https://myaccount.google.com/apppasswords
   - 登录`wsir78933@gmail.com`
   - 生成应用专用密码

2. **配置Vercel**
   ```
   GMAIL_USER=wsir78933@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

3. **重新部署**
   - Vercel Dashboard → Deployments → Redeploy

## 如何选择？

| 特性 | 方案1: 真RUBE MCP | 方案2: nodemailer |
|------|-------------------|-------------------|
| 需要配置 | Composio API Key | Gmail应用密码 |
| 架构纯度 | ✅ 完全RUBE生态 | ❌ 混合方案 |
| 实施难度 | 中等 | 简单 |
| 长期维护 | ✅ 更好 | ⚠️ 需管理密码 |
| 立即可用 | 需要API Key | 需要Gmail密码 |

## 推荐：方案1

虽然需要一些配置，但**方案1是正确的架构**：
- ✅ 使用您已授权的Gmail连接
- ✅ 无需管理SMTP密码
- ✅ 符合RUBE MCP理念
- ✅ 更安全、更易维护

## 下一步行动

**选择方案1** (推荐):
1. 获取Composio API Key
2. 告诉我API Key，我帮您配置
3. 修改代码并部署

**选择方案2** (快速):
1. 生成Gmail应用专用密码
2. 在Vercel配置环境变量
3. 重新部署

您希望使用哪个方案？
