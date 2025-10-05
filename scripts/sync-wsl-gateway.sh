#!/bin/bash
# WSL2 网关同步脚本
# 自动识别Windows主机的VPN虚拟网关,并确保WSL与其一致

set -e

echo "🔍 检测Windows主机网关..."

# 获取Windows主机的默认网关
WINDOWS_GATEWAY=$(powershell.exe -Command "Get-NetIPConfiguration | Select-Object -ExpandProperty IPv4DefaultGateway | Select-Object -ExpandProperty NextHop" 2>/dev/null | tr -d '\r\n')

if [ -z "$WINDOWS_GATEWAY" ]; then
    echo "❌ 无法获取Windows网关"
    exit 1
fi

echo "✅ Windows主机网关: $WINDOWS_GATEWAY"

# 获取WSL2当前默认网关
WSL_CURRENT_GATEWAY=$(ip route show default | grep -oP 'via \K[0-9.]+' | head -1)

echo "📍 WSL2当前网关: $WSL_CURRENT_GATEWAY"

# 比较网关是否一致
if [ "$WINDOWS_GATEWAY" = "$WSL_CURRENT_GATEWAY" ]; then
    echo "✅ 网关一致,无需修改"
else
    echo "⚠️ 网关不一致,需要同步"
    echo "🔧 这需要sudo权限来修改路由表"
    echo ""
    echo "请在Windows PowerShell中手动执行以下命令:"
    echo ""
    echo "wsl -d Ubuntu -u root -- bash -c 'ip route del default; ip route add default via $WINDOWS_GATEWAY'"
    echo ""
    exit 2
fi

# 测试网关连接性
echo "🔍 测试网关连接性..."
if ping -c 2 -W 2 $WINDOWS_GATEWAY > /dev/null 2>&1; then
    echo "✅ 网关可达"
else
    echo "⚠️ 网关ping失败,但可能仍可正常使用"
fi

# 测试GitHub连接
echo "🔍 测试GitHub连接..."
if timeout 5 git ls-remote https://github.com/wsir78933-rgb/ebay_webhook.git HEAD > /dev/null 2>&1; then
    echo "✅ GitHub连接正常"
else
    echo "❌ GitHub连接失败,尝试使用PowerShell代理..."

    # 创建PowerShell代理脚本
    cat > /tmp/git-push-proxy.ps1 << 'EOF'
# PowerShell Git Push 代理脚本
param(
    [string]$RepoPath = "."
)

Set-Location $RepoPath
git push origin main
EOF

    echo "🚀 使用PowerShell代理推送..."
    REPO_WIN_PATH=$(wslpath -w "$(pwd)")
    powershell.exe -ExecutionPolicy Bypass -File "/tmp/git-push-proxy.ps1" -RepoPath "$REPO_WIN_PATH"
fi

echo "✅ 网关同步完成"
