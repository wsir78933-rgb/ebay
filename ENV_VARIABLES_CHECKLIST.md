# 环境变量配置检查清单

**项目**: ebay_webhook
**Vercel项目**: ebaywebhook-one
**配置地址**: https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/settings/environment-variables

---

## ✅ 必需的环境变量 (Required)

请在 Vercel Dashboard → Settings → Environment Variables 中验证以下配置:

### 1. eBay API 凭证

| 变量名 | 示例值 | 状态 | 说明 |
|--------|--------|------|------|
| `EBAY_PROD_CLIENT_ID` | `sirw-workflow-PRD-xxxxx` | ⬜ | eBay生产环境Client ID |
| `EBAY_PROD_CLIENT_SECRET` | `PRD-xxxxx` | ⬜ | eBay生产环境Client Secret |

**获取方式**:
- 访问 [eBay Developer Program](https://developer.ebay.com/my/keys)
- 登录你的开发者账号
- 复制 **Production** 环境的 App ID (Client ID) 和 Cert ID (Client Secret)

**验证方法**:
```bash
curl "https://ebaywebhook-one.vercel.app/api/search-products?q=test&limit=1"
```
- ✅ 成功: 返回商品数据
- ❌ 失败: 返回 "Missing eBay credentials" 或 "Failed to get eBay access token"

---

### 2. Supabase 数据库凭证

| 变量名 | 示例值 | 状态 | 说明 |
|--------|--------|------|------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | ⬜ | Supabase项目URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ⬜ | Supabase匿名密钥 (公开) |

**获取方式**:
- 访问 [Supabase Dashboard](https://supabase.com/dashboard)
- 选择你的项目
- Settings → API → Project URL (复制 URL)
- Settings → API → Project API keys → `anon public` (复制 Key)

**验证方法**:
```bash
curl "https://ebaywebhook-one.vercel.app/api/test-supabase"
```
- ✅ 成功: 返回 `{"success": true, "tableStatus": {...}}`
- ❌ 失败: 返回连接错误或 PGRST116 (表不存在)

---

### 3. Gmail 邮件发送凭证

| 变量名 | 示例值 | 状态 | 说明 |
|--------|--------|------|------|
| `GMAIL_USER` | `wsir78933@gmail.com` | ⬜ | Gmail发件人地址 |
| `GMAIL_APP_PASSWORD` | `abcd efgh ijkl mnop` | ⬜ | Gmail应用专用密码 (16位) |
| `RECIPIENT_EMAIL` | `3277193856@qq.com` | ⬜ | 邮件接收地址 |

**⚠️ 重要**: `GMAIL_APP_PASSWORD` 是 **应用专用密码**,不是 Gmail 登录密码!

#### 🔑 如何生成 Gmail 应用专用密码

**前提条件**: Gmail账号必须启用 **两步验证**

1. **启用两步验证** (如果尚未启用):
   - 访问: https://myaccount.google.com/security
   - 找到 "两步验证" → 点击 "开始使用"
   - 按照提示完成设置

2. **生成应用专用密码**:
   - 访问: https://myaccount.google.com/apppasswords
   - 登录 `wsir78933@gmail.com`
   - 选择应用: **邮件**
   - 选择设备: **其他(自定义名称)**
   - 输入名称: `Vercel eBay Monitor`
   - 点击 **生成**
   - **复制 16 位密码** (格式: `abcd efgh ijkl mnop`)

3. **在 Vercel 中配置**:
   - 访问: https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/settings/environment-variables
   - 添加/更新 `GMAIL_APP_PASSWORD`
   - **重要**: 移除所有空格,输入纯密码 `abcdefghijklmnop`
   - 或者保留空格也可以,代码会自动处理

**验证方法**:
```bash
# 手动触发监控,会发送邮件
curl "https://ebaywebhook-one.vercel.app/api/monitor-sellers"

# 1-2分钟后检查 QQ 邮箱
# ✅ 成功: 收到监控邮件
# ❌ 失败: 未收到邮件 → 检查垃圾邮件文件夹
```

**常见错误**:
```
❌ Error: Invalid login: 535-5.7.8 Username and Password not accepted
   → 应用专用密码错误或过期,需要重新生成

❌ Error: Missing authentication
   → GMAIL_USER 或 GMAIL_APP_PASSWORD 未配置
```

---

## ⚪ 可选的环境变量 (Optional)

| 变量名 | 示例值 | 状态 | 说明 |
|--------|--------|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ⬜ | Supabase服务密钥 (管理员权限) |

**用途**:
- 用于 GDPR 用户删除功能 (绕过 Row Level Security)
- 如果不配置,GDPR删除功能会受限

**获取方式**:
- Supabase Dashboard → Settings → API → Project API keys → `service_role secret`

---

## 🔧 配置步骤

### 在 Vercel Dashboard 中配置

1. **访问环境变量页面**:
   ```
   https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/settings/environment-variables
   ```

2. **添加每个变量**:
   - 点击 **Add New** 按钮
   - 输入 **Key** (变量名,如 `GMAIL_USER`)
   - 输入 **Value** (变量值,如 `wsir78933@gmail.com`)
   - 选择 **Environment**: `Production`, `Preview`, `Development` (全选)
   - 点击 **Save**

3. **重要提示**:
   - ⚠️ 配置完成后必须 **重新部署** 才能生效
   - ⚠️ 敏感信息 (如密码、密钥) 不要提交到 Git

### 使用 Vercel CLI 配置 (可选)

```bash
# 登录 Vercel
vercel login

# 进入项目目录
cd /home/wcp/项目集合/电商/src/ebay_webhook

# 添加环境变量 (交互式)
vercel env add GMAIL_APP_PASSWORD

# 或从本地 .env 文件批量导入
vercel env pull .env.local  # 拉取远程配置
# 编辑 .env.local
vercel env push .env.local  # 推送到远程
```

---

## ✅ 验证清单

配置完成后,逐项验证:

- [ ] **eBay API**: 测试商品搜索接口
  ```bash
  curl "https://ebaywebhook-one.vercel.app/api/search-products?q=iphone&limit=1"
  ```

- [ ] **Supabase**: 测试数据库连接
  ```bash
  curl "https://ebaywebhook-one.vercel.app/api/test-supabase"
  ```

- [ ] **Gmail**: 手动触发监控,检查邮箱
  ```bash
  curl "https://ebaywebhook-one.vercel.app/api/monitor-sellers"
  # 等待 1-2 分钟,检查 3277193856@qq.com 邮箱
  ```

- [ ] **Cron Job**: 查看 Vercel 日志是否有定时执行记录
  ```
  https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/logs
  # 查找: [Seller Monitor] Starting monitoring cycle...
  ```

- [ ] **重新部署**: 配置变更后必须重新部署
  ```bash
  vercel deploy --prod
  ```

---

## 🆘 故障排查

### 问题1: 环境变量未生效

**症状**: 配置了环境变量,但代码仍然报错 "Missing credentials"

**解决方案**:
1. 确认变量名拼写正确 (区分大小写)
2. 确认选择了 **Production** 环境
3. **重新部署**: `vercel deploy --prod`
4. 清除 Vercel 缓存: Deployments → 最新部署 → Actions → Redeploy

### 问题2: Gmail 密码错误

**症状**: `535-5.7.8 Username and Password not accepted`

**解决方案**:
1. 确认使用的是 **应用专用密码**,不是 Gmail 登录密码
2. 检查两步验证是否启用
3. 重新生成应用专用密码
4. 确认密码没有多余空格或特殊字符

### 问题3: Supabase 连接失败

**症状**: `Connection timeout` 或 `PGRST116`

**解决方案**:
1. 检查 `SUPABASE_URL` 格式: `https://xxxxx.supabase.co`
2. 检查 `SUPABASE_ANON_KEY` 是否完整 (通常很长)
3. 确认数据库表已创建 (参考 `docs/database-setup-for-always-notify.md`)
4. 检查 Supabase 项目是否暂停 (免费版会自动暂停)

---

## 📚 相关文档

- **完整诊断报告**: `EMAIL_NOT_RECEIVED_DIAGNOSIS.md`
- **故障排查指南**: `TROUBLESHOOTING.md`
- **项目文档**: `CLAUDE.md`
- **数据库设置**: `dosc/database-setup-for-always-notify.md`

---

**最后更新**: 2025-10-04
**状态**: 等待用户验证环境变量配置
