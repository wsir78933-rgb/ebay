# 邮件定时监控故障排查指南

## 📋 问题：没有收到定时监控邮件

### 🔍 诊断步骤

#### 1. 检查 Vercel Cron Job 是否启用

**访问**: [Vercel Dashboard](https://vercel.com/dashboard)
1. 进入你的项目 `ebaywebhook-one`
2. 点击 **Settings** → **Crons**
3. 检查是否看到：
   ```
   Path: /api/monitor-sellers
   Schedule: 33 14 * * *
   Status: Active ✅
   ```

**常见问题**：
- ❌ **没有看到Cron配置** → 需要重新部署
- ❌ **Status显示Disabled** → 点击Enable启用
- ❌ **Schedule不正确** → 修改vercel.json后重新部署

---

#### 2. 检查执行时间设置

**当前配置**: `33 14 * * *` = UTC 14:33 = **北京时间 22:33**

**如果你想在北京时间23:00执行**：
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

**Cron表达式格式**: `分 时 日 月 星期`
- `0 15 * * *` = 每天UTC 15:00（北京时间23:00）
- `0 23 * * *` = 每天UTC 23:00（北京时间次日07:00）
- `30 14 * * *` = 每天UTC 14:30（北京时间22:30）

---

#### 3. 查看 Cron Job 执行日志

**步骤**：
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目 → **Deployments** → 点击最新部署
3. 点击 **Functions** 标签
4. 找到 `api/monitor-sellers.js`
5. 查看 **Logs**

**查找关键日志**：
```
✅ 成功执行：
[Seller Monitor] Starting monitoring cycle...
[Seller Monitor] Found X products for seller...
[RUBE Email] Email sent successfully

❌ 执行失败：
Error: Missing eBay credentials
Error: Failed to get eBay access token
[RUBE Email] Email execution failed
```

---

#### 4. 验证环境变量配置

**访问**: Vercel Dashboard → Settings → Environment Variables

**必需的环境变量**：

```bash
# eBay API（必需）
✅ EBAY_PROD_CLIENT_ID = sirw-workflow-PRD-xxxxx
✅ EBAY_PROD_CLIENT_SECRET = PRD-xxxxx

# Supabase（必需）
✅ SUPABASE_URL = https://xxxxx.supabase.co
✅ SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 邮件配置（必需）
✅ GMAIL_USER = wsir78933@gmail.com
✅ GMAIL_APP_PASSWORD = tscq*********  # Gmail应用专用密码
✅ RECIPIENT_EMAIL = 3277193856@qq.com

# 可选
⚪ SUPABASE_SERVICE_ROLE_KEY = （数据删除功能需要）
```

**检查方法**：
```bash
# 在本地终端运行
cd /home/wcp/项目集合/电商/src/ebay_webhook
vercel env pull .env.local  # 拉取环境变量到本地
cat .env.local  # 查看配置
```

---

#### 5. 手动触发测试

**立即测试是否能收到邮件**：

```bash
# 方法1: 直接访问URL（推荐）
curl "https://ebaywebhook-one.vercel.app/api/monitor-sellers"

# 方法2: 在浏览器中访问
# 打开: https://ebaywebhook-one.vercel.app/api/monitor-sellers
```

**预期结果**：
- ✅ 返回 `{"success":true,...}`
- ✅ 1-2分钟后收到邮件（发送到 3277193856@qq.com）

**如果没收到邮件**：
1. 检查QQ邮箱 **垃圾邮件** 文件夹
2. 检查发件人 `wsir78933@gmail.com` 是否被屏蔽
3. 查看Vercel日志确认邮件发送状态

---

#### 6. 检查 Gmail 应用专用密码

**GMAIL_APP_PASSWORD 可能失效的原因**：
- Gmail安全设置变更
- 应用专用密码过期
- 两步验证被禁用

**重新生成Gmail应用专用密码**：
1. 访问: https://myaccount.google.com/apppasswords
2. 登录 `wsir78933@gmail.com`
3. 选择 **邮件** 和 **其他（自定义名称）**
4. 输入 `Vercel eBay Monitor`
5. 点击 **生成**
6. 复制16位密码（如 `abcd efgh ijkl mnop`）
7. 在Vercel中更新 `GMAIL_APP_PASSWORD` 环境变量
8. 重新部署

---

#### 7. 检查 Supabase 数据库连接

**测试数据库连接**：
```bash
curl "https://ebaywebhook-one.vercel.app/api/test-supabase"
```

**预期响应**：
```json
{
  "success": true,
  "message": "Supabase connection successful",
  "tableStatus": {
    "seller_monitor": "X records",
    "seller_monitor_meta": "X records",
    "seller_monitor_history": "X records"
  }
}
```

**如果失败**：
- 检查 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
- 确认数据库表已创建（参考 `docs/database-setup-for-always-notify.md`）

---

#### 8. 验证 Vercel Hobby 计划限制

**Vercel Hobby 计划的 Cron Job 限制**：
- ✅ **允许**: 每天执行一次
- ❌ **不允许**: 每小时、每分钟执行

**当前配置符合限制**：`33 14 * * *`（每天一次）✅

---

## 🛠️ 快速修复步骤

### 修复1: 调整执行时间到北京时间23:00

```bash
cd /home/wcp/项目集合/电商/src/ebay_webhook

# 编辑 vercel.json
# 将 "schedule": "33 14 * * *" 改为 "schedule": "0 15 * * *"
```

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

```bash
# 重新部署
vercel deploy --prod
```

---

### 修复2: 重新生成并配置 Gmail 密码

1. 访问: https://myaccount.google.com/apppasswords
2. 生成新的应用专用密码
3. 在Vercel中更新 `GMAIL_APP_PASSWORD`
4. 重新部署: `vercel deploy --prod`

---

### 修复3: 手动测试验证

```bash
# 立即触发监控（不等定时任务）
curl "https://ebaywebhook-one.vercel.app/api/monitor-sellers"

# 查看响应和日志
# 检查QQ邮箱（包括垃圾邮件文件夹）
```

---

## 📊 常见错误和解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| `Missing eBay credentials` | 环境变量未配置 | 在Vercel中添加 `EBAY_PROD_CLIENT_ID` 和 `EBAY_PROD_CLIENT_SECRET` |
| `Failed to get eBay access token` | eBay凭证错误或过期 | 验证CLIENT_ID和SECRET是否正确 |
| `Invalid login: 535-5.7.8 Username and Password not accepted` | Gmail密码错误 | 重新生成Gmail应用专用密码 |
| `Connection timeout` | Supabase连接失败 | 检查 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` |
| `PGRST116` | 数据库表不存在 | 参考文档创建必需的表 |
| `Cron job not found` | Cron未部署 | 检查vercel.json并重新部署 |

---

## ✅ 验证清单

部署后验证以下各项：

- [ ] Vercel Dashboard中看到Cron Job配置（Settings → Crons）
- [ ] Cron Job状态为 `Active`
- [ ] 执行时间符合预期（UTC时间 = 北京时间 - 8小时）
- [ ] 所有必需的环境变量已配置
- [ ] 手动触发测试成功收到邮件
- [ ] Vercel日志中看到成功执行记录
- [ ] QQ邮箱能正常接收（检查垃圾邮件）
- [ ] Supabase数据库连接正常

---

## 🆘 仍然无法解决？

### 查看详细日志

```bash
# 方法1: Vercel CLI
vercel logs --follow

# 方法2: Vercel Dashboard
# 访问: https://vercel.com/dashboard
# 项目 → Deployments → 最新部署 → Functions → Logs
```

### 联系支持

如果问题持续，请提供以下信息：
1. Vercel项目URL
2. 最近一次手动触发的响应
3. Vercel Functions日志截图
4. 环境变量配置清单（隐藏敏感信息）

---

**最后更新**: 2025-10-04
**文档版本**: 1.0
