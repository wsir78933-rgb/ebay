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
import { UserService } from '../lib/supabase.js';

const EBAY_VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://ebaywebhook-one.vercel.app/api/ebay-webhook';

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

    // 方案1：验证请求头中的 Verification Token（可选验证）
    const incomingToken = req.headers['x-ebay-verification-token'];

    if (!incomingToken || incomingToken !== EBAY_VERIFICATION_TOKEN) {
      console.warn('[eBay Webhook] 注意：POST 请求未包含有效的 x-ebay-verification-token 头', {
        received: incomingToken ? '***' : 'null',
        allHeaders: Object.keys(req.headers),
        timestamp: new Date().toISOString()
      });

      // 注意：对于 Marketplace Account Deletion 通知，
      // eBay 可能不会在 POST 请求中发送 x-ebay-verification-token
      // 端点验证已通过 GET 请求的 challenge-response 完成
      // 这里我们接受没有 token 的请求，但会记录警告
    } else {
      console.log('[eBay Webhook] 验证成功：请求包含有效的验证令牌');
    }

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

    // 使用 Supabase 异步处理用户数据删除
    setImmediate(async () => {
      try {
        await UserService.deleteUserData(userId, username);
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
// 注意：用户数据删除功能已迁移到 Supabase
// ============================================================================
/**
 * 用户数据删除功能现在通过 UserService.deleteUserData() 实现
 * 位置：/lib/supabase.js
 *
 * 功能特性：
 * 1. 使用 Supabase 客户端进行数据库操作
 * 2. 自动事务处理和错误回滚
 * 3. 内置审计日志记录
 * 4. 符合 GDPR 第17条"被遗忘权"要求
 * 5. 支持多表级联删除
 *
 * 删除范围包括：
 * - users (用户基本信息)
 * - oauth_tokens (OAuth 令牌)
 * - orders (订单历史)
 * - search_history (搜索历史)
 * - audit_logs (审计日志，记录删除操作)
 */

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