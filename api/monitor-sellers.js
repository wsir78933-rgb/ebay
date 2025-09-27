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
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || '3277193856@qq.com';

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

      if (GMAIL_USER && GMAIL_APP_PASSWORD) {
        const emailSent = await sendEmailNotification(
          changes,
          GMAIL_USER,
          GMAIL_APP_PASSWORD,
          RECIPIENT_EMAIL
        );

        if (emailSent) {
          console.log('[Seller Monitor] Email notification sent');
        }
      } else {
        console.log('[Seller Monitor] Gmail credentials not configured, skipping email');
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

async function sendEmailNotification(changes, gmailUser, gmailPassword, recipient) {
  try {
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.default.createTransporter({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    const emailContent = generateEmailContent(changes);

    await transporter.sendMail({
      from: gmailUser,
      to: recipient,
      subject: `🔔 eBay卖家监控警报 - 检测到${changes.priceChanges.length + changes.newListings.length + changes.removedListings.length}项变化`,
      html: emailContent
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send notification:', error);
    return false;
  }
}

function generateEmailContent(changes) {
  let html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
        .section { background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 15px 0; }
        .section-title { color: #667eea; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .item { background: white; padding: 10px; margin: 8px 0; border-left: 3px solid #667eea; }
        .price-up { color: #dc3545; font-weight: bold; }
        .price-down { color: #28a745; font-weight: bold; }
        .new-badge { background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .removed-badge { background: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        a { color: #667eea; text-decoration: none; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 eBay 卖家监控警报</h1>
          <p>监控时间: ${new Date().toLocaleString('zh-CN')}</p>
          <p>监控卖家: cellfc, electronicdea1s</p>
        </div>
  `;

  if (changes.priceChanges.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">💰 价格变化 (${changes.priceChanges.length}项)</div>
    `;
    for (const change of changes.priceChanges) {
      const priceClass = change.change > 0 ? 'price-up' : 'price-down';
      const emoji = change.change > 0 ? '📈' : '📉';
      html += `
        <div class="item">
          <strong>${emoji} ${change.title}</strong><br>
          <span style="color: #666;">卖家: ${change.seller}</span><br>
          旧价格: $${change.oldPrice} → 新价格: <span class="${priceClass}">$${change.newPrice}</span><br>
          变化: <span class="${priceClass}">${change.change > 0 ? '+' : ''}$${change.change.toFixed(2)} (${change.percentChange}%)</span><br>
          <a href="${change.url}" target="_blank">查看商品</a>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (changes.newListings.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">🆕 新增商品 (${changes.newListings.length}项)</div>
    `;
    for (const item of changes.newListings) {
      html += `
        <div class="item">
          <span class="new-badge">新品</span>
          <strong>${item.title}</strong><br>
          <span style="color: #666;">卖家: ${item.seller}</span><br>
          价格: <strong>$${item.price}</strong><br>
          <a href="${item.url}" target="_blank">查看商品</a>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (changes.removedListings.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">❌ 下架商品 (${changes.removedListings.length}项)</div>
    `;
    for (const item of changes.removedListings) {
      html += `
        <div class="item">
          <span class="removed-badge">已下架</span>
          <strong>${item.title}</strong><br>
          <span style="color: #666;">卖家: ${item.seller}</span><br>
          原价格: $${item.price}
        </div>
      `;
    }
    html += `</div>`;
  }

  if (changes.titleChanges.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">✏️ 标题修改 (${changes.titleChanges.length}项)</div>
    `;
    for (const change of changes.titleChanges) {
      html += `
        <div class="item">
          <span style="color: #666;">卖家: ${change.seller}</span><br>
          旧标题: <s>${change.oldTitle}</s><br>
          新标题: <strong>${change.newTitle}</strong><br>
          <a href="${change.url}" target="_blank">查看商品</a>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (changes.imageChanges.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">🖼️ 图片修改 (${changes.imageChanges.length}项)</div>
    `;
    for (const change of changes.imageChanges) {
      html += `
        <div class="item">
          <strong>${change.title}</strong><br>
          <span style="color: #666;">卖家: ${change.seller}</span><br>
          图片已更新<br>
          <a href="${change.url}" target="_blank">查看商品</a>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (changes.ratingChanges.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">⭐ 卖家评分变化 (${changes.ratingChanges.length}项)</div>
    `;
    for (const change of changes.ratingChanges) {
      html += `
        <div class="item">
          卖家: <strong>${change.seller}</strong><br>
          旧评分: ${change.oldRating}% → 新评分: <strong>${change.newRating}%</strong><br>
          变化: ${change.change > 0 ? '+' : ''}${change.change}%
        </div>
      `;
    }
    html += `</div>`;
  }

  html += `
        <div class="footer">
          🤖 这是一个自动监控警报，由 eBay Seller Monitor 生成<br>
          📧 监控频率: 每2小时<br>
          💡 只在检测到变化时发送通知
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}