# 邮件未收到问题诊断报告

**诊断时间**: 2025-10-04
**项目**: ebay_webhook (ebaywebhook-one.vercel.app)
**问题**: 定时监控邮件未收到

---

## 🔍 诊断结果

### 1️⃣ **Cron Job 执行时间问题**

**当前配置**:
```json
{
  "crons": [
    {
      "path": "/api/monitor-sellers",
      "schedule": "33 14 * * *"  // UTC 14:33 = 北京时间 22:33
    }
  ]
}
```

**问题**:
- 如果你期待在北京时间 **23:00** 收到邮件
- 当前设置会在北京时间 **22:33** 执行

**解决方案**:
修改 `src/ebay_webhook/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/monitor-sellers",
      "schedule": "0 15 * * *"  // UTC 15:00 = 北京时间 23:00
    }
  ]
}
```

---

### 2️⃣ **Vercel日志中没有Cron执行记录**

**发现**:
- 查看了最近30分钟的日志
- 只看到 `/api/ebay-webhook` 的请求
- **没有看到** `/api/monitor-sellers` 的执行日志

**可能原因**:
1. ❌ Cron Job未在Vercel中激活
2. ❌ Cron Job执行失败但未记录日志
3. ❌ 环境变量缺失导致函数立即退出

---

### 3️⃣ **Vercel Hobby计划 Cron 限制**

**Hobby计划限制**:
- ✅ **允许**: 每天执行一次的Cron Job
- ❌ **不允许**: 每小时或更频繁的执行
- ⚠️ **注意**: Cron Job需要手动启用

**当前配置符合限制**: `33 14 * * *` (每天一次) ✅

**但需要验证是否已启用**:
1. 访问 Vercel Dashboard
2. 项目 → Settings → Crons
3. 检查状态是否为 `Active`

---

### 4️⃣ **环境变量检查清单**

**必需的环境变量** (在Vercel Dashboard → Settings → Environment Variables):

```bash
# eBay API（必需 - 获取商品数据）
EBAY_PROD_CLIENT_ID = sirw-workflow-PRD-xxxxx
EBAY_PROD_CLIENT_SECRET = PRD-xxxxx

# Supabase数据库（必需 - 存储历史数据）
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 邮件配置（必需 - 发送通知邮件）
GMAIL_USER = wsir78933@gmail.com
GMAIL_APP_PASSWORD = xxxx xxxx xxxx xxxx  # Gmail应用专用密码
RECIPIENT_EMAIL = 3277193856@qq.com
```

**⚠️ 如果这些变量缺失，函数会立即失败**

---

## 🛠️ 立即修复步骤

### 步骤 1: 检查并更新环境变量

1. 访问: https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/settings/environment-variables
2. 验证所有必需变量都已配置
3. **特别检查**: `GMAIL_APP_PASSWORD` 是否有效

**重新生成Gmail应用专用密码**:
1. 访问: https://myaccount.google.com/apppasswords
2. 登录 `wsir78933@gmail.com`
3. 选择 **邮件** 和 **其他（自定义名称）**
4. 输入名称: `Vercel eBay Monitor`
5. 点击 **生成**
6. 复制16位密码（**移除所有空格**）
7. 在Vercel中更新 `GMAIL_APP_PASSWORD`

---

### 步骤 2: 调整Cron执行时间（可选）

**如果你想在北京时间23:00执行**:

```bash
# 在本地项目目录
cd /home/wcp/项目集合/电商/src/ebay_webhook

# 编辑 vercel.json
# 修改: "schedule": "33 14 * * *"
# 改为: "schedule": "0 15 * * *"
```

修改后的完整 `vercel.json`:
```json
{
  "version": 2,
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api/ebay-webhook.js": {
      "memory": 1024,
      "maxDuration": 10
    },
    "api/monitor-sellers.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/monitor-sellers",
      "schedule": "0 15 * * *"
    }
  ]
}
```

**然后重新部署**:
```bash
vercel deploy --prod
```

---

### 步骤 3: 手动触发测试

