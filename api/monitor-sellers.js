export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[Seller Monitor] Starting monitoring cycle...');

  try {
    const EBAY_CLIENT_ID = process.env.EBAY_PROD_CLIENT_ID;
    const EBAY_CLIENT_SECRET = process.env.EBAY_PROD_CLIENT_SECRET;

    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Missing eBay credentials'
      });
    }

    const sellers = ['cellfc', 'electronicdea1s'];
    const searchQuery = 'iphone';

    const accessToken = await getEbayAccessToken(EBAY_CLIENT_ID, EBAY_CLIENT_SECRET);
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get eBay access token'
      });
    }

    const currentData = await fetchSellersProducts(accessToken, sellers, searchQuery);

    const previousData = await getPreviousData();

    const changes = detectChanges(previousData, currentData);

    if (changes.hasChanges) {
      console.log('[Seller Monitor] Changes detected:', changes);

      // 使用RUBE MCP智能邮件系统发送通知
      const emailResult = await sendRubeEmailNotification(changes);

      if (emailResult.success) {
        console.log('[Seller Monitor] RUBE MCP email sent successfully');
      } else {
        console.error('[Seller Monitor] RUBE MCP email failed:', emailResult.error);
      }
    } else {
      console.log('[Seller Monitor] No significant changes detected');
    }

    await savePreviousData(currentData);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      hasChanges: changes.hasChanges,
      changes: changes.hasChanges ? changes : undefined,
      summary: {
        totalProducts: currentData.products.length,
        sellers: sellers,
        monitoredMetrics: ['price', 'listing', 'title', 'image', 'rating']
      }
    });

  } catch (error) {
    console.error('[Seller Monitor] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

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

    const data = await authResponse.json();
    return data.access_token;
  } catch (error) {
    console.error('[Token] Failed to get access token:', error);
    return null;
  }
}

async function fetchSellersProducts(accessToken, sellers, searchQuery) {
  const products = [];

  for (const seller of sellers) {
    try {
      const searchUrl = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
      searchUrl.searchParams.append('q', searchQuery);
      searchUrl.searchParams.append('limit', '50');
      searchUrl.searchParams.append('filter', `seller:{${seller}}`);

      const response = await fetch(searchUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });

      const data = await response.json();
      const items = data.itemSummaries || [];

      console.log(`[Seller Monitor] Found ${items.length} products for seller ${seller}`);

      for (const item of items) {
        products.push({
          itemId: item.itemId,
          seller: seller,
          title: item.title,
          price: item.price?.value,
          currency: item.price?.currency,
          image: item.image?.imageUrl,
          condition: item.condition,
          itemWebUrl: item.itemWebUrl,
          sellerFeedbackScore: item.seller?.feedbackScore,
          sellerFeedbackPercentage: item.seller?.feedbackPercentage
        });
      }
    } catch (error) {
      console.error(`[Seller Monitor] Error fetching products for ${seller}:`, error);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    products: products
  };
}

async function getPreviousData() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('seller_monitor')
      .select('data')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[Storage] No previous data found');
        return { timestamp: null, products: [] };
      }
      throw error;
    }

    return data?.data || { timestamp: null, products: [] };
  } catch (error) {
    console.log('[Storage] No previous data or Supabase not configured:', error.message);
    return { timestamp: null, products: [] };
  }
}

async function savePreviousData(currentData) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('seller_monitor')
      .upsert({
        id: 1,
        data: currentData,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log('[Storage] Data saved successfully');
  } catch (error) {
    console.error('[Storage] Failed to save data:', error.message);
  }
}

function detectChanges(previousData, currentData) {
  const changes = {
    hasChanges: false,
    priceChanges: [],
    newListings: [],
    removedListings: [],
    titleChanges: [],
    imageChanges: [],
    ratingChanges: []
  };

  const prevProductsMap = new Map(
    previousData.products.map(p => [p.itemId, p])
  );

  const currentProductsMap = new Map(
    currentData.products.map(p => [p.itemId, p])
  );

  for (const [itemId, currentProduct] of currentProductsMap) {
    const prevProduct = prevProductsMap.get(itemId);

    if (!prevProduct) {
      changes.newListings.push({
        itemId: currentProduct.itemId,
        seller: currentProduct.seller,
        title: currentProduct.title,
        price: currentProduct.price,
        url: currentProduct.itemWebUrl
      });
      changes.hasChanges = true;
    } else {
      if (prevProduct.price !== currentProduct.price) {
        const priceChange = currentProduct.price - prevProduct.price;
        const percentChange = ((priceChange / prevProduct.price) * 100).toFixed(2);

        changes.priceChanges.push({
          itemId: currentProduct.itemId,
          seller: currentProduct.seller,
          title: currentProduct.title,
          oldPrice: prevProduct.price,
          newPrice: currentProduct.price,
          change: priceChange,
          percentChange: percentChange,
          url: currentProduct.itemWebUrl
        });
        changes.hasChanges = true;
      }

      if (prevProduct.title !== currentProduct.title) {
        changes.titleChanges.push({
          itemId: currentProduct.itemId,
          seller: currentProduct.seller,
          oldTitle: prevProduct.title,
          newTitle: currentProduct.title,
          url: currentProduct.itemWebUrl
        });
        changes.hasChanges = true;
      }

      if (prevProduct.image !== currentProduct.image) {
        changes.imageChanges.push({
          itemId: currentProduct.itemId,
          seller: currentProduct.seller,
          title: currentProduct.title,
          oldImage: prevProduct.image,
          newImage: currentProduct.image,
          url: currentProduct.itemWebUrl
        });
        changes.hasChanges = true;
      }

      if (prevProduct.sellerFeedbackPercentage !== currentProduct.sellerFeedbackPercentage) {
        changes.ratingChanges.push({
          seller: currentProduct.seller,
          oldRating: prevProduct.sellerFeedbackPercentage,
          newRating: currentProduct.sellerFeedbackPercentage,
          change: (currentProduct.sellerFeedbackPercentage - prevProduct.sellerFeedbackPercentage).toFixed(2)
        });
        changes.hasChanges = true;
      }
    }
  }

  for (const [itemId, prevProduct] of prevProductsMap) {
    if (!currentProductsMap.has(itemId)) {
      changes.removedListings.push({
        itemId: prevProduct.itemId,
        seller: prevProduct.seller,
        title: prevProduct.title,
        price: prevProduct.price
      });
      changes.hasChanges = true;
    }
  }

  return changes;
}

/**
 * 使用RUBE MCP发送智能邮件通知
 */
async function sendRubeEmailNotification(changes) {
  try {
    console.log('[RUBE Email] Sending intelligent email notification...');

    // 调用RUBE MCP邮件API
    const rubeEmailUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/rube-email`
      : '/api/rube-email';

    const response = await fetch(rubeEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changes,
        emailType: 'seller_monitor_alert',
        recipients: ['3277193856@qq.com'],
        priority: 'normal'
      })
    });

    if (!response.ok) {
      throw new Error(`RUBE Email API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('[RUBE Email] Email sent via RUBE MCP:', result.sendResult?.message_id);
      return {
        success: true,
        messageId: result.sendResult?.message_id,
        analytics: result.analysis?.metrics,
        rubeIntegration: true
      };
    } else {
      throw new Error(result.error || 'RUBE MCP email failed');
    }

  } catch (error) {
    console.error('[RUBE Email] Failed to send notification:', error);
    return {
      success: false,
      error: error.message,
      rubeIntegration: false
    };
  }
}