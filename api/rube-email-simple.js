/**
 * 简化版RUBE邮件系统 - 直接使用nodemailer发送邮件
 * 添加完整的环境变量验证和错误处理
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[RUBE Email Simple] Starting email processing...');

  try {
    // 验证环境变量
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    console.log('[RUBE Email Simple] Environment check:', {
      GMAIL_USER: gmailUser ? '已配置' : '❌ 未配置',
      GMAIL_APP_PASSWORD: gmailPassword ? '已配置' : '❌ 未配置'
    });

    if (!gmailUser || !gmailPassword) {
      const error = 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel environment variables.';
      console.error('[RUBE Email Simple]', error);
      return res.status(500).json({
        success: false,
        error,
        envCheck: {
          GMAIL_USER: gmailUser ? '已配置' : '未配置',
          GMAIL_APP_PASSWORD: gmailPassword ? '已配置' : '未配置'
        }
      });
    }

    // 从请求中获取邮件数据
    const {
      changes,
      monitoringStats,
      emailType = 'seller_monitor_alert'
    } = req.body || {};

    if (!changes) {
      return res.status(400).json({
        success: false,
        error: 'Missing changes data'
      });
    }

    // 生成邮件内容
    const emailContent = generateEmailContent(changes, monitoringStats, emailType);
    const subject = generateSubject(changes, monitoringStats);

    // 配置nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    const mailOptions = {
      from: `eBay监控系统 <${gmailUser}>`,
      to: '3277193856@qq.com',
      subject: subject,
      html: emailContent
    };

    console.log('[RUBE Email Simple] Sending email...');
    console.log('[RUBE Email Simple] From:', gmailUser);
    console.log('[RUBE Email Simple] To: 3277193856@qq.com');
    console.log('[RUBE Email Simple] Subject:', subject);

    const info = await transporter.sendMail(mailOptions);

    console.log('[RUBE Email Simple] Email sent successfully');
    console.log('[RUBE Email Simple] Message ID:', info.messageId);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      emailType,
      messageId: info.messageId,
      delivery: 'success',
      integration: 'nodemailer_simple'
    });

  } catch (error) {
    console.error('[RUBE Email Simple] Error:', error.message);
    console.error('[RUBE Email Simple] Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message,
      errorType: error.name,
      integration: 'nodemailer_simple_failed'
    });
  }
}

function generateSubject(changes, monitoringStats) {
  if (!changes.hasChanges) {
    return `✅ eBay监控状态 - 系统正常运行 (第${monitoringStats?.monitoringDays || 'N'}天)`;
  }

  const stats = {
    priceChanges: changes.priceChanges?.length || 0,
    newListings: changes.newListings?.length || 0,
    removedListings: changes.removedListings?.length || 0
  };

  const totalChanges = Object.values(stats).reduce((sum, count) => sum + count, 0);
  const priorities = [];

  if (stats.priceChanges > 0) priorities.push(`${stats.priceChanges}项价格变化`);
  if (stats.newListings > 0) priorities.push(`${stats.newListings}项新品上架`);

  const mainChanges = priorities.slice(0, 2).join('、');
  const urgencyLevel = totalChanges >= 10 ? '🚨 紧急' : totalChanges >= 5 ? '⚠️ 重要' : '📊 标准';

  return `${urgencyLevel} eBay监控警报 - ${mainChanges}等${totalChanges}项变化`;
}

function generateEmailContent(changes, monitoringStats, emailType) {
  const timestamp = new Date().toLocaleString('zh-CN');
  const trackingId = `simple-${Date.now()}`;

  if (!changes.hasChanges) {
    return generateStatusEmail(monitoringStats, trackingId, timestamp);
  }

  return generateAlertEmail(changes, trackingId, timestamp);
}

function generateStatusEmail(stats, trackingId, timestamp) {
  const sellers = ['cellfc', 'electronicdea1s'];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { padding: 20px; }
    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 12px 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ eBay监控状态报告</h1>
      <p>监控时间: ${timestamp}</p>
    </div>
    <div class="content">
      <h2>📊 监控状态</h2>
      <p>系统运行正常，当前检查周期内未发现显著变化。</p>
      <div class="stats">
        <div class="stat-card">
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats?.monitoringDays || 0}</div>
          <div>已监控天数</div>
        </div>
        <div class="stat-card">
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${sellers.length}</div>
          <div>监控卖家数</div>
        </div>
      </div>
      <p><strong>监控卖家：</strong> ${sellers.join(', ')}</p>
      <p><strong>监控商品：</strong> iPhone 相关商品</p>
    </div>
    <div class="footer">
      🤖 由简化版RUBE邮件系统生成 | 跟踪ID: ${trackingId}<br>
      📧 技术支持: Nodemailer + Gmail | ${timestamp}
    </div>
  </div>
</body>
</html>`;
}

function generateAlertEmail(changes, trackingId, timestamp) {
  const stats = {
    priceChanges: changes.priceChanges?.length || 0,
    newListings: changes.newListings?.length || 0,
    removedListings: changes.removedListings?.length || 0
  };

  const totalChanges = Object.values(stats).reduce((sum, count) => sum + count, 0);

  let detailsHtml = '';

  // 价格变化
  if (stats.priceChanges > 0) {
    detailsHtml += `<h3>💰 价格变化 (${stats.priceChanges}项)</h3>`;
    changes.priceChanges.forEach(item => {
      const priceDirection = item.change > 0 ? '📈' : '📉';
      const priceColor = item.change > 0 ? '#ef4444' : '#10b981';
      detailsHtml += `
        <div style="background: #fef3c7; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #f59e0b;">
          <strong>${item.title}</strong><br>
          卖家: ${item.seller}<br>
          ${priceDirection} 价格: <span style="color: #666; text-decoration: line-through;">$${item.oldPrice}</span> →
          <strong style="color: ${priceColor};">$${item.newPrice}</strong>
          (${item.change > 0 ? '+' : ''}$${item.change.toFixed(2)} / ${item.percentChange}%)
          ${item.url ? `<br><a href="${item.url}" style="color: #3b82f6; text-decoration: none;">查看商品 →</a>` : ''}
        </div>`;
    });
  }

  // 新增商品
  if (stats.newListings > 0) {
    detailsHtml += `<h3>🆕 新增商品 (${stats.newListings}项)</h3>`;
    changes.newListings.forEach(item => {
      detailsHtml += `
        <div style="background: #f0f9ff; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #3b82f6;">
          <strong>${item.title}</strong><br>
          卖家: ${item.seller} | 价格: <strong>$${item.price}</strong>
          ${item.url ? `<br><a href="${item.url}" style="color: #3b82f6; text-decoration: none;">查看商品 →</a>` : ''}
        </div>`;
    });
  }

  // 下架商品
  if (stats.removedListings > 0) {
    detailsHtml += `<h3>📦 下架商品 (${stats.removedListings}项)</h3>`;
    changes.removedListings.forEach(item => {
      detailsHtml += `
        <div style="background: #fee2e2; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #ef4444;">
          <strong>${item.title}</strong><br>
          卖家: ${item.seller} | 原价格: $${item.price}
        </div>`;
    });
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { padding: 25px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 12px 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 eBay监控警报</h1>
      <p>发现 ${totalChanges} 项变化 | ${timestamp}</p>
    </div>
    <div class="content">
      <h2>📊 变化统计</h2>
      <div class="stats">
        <div class="stat-card">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${stats.priceChanges}</div>
          <div>价格变化</div>
        </div>
        <div class="stat-card">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${stats.newListings}</div>
          <div>新增商品</div>
        </div>
        <div class="stat-card">
          <div style="font-size: 24px; font-weight: bold; color: #667eea;">${stats.removedListings}</div>
          <div>下架商品</div>
        </div>
      </div>
      ${detailsHtml}
    </div>
    <div class="footer">
      🤖 由简化版RUBE邮件系统生成 | 跟踪ID: ${trackingId}<br>
      📧 技术支持: Nodemailer + Gmail | ${timestamp}
    </div>
  </div>
</body>
</html>`;
}
