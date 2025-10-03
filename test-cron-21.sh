#!/bin/bash

# 临时测试脚本：在21点执行 monitor-sellers API 测试
# 作者：Claude Code
# 用途：验证 Cron Job 在修复后能否正常工作

echo "========================================"
echo "eBay Monitor Sellers - 临时测试 (21:00)"
echo "执行时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# API 端点
API_URL="https://ebaywebhook-one.vercel.app/api/monitor-sellers"

# 调用 API
echo ""
echo "正在调用 API: $API_URL"
echo ""

response=$(curl -X GET "$API_URL" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  --max-time 60 \
  2>&1)

echo "$response"

echo ""
echo "========================================"
echo "测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
