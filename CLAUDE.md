# CLAUDE.md - eBay Webhook 监控项目

> **文档版本**: 1.1
> **最后更新**: 2025-10-05
> **项目**: eBay Webhook + 卖家监控系统
> **部署**: Vercel Serverless Functions
> **特性**: 定时监控、智能邮件、Supabase存储
> **状态**: ✅ 邮件系统已修复并正常运行

---

## 🏗️ 项目概览

### 核心功能
- **eBay Webhook**: 接收 eBay GDPR 用户删除通知
- **卖家监控**: 定时监控指定卖家的商品变化
- **智能邮件**: RUBE MCP AI 驱动的邮件通知系统
- **数据存储**: Supabase PostgreSQL 云数据库

### 技术栈
- **Runtime**: Node.js 18+ (Vercel Serverless)
- **数据库**: Supabase (PostgreSQL)
- **邮件**: Nodemailer + Gmail SMTP (RUBE MCP 智能层)
- **部署**: Vercel (GitHub 自动部署)
- **Cron**: Vercel Cron Jobs (每天23:00北京时间)

---

## 📁 项目结构

```
ebay_webhook/
├── api/                         # Vercel Serverless Functions
│   ├── ebay-webhook.js          # Webhook 接收端点
│   ├── monitor-sellers.js       # 卖家监控任务 (调用 rube-email-simple.js)
│   ├── rube-email-simple.js     # ⭐ 实际使用的邮件系统 (已修复)
│   ├── rube-email.js            # RUBE MCP 完整版邮件系统
│   └── search-products.js       # eBay 商品搜索
├── lib/                         # 共享库
│   └── supabase.js              # Supabase 客户端
├── docs/                        # 文档
├── vercel.json                  # Vercel 配置
├── package.json                 # 依赖管理
└── CLAUDE.md                    # 本文件
```

---

## 🔐 环境变量配置

### 必需变量 (在 Vercel Dashboard 配置)

```bash
# eBay API
EBAY_PROD_CLIENT_ID=sirw-workflow-PRD-xxxxx
EBAY_PROD_CLIENT_SECRET=PRD-xxxxx

# Supabase 数据库
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gmail 邮件发送 (必需!)
GMAIL_USER=wsir78933@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # Gmail 应用专用密码
RECIPIENT_EMAIL=3277193856@qq.com
```

**⚠️ 重要说明**:
- `GMAIL_APP_PASSWORD` 是应用专用密码,不是 Gmail 登录密码
- 虽然使用了 RUBE MCP 框架,但底层仍需 Gmail SMTP 凭证
- `/dosc/CLAUDE.md` 中声称 Gmail 已废弃的说法是**错误的**

### Gmail 应用专用密码生成

1. 访问: https://myaccount.google.com/apppasswords
2. 登录 `wsir78933@gmail.com`
3. 选择 **邮件** + **其他(自定义名称)**
4. 输入名称: `Vercel eBay Monitor`
5. 点击 **生成**
6. 复制 16 位密码 (移除所有空格)
7. 在 Vercel 中配置 `GMAIL_APP_PASSWORD`

---

## ⏰ Cron Job 配置

### 当前配置 (vercel.json)

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

### Cron 时间对照表

| UTC时间 | 北京时间 | Cron表达式 | 用途 |
|---------|----------|------------|------|
| 15:00 | 23:00 | `0 15 * * *` | ✅ 当前配置 |
| 14:33 | 22:33 | `33 14 * * *` | ❌ 旧配置 |
| 16:00 | 00:00 | `0 16 * * *` | 午夜执行 |
| 23:00 | 07:00 | `0 23 * * *` | 早上执行 |

**计算公式**: 北京时间 = UTC时间 + 8小时

### Vercel Hobby 计划限制
- ✅ 允许: 每天执行一次
- ❌ 不允许: 每小时或更频繁

---

## 🚀 常用命令

### 手动触发监控

**方法 1: 使用 curl (Linux)**
```bash
curl "https://ebaywebhook-one.vercel.app/api/monitor-sellers"
```

**方法 2: 使用 PowerShell (Windows)**
```powershell
Invoke-WebRequest -Uri "https://ebaywebhook-one.vercel.app/api/monitor-sellers"
```

**方法 3: 浏览器访问**
```
https://ebaywebhook-one.vercel.app/api/monitor-sellers
```

### 部署到 Vercel

```bash
# 方法 1: Git 推送 (触发自动部署)
git push origin main

# 方法 2: Vercel CLI
vercel deploy --prod
```

### 查看日志

```bash
# Vercel Dashboard
https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/logs

# Vercel CLI
vercel logs
```

---

## 🐛 已知问题和解决方案

### ⚠️ WSL2 网络连接问题

**问题描述**:
WSL2 Linux 环境无法访问 GitHub 和 Vercel HTTPS 服务,表现为:
- `curl` 连接重置 (Connection reset by peer)
- `git push` 失败 (TLS 握手失败)
- `ping` 100% 丢包

**诊断时间**: 2025-10-04
**影响范围**: WSL2 环境下的所有外网 HTTPS 操作

**根本原因**:
WSL2 网络模式问题,虽然网络配置正常,但 TLS 握手阶段连接被重置。

**临时解决方案**:

#### 方案 1: 使用 Windows PowerShell (推荐)

```powershell
# 在 WSL2 中执行
powershell.exe -Command "Invoke-WebRequest -Uri 'https://ebaywebhook-one.vercel.app/api/monitor-sellers'"
```

**优点**:
- ✅ 无需修改网络配置
- ✅ 立即可用
- ✅ 稳定可靠

#### 方案 2: 配置 WSL2 网络镜像模式

1. 编辑 `.wslconfig` (Windows 用户目录):
```ini
[wsl2]
networkingMode=mirrored
```

2. 重启 WSL2:
```bash
wsl --shutdown
```

#### 方案 3: 使用 Git 通过 Windows

```bash
# 在 WSL2 中执行
git config --global core.sshCommand "'/mnt/c/Windows/System32/OpenSSH/ssh.exe'"
```

**永久解决方案**: 升级到 WSL2 镜像网络模式 (Windows 11 22H2+)

---

## 📊 监控统计

### 监控的卖家
- `cellfc`
- `electronicdea1s`

### 监控内容
- 💰 价格变化
- 🆕 新品上架
- 📦 商品下架
- ✏️ 标题/图片变更
- ⭐ 卖家评分

### 邮件通知
- **有变化**: 发送详细警报邮件
- **无变化**: 发送简化状态报告
- **接收邮箱**: 3277193856@qq.com
- **发件人**: wsir78933@gmail.com

---

## 🗄️ 数据库表结构

### Supabase 表

1. **seller_monitor** - 当前监控状态
   - 存储最新的商品数据
   - 用于变化对比

2. **seller_monitor_meta** - 监控元数据
   - 监控开始时间
   - 检查次数统计

3. **seller_monitor_history** - 变化历史
   - 每次检查的变化记录
   - 用于生成统计报告

**详细设置**: `docs/database-setup-for-always-notify.md`

---

## 🔧 故障排查

### 问题 1: 邮件未收到 ✅ 已解决

**问题根因** (2025-10-05发现并修复):
- ❌ **错误代码**: `nodemailer.createTransporter()`
- ✅ **正确代码**: `nodemailer.createTransport()`
- 📁 **影响文件**:
  - `api/rube-email-simple.js:61` (主要问题，已修复)
  - `api/rube-email.js:269` (已修复)

**修复过程**:
1. 发现 `monitor-sellers.js` 调用的是 `rube-email-simple.js`，而非 `rube-email.js`
2. 两个文件都存在同样的拼写错误（多了 `er`）
3. 修复后邮件系统正常工作

**验证方法**:
```bash
# 触发监控任务
powershell.exe -Command "Invoke-WebRequest -Uri 'https://ebaywebhook-one.vercel.app/api/monitor-sellers'"

# 检查QQ邮箱 3277193856@qq.com
# 应收到主题为: 📊 标准 eBay监控警报 的邮件
```

**检查清单** (如果仍未收到):
- [ ] Vercel 环境变量是否配置完整（GMAIL_USER, GMAIL_APP_PASSWORD）
- [ ] Gmail 应用专用密码是否有效
- [ ] QQ 邮箱垃圾邮件文件夹
- [ ] 等待5-10分钟（Gmail→QQ传输延迟）
- [ ] 登录 wsir78933@gmail.com 查看"已发送"文件夹

### 问题 2: API 无法访问 (WSL2)

**症状**: `curl: (35) Connection reset by peer`

**解决**: 使用 Windows PowerShell 代替 WSL2 curl
```bash
powershell.exe -Command "Invoke-WebRequest -Uri 'https://your-url'"
```

### 问题 3: Git Push 失败

**症状**: `fatal: Connection reset by peer`

**解决**:
1. 使用 GitHub 网页编辑
2. 或通过 Windows Git 操作
3. 或配置 WSL2 网络镜像模式

---

## 📚 相关文档

- **紧急修复报告**: `URGENT_FIX_REPORT.md`
- **完整诊断**: `EMAIL_NOT_RECEIVED_DIAGNOSIS.md`
- **故障排查**: `TROUBLESHOOTING.md`
- **环境变量清单**: `ENV_VARIABLES_CHECKLIST.md`
- **网络问题解决**: `NETWORK_ISSUE_SOLUTION.md`

---

## 🚦 项目状态

### ✅ 已完成
- [x] eBay Webhook 接收
- [x] 卖家监控功能
- [x] RUBE MCP 智能邮件
- [x] Supabase 数据存储
- [x] Vercel Cron Job 定时执行
- [x] 环境变量配置完整
- [x] WSL2 网络问题解决方案
- [x] **邮件发送功能修复** (2025-10-05)
  - 修复 `createTransporter` → `createTransport` 拼写错误
  - 修复文件: `rube-email-simple.js`, `rube-email.js`
  - 邮件系统现已正常运行

### 📝 待改进
- [ ] WSL2 原生网络支持 (需升级系统)
- [ ] 邮件模板优化
- [ ] 监控更多卖家
- [ ] 价格趋势分析

---

## 🔄 更新日志

### 2025-10-05 17:45 - 邮件系统关键修复
- 🐛 **修复**: `nodemailer.createTransporter` → `createTransport`
- 📁 **文件**: `api/rube-email-simple.js:61`, `api/rube-email.js:269`
- 🔍 **发现**: `monitor-sellers.js` 实际调用 `rube-email-simple.js`
- ✅ **状态**: 邮件系统恢复正常，功能验证通过
- 📧 **测试**: 成功发送到 3277193856@qq.com

### 2025-10-04 23:30 - 初始文档
- 📝 创建完整的项目文档
- 🔐 环境变量配置说明
- ⏰ Cron Job 设置指南
- 🐛 WSL2 网络问题解决方案

---

**最后更新**: 2025-10-05 17:45
**维护者**: Claude Code
**项目状态**: ✅ 邮件系统已修复，正常运行
