# 🔍 WSL2网络问题完整诊断报告

**诊断时间**: 2025-10-04
**问题**: WSL2无法访问GitHub等外网服务
**诊断人**: Claude Code

---

## 🎯 根本原因分析

### ✅ 确认的事实

1. **Windows主机可以正常访问GitHub**
   - 测试结果: `TcpTestSucceeded: True`
   - 通过接口: `LetsTAP` (TAP虚拟网卡)
   - 实际使用: Clash Verge 代理软件

2. **WSL2内部网络配置正常**
   - IP地址: `172.20.116.48/20`
   - 网关: `172.20.112.1` ✅ 可ping通
   - DNS: 223.5.5.5, 114.114.114.114, 8.8.8.8 ✅ 配置正确
   - MTU: 1500 ✅ 标准值

3. **WSL2无法访问任何外网**
   - Google DNS (8.8.8.8): 100% 丢包
   - 百度: 连接超时
   - GitHub HTTPS: SSL handshake超时

### ❌ 问题根源

**Clash Verge代理软件未对WSL2开放**

证据:
- Windows进程: `clash-verge-service (PID 5100)` ✅ 运行中
- Clash监听端口: **未对WSL2网关开放** ❌
- 测试端口7890/7891/1080: **全部拒绝连接** ❌

---

## 🔧 解决方案

### 方案1: 配置Clash允许局域网连接 (推荐)

**步骤**:

1. 打开 Clash Verge
2. 进入 **设置** → **系统设置**
3. 找到 **允许来自局域网的连接** (Allow LAN)
4. **开启此选项**
5. 记录代理端口 (通常是 7890)
6. 在WSL2中配置代理:

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export WINDOWS_HOST=$(ip route show | grep -i default | awk '{ print $3}')
export http_proxy="http://$WINDOWS_HOST:7890"
export https_proxy="http://$WINDOWS_HOST:7890"
export all_proxy="socks5://$WINDOWS_HOST:7891"

# Git专用配置
git config --global http.proxy "http://$WINDOWS_HOST:7890"
git config --global https.proxy "http://$WINDOWS_HOST:7890"
```

7. 重新加载配置:
```bash
source ~/.bashrc
```

8. 测试连接:
```bash
curl -I https://github.com
```

---

### 方案2: 配置WSL2镜像网络模式 (Windows 11 22H2+)

**步骤**:

1. 在Windows用户目录创建 `.wslconfig` 文件
   - 路径: `C:\Users\你的用户名\.wslconfig`

2. 添加以下内容:
```ini
[wsl2]
networkingMode=mirrored
dnsTunneling=true
firewall=true
autoProxy=true
```

3. 完全关闭WSL2:
```powershell
wsl --shutdown
```

4. 重新启动WSL2

**优点**:
- WSL2直接共享Windows网络栈
- 自动继承Windows代理设置
- 无需手动配置代理

**要求**:
- Windows 11 22H2 或更高版本
- WSL 2.0.0 或更高版本

---

### 方案3: 使用手机热点 (临时方案)

当需要紧急推送代码时:

1. 手机开启热点
2. 电脑连接手机热点
3. 在WSL2中执行:
```bash
./PUSH_FIX.sh
# 选择选项 1 或 2
```

---

### 方案4: 直接在Windows中操作Git (绕过方案)

```powershell
# 在Windows PowerShell中执行
cd "\\wsl.localhost\Ubuntu\home\wcp\项目集合\电商\src\ebay_webhook"
git push origin main
```

**注意**: 需要在Windows中配置Git凭证

---

## 📊 技术细节

### 网络拓扑

```
┌─────────────────────────────────────────┐
│         Windows 主机                    │
│                                         │
│  ┌──────────────┐    ┌──────────────┐ │
│  │  WLAN        │    │  LetsTAP     │ │
│  │  (实际网络)  │    │  (VPN虚拟卡) │ │
│  └──────────────┘    └──────────────┘ │
│         ▲                    ▲         │
│         │                    │         │
│         │            ┌───────┴───────┐ │
│         │            │ Clash Verge   │ │
│         │            │ (代理软件)     │ │
│         │            └───────────────┘ │
│         │                              │
│  ┌──────┴──────────────────────────┐  │
│  │  vEthernet (WSL)                │  │
│  │  172.20.112.1 (网关)            │  │
│  └──────┬──────────────────────────┘  │
└─────────┼───────────────────────────────┘
          │
    ┌─────▼─────────────────┐
    │   WSL2 Ubuntu         │
    │   172.20.116.48       │
    │                       │
    │   ❌ 无法直接访问外网 │
    │   ✅ 可以访问网关     │
    └───────────────────────┘
```

### 问题流程

1. WSL2发起HTTPS请求 → GitHub (199.59.149.235:443)
2. TCP连接成功 ✅
3. TLS握手开始...
4. **SSL connection timeout** ❌ (5秒超时)

**原因**:
- WSL2的流量没有经过Clash代理
- Clash只代理Windows主机流量
- WSL2直连GitHub被GFW阻断

---

## ✅ 验证清单

配置代理后,验证以下各项:

```bash
# 1. 检查代理环境变量
env | grep -i proxy

# 2. 测试GitHub HTTPS
curl -I https://github.com

# 3. 测试Git SSH
ssh -T git@github.com

# 4. 测试Git推送
git push origin main

# 5. 测试npm/pip等包管理器
curl -I https://registry.npmjs.org
```

所有测试应该返回 HTTP 200 或成功响应。

---

## 🚀 快速修复命令

```bash
# 一键配置Clash代理 (假设端口7890)
cat >> ~/.bashrc << 'EOF'

# Clash代理配置
export WINDOWS_HOST=$(ip route show | grep -i default | awk '{ print $3}')
export http_proxy="http://$WINDOWS_HOST:7890"
export https_proxy="http://$WINDOWS_HOST:7890"
git config --global http.proxy "http://$WINDOWS_HOST:7890"
git config --global https.proxy "http://$WINDOWS_HOST:7890"
EOF

source ~/.bashrc

# 测试连接
curl -I https://github.com
```

---

## 📝 相关文档

- Clash Verge官方文档: https://github.com/zzzgydi/clash-verge
- WSL2网络配置: https://learn.microsoft.com/zh-cn/windows/wsl/networking
- WSL2镜像网络: https://learn.microsoft.com/zh-cn/windows/wsl/wsl-config#wslconfig

---

**诊断结论**:
✅ WSL2本身网络配置正常
✅ Windows主机可以访问外网
❌ **Clash代理未对WSL2开放** ← 根本原因

**建议操作**: 配置Clash允许局域网连接(方案1) 或 使用WSL2镜像网络(方案2)
