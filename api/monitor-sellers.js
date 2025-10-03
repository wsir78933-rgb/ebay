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

    // 准备监控统计信息
    const monitoringStats = await getMonitoringStats(previousData);

    // 总是发送通知 - 有变化或无变化都通知
    console.log(`[Seller Monitor] Sending notification - Changes: ${changes.hasChanges ? 'Yes' : 'No'}`);

    const emailResult = await sendRubeEmailNotification(changes, monitoringStats);

    if (emailResult.success) {
      console.log('[Seller Monitor] RUBE MCP email sent successfully');
    } else {
      console.error('[Seller Monitor] RUBE MCP email failed:', emailResult.error);
    }

    // 保存变化历史记录
    await saveChangeHistory(changes, monitoringStats);

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

/**
 * 保存变化历史记录
 */
async function saveChangeHistory(changes, monitoringStats) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // 计算变化摘要
    const changesSummary = {
      hasChanges: changes.hasChanges,
      totalChanges: (changes.priceChanges?.length || 0) +
                   (changes.newListings?.length || 0) +
                   (changes.removedListings?.length || 0) +
                   (changes.titleChanges?.length || 0) +
                   (changes.imageChanges?.length || 0) +
                   (changes.ratingChanges?.length || 0),
      priceChanges: changes.priceChanges?.length || 0,
      newListings: changes.newListings?.length || 0,
      removedListings: changes.removedListings?.length || 0,
      titleChanges: changes.titleChanges?.length || 0,
      imageChanges: changes.imageChanges?.length || 0,
      ratingChanges: changes.ratingChanges?.length || 0
    };

    const { error } = await supabase
      .from('seller_monitor_history')
      .insert({
        changes_summary: changesSummary,
        monitoring_day: monitoringStats.monitoringDays,
        total_checks: monitoringStats.totalChecks,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[History] Failed to save change history:', error);
    } else {
      console.log('[History] Change history saved successfully');
    }

  } catch (error) {
    console.error('[History] Failed to save change history:', error.message);
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
 * 获取监控统计信息
 */
async function getMonitoringStats(previousData) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // 获取监控开始时间
    const { data: metaData, error: metaError } = await supabase
      .from('seller_monitor_meta')
      .select('start_date, total_checks')
      .eq('id', 1)
      .single();

    let monitoringDays = 0;
    let totalChecks = 0;
    const currentTime = new Date();

    if (metaError && metaError.code === 'PGRST116') {
      // 首次运行，创建元数据
      const { error: insertError } = await supabase
        .from('seller_monitor_meta')
        .insert({
          id: 1,
          start_date: currentTime.toISOString(),
          total_checks: 1
        });

      if (!insertError) {
        console.log('[Stats] Created monitoring metadata');
      }
      monitoringDays = 0;
      totalChecks = 1;
    } else if (!metaError && metaData) {
      // 计算监控天数
      const startDate = new Date(metaData.start_date);
      monitoringDays = Math.floor((currentTime - startDate) / (1000 * 60 * 60 * 24));
      totalChecks = (metaData.total_checks || 0) + 1;

      // 更新检查次数
      await supabase
        .from('seller_monitor_meta')
        .update({ total_checks: totalChecks })
        .eq('id', 1);
    }

    // 获取过去7天的变化历史
    const sevenDaysAgo = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: historyData } = await supabase
      .from('seller_monitor_history')
      .select('changes_summary, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // 计算过去7天的变化统计
    let recentStats = {
      totalChanges: 0,
      priceChanges: 0,
      newListings: 0,
      removedListings: 0
    };

    if (historyData) {
      historyData.forEach(record => {
        if (record.changes_summary) {
          recentStats.totalChanges += record.changes_summary.totalChanges || 0;
          recentStats.priceChanges += record.changes_summary.priceChanges || 0;
          recentStats.newListings += record.changes_summary.newListings || 0;
          recentStats.removedListings += record.changes_summary.removedListings || 0;
        }
      });
    }

    return {
      monitoringDays,
      totalChecks,
      recentStats,
      lastCheckTime: currentTime.toISOString()
    };

  } catch (error) {
    console.error('[Stats] Failed to get monitoring stats:', error);
    return {
      monitoringDays: 0,
      totalChecks: 1,
      recentStats: { totalChanges: 0, priceChanges: 0, newListings: 0, removedListings: 0 },
      lastCheckTime: new Date().toISOString()
    };
  }
}

/**
 * 使用RUBE MCP发送智能邮件通知
 */
async function sendRubeEmailNotification(changes, monitoringStats) {
  try {
    console.log('[RUBE Email] Sending intelligent email notification...');

    // 调用RUBE MCP邮件API - 使用生产环境固定URL
    const rubeEmailUrl = 'https://ebaywebhook-one.vercel.app/api/rube-email';

    const response = await fetch(rubeEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changes,
        monitoringStats,
        emailType: changes.hasChanges ? 'seller_monitor_alert' : 'seller_monitor_status',
        recipients: ['3277193856@qq.com'],
        priority: changes.hasChanges ? 'normal' : 'info'
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