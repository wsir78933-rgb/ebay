#!/bin/bash
# 当网络恢复时,执行此脚本推送修复

echo "🔄 准备推送修复到GitHub..."
echo ""

# 显示将要推送的提交
echo "📋 待推送的提交:"
git log origin/main..HEAD --oneline
echo ""

# 提示用户选择方法
echo "选择推送方法:"
echo "1) 直接推送 (需要网络正常)"
echo "2) 使用手机热点"
echo "3) 配置代理后推送"
echo ""
read -p "请选择 (1/2/3): " choice

case $choice in
  1)
    echo "🚀 正在推送..."
    git push origin main
    ;;
  2)
    echo "📱 请先连接手机热点,然后按回车继续"
    read
    git push origin main
    ;;
  3)
    read -p "请输入代理地址 (如 http://127.0.0.1:7890): " proxy
    export https_proxy="$proxy"
    export http_proxy="$proxy"
    git push origin main
    ;;
  *)
    echo "❌ 无效选择"
    exit 1
    ;;
esac

if [ $? -eq 0 ]; then
    echo "✅ 推送成功!"
    echo "🎯 Vercel将自动部署最新代码"
    echo "⏰ 预计30秒后完成部署"
    echo ""
    echo "📧 部署完成后,请访问以下链接测试邮件:"
    echo "   https://ebaywebhook-one.vercel.app/api/monitor-sellers"
else
    echo "❌ 推送失败,请检查网络或代理设置"
    exit 1
fi
