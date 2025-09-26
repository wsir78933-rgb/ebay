// /api/get-orders.js
/**
 * eBay Fulfillment API - 获取订单列表
 *
 * 功能说明：
 * 1. 调用 eBay Fulfillment API 的 getOrders 端点
 * 2. 使用用户访问令牌进行身份验证
 * 3. 返回账户下的最新订单数据
 * 4. 完整的错误处理和日志记录
 *
 * 部署平台：Vercel Serverless Functions
 * 运行时：Node.js 18.x
 */

// ============================================================================
// 环境变量配置
// ============================================================================
// 需要在 Vercel 项目设置中配置以下环境变量：
// - EBAY_PROD_USER_TOKEN: eBay 生产环境用户访问令牌 (User Access Token)
//   格式示例: v^1.1#i^1#r^1#f^0#p^3#I^3#t^Ul4x...
//   获取方式: 通过 OAuth 2.0 授权流程获取
//   有效期: 通常为 2 小时，需要使用 refresh token 刷新

const EBAY_PROD_USER_TOKEN = process.env.EBAY_PROD_USER_TOKEN;

// eBay Fulfillment API 生产环境基础 URL
const EBAY_API_BASE_URL = 'https://api.ebay.com/sell/fulfillment/v1';

// ============================================================================
// 主处理函数（Vercel Serverless Function 入口点）
// ============================================================================
export default async function handler(req, res) {
  // 设置 CORS 和安全响应头
  res.setHeader('Access-Control-Allow-Origin', '*'); // 生产环境建议限制为特定域名
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // 处理预检请求（OPTIONS）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 记录请求信息（用于调试）
  console.log('[eBay Orders API] 收到请求:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  try {
    // ========================================================================
    // 第一步：验证请求方法
    // ========================================================================
    if (req.method !== 'GET') {
      console.warn('[eBay Orders API] 不支持的请求方法:', req.method);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Only GET is supported.',
        allowedMethods: ['GET']
      });
    }

    // ========================================================================
    // 第二步：验证环境变量配置
    // ========================================================================
    if (!EBAY_PROD_USER_TOKEN) {
      console.error('[eBay Orders API] 错误：未配置 EBAY_PROD_USER_TOKEN 环境变量');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: missing eBay user access token',
        message: '请在 Vercel 环境变量中配置 EBAY_PROD_USER_TOKEN'
      });
    }

    // ========================================================================
    // 第三步：解析查询参数（可选的筛选条件）
    // ========================================================================
    // eBay getOrders API 支持多种查询参数，例如：
    // - limit: 每页返回的订单数量（默认 50，最大 200）
    // - offset: 分页偏移量
    // - filter: 筛选条件（如订单状态、日期范围等）
    // - orderIds: 特定订单 ID 列表

    const queryParams = new URLSearchParams();

    // 从请求中获取可选参数
    const limit = req.query.limit || '50'; // 默认返回 50 条订单
    const offset = req.query.offset || '0';

    queryParams.append('limit', limit);
    queryParams.append('offset', offset);

    // 如果提供了筛选条件，添加到查询参数中
    // 示例：filter=orderfulfillmentstatus:{FULFILLED|IN_PROGRESS}
    if (req.query.filter) {
      queryParams.append('filter', req.query.filter);
    }

    // 构建完整的 API URL
    const apiUrl = `${EBAY_API_BASE_URL}/order?${queryParams.toString()}`;

    console.log('[eBay Orders API] 准备调用 eBay API:', {
      url: apiUrl,
      limit,
      offset
    });

    // ========================================================================
    // 第四步：调用 eBay Fulfillment API
    // ========================================================================
    // 关键点：在 Authorization 头中使用 Bearer 令牌进行身份验证
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        // 身份验证头：Bearer 令牌
        'Authorization': `Bearer ${EBAY_PROD_USER_TOKEN}`,

        // Content-Type 头（虽然 GET 请求通常不需要，但 eBay 建议添加）
        'Content-Type': 'application/json',

        // Accept 头：指定期望的响应格式
        'Accept': 'application/json',

        // 可选：添加自定义请求头用于追踪
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', // 指定市场（美国站点）
      }
    });

    // ========================================================================
    // 第五步：处理 API 响应
    // ========================================================================
    // 解析响应体（无论成功或失败都需要）
    const responseData = await response.json();

    // 检查响应状态码
    if (!response.ok) {
      // API 调用失败
      console.error('[eBay Orders API] API 调用失败:', {
        status: response.status,
        statusText: response.statusText,
        errorData: responseData
      });

      // 返回详细的错误信息
      return res.status(response.status).json({
        success: false,
        error: 'eBay API call failed',
        status: response.status,
        message: responseData.errors?.[0]?.message || response.statusText,
        details: responseData
      });
    }

    // ========================================================================
    // 第六步：成功返回订单数据
    // ========================================================================
    console.log('[eBay Orders API] 成功获取订单数据:', {
      ordersCount: responseData.orders?.length || 0,
      total: responseData.total,
      limit: responseData.limit,
      offset: responseData.offset
    });

    // 返回格式化的订单数据
    return res.status(200).json({
      success: true,
      data: {
        // 订单列表
        orders: responseData.orders || [],

        // 分页信息
        pagination: {
          total: responseData.total || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + responseData.orders?.length) < responseData.total
        },

        // 响应元数据
        metadata: {
          timestamp: new Date().toISOString(),
          apiVersion: 'v1',
          marketplace: 'EBAY_US'
        }
      }
    });

  } catch (error) {
    // ========================================================================
    // 全局错误处理
    // ========================================================================
    console.error('[eBay Orders API] 处理请求时发生错误:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // 检查是否是网络错误
    if (error.name === 'FetchError' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Network error',
        message: '无法连接到 eBay API 服务器，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // 检查是否是令牌相关错误
    if (error.message.includes('token') || error.message.includes('auth')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication error',
        message: '访问令牌无效或已过期，请重新获取用户授权',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // 返回通用错误响应
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '服务器内部错误，请联系技术支持',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// ============================================================================
// 使用说明
// ============================================================================
/**
 * API 调用示例：
 *
 * 1. 获取最新的 50 条订单（默认）：
 *    GET https://your-domain.vercel.app/api/get-orders
 *
 * 2. 分页获取订单（每页 100 条，从第 50 条开始）：
 *    GET https://your-domain.vercel.app/api/get-orders?limit=100&offset=50
 *
 * 3. 筛选特定状态的订单（例如：已完成的订单）：
 *    GET https://your-domain.vercel.app/api/get-orders?filter=orderfulfillmentstatus:FULFILLED
 *
 * 4. 筛选特定日期范围的订单：
 *    GET https://your-domain.vercel.app/api/get-orders?filter=creationdate:[2024-01-01T00:00:00.000Z..2024-12-31T23:59:59.999Z]
 *
 * 成功响应示例：
 * {
 *   "success": true,
 *   "data": {
 *     "orders": [
 *       {
 *         "orderId": "12-34567-89012",
 *         "creationDate": "2024-09-26T10:30:00.000Z",
 *         "orderFulfillmentStatus": "FULFILLED",
 *         "buyer": { ... },
 *         "lineItems": [ ... ]
 *       }
 *     ],
 *     "pagination": {
 *       "total": 150,
 *       "limit": 50,
 *       "offset": 0,
 *       "hasMore": true
 *     }
 *   }
 * }
 *
 * 错误响应示例：
 * {
 *   "success": false,
 *   "error": "Authentication error",
 *   "message": "访问令牌无效或已过期"
 * }
 *
 * 环境变量配置（在 Vercel Dashboard 中添加）：
 * - EBAY_PROD_USER_TOKEN: 你的 eBay 用户访问令牌
 *
 * 注意事项：
 * 1. 用户访问令牌有效期约 2 小时，过期后需要使用 refresh token 刷新
 * 2. API 请求有速率限制，请合理控制调用频率
 * 3. 生产环境建议实现令牌自动刷新机制
 * 4. 建议使用 HTTPS 保护 API 调用
 */