# 📧 邮件未收到问题 - 完整解决方案

## 🔍 问题诊断

### 症状
- 监控任务执行成功 (200 OK)
- 检测到商品变化
- 但邮箱未收到通知邮件

### 根本原因
**Gmail SMTP环境变量缺失或配置错误**

## ⚙️ 必需的环境变量

在Vercel项目设置中,**必须配置以下环境变量**:

```bash
# Gmail SMTP配置 (必需!)
GMAIL_USER=wsir78933@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # 16位应用专用密码

# 接收邮箱
RECIPIENT_EMAIL=3277193856@qq.com
```

## 🔑 获取Gmail应用专用密码

### 步骤:

1. **访问**: https://myaccount.google.com/apppasswords
2. **登录**: wsir78933@gmail.com
3. **选择应用**: 邮件
4. **选择设备**: 其他(自定义名称)
5. **输入名称**: Vercel eBay Monitor
6. **点击生成**
7. **复制密码**: 16位密码(格式: `xxxx xxxx xxxx xxxx`)

### ⚠️ 重要提示:
- 这是**应用专用密码**,不是Gmail登录密码
- 只会显示一次,请妥善保存
- 移除所有空格后配置到Vercel

## 🚀 在Vercel配置环境变量

### 方法1: Vercel Dashboard (推荐)

1. 访问: https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/settings/environment-variables
2. 点击 **Add New**
3. 逐个添加:

| 变量名 | 值 | 环境 |
|--------|---|------|
| `GMAIL_USER` | `wsir78933@gmail.com` | Production |
| `GMAIL_APP_PASSWORD` | `xxxxxxxxxxxxxxxx` | Production |
| `RECIPIENT_EMAIL` | `3277193856@qq.com` | Production |

4. 点击 **Save**
5. **重新部署**: Settings → Deployments → 最新部署 → Redeploy

### 方法2: Vercel CLI

```bash
# 需先登录
vercel login

# 添加环境变量
vercel env add GMAIL_USER
# 输入: wsir78933@gmail.com

vercel env add GMAIL_APP_PASSWORD
# 输入: 16位应用专用密码(无空格)

vercel env add RECIPIENT_EMAIL
# 输入: 3277193856@qq.com

# 重新部署
vercel deploy --prod
```

## ✅ 验证配置

### 步骤1: 检查环境变量

```bash
# 访问测试端点(部署后可用)
curl https://ebaywebhook-one.vercel.app/api/test-env

# 或使用PowerShell
powershell.exe -Command "Invoke-WebRequest -Uri 'https://ebaywebhook-one.vercel.app/api/test-env'"
```

**期望输出**:
```json
{
  "success": true,
  "envCheck": {
    "GMAIL_USER": "已配置",
    "GMAIL_APP_PASSWORD": "已配置",
    "RECIPIENT_EMAIL": "3277193856@qq.com"
  }
}
```

### 步骤2: 测试邮件发送

```bash
# 手动触发监控任务
powershell.exe -Command "Invoke-WebRequest -Uri 'https://ebaywebhook-one.vercel.app/api/monitor-sellers'"
```

**期望结果**:
- API返回 200 OK
- 几分钟内收到邮件(检查QQ邮箱收件箱和垃圾邮件)

## 🐛 常见问题排查

### 问题1: 仍未收到邮件

**检查清单**:
- [ ] Gmail应用专用密码是否正确(16位,无空格)
- [ ] Vercel环境变量是否在 **Production** 环境中
- [ ] 是否已 **重新部署** (配置环境变量后必须重新部署)
- [ ] QQ邮箱是否设置了白名单/黑名单
- [ ] 检查QQ邮箱垃圾邮件文件夹

### 问题2: Gmail认证失败

**可能原因**:
1. 使用了登录密码而非应用专用密码
2. Gmail两步验证未启用
3. 应用专用密码包含空格

**解决方案**:
1. 确保Gmail已启用两步验证
2. 重新生成应用专用密码
3. 复制密码时移除所有空格

### 问题3: 环境变量未生效

**原因**: 配置环境变量后需要重新部署

**解决**:
```bash
# 方法1: Vercel Dashboard
Settings → Deployments → 点击最新部署 → Redeploy

# 方法2: 触发新部署
git commit --allow-empty -m "Redeploy to apply env vars"
git push origin main
```

## 📊 邮件发送流程

### 工作原理

1. **Cron Job触发** (每天23:00北京时间)
   ```
   /api/monitor-sellers
   ```

2. **检测商品变化**
   ```javascript
   const changes = detectChanges(currentData, historicalData);
   ```

3. **调用邮件API**
   ```javascript
   fetch('https://ebaywebhook-one.vercel.app/api/rube-email', {
     method: 'POST',
     body: JSON.stringify({ changes, emailType: '...' })
   });
   ```

4. **发送邮件** (使用Nodemailer + Gmail SMTP)
   ```javascript
   const transporter = nodemailer.createTransporter({
     service: 'gmail',
     auth: {
       user: process.env.GMAIL_USER,        // ← 必需
       pass: process.env.GMAIL_APP_PASSWORD  // ← 必需
     }
   });
   ```

5. **邮件送达** → 3277193856@qq.com

## 🔄 完整解决流程

```bash
# 1. 获取Gmail应用专用密码
访问 https://myaccount.google.com/apppasswords
登录 wsir78933@gmail.com → 生成应用专用密码 → 复制(移除空格)

# 2. 配置Vercel环境变量
访问 https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/settings/environment-variables
添加 GMAIL_USER, GMAIL_APP_PASSWORD, RECIPIENT_EMAIL

# 3. 重新部署
触发新部署或手动Redeploy

# 4. 验证配置
powershell.exe -Command "Invoke-WebRequest -Uri 'https://ebaywebhook-one.vercel.app/api/test-env'"

# 5. 测试邮件
powershell.exe -Command "Invoke-WebRequest -Uri 'https://ebaywebhook-one.vercel.app/api/monitor-sellers'"

# 6. 检查邮箱
等待2-5分钟 → 检查3277193856@qq.com收件箱和垃圾邮件
```

## 📝 验证成功标志

✅ **环境变量配置成功**:
```json
{
  "GMAIL_USER": "已配置",
  "GMAIL_APP_PASSWORD": "已配置"
}
```

✅ **邮件发送成功**:
```json
{
  "success": true,
  "sendResult": {
    "message_id": "<xxx@gmail.com>",
    "delivery_status": "delivered"
  }
}
```

✅ **收到邮件**:
- 主题: `🚨 eBay监控警报 - ...` 或 `✅ eBay监控状态 - ...`
- 发件人: eBay监控系统 <wsir78933@gmail.com>
- 收件人: 3277193856@qq.com

## 🚨 紧急回退方案

如果Gmail配置失败,可以临时使用其他邮件服务:

### 方案1: 使用QQ邮箱SMTP

```javascript
// api/rube-email.js 第263-269行
const transporter = nodemailer.createTransporter({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.QQ_EMAIL,      // QQ邮箱
    pass: process.env.QQ_AUTH_CODE   // QQ授权码(非登录密码)
  }
});
```

### 方案2: 使用SendGrid API

需安装依赖并修改代码,详见SendGrid文档。

## 📚 相关文档

- Gmail应用专用密码: https://support.google.com/accounts/answer/185833
- Nodemailer文档: https://nodemailer.com/
- Vercel环境变量: https://vercel.com/docs/projects/environment-variables

---

**最后更新**: 2025-10-04
**状态**: 等待配置环境变量
**下一步**: 在Vercel Dashboard配置Gmail凭证并重新部署
