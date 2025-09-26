// /api/oauth-callback.js
/**
 * eBay OAuth 2.0 授权流程 - 步骤 2：处理授权回调
 *
 * 功能说明：
 * 1. 接收 eBay 授权后的回调（带 authorization code）
 * 2. 使用 authorization code 交换 access token 和 refresh token
 * 3. 显示获取到的 token（需要保存到环境变量）
 *
 * 回调 URL：
 * https://your-domain.vercel.app/api/oauth-callback?code=xxx&state=xxx
 *
 * 部署平台：Vercel Serverless Functions
 * 运行时：Node.js 18.x
 */

// ============================================================================
// 环境变量配置
// ============================================================================
const EBAY_CLIENT_ID = process.env.EBAY_PROD_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_PROD_CLIENT_SECRET;
const REDIRECT_URI = process.env.EBAY_OAUTH_REDIRECT_URI || 'https://ebaywebhook-one.vercel.app/api/oauth-callback';

// eBay OAuth Token 端点（生产环境）
const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';

// ============================================================================
// 主处理函数
// ============================================================================
export default async function handler(req, res) {
  console.log('[OAuth Callback] 收到回调请求');

  try {
    // 获取授权码和 state
    const { code, state, error, error_description } = req.query;

    // 检查是否有错误
    if (error) {
      console.error('[OAuth Callback] 授权失败:', error, error_description);

      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>授权失败</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ 授权失败</h2>
            <p><strong>错误类型：</strong> ${error}</p>
            <p><strong>错误描述：</strong> ${error_description || '用户取消授权或授权过程中出错'}</p>
            <a href="/api/oauth-authorize" class="btn">重新授权</a>
          </div>
        </body>
        </html>
      `);
    }

    // 验证必需参数
    if (!code) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>参数错误</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>⚠️ 参数错误</h2>
            <p>缺少授权码 (code) 参数</p>
          </div>
        </body>
        </html>
      `);
    }

    // 验证环境变量
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      console.error('[OAuth Callback] 缺少环境变量');
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>配置错误</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>⚠️ 服务器配置错误</h2>
            <p>缺少 eBay 应用凭证，请在 Vercel Dashboard 配置环境变量。</p>
          </div>
        </body>
        </html>
      `);
    }

    console.log('[OAuth Callback] 正在交换 authorization code 为 access token...');

    // ========================================================================
    // 使用 authorization code 交换 access token
    // ========================================================================

    // 1. Base64 编码凭证
    const credentials = `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    // 2. 构建请求体
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI
    });

    // 3. 发起 POST 请求
    const tokenResponse = await fetch(EBAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenRequestBody.toString()
    });

    const tokenData = await tokenResponse.json();

    // 4. 检查响应
    if (!tokenResponse.ok) {
      console.error('[OAuth Callback] Token 交换失败:', tokenData);

      return res.status(tokenResponse.status).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Token 获取失败</title>
          <style>
            body { font-family: Arial; max-width: 700px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Token 获取失败</h2>
            <p><strong>错误详情：</strong></p>
            <pre>${JSON.stringify(tokenData, null, 2)}</pre>
          </div>
        </body>
        </html>
      `);
    }

    // ========================================================================
    // 成功获取 Token！
    // ========================================================================
    const {
      access_token,
      refresh_token,
      expires_in,
      token_type
    } = tokenData;

    console.log('[OAuth Callback] ✓ 成功获取 User Access Token');
    console.log('[OAuth Callback] Token 类型:', token_type);
    console.log('[OAuth Callback] 有效期:', expires_in, '秒');

    // 返回成功页面（显示 Token）
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>授权成功</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 900px;
            margin: 50px auto;
            padding: 40px;
          }
          h1 {
            color: #28a745;
            font-size: 32px;
            margin-bottom: 10px;
            text-align: center;
          }
          .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
          }
          .success-box {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 4px;
          }
          .token-section {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .token-section h3 {
            color: #333;
            font-size: 16px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .token-box {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            word-break: break-all;
            position: relative;
          }
          .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
          }
          .copy-btn:hover {
            background: #5568d3;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-item {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
          }
          .info-item strong {
            display: block;
            color: #667eea;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .info-item span {
            color: #333;
            font-size: 18px;
            font-weight: 600;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin-top: 20px;
            border-radius: 4px;
            font-size: 14px;
            color: #856404;
          }
          .steps {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #eee;
          }
          .steps h3 {
            color: #333;
            margin-bottom: 15px;
          }
          .steps ol {
            padding-left: 20px;
          }
          .steps li {
            margin-bottom: 15px;
            line-height: 1.6;
          }
          .steps code {
            background: #f4f4f4;
            padding: 2px 8px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
          }
        </style>
        <script>
          function copyToClipboard(elementId) {
            const text = document.getElementById(elementId).textContent;
            navigator.clipboard.writeText(text).then(() => {
              const btn = event.target;
              btn.textContent = '✓ 已复制';
              setTimeout(() => {
                btn.textContent = '复制';
              }, 2000);
            });
          }
        </script>
      </head>
      <body>
        <div class="container">
          <h1>🎉 授权成功！</h1>
          <p class="subtitle">你已成功授权应用访问你的 eBay 账户数据</p>

          <div class="success-box">
            ✅ 已获取 <strong>User Access Token</strong> 和 <strong>Refresh Token</strong>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <strong>Token 类型</strong>
              <span>${token_type}</span>
            </div>
            <div class="info-item">
              <strong>有效期</strong>
              <span>${Math.floor(expires_in / 3600)} 小时</span>
            </div>
            <div class="info-item">
              <strong>过期时间</strong>
              <span>${new Date(Date.now() + expires_in * 1000).toLocaleString('zh-CN')}</span>
            </div>
          </div>

          <div class="token-section">
            <h3>🔑 Access Token (访问令牌)</h3>
            <div class="token-box">
              <button class="copy-btn" onclick="copyToClipboard('access-token')">复制</button>
              <div id="access-token">${access_token}</div>
            </div>
          </div>

          <div class="token-section">
            <h3>🔄 Refresh Token (刷新令牌)</h3>
            <div class="token-box">
              <button class="copy-btn" onclick="copyToClipboard('refresh-token')">复制</button>
              <div id="refresh-token">${refresh_token}</div>
            </div>
          </div>

          <div class="warning">
            ⚠️ <strong>重要提示：</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
              <li>Access Token 有效期约 <strong>2 小时</strong>，过期后需要使用 Refresh Token 刷新</li>
              <li>Refresh Token 有效期约 <strong>18 个月</strong>，请妥善保存</li>
              <li>请勿在公共场所分享这些 Token</li>
            </ul>
          </div>

          <div class="steps">
            <h3>📋 下一步操作</h3>
            <ol>
              <li>
                复制上面的 <strong>Access Token</strong>
              </li>
              <li>
                在 Vercel Dashboard 中设置环境变量：<br>
                <code>EBAY_PROD_USER_TOKEN</code> = <strong>你的 Access Token</strong>
              </li>
              <li>
                保存 <strong>Refresh Token</strong> 到安全的地方（用于刷新 Access Token）
              </li>
              <li>
                重新部署你的 Vercel 应用，或等待环境变量自动生效
              </li>
              <li>
                测试订单获取 API：<br>
                <code>GET https://ebaywebhook-one.vercel.app/api/get-orders</code>
              </li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('[OAuth Callback] 处理回调时出错:', error);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>处理错误</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
          pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ 处理回调时出错</h2>
          <p><strong>错误信息：</strong></p>
          <pre>${error.message}</pre>
        </div>
      </body>
      </html>
    `);
  }
}