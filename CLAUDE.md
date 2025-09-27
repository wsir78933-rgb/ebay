# CLAUDE.md - eBay Webhook 卖家监控系统

> **文档版本**: 1.0
> **最后更新**: 2025-09-27
> **项目**: eBay Webhook 卖家监控系统
> **状态**: ✅ 生产环境正常运行

## 🎯 项目概述

eBay用户账户删除通知Webhook处理器，集成Supabase数据库和卖家监控功能，符合GDPR要求。

## 🚨 重要问题解决记录

### ✅ **已解决：GitHub红色❌部署失败问题**
**日期**: 2025-09-27
**根本原因**: vercel.json中crons配置违反Hobby套餐限制
**问题**: `"schedule": "0 */2 * * *"` (每2小时执行，违反套餐限制)
**解决**: `"schedule": "0 23 * * *"` (每天23点执行，符合套餐要求)
**结果**: GitHub状态从红色❌变为绿色✅，Vercel部署恢复正常

## 🏗️ 系统架构

### **核心组件**
1. **eBay Webhook接收器** (`/api/ebay-webhook`)
   - 处理eBay用户删除通知
   - 验证webhook签名
   - 符合GDPR合规要求

2. **卖家监控系统** (`/api/monitor-sellers`)
   - 监控目标卖家：`electronicdea1s`, `cellfc`
   - 实时跟踪iPhone商品动态
   - 每天23点自动执行

### **数据库**
- **Supabase**: 云数据库存储监控数据
- **环境变量**:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

## 📊 监控功能详解

### **监控指标**
- 📈 **价格变化**: 跟踪商品价格波动
- 🆕 **新增商品**: 发现新上架商品
- ❌ **下架商品**: 检测商品移除
- 📝 **标题变化**: 监控商品标题修改
- 🖼️ **图片变化**: 检测商品图片更新
- ⭐ **评级变化**: 监控卖家评分

### **当前监控状态**
- **监控商品总数**: 100个iPhone相关产品
- **价格范围**: $29.99 - $827.99
- **商品类型**: iPhone 6 到 iPhone 16 全系列
- **检测频率**: 每天23点自动检查

## 🚀 部署状态

### **生产环境**
- **URL**: https://ebaywebhook-one.vercel.app
- **状态**: ✅ 正常运行
- **最新部署**: 2025-09-27 13:21 (修复vercel.json配置)

### **API端点测试**
- ✅ `/api/ebay-webhook`: 正常响应
- ✅ `/api/monitor-sellers`: 返回完整监控数据

### **GitHub状态**
- ✅ 绿色成功状态
- ✅ Vercel自动部署正常
- ✅ 定时任务配置符合套餐限制

## ⚙️ 技术栈

- **运行时**: Node.js 18+
- **框架**: Vercel Serverless Functions
- **数据库**: Supabase
- **部署**: Vercel (Hobby套餐)
- **API**: eBay Developer API
- **语言**: JavaScript (ES Modules)

## 📝 配置文件

### **package.json**
```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "nodemailer": "^6.9.8"
  }
}
```

### **vercel.json** (重要配置)
```json
{
  "crons": [
    {
      "path": "/api/monitor-sellers",
      "schedule": "0 23 * * *"
    }
  ]
}
```

## 🔧 开发指南

### **本地开发**
```bash
npm run dev          # 启动开发服务器
npm run deploy       # 部署到生产环境
```

### **环境变量**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
NODE_ENV=production
```

## 📋 运维记录

### **重要事件**
- **2025-09-27**: 修复Vercel定时任务配置，解决GitHub红色❌失败问题
- **2025-09-27**: 确认两个API端点正常工作
- **2025-09-27**: 卖家监控系统检测到100个商品，功能正常

### **套餐限制**
- **Hobby套餐**: 最多2个cron jobs，每天最多执行一次
- **当前使用**: 1个cron job，每天23点执行一次 ✅

## 🐛 故障排除

### **常见问题**
1. **Vercel部署失败**: 检查crons配置是否违反套餐限制
2. **API响应异常**: 确认Supabase连接和环境变量
3. **定时任务不执行**: 验证schedule格式和套餐限制

### **监控检查**
- GitHub Actions状态
- Vercel部署日志
- API端点健康检查
- Supabase数据库连接

## 📚 相关文档

- [eBay Developer Documentation](https://developer.ebay.com)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase Documentation](https://supabase.io/docs)
- [GDPR Compliance Guide](https://gdpr-info.eu)

---

> 🤖 **此文档由Claude Code维护**
> 📅 **下次更新**: 当系统有重大变更时
> 🔗 **项目仓库**: https://github.com/wsir78933-rgb/ebay