/**
 * eBay API 电商集成系统 - 首页
 * 显示项目信息和可用API端点
 */

export default function handler(req, res) {
  // 设置响应头
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // 返回HTML首页
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>eBay API 电商集成系统</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
          line-height: 1.6;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px;
          text-align: center;
        }

        .header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
        }

        .header p {
          font-size: 1.2em;
          opacity: 0.9;
        }

        .status {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          margin-top: 15px;
          font-weight: bold;
        }

        .content {
          padding: 40px;
        }

        .section {
          margin-bottom: 40px;
        }

        .section h2 {
          color: #667eea;
          font-size: 1.8em;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }

        .api-list {
          display: grid;
          gap: 20px;
        }

        .api-card {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .api-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
          transform: translateY(-2px);
        }

        .api-card h3 {
          color: #1f2937;
          font-size: 1.3em;
          margin-bottom: 10px;
        }

        .api-card p {
          color: #6b7280;
          margin-bottom: 15px;
        }

        .api-card code {
          display: block;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 5px;
          padding: 12px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #667eea;
          overflow-x: auto;
          white-space: nowrap;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: bold;
          margin-right: 8px;
        }

        .badge-get {
          background: #dbeafe;
          color: #1e40af;
        }

        .badge-post {
          background: #dcfce7;
          color: #166534;
        }

        .badge-cron {
          background: #fef3c7;
          color: #92400e;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .feature {
          background: #f0f9ff;
          border-left: 4px solid #667eea;
          padding: 20px;
          border-radius: 8px;
        }

        .feature h3 {
          color: #667eea;
          margin-bottom: 10px;
        }

        .feature ul {
          list-style: none;
          padding-left: 0;
        }

        .feature li {
          padding: 5px 0;
          color: #4b5563;
        }

        .feature li:before {
          content: "✓ ";
          color: #10b981;
          font-weight: bold;
          margin-right: 8px;
        }

        .footer {
          background: #f9fafb;
          padding: 30px 40px;
          text-align: center;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }

        .tech-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-top: 15px;
        }

        .tech {
          background: white;
          border: 2px solid #e5e7eb;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9em;
          font-weight: 500;
          color: #4b5563;
        }

        @media (max-width: 768px) {
          .header h1 {
            font-size: 1.8em;
          }

          .content {
            padding: 20px;
          }

          .features {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 eBay API 电商集成系统</h1>
          <p>基于Vercel Serverless的eBay API自动化平台</p>
          <span class="status">✅ 系统运行中</span>
        </div>

        <div class="content">
          <div class="section">
            <h2>📋 核心功能</h2>
            <div class="features">
              <div class="feature">
                <h3>🔔 Webhook处理</h3>
                <ul>
                  <li>GDPR用户删除通知</li>
                  <li>端点验证机制</li>
                  <li>审计日志记录</li>
                </ul>
              </div>

              <div class="feature">
                <h3>🔍 商品搜索</h3>
                <ul>
                  <li>eBay商品查询</li>
                  <li>自动Token管理</li>
                  <li>结构化数据返回</li>
                </ul>
              </div>

              <div class="feature">
                <h3>📦 订单管理</h3>
                <ul>
                  <li>订单历史查询</li>
                  <li>OAuth授权流程</li>
                  <li>用户Token管理</li>
                </ul>
              </div>

              <div class="feature">
                <h3>👀 卖家监控</h3>
                <ul>
                  <li>每日定时监控</li>
                  <li>价格变化追踪</li>
                  <li>AI智能邮件通知</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>🔌 API端点列表</h2>
            <div class="api-list">
              <div class="api-card">
                <h3>
                  <span class="badge badge-get">GET</span>
                  商品搜索
                </h3>
                <p>搜索eBay商品，支持关键词查询和结果限制</p>
                <code>/api/search-products?q=iphone&limit=10</code>
              </div>

              <div class="api-card">
                <h3>
                  <span class="badge badge-get">GET</span>
                  订单查询
                </h3>
                <p>获取用户订单历史（需要User Token授权）</p>
                <code>/api/get-orders?limit=20</code>
              </div>

              <div class="api-card">
                <h3>
                  <span class="badge badge-post">POST</span>
                  Webhook处理
                </h3>
                <p>处理eBay GDPR用户删除通知</p>
                <code>/api/ebay-webhook</code>
              </div>

              <div class="api-card">
                <h3>
                  <span class="badge badge-get">GET</span>
                  OAuth授权
                </h3>
                <p>发起eBay OAuth 2.0授权流程</p>
                <code>/api/oauth-authorize</code>
              </div>

              <div class="api-card">
                <h3>
                  <span class="badge badge-get">GET</span>
                  OAuth回调
                </h3>
                <p>处理OAuth授权回调，获取User Token</p>
                <code>/api/oauth-callback</code>
              </div>

              <div class="api-card">
                <h3>
                  <span class="badge badge-cron">CRON</span>
                  卖家监控
                </h3>
                <p>定时监控指定卖家商品变化（每天10:30 UTC）</p>
                <code>/api/monitor-sellers</code>
              </div>

              <div class="api-card">
                <h3>
                  <span class="badge badge-get">GET</span>
                  历史统计
                </h3>
                <p>查看卖家监控的历史统计数据</p>
                <code>/api/historical-stats</code>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>💡 快速开始</h2>
            <div class="api-card">
              <h3>测试商品搜索API</h3>
              <p>在浏览器或命令行中执行：</p>
              <code>curl "https://ebaywebhook-one.vercel.app/api/search-products?q=iphone&limit=5"</code>
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>技术栈</strong></p>
          <div class="tech-stack">
            <span class="tech">Node.js 18+</span>
            <span class="tech">Vercel Serverless</span>
            <span class="tech">Supabase</span>
            <span class="tech">eBay API</span>
            <span class="tech">RUBE MCP</span>
            <span class="tech">OAuth 2.0</span>
          </div>
          <p style="margin-top: 20px; font-size: 0.9em;">
            © 2024 eBay API Integration System |
            <a href="https://developer.ebay.com" target="_blank" style="color: #667eea; text-decoration: none;">eBay Developer</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
}
