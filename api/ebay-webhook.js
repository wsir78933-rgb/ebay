// /api/ebay-webhook.js
/**
 * eBay 用户账户删除通知 Webhook 处理器
 *
 * 功能说明：
 * 1. 接收 eBay 平台发送的用户账户删除通知
 * 2. 验证请求的合法性（防止恶意请求）
 * 3. 异步处理用户数据删除（符合 GDPR 等隐私法规）
 * 4. 快速响应 eBay 服务器（避免重试机制）
 *
 * 部署平台：Vercel Serverless Functions
 * 运行时：Node.js 18.x
 */

// ============================================================================
// 环境变量配置
// ============================================================================
// 需要在 Vercel 项目设置中配置以下环境变量：
// - EBAY_VERIFICATION_TOKEN: eBay 提供的 Webhook 验证令牌
// - DATABASE_URL: 数据库连接字符串（用于删除用户数据）
// - LOG_LEVEL: 日志级别（可选，默认为 'info'）

import { createHash } from 'crypto';

const EBAY_VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://ebay-webhook.vercel.app/api/ebay-webhook';

// ============================================================================
// 主处理函数（Vercel Serverless Function 入口点）
// ============================================================================
export default async function handler(req, res) {
  // 设置 CORS 和安全响应头
  res.setHeader('Access-Control-Allow-Origin', 'https://api.ebay.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // 记录请求信息（用于调试和审计）
  console.log('[eBay Webhook] 收到请求:', {
    method: req.method,
    url: req.url,
    headers: sanitizeHeaders(req.headers),
    timestamp: new Date().toISOString()
  });

  try {
    // ========================================================================
    // 第一步：处理 eBay 的端点验证请求（Endpoint Validation）
    // ========================================================================
    // eBay 在配置 Webhook 时会发送一个包含 challenge_code 的 GET 请求
    // 我们需要计算 SHA-256 哈希值并返回，格式：hash(challengeCode + verificationToken + endpoint)
    if (req.method === 'GET') {
      const challengeCode = req.query.challenge_code;

      if (!challengeCode) {
        console.warn('[eBay Webhook] GET 请求缺少 challenge_code');
        return res.status(400).json({
          error: 'Missing challenge_code parameter'
        });
      }

      // 检查环境变量是否配置
      if (!EBAY_VERIFICATION_TOKEN) {
        console.error('[eBay Webhook] 错误：未配置 EBAY_VERIFICATION_TOKEN 环境变量');
        return res.status(500).json({
          error: 'Server configuration error: missing verification token'
        });
      }

      // 按照 eBay 要求计算哈希：SHA256(challengeCode + verificationToken + endpoint)
      const hash = createHash('sha256');
      hash.update(challengeCode);
      hash.update(EBAY_VERIFICATION_TOKEN);
      hash.update(ENDPOINT_URL);
      const responseHash = hash.digest('hex');

      console.log('[eBay Webhook] 端点验证成功，返回哈希值');

      // 返回哈希后的 challengeResponse
      return res.status(200).json({
        challengeResponse: responseHash
      });
    }

    // ========================================================================
    // 第二步：验证 POST 请求（实际的用户删除通知）
    // ========================================================================
    if (req.method !== 'POST') {
      console.warn('[eBay Webhook] 不支持的请求方法:', req.method);
      return res.status(405).json({
        error: 'Method not allowed. Only POST and GET are supported.'
      });
    }

    // ========================================================================
    // 第三步：验证请求的合法性（安全防护）
    // ========================================================================
    // 检查环境变量是否配置
    if (!EBAY_VERIFICATION_TOKEN) {
      console.error('[eBay Webhook] 错误：未配置 EBAY_VERIFICATION_TOKEN 环境变量');
      return res.status(500).json({
        error: 'Server configuration error'
      });
    }

    // 方案1：验证请求头中的 Verification Token
    const incomingToken = req.headers['x-ebay-verification-token'];

    if (!incomingToken || incomingToken !== EBAY_VERIFICATION_TOKEN) {
      console.warn('[eBay Webhook] 验证失败：Token 不匹配', {
        received: incomingToken ? '***' : 'null',
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        error: 'Unauthorized: Invalid verification token'
      });
    }

    console.log('[eBay Webhook] 验证成功：请求来自 eBay 平台');

    // ========================================================================
    // 第四步：解析并验证请求体
    // ========================================================================
    const notification = req.body;

    // 验证必需字段
    if (!notification || !notification.metadata) {
      console.warn('[eBay Webhook] 请求体格式错误：缺少 metadata');
      return res.status(400).json({
        error: 'Invalid request body: missing metadata'
      });
    }

    // 提取关键信息
    const {
      metadata,
      notification: notificationData
    } = notification;

    const {
      topic,        // 通知主题，应该是 "MARKETPLACE_ACCOUNT_DELETION"
      notificationId
    } = metadata;

    // 验证通知类型
    if (topic !== 'MARKETPLACE_ACCOUNT_DELETION') {
      console.warn('[eBay Webhook] 未知的通知类型:', topic);
      return res.status(400).json({
        error: `Unsupported notification topic: ${topic}`
      });
    }

    // 提取用户标识信息
    const userData = notificationData?.data;
    const username = userData?.username;
    const userId = userData?.userId;

    if (!username && !userId) {
      console.error('[eBay Webhook] 无法提取用户标识信息');
      return res.status(400).json({
        error: 'Missing user identification data'
      });
    }

    console.log('[eBay Webhook] 接收到账户删除通知:', {
      notificationId,
      username: username || 'N/A',
      userId: userId || 'N/A',
      topic
    });

    // ========================================================================
    // 第五步：快速响应 eBay（关键！必须在处理前响应）
    // ========================================================================
    // 先返回 200 OK，防止 eBay 因超时而重试
    // 实际的数据删除操作在后台异步执行
    res.status(200).json({
      success: true,
      message: 'Notification received and queued for processing',
      notificationId
    });

    // ========================================================================
    // 第六步：异步处理用户数据删除（不阻塞响应）
    // ========================================================================
    // 注意：在 Vercel Serverless 环境中，函数返回后可能会立即终止
    // 对于生产环境，建议使用消息队列（如 AWS SQS、Redis Queue）
    // 或触发另一个 Serverless 函数来处理耗时操作

    // 这里使用 setImmediate 来模拟异步处理（仅用于演示）
    setImmediate(async () => {
      try {
        await deleteUserData(username, userId);
        console.log('[eBay Webhook] 用户数据删除成功:', { username, userId });
      } catch (error) {
        console.error('[eBay Webhook] 用户数据删除失败:', {
          username,
          userId,
          error: error.message,
          stack: error.stack
        });

        // 生产环境建议：
        // 1. 记录到错误跟踪系统（如 Sentry）
        // 2. 重试失败的删除操作
        // 3. 发送告警通知管理员
      }
    });

  } catch (error) {
    // ========================================================================
    // 全局错误处理
    // ========================================================================
    console.error('[eBay Webhook] 处理请求时发生错误:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // 如果还没有发送响应，返回 500 错误
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// ============================================================================
// 辅助函数：删除用户数据
// ============================================================================
/**
 * 从数据库中彻底删除用户的所有个人数据
 *
 * @param {string} username - eBay 用户名
 * @param {string} userId - eBay 用户 ID
 *
 * 注意事项：
 * 1. 必须删除所有包含该用户个人信息的表（符合 GDPR 第17条"被遗忘权"）
 * 2. 删除范围包括但不限于：
 *    - 用户基本信息表
 *    - OAuth tokens
 *    - 订单历史
 *    - 搜索历史
 *    - 个人偏好设置
 * 3. 考虑级联删除和外键约束
 * 4. 保留匿名化的统计数据（如果业务需要）
 */
async function deleteUserData(username, userId) {
  console.log('[数据删除] 开始删除用户数据:', { username, userId });

  // 这里需要根据你的实际数据库结构实现
  // 以下是示例代码（假设使用 PostgreSQL）

  try {
    // 示例：使用数据库客户端
    // const { Client } = require('pg');
    // const client = new Client({ connectionString: DATABASE_URL });
    // await client.connect();

    // 删除用户数据（根据你的数据库结构调整）
    /*
    await client.query('BEGIN');

    // 删除 OAuth tokens
    await client.query(
      'DELETE FROM oauth_tokens WHERE ebay_user_id = $1 OR ebay_username = $2',
      [userId, username]
    );

    // 删除用户信息
    await client.query(
      'DELETE FROM users WHERE ebay_user_id = $1 OR ebay_username = $2',
      [userId, username]
    );

    // 删除其他相关数据...

    await client.query('COMMIT');
    await client.end();
    */

    // 临时实现：仅记录日志（生产环境必须实际删除数据）
    console.log('[数据删除] 模拟删除操作完成:', {
      username,
      userId,
      warning: '⚠️ 这是演示代码，生产环境必须实现真实的数据删除逻辑'
    });

    // 记录删除审计日志
    await logDeletionAudit(username, userId);

  } catch (error) {
    console.error('[数据删除] 删除失败:', error);
    throw error; // 抛出错误以便上层捕获和处理
  }
}

// ============================================================================
// 辅助函数：记录删除审计日志
// ============================================================================
/**
 * 记录数据删除的审计日志（符合合规要求）
 *
 * @param {string} username - eBay 用户名
 * @param {string} userId - eBay 用户 ID
 */
async function logDeletionAudit(username, userId) {
  const auditLog = {
    event: 'USER_DATA_DELETION',
    username,
    userId,
    timestamp: new Date().toISOString(),
    source: 'EBAY_WEBHOOK',
    status: 'SUCCESS'
  };

  console.log('[审计日志]', JSON.stringify(auditLog));

  // 生产环境建议：
  // 1. 写入专门的审计日志数据库
  // 2. 发送到日志聚合服务（如 LogDNA, Datadog）
  // 3. 保留日志至少 6 年（根据法规要求）
}

// ============================================================================
// 辅助函数：清理敏感信息（用于日志记录）
// ============================================================================
/**
 * 清理请求头中的敏感信息，避免在日志中泄露
 *
 * @param {object} headers - 原始请求头
 * @returns {object} 清理后的请求头
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };

  // 隐藏敏感信息
  if (sanitized['x-ebay-verification-token']) {
    sanitized['x-ebay-verification-token'] = '***';
  }
  if (sanitized['authorization']) {
    sanitized['authorization'] = '***';
  }

  return sanitized;
}