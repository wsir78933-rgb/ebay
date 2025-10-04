/**
 * 临时测试端点 - 检查环境变量配置
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const envCheck = {
    GMAIL_USER: process.env.GMAIL_USER ? '已配置' : '❌ 缺失',
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? '已配置' : '❌ 缺失',
    RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL || '未配置',
    SUPABASE_URL: process.env.SUPABASE_URL ? '已配置' : '❌ 缺失',
    EBAY_PROD_CLIENT_ID: process.env.EBAY_PROD_CLIENT_ID ? '已配置' : '❌ 缺失'
  };

  return res.status(200).json({
    success: true,
    environment: 'production',
    envCheck,
    timestamp: new Date().toISOString()
  });
}
