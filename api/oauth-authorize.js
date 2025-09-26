// /api/oauth-authorize.js
/**
 * eBay OAuth 2.0 授权流程 - 步骤 1：发起授权请求
 *
 * 功能说明：
 * 1. 将用户重定向到 eBay 授权页面
 * 2. 用户登录并同意授权后，eBay 会回调到 oauth-callback.js
 * 3. 可以指定需要的权限范围（scopes）
 *
 * 使用方式：
 * 访问 https://your-domain.vercel.app/api/oauth-authorize
 *
 * 部署平台：Vercel Serverless Functions
 * 运行时：Node.js 18.x
 */

// ============================================================================
// 环境变量配置
// ============================================================================
const EBAY_CLIENT_ID = process.env.EBAY_PROD_CLIENT_ID;
const REDIRECT_URI = process.env.EBAY_OAUTH_REDIRECT_URI || 'https://ebaywebhook-one.vercel.app/api/oauth-callback';

// eBay OAuth 授权 URL（生产环境）
const EBAY_AUTHORIZE_URL = 'https://auth.ebay.com/oauth2/authorize';

// 需要的权限范围（可以根据需求添加）
const SCOPES = [
  'https://api.ebay.com/oauth/api_scope',           // 基础权限
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',  // 订单管理
  'https://api.ebay.com/oauth/api_scope/sell.inventory',    // 库存管理
  'https://api.ebay.com/oauth/api_scope/sell.account'       // 账户管理
];

// ============================================================================
// 主处理函数
// ============================================================================
export default async function handler(req, res) {
  console.log('[OAuth Authorize] 收到授权请求');

  try {
    // 验证环境变量
    if (!EBAY_CLIENT_ID) {
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
            <h2>⚠️ 配置错误</h2>
            <p>缺少环境变量 <code>EBAY_PROD_CLIENT_ID</code></p>
            <p>请在 Vercel Dashboard 中配置环境变量。</p>
          </div>
        </body>
        </html>
      `);
    }

    // 生成随机 state 参数（防止 CSRF 攻击）
    const state = generateRandomState();

    // 构建授权 URL
    const authUrl = new URL(EBAY_AUTHORIZE_URL);
    authUrl.searchParams.append('client_id', EBAY_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('state', state);

    console.log('[OAuth Authorize] 重定向到 eBay 授权页面');
    console.log('[OAuth Authorize] Scopes:', SCOPES);

    // 返回授权页面（带确认按钮）
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>eBay 授权</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
          }
          h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
            text-align: center;
          }
          .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 4px;
          }
          .info-box h3 {
            color: #667eea;
            font-size: 16px;
            margin-bottom: 10px;
          }
          .scope-list {
            list-style: none;
            padding: 0;
          }
          .scope-list li {
            padding: 8px 0;
            color: #555;
            font-size: 14px;
          }
          .scope-list li:before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
            margin-right: 8px;
          }
          .btn {
            display: block;
            width: 100%;
            padding: 15px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            text-align: center;
            margin-bottom: 15px;
          }
          .btn:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102,126,234,0.4);
          }
          .btn-secondary {
            background: #6c757d;
          }
          .btn-secondary:hover {
            background: #5a6268;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 13px;
            color: #856404;
          }
          .tech-info {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #999;
          }
          .tech-info code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 eBay 账户授权</h1>
          <p class="subtitle">授权应用访问你的 eBay 卖家数据</p>

          <div class="warning">
            ⚠️ 你将被重定向到 eBay 官方授权页面，请使用你的 eBay 卖家账户登录。
          </div>

          <div class="info-box">
            <h3>📋 请求的权限</h3>
            <ul class="scope-list">
              <li>访问公共数据（商品搜索）</li>
              <li>管理订单和发货信息</li>
              <li>管理库存和商品列表</li>
              <li>访问账户基本信息</li>
            </ul>
          </div>

          <a href="${authUrl.toString()}" class="btn">
            🚀 前往 eBay 授权
          </a>

          <button onclick="window.history.back()" class="btn btn-secondary">
            ← 取消
          </button>

          <div class="tech-info">
            <strong>技术信息：</strong><br>
            Client ID: <code>${EBAY_CLIENT_ID.substring(0, 20)}...</code><br>
            Redirect URI: <code>${REDIRECT_URI}</code><br>
            State: <code>${state}</code>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('[OAuth Authorize] 错误:', error);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>授权错误</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ 授权流程错误</h2>
          <p>${error.message}</p>
        </div>
      </body>
      </html>
    `);
  }
}

// ============================================================================
// 辅助函数：生成随机 state
// ============================================================================
function generateRandomState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let state = '';
  for (let i = 0; i < 32; i++) {
    state += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return state;
}