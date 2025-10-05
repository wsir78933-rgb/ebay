# 🚨 紧急邮件修复方案

## 问题诊断

**症状**: 监控任务执行成功(200 OK),检测到变化,但邮件未发送
**根本原因**:
1. rube-email.js缺少环境变量验证
2. Gmail凭证可能未在Vercel正确配置
3. FUNCTION_INVOCATION_FAILED错误表明函数执行失败

## 已完成的本地修改

### 1. 创建简化版邮件系统
- **文件**: `api/rube-email-simple.js` (已创建)
- **功能**:
  - ✅ 完整的Gmail环境变量验证
  - ✅ 清晰的错误日志输出
  - ✅ 简化的邮件模板生成
  - ✅ 直接使用nodemailer,移除复杂的RUBE MCP模拟代码

### 2. 修改监控系统调用
- **文件**: `api/monitor-sellers.js` (已修改)
- **变更**: 第454行,从`/api/rube-email`改为`/api/rube-email-simple`

### 3. 本地提交记录
```bash
commit c7ec345
修复邮件发送: 创建简化版邮件系统并启用环境变量验证
- 新建api/rube-email-simple.js
- 修改monitor-sellers.js调用简化版API
```

## 🔧 部署步骤

### 方案A: 通过GitHub Web界面(推荐)

#### 步骤1: 创建rube-email-simple.js

1. 访问: https://github.com/wsir78933-rgb/ebay/new/main/api
2. 文件名: `rube-email-simple.js`
3. 复制本地文件内容:
   ```bash
   cat /home/wcp/项目集合/电商/src/ebay_webhook/api/rube-email-simple.js
   ```
4. 提交信息: `新增: 简化版邮件系统with环境变量验证`

#### 步骤2: 修改monitor-sellers.js

1. 访问: https://github.com/wsir78933-rgb/ebay/edit/main/api/monitor-sellers.js
2. 找到第453-454行:
   ```javascript
   // 调用RUBE MCP邮件API - 使用生产环境固定URL
   const rubeEmailUrl = 'https://ebaywebhook-one.vercel.app/api/rube-email';
   ```
3. 修改为:
   ```javascript
   // 调用简化版邮件API - 使用生产环境固定URL
   const rubeEmailUrl = 'https://ebaywebhook-one.vercel.app/api/rube-email-simple';
   ```
4. 提交信息: `修复: 切换到简化版邮件API`

### 方案B: 使用PowerShell + GitHub CLI(如果已安装gh)

```powershell
# 在Windows PowerShell中执行
cd "C:\path\to\项目集合\电商\src\ebay_webhook"

# 推送本地提交
git push origin main
```

## 📋 Vercel环境变量检查清单

访问: https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/settings/environment-variables

确认以下变量已配置:

- [ ] `GMAIL_USER` = `wsir78933@gmail.com`
- [ ] `GMAIL_APP_PASSWORD` = `ruljkdwonvbzzhgb` (Gmail应用专用密码)
- [ ] `RECIPIENT_EMAIL` = `3277193856@qq.com`

**如果缺失,立即添加并重新部署!**

## ✅ 验证步骤

### 1. 等待Vercel自动部署(1-2分钟)

访问: https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/deployments

确认最新部署状态为"Ready"

### 2. 测试简化版邮件API

```bash
# 在WSL2使用PowerShell执行
powershell.exe -Command "Invoke-WebRequest -Method POST -Uri 'https://ebaywebhook-one.vercel.app/api/rube-email-simple' -ContentType 'application/json' -Body '{\"changes\":{\"hasChanges\":true,\"newListings\":[{\"itemId\":\"test\",\"title\":\"测试商品\",\"price\":99,\"seller\":\"测试卖家\"}]},\"monitoringStats\":{\"monitoringDays\":1}}'"
```

**期望结果**:
```json
{
  "success": true,
  "messageId": "<...@gmail.com>",
  "delivery": "success"
}
```

### 3. 手动触发监控任务

```bash
powershell.exe -Command "Invoke-WebRequest -Uri 'https://ebaywebhook-one.vercel.app/api/monitor-sellers'"
```

### 4. 检查QQ邮箱

- 收件箱: 3277193856@qq.com
- 检查垃圾邮件文件夹
- 主题应为: `🚨 eBay监控警报 - ...` 或 `✅ eBay监控状态 - ...`

## 🐛 如果仍未收到邮件

### 诊断步骤:

1. **检查Vercel函数日志**
   ```
   https://vercel.com/wsir78933-rgbs-projects/ebay_webhook/logs
   ```
   查找错误信息,特别是`[RUBE Email Simple]`开头的日志

2. **验证环境变量**
   - 确认`GMAIL_USER`和`GMAIL_APP_PASSWORD`在Production环境中已配置
   - Gmail应用专用密码无空格: `ruljkdwonvbzzhgb`

3. **重新生成Gmail应用密码**(如果旧密码失效)
   - 访问: https://myaccount.google.com/apppasswords
   - 登录: wsir78933@gmail.com
   - 生成新密码并更新Vercel环境变量

4. **检查Gmail发送限额**
   - Gmail免费账户: 500封/天
   - 检查是否被暂时限制

## 📊 简化版邮件系统优势

对比原rube-email.js:

| 特性 | 原版本 | 简化版 |
|------|--------|--------|
| 代码行数 | ~800行 | ~250行 |
| 环境变量验证 | ❌ 无 | ✅ 完整验证 |
| 错误日志 | 基本 | 详细输出 |
| RUBE模拟代码 | 复杂 | 已移除 |
| 邮件功能 | 完整 | 核心功能 |
| 故障诊断 | 困难 | 容易 |

## 🔄 回滚方案

如果简化版出现问题,可以快速回滚:

1. 修改monitor-sellers.js第454行:
   ```javascript
   const rubeEmailUrl = 'https://ebaywebhook-one.vercel.app/api/rube-email';
   ```

2. 但必须先修复原rube-email.js的环境变量问题

## 📝 相关文档

- Gmail应用专用密码: https://support.google.com/accounts/answer/185833
- Vercel环境变量: https://vercel.com/docs/projects/environment-variables
- Nodemailer Gmail配置: https://nodemailer.com/usage/using-gmail/

---

**最后更新**: 2025-10-05 12:20
**状态**: 待部署
**下一步**: 通过GitHub web界面应用修改并触发Vercel部署