**立即测试是否能收到邮件**:

```bash
# 方法1: 使用curl
curl "https://ebaywebhook-one.vercel.app/api/monitor-sellers"

# 方法2: 浏览器访问
# 打开: https://ebaywebhook-one.vercel.app/api/monitor-sellers
```

**预期结果**:
- ✅ 返回 JSON 响应: `{"success":true,...}`
- ✅ 1-2分钟后收到邮件（QQ邮箱 3277193856@qq.com）
- ✅ 检查 **垃圾邮件** 文件夹

---

### 步骤 4: 查看详细执行日志

**访问 Vercel 日志**:
1. https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/logs
2. 设置时间范围: 最近1小时
3. 筛选路径: `/api/monitor-sellers`
4. 查找错误信息

**常见错误**:
```
❌ "Missing eBay credentials" → 环境变量未配置
❌ "Invalid login: 535-5.7.8" → Gmail密码错误
❌ "Connection timeout" → Supabase连接失败
❌ "PGRST116" → 数据库表不存在
```

---

## 📊 Cron 时间对照表

| UTC时间 | 北京时间 | Cron表达式 | 说明 |
|---------|----------|------------|------|
| 14:33 | 22:33 | `33 14 * * *` | 当前配置 |
| 15:00 | 23:00 | `0 15 * * *` | 推荐配置 |
| 16:00 | 00:00 | `0 16 * * *` | 午夜执行 |
| 23:00 | 07:00 | `0 23 * * *` | 早上执行 |

**计算公式**: 北京时间 = UTC时间 + 8小时

---

## 🔬 深度调试步骤

如果修复后仍未收到邮件，执行以下调试:

### 1. 测试eBay API连接

```bash
curl "https://ebaywebhook-one.vercel.app/api/search-products?q=test&limit=1"
```

**预期**: 返回商品搜索结果

---

### 2. 测试Supabase连接

```bash
curl "https://ebaywebhook-one.vercel.app/api/test-supabase"
```

**预期**: 返回数据库连接成功信息

---

### 3. 测试RUBE邮件系统

```bash
curl -X POST "https://ebaywebhook-one.vercel.app/api/rube-email" \
  -H "Content-Type: application/json" \
  -d '{
    "changes": {"hasChanges": false},
    "monitoringStats": {
      "monitoringDays": 1,
      "totalChecks": 1,
      "recentStats": {
        "totalChanges": 0,
        "priceChanges": 0,
        "newListings": 0,
        "removedListings": 0
      }
    },
    "emailType": "seller_monitor_status"
  }'
```

**预期**:
- 返回成功响应
- 收到测试邮件

---

### 4. 检查QQ邮箱设置

**可能导致邮件被拦截的原因**:
1. Gmail被列入黑名单
2. 垃圾邮件过滤器过严
3. 邮件内容触发安全规则

**解决方案**:
1. 在QQ邮箱中添加 `wsir78933@gmail.com` 为白名单
2. 检查垃圾邮件文件夹
3. 查看 "已删除" 文件夹

---

## ✅ 验证清单

修复后，验证以下各项:

- [ ] Vercel环境变量已配置完整
- [ ] Gmail应用专用密码已重新生成并更新
- [ ] vercel.json中Cron时间已调整
- [ ] 已重新部署: `vercel deploy --prod`
- [ ] 手动触发测试成功
- [ ] 收到测试邮件（检查垃圾邮件）
- [ ] Vercel日志中看到执行记录
- [ ] Cron Job在Vercel中显示为Active

---

## 📞 仍然无法解决？

### 获取详细日志

```bash
# 在终端运行
vercel logs --follow

# 或访问Vercel Dashboard
# https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/logs
```

### 需要提供的信息

如果问题持续，请提供:
1. 手动触发 `/api/monitor-sellers` 的完整响应
2. Vercel Functions日志截图
3. QQ邮箱设置截图
4. 环境变量清单（隐藏敏感值）

---

**最后更新**: 2025-10-04
**诊断人员**: Claude Code Assistant
**状态**: 待用户执行修复步骤
