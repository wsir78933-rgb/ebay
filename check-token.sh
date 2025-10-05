#!/bin/bash
# GitHub Token过期检查脚本
# 使用方法: ./check-token.sh

TOKEN_EXPIRE_DATE="2026-10-05"
CURRENT_DATE=$(date +%Y-%m-%d)
DAYS_LEFT=$(( ($(date -d "$TOKEN_EXPIRE_DATE" +%s) - $(date -d "$CURRENT_DATE" +%s)) / 86400 ))

echo "🔑 GitHub Token 状态检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 当前日期: $CURRENT_DATE"
echo "⏰ Token过期日期: $TOKEN_EXPIRE_DATE"
echo ""

if [ $DAYS_LEFT -lt 0 ]; then
    echo "❌ Token已过期 $((0 - DAYS_LEFT)) 天！"
    echo ""
    echo "🔧 立即更新Token:"
    echo "   1. 访问 https://github.com/settings/tokens"
    echo "   2. 点击 'Generate new token (classic)'"
    echo "   3. 名称: Git Push Token for eBay Project"
    echo "   4. 勾选: ✅ repo"
    echo "   5. 生成并复制新token"
    echo "   6. 在PowerShell中运行:"
    echo "      git config credential.helper store"
    echo "      # 下次推送时输入新token作为密码"
elif [ $DAYS_LEFT -le 7 ]; then
    echo "⚠️  Token即将过期！剩余 $DAYS_LEFT 天"
    echo ""
    echo "💡 建议本周内更新Token"
    echo "   访问: https://github.com/settings/tokens"
elif [ $DAYS_LEFT -le 14 ]; then
    echo "⏰ Token剩余 $DAYS_LEFT 天有效"
    echo ""
    echo "💡 提示: 两周后需要更新Token"
else
    echo "✅ Token有效，剩余 $DAYS_LEFT 天"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
