// /api/search-products.js
/**
 * eBay 商品搜索 API - 使用应用访问令牌
 *
 * 功能说明：
 * 1. 使用 Client Credentials 流程获取应用访问令牌 (Application Access Token)
 * 2. 使用令牌调用 eBay Browse API 搜索公开商品
 * 3. 返回搜索结果（商品列表）
 * 4. 完整的错误处理和日志记录
 *
 * 部署平台：Vercel Serverless Functions
 * 运行时：Node.js 18.x
 *
 * 关键区别：
 * - 应用访问令牌 (Application Token)：用于访问公开数据，不需要用户授权
 * - 用户访问令牌 (User Token)：用于访问用户私人数据（如订单），需要用户授权
 */

// ============================================================================
// 环境变量配置
// ============================================================================
// 需要在 Vercel 项目设置中配置以下环境变量：
// - EBAY_PROD_CLIENT_ID: eBay 应用的 Client ID
// - EBAY_PROD_CLIENT_SECRET: eBay 应用的 Client Secret

const EBAY_CLIENT_ID = process.env.EBAY_PROD_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_PROD_CLIENT_SECRET;

// eBay API 端点
const EBAY_AUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_BROWSE_API_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

// OAuth 2.0 作用域（用于访问公开商品数据）
const OAUTH_SCOPE = 'https://api.ebay.com/oauth/api_scope';

// ============================================================================
// 主处理函数（Vercel Serverless Function 入口点）
// ============================================================================
export default async function handler(req, res) {
  // 设置 CORS 和安全响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 记录请求信息
  console.log('[eBay Search API] 收到请求:', {
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  try {
    // ========================================================================
    // 第一步：验证请求方法
    // ========================================================================
    if (req.method !== 'GET') {
      console.warn('[eBay Search API] 不支持的请求方法:', req.method);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        message: 'Only GET method is supported'
      });
    }

    // ========================================================================
    // 第二步：验证环境变量配置
    // ========================================================================
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      console.error('[eBay Search API] 错误：缺少必需的环境变量');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: '缺少 eBay 应用凭证，请配置 EBAY_PROD_CLIENT_ID 和 EBAY_PROD_CLIENT_SECRET'
      });
    }

    // ========================================================================
    // 第三步：验证搜索查询参数
    // ========================================================================
    const searchQuery = req.query.q;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing query parameter',
        message: '请提供搜索关键词，例如：?q=iphone'
      });
    }

    console.log('[eBay Search API] 搜索关键词:', searchQuery);

    // ========================================================================
    // 任务一：获取应用访问令牌 (Application Access Token)
    // ========================================================================
    console.log('[eBay Search API] 步骤 1/2: 开始获取应用访问令牌...');

    // 1. Base64 编码凭证（格式：client_id:client_secret）
    const credentials = `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    console.log('[eBay Search API] 凭证已编码（Base64）');

    // 2. 构建 OAuth 2.0 请求体（使用 application/x-www-form-urlencoded 格式）
    const authRequestBody = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: OAUTH_SCOPE
    });

    // 3. 发起 POST 请求获取令牌
    console.log('[eBay Search API] 正在请求访问令牌...');

    const authResponse = await fetch(EBAY_AUTH_URL, {
      method: 'POST',
      headers: {
        // 关键：使用 Basic 认证头
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: authRequestBody.toString()
    });

    // 4. 解析认证响应
    const authData = await authResponse.json();

    // 5. 检查认证是否成功
    if (!authResponse.ok) {
      console.error('[eBay Search API] 获取访问令牌失败:', {
        status: authResponse.status,
        error: authData
      });

      return res.status(authResponse.status).json({
        success: false,
        error: 'Authentication failed',
        message: authData.error_description || '无法获取访问令牌',
        details: authData
      });
    }

    // 6. 提取访问令牌
    const accessToken = authData.access_token;

    if (!accessToken) {
      console.error('[eBay Search API] 响应中缺少 access_token');
      return res.status(500).json({
        success: false,
        error: 'Invalid authentication response',
        message: '认证成功但未返回访问令牌'
      });
    }

    console.log('[eBay Search API] ✓ 成功获取访问令牌:', {
      tokenType: authData.token_type,
      expiresIn: authData.expires_in,
      scope: authData.scope
    });

    // ========================================================================
    // 任务二：使用令牌搜索商品
    // ========================================================================
    console.log('[eBay Search API] 步骤 2/2: 开始搜索商品...');

    // 1. 构建搜索 API URL（带查询参数）
    const searchParams = new URLSearchParams({
      q: searchQuery,
      limit: req.query.limit || '10' // 默认返回 10 个商品
    });

    // 可选参数：排序方式
    if (req.query.sort) {
      searchParams.append('sort', req.query.sort);
    }

    // 可选参数：筛选条件（如价格范围、品牌等）
    if (req.query.filter) {
      searchParams.append('filter', req.query.filter);
    }

    const searchUrl = `${EBAY_BROWSE_API_URL}?${searchParams.toString()}`;

    console.log('[eBay Search API] 请求 URL:', searchUrl);

    // 2. 发起 GET 请求搜索商品
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        // 关键：使用 Bearer 令牌进行身份验证
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // 指定市场（美国站点）
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });

    // 3. 解析搜索响应
    const searchData = await searchResponse.json();

    // 4. 检查搜索是否成功
    if (!searchResponse.ok) {
      console.error('[eBay Search API] 搜索商品失败:', {
        status: searchResponse.status,
        error: searchData
      });

      return res.status(searchResponse.status).json({
        success: false,
        error: 'Search failed',
        message: searchData.errors?.[0]?.message || '商品搜索失败',
        details: searchData
      });
    }

    // ========================================================================
    // 第四步：返回搜索结果
    // ========================================================================
    console.log('[eBay Search API] ✓ 搜索成功:', {
      total: searchData.total,
      returned: searchData.itemSummaries?.length || 0,
      query: searchQuery
    });

    // 返回格式化的搜索结果
    return res.status(200).json({
      success: true,
      data: {
        // 搜索摘要
        summary: {
          query: searchQuery,
          totalResults: searchData.total || 0,
          returnedResults: searchData.itemSummaries?.length || 0,
          limit: searchData.limit,
          offset: searchData.offset || 0
        },

        // 商品列表
        items: (searchData.itemSummaries || []).map(item => ({
          itemId: item.itemId,
          title: item.title,
          price: item.price?.value,
          currency: item.price?.currency,
          condition: item.condition,
          image: item.image?.imageUrl,
          itemWebUrl: item.itemWebUrl,
          seller: {
            username: item.seller?.username,
            feedbackPercentage: item.seller?.feedbackPercentage
          }
        })),

        // 分页信息（如果有）
        pagination: searchData.next || searchData.prev ? {
          hasNext: !!searchData.next,
          hasPrev: !!searchData.prev,
          nextUrl: searchData.next,
          prevUrl: searchData.prev
        } : null,

        // 响应元数据
        metadata: {
          timestamp: new Date().toISOString(),
          marketplace: 'EBAY_US',
          tokenExpiration: authData.expires_in
        }
      }
    });

  } catch (error) {
    // ========================================================================
    // 全局错误处理
    // ========================================================================
    console.error('[eBay Search API] 处理请求时发生错误:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // 检查网络错误
    if (error.name === 'FetchError' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Network error',
        message: '无法连接到 eBay API 服务器，请稍后重试'
      });
    }

    // 返回通用错误
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '服务器内部错误',
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
 * 1. 基本搜索（搜索 iPhone）：
 *    GET https://your-domain.vercel.app/api/search-products?q=iphone
 *
 * 2. 限制返回数量（返回 20 个结果）：
 *    GET https://your-domain.vercel.app/api/search-products?q=laptop&limit=20
 *
 * 3. 按价格排序（从低到高）：
 *    GET https://your-domain.vercel.app/api/search-products?q=shoes&sort=price
 *
 * 4. 添加筛选条件（价格范围）：
 *    GET https://your-domain.vercel.app/api/search-products?q=camera&filter=price:[100..500]
 *
 * 5. 组合查询：
 *    GET https://your-domain.vercel.app/api/search-products?q=watch&limit=50&sort=price&filter=condition:{NEW}
 *
 * 成功响应示例：
 * {
 *   "success": true,
 *   "data": {
 *     "summary": {
 *       "query": "iphone",
 *       "totalResults": 50000,
 *       "returnedResults": 10
 *     },
 *     "items": [
 *       {
 *         "itemId": "v1|123456789012|0",
 *         "title": "Apple iPhone 15 Pro 128GB",
 *         "price": "999.00",
 *         "currency": "USD",
 *         "condition": "NEW",
 *         "image": "https://i.ebayimg.com/...",
 *         "itemWebUrl": "https://www.ebay.com/itm/...",
 *         "seller": {
 *           "username": "apple_store",
 *           "feedbackPercentage": "100.0"
 *         }
 *       }
 *     ]
 *   }
 * }
 *
 * 错误响应示例：
 * {
 *   "success": false,
 *   "error": "Missing query parameter",
 *   "message": "请提供搜索关键词，例如：?q=iphone"
 * }
 *
 * 环境变量配置（在 Vercel Dashboard 中添加）：
 * - EBAY_PROD_CLIENT_ID: 你的 eBay Client ID
 * - EBAY_PROD_CLIENT_SECRET: 你的 eBay Client Secret
 *
 * 注意事项：
 * 1. 应用访问令牌有效期约 2 小时（7200 秒）
 * 2. 令牌会在每次请求时重新获取（可优化：缓存令牌直到过期）
 * 3. API 请求有速率限制，请合理控制调用频率
 * 4. 此 API 只能访问公开商品数据，无法访问用户私人信息
 * 5. 生产环境建议实现令牌缓存机制以提高性能
 *
 * 性能优化建议：
 * - 使用 Redis 或内存缓存存储访问令牌
 * - 在令牌过期前 5 分钟提前刷新
 * - 实现请求重试机制
 * - 添加响应缓存（对于热门搜索词）
 */