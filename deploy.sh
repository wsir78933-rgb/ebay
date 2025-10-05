#!/bin/bash

# eBay Webhook 快速部署脚本

set -e

echo "📦 开始部署 eBay Webhook 到 Vercel..."

# 切换到项目目录
cd "$(dirname "$0")"

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 未找到 Vercel CLI"
    echo "📥 正在安装 Vercel CLI..."
    npm install -g vercel
fi

# 部署到生产环境
echo "🚀 部署到 Vercel 生产环境..."
vercel --prod

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 在 Vercel Dashboard 配置环境变量："
echo "   - EBAY_VERIFICATION_TOKEN"
echo "   - DATABASE_URL"
echo ""
echo "2. 在 eBay Developer Portal 配置 Webhook："
echo "   - 访问 https://developer.ebay.com/"
echo "   - 配置 Destination 和 Subscription"
echo ""