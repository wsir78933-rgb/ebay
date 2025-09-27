// /api/test-supabase.js
/**
 * Supabase 连接测试端点
 *
 * 功能说明：
 * 1. 测试 Supabase 数据库连接
 * 2. 检查表结构和数据状态
 * 3. 验证环境变量配置
 * 4. 提供调试信息
 *
 * 访问方式：GET /api/test-supabase
 */

import { DatabaseUtils, UserService, OAuthService } from '../lib/supabase.js';

export default async function handler(req, res) {
  // 设置响应头
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  console.log('[Supabase Test] 开始测试连接:', {
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed. Only GET is supported.',
      method: req.method
    });
  }

  try {
    // ========================================================================
    // 第一步：检查环境变量
    // ========================================================================
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    console.log('[Supabase Test] 环境变量检查:', envCheck);

    // ========================================================================
    // 第二步：测试基本连接
    // ========================================================================
    let connectionStatus = false;
    let connectionError = null;

    try {
      connectionStatus = await DatabaseUtils.testConnection();
      console.log('[Supabase Test] 基本连接测试:', connectionStatus);
    } catch (error) {
      connectionError = error.message;
      console.error('[Supabase Test] 连接测试失败:', error);
    }

    // ========================================================================
    // 第三步：获取数据库状态
    // ========================================================================
    let databaseStatus = {};
    let statusError = null;

    if (connectionStatus) {
      try {
        databaseStatus = await DatabaseUtils.getStatus();
        console.log('[Supabase Test] 数据库状态:', databaseStatus);
      } catch (error) {
        statusError = error.message;
        console.error('[Supabase Test] 获取状态失败:', error);
      }
    }

    // ========================================================================
    // 第四步：测试基本操作（可选）
    // ========================================================================
    let operationTests = {};

    if (connectionStatus && req.query.test_operations === 'true') {
      try {
        // 测试用户查找（不存在的用户）
        const testUser = await UserService.findUserByEbayData('test_user_123', 'test_username_123');
        operationTests.userFind = testUser ? 'Found user' : 'No user found (expected)';

        // 测试 OAuth token 查找（不存在的token）
        const testToken = await OAuthService.getToken('test_user_123');
        operationTests.tokenFind = testToken ? 'Found token' : 'No token found (expected)';

        console.log('[Supabase Test] 操作测试完成:', operationTests);
      } catch (error) {
        operationTests.error = error.message;
        console.error('[Supabase Test] 操作测试失败:', error);
      }
    }

    // ========================================================================
    // 第五步：构建响应
    // ========================================================================
    const response = {
      timestamp: new Date().toISOString(),
      service: 'Supabase',
      project: 'eBay Webhook Handler',
      environment: {
        variables: envCheck,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      connection: {
        status: connectionStatus,
        error: connectionError
      },
      database: {
        status: databaseStatus,
        error: statusError
      },
      ...(Object.keys(operationTests).length > 0 && { operations: operationTests }),
      recommendations: []
    };

    // ========================================================================
    // 第六步：生成建议
    // ========================================================================
    if (!envCheck.SUPABASE_URL) {
      response.recommendations.push('配置 SUPABASE_URL 环境变量');
    }
    if (!envCheck.SUPABASE_ANON_KEY) {
      response.recommendations.push('配置 SUPABASE_ANON_KEY 环境变量');
    }
    if (!envCheck.SUPABASE_SERVICE_ROLE_KEY) {
      response.recommendations.push('配置 SUPABASE_SERVICE_ROLE_KEY 环境变量（用于数据删除操作）');
    }
    if (!connectionStatus) {
      response.recommendations.push('检查 Supabase 项目是否正常运行');
      response.recommendations.push('验证 API 密钥是否正确');
    }
    if (Object.keys(databaseStatus).length === 0 && connectionStatus) {
      response.recommendations.push('创建必需的数据库表（参见 /docs/supabase-setup.md）');
    }

    // ========================================================================
    // 第七步：确定响应状态码
    // ========================================================================
    let statusCode = 200;

    if (!connectionStatus) {
      statusCode = 503; // Service Unavailable
    } else if (!envCheck.SUPABASE_URL || !envCheck.SUPABASE_ANON_KEY) {
      statusCode = 500; // Internal Server Error
    } else if (response.recommendations.length > 0) {
      statusCode = 206; // Partial Content
    }

    console.log('[Supabase Test] 测试完成:', {
      statusCode,
      connected: connectionStatus,
      recommendations: response.recommendations.length
    });

    return res.status(statusCode).json(response);

  } catch (error) {
    // ========================================================================
    // 全局错误处理
    // ========================================================================
    console.error('[Supabase Test] 测试过程中发生错误:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      timestamp: new Date().toISOString(),
      service: 'Supabase',
      project: 'eBay Webhook Handler',
      error: 'Test failed',
      message: error.message,
      connected: false,
      recommendations: [
        '检查服务器日志以获取详细错误信息',
        '验证所有环境变量是否正确配置',
        '确保 Supabase 项目正常运行'
      ]
    });
  }
}

// ============================================================================
// 使用说明
// ============================================================================
/**
 * 使用方式：
 *
 * 1. 基本测试：
 *    GET /api/test-supabase
 *
 * 2. 详细测试（包括操作测试）：
 *    GET /api/test-supabase?test_operations=true
 *
 * 响应状态码：
 * - 200: 所有测试通过
 * - 206: 部分配置缺失但基本功能正常
 * - 500: 配置错误
 * - 503: 无法连接到数据库
 *
 * 示例响应：
 * {
 *   "timestamp": "2024-01-01T00:00:00.000Z",
 *   "service": "Supabase",
 *   "project": "eBay Webhook Handler",
 *   "environment": {
 *     "variables": {
 *       "SUPABASE_URL": true,
 *       "SUPABASE_ANON_KEY": true,
 *       "SUPABASE_SERVICE_ROLE_KEY": true
 *     },
 *     "nodeEnv": "production"
 *   },
 *   "connection": {
 *     "status": true,
 *     "error": null
 *   },
 *   "database": {
 *     "status": {
 *       "users": "0 条记录",
 *       "oauth_tokens": "0 条记录",
 *       "orders": "0 条记录",
 *       "search_history": "0 条记录",
 *       "audit_logs": "0 条记录"
 *     },
 *     "error": null
 *   },
 *   "recommendations": []
 * }
 */