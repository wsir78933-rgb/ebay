/**
 * eBay热门商品邮件推送API
 * 功能：获取eBay热门商品并通过RUBE MCP发送到指定邮箱
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[Hot Products Email] Starting hot products email push...');

  try {
    // 环境变量检查
    const EBAY_CLIENT_ID = process.env.EBAY_PROD_CLIENT_ID;
    const EBAY_CLIENT_SECRET = process.env.EBAY_PROD_CLIENT_SECRET;
    const RECIPIENT_EMAIL = req.query.email || process.env.RECIPIENT_EMAIL || '3277193856@qq.com';

    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Missing eBay credentials'
      });
    }

    // Step 1: 获取eBay访问令牌
    console.log('[Hot Products Email] Step 1: Getting eBay access token...');
    const accessToken = await getEbayAccessToken(EBAY_CLIENT_ID, EBAY_CLIENT_SECRET);

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get eBay access token'
      });
    }

    // Step 2: 获取热门商品
    console.log('[Hot Products Email] Step 2: Fetching hot products...');
    const hotProducts = await fetchHotProducts(accessToken);

    if (!hotProducts || hotProducts.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No hot products found'
      });
    }

    console.log('[Hot Products Email] Found', hotProducts.length, 'hot products');

    // Step 3: 通过RUBE MCP发送邮件
    console.log('[Hot Products Email] Step 3: Sending email via RUBE MCP...');
    const emailResult = await sendHotProductsEmail(hotProducts, RECIPIENT_EMAIL, req);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      recipient: RECIPIENT_EMAIL,
      hotProducts: {
        count: hotProducts.length,
        categories: [...new Set(hotProducts.map(p => p.category))],
        totalValue: hotProducts.reduce((sum, p) => sum + (parseFloat(p.price?.value) || 0), 0).toFixed(2)
      },
      emailResult,
      rubeIntegration: 'active'
    });

  } catch (error) {
    console.error('[Hot Products Email] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 获取eBay访问令牌
 */
async function getEbayAccessToken(clientId, clientSecret) {
  try {
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    const authResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope'
      })
    });

    if (!authResponse.ok) {
      throw new Error(`eBay auth failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    return authData.access_token;

  } catch (error) {
    console.error('[Hot Products Email] Auth error:', error);
    return null;
  }
}

/**
 * 获取eBay热门商品
 */
async function fetchHotProducts(accessToken) {
  try {
    // 热门搜索关键词列表
    const hotKeywords = [
      'iPhone 15',
      'MacBook Pro',
      'Samsung Galaxy',
      'Nintendo Switch',
      'PlayStation 5',
      'AirPods Pro',
      'iPad Pro',
      'Tesla Model Y',
      'Gaming Chair',
      'Smart Watch'
    ];

    // 随机选择2-3个关键词
    const selectedKeywords = hotKeywords
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 2) + 2);

    console.log('[Hot Products Email] Selected keywords:', selectedKeywords);

    const allProducts = [];

    // 为每个关键词获取热门商品
    for (const keyword of selectedKeywords) {
      const products = await searchProductsByKeyword(accessToken, keyword);
      if (products && products.length > 0) {
        // 只取每个关键词的前3个商品
        allProducts.push(...products.slice(0, 3).map(product => ({
          ...product,
          searchKeyword: keyword
        })));
      }
    }

    // 按价格和评分排序，选出最有趣的商品
    const sortedProducts = allProducts
      .filter(p => p.price && p.title)
      .sort((a, b) => {
        const scoreA = calculateProductScore(a);
        const scoreB = calculateProductScore(b);
        return scoreB - scoreA;
      })
      .slice(0, 8); // 最多8个商品

    return sortedProducts;

  } catch (error) {
    console.error('[Hot Products Email] Fetch products error:', error);
    return [];
  }
}

/**
 * 根据关键词搜索商品
 */
async function searchProductsByKeyword(accessToken, keyword) {
  try {
    const searchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword)}&limit=5&sort=newlyListed`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });

    if (!response.ok) {
      console.warn(`[Hot Products Email] Search failed for "${keyword}":`, response.status);
      return [];
    }

    const data = await response.json();
    return data.itemSummaries || [];

  } catch (error) {
    console.error(`[Hot Products Email] Search error for "${keyword}":`, error);
    return [];
  }
}

/**
 * 计算商品热度评分
 */
function calculateProductScore(product) {
  let score = 0;

  // 价格因子（价格越高，某种程度上越有趣）
  const price = parseFloat(product.price?.value) || 0;
  if (price > 100) score += 2;
  if (price > 500) score += 2;
  if (price > 1000) score += 3;

  // 标题长度因子（详细标题通常质量更好）
  if (product.title && product.title.length > 50) score += 2;

  // 图片因子
  if (product.image) score += 1;

  // 品牌因子（知名品牌加分）
  const title = product.title?.toLowerCase() || '';
  const premiumBrands = ['apple', 'samsung', 'sony', 'nintendo', 'tesla', 'microsoft', 'google'];
  if (premiumBrands.some(brand => title.includes(brand))) {
    score += 3;
  }

  // 新品因子
  if (product.condition === 'NEW') score += 2;

  return score;
}

/**
 * 通过RUBE MCP发送热门商品邮件
 */
async function sendHotProductsEmail(products, recipientEmail, req) {
  try {
    // 构造热门商品变化数据，适配现有的RUBE邮件API
    const hotProductsData = {
      hasChanges: true,
      hotProducts: products.map((product, index) => ({
        title: product.title,
        price: product.price?.value || 'N/A',
        currency: product.price?.currency || 'USD',
        image: product.image?.imageUrl,
        url: product.itemWebUrl,
        condition: product.condition,
        location: product.itemLocation?.country,
        category: product.categories?.[0]?.categoryName || product.searchKeyword,
        seller: product.seller?.username || 'Unknown',
        rank: index + 1
      })),
      // 为了兼容现有邮件模板，添加空的其他变化
      priceChanges: [],
      newListings: [],
      removedListings: [],
      titleChanges: [],
      imageChanges: [],
      ratingChanges: []
    };

    // 调用RUBE邮件API
    const rubeEmailUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/rube-email`
      : (req.headers.host ? `https://${req.headers.host}/api/rube-email` : '/api/rube-email');

    console.log('[Hot Products Email] Calling RUBE email API:', rubeEmailUrl);

    const response = await fetch(rubeEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changes: hotProductsData,
        emailType: 'hot_products_alert',
        recipients: [recipientEmail],
        priority: 'normal'
      })
    });

    if (!response.ok) {
      throw new Error(`RUBE Email API failed: ${response.status}`);
    }

    const result = await response.json();

    console.log('[Hot Products Email] RUBE email sent successfully');
    return {
      success: true,
      messageId: result.sendResult?.message_id,
      rubeSession: result.plan?.session_id,
      analytics: result.analysis?.metrics
    };

  } catch (error) {
    console.error('[Hot Products Email] Email sending failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}