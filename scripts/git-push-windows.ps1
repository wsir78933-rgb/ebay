# PowerShell Git Push 脚本
# 用于在WSL2网络问题时通过Windows推送Git仓库

param(
    [string]$RepoPath = "\\wsl.localhost\Ubuntu\home\wcp\项目集合\电商\src\ebay_webhook",
    [string]$Branch = "main",
    [string]$Remote = "origin"
)

Write-Host "🚀 PowerShell Git Push 代理启动..." -ForegroundColor Cyan
Write-Host "📁 仓库路径: $RepoPath" -ForegroundColor Yellow
Write-Host "🌿 分支: $Branch" -ForegroundColor Yellow
Write-Host "🔗 远程: $Remote" -ForegroundColor Yellow
Write-Host ""

# 检查路径是否存在
if (-not (Test-Path $RepoPath)) {
    Write-Host "❌ 错误: 仓库路径不存在: $RepoPath" -ForegroundColor Red
    exit 1
}

# 切换到仓库目录
Set-Location $RepoPath
Write-Host "✅ 已切换到仓库目录" -ForegroundColor Green

# 检查Git配置
Write-Host "🔍 检查Git配置..." -ForegroundColor Cyan
$gitUser = git config --global user.name
$gitEmail = git config --global user.email

if ([string]::IsNullOrEmpty($gitUser) -or [string]::IsNullOrEmpty($gitEmail)) {
    Write-Host "⚠️ Git用户未配置,使用默认值..." -ForegroundColor Yellow
    git config --global user.name "wsir78933-rgb"
    git config --global user.email "wsir78933-rgb@example.com"
}

Write-Host "👤 Git用户: $gitUser <$gitEmail>" -ForegroundColor Green

# 添加安全目录
Write-Host "🔒 添加安全目录配置..." -ForegroundColor Cyan
git config --global --add safe.directory $RepoPath

# 查看Git状态
Write-Host ""
Write-Host "📊 当前Git状态:" -ForegroundColor Cyan
git status

# 推送到远程
Write-Host ""
Write-Host "🚀 开始推送到 $Remote/$Branch ..." -ForegroundColor Cyan
$pushResult = git push $Remote $Branch 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Git推送成功!" -ForegroundColor Green
    Write-Host $pushResult
} else {
    Write-Host "❌ Git推送失败!" -ForegroundColor Red
    Write-Host $pushResult
    exit 1
}

Write-Host ""
Write-Host "🎉 完成! 所有提交已推送到GitHub" -ForegroundColor Green
