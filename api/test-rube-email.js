/**
 * RUBE MCP 邮件功能测试
 * 用于验证RUBE MCP智能邮件集成是否正常工作
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[RUBE Email Test] Starting test...');

  try {
    // 创建测试用的卖家变化数据
    const testChanges = {
      hasChanges: true,
      priceChanges: [
        {
          title: 'iPhone 15 Pro Max 256GB Natural Titanium',
          seller: 'cellfc',
          oldPrice: 1199.99,
          newPrice: 1149.99,
          change: -50.00,
          percentChange: '-4.17',
          url: 'https://www.ebay.com/itm/test123'
        },
        {
          title: 'Samsung Galaxy S24 Ultra 512GB Titanium Black',
          seller: 'electronicdea1s',
          oldPrice: 1399.99,
          newPrice: 1299.99,
          change: -100.00,
          percentChange: '-7.14',
          url: 'https://www.ebay.com/itm/test456'
        }
      ],
      newListings: [
        {
          title: 'MacBook Pro 16" M3 Pro 18GB 512GB Space Black',
          seller: 'cellfc',
          price: 2499.99,
          url: 'https://www.ebay.com/itm/test789'
        }
      ],
      removedListings: [
        {
          title: 'iPad Pro 12.9" 2022 256GB Silver',
          seller: 'electronicdea1s',
          price: 999.99
        }
      ],
      titleChanges: [],
      imageChanges: [],
      ratingChanges: []
    };

    console.log('[RUBE Email Test] Test data created:', {
      priceChanges: testChanges.priceChanges.length,
      newListings: testChanges.newListings.length,
      removedListings: testChanges.removedListings.length
    });

    // 调用RUBE邮件API
    const rubeEmailUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/rube-email`
      : (req.headers.host ? `https://${req.headers.host}/api/rube-email` : '/api/rube-email');

    console.log('[RUBE Email Test] Calling RUBE email API:', rubeEmailUrl);

    const rubeResponse = await fetch(rubeEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changes: testChanges,
        emailType: 'seller_monitor_alert_test',
        recipients: ['test@example.com'],
        priority: 'high'
      })
    });

    if (!rubeResponse.ok) {
      throw new Error(`RUBE Email API failed: ${rubeResponse.status} ${rubeResponse.statusText}`);
    }

    const rubeResult = await rubeResponse.json();

    console.log('[RUBE Email Test] RUBE API response received');

    // 验证响应结构
    const validationResults = validateRubeResponse(rubeResult);

    return res.status(200).json({
      success: true,
      testType: 'RUBE MCP Email Integration Test',
      timestamp: new Date().toISOString(),
      testData: {
        priceChanges: testChanges.priceChanges.length,
        newListings: testChanges.newListings.length,
        removedListings: testChanges.removedListings.length,
        totalChanges: testChanges.priceChanges.length + testChanges.newListings.length + testChanges.removedListings.length
      },
      rubeResponse: rubeResult,
      validation: validationResults,
      testResults: {
        rubeIntegration: rubeResult.success ? '✅ 通过' : '❌ 失败',
        emailGeneration: rubeResult.rubeIntegration === 'active' ? '✅ 通过' : '❌ 失败',
        intelligentContent: rubeResult.analysis?.metrics?.ai_content_generated ? '✅ 通过' : '❌ 失败',
        analytics: rubeResult.analysis ? '✅ 通过' : '❌ 失败'
      }
    });

  } catch (error) {
    console.error('[RUBE Email Test] Test failed:', error);
    return res.status(500).json({
      success: false,
      testType: 'RUBE MCP Email Integration Test',
      error: error.message,
      timestamp: new Date().toISOString(),
      testStatus: '❌ 测试失败'
    });
  }
}

/**
 * 验证RUBE响应结构
 */
function validateRubeResponse(response) {
  const validations = {
    basicStructure: false,
    rubeIntegration: false,
    emailTools: false,
    connectionStatus: false,
    planCreation: false,
    sendResult: false,
    analysis: false
  };

  try {
    // 验证基本结构
    if (response && typeof response === 'object') {
      validations.basicStructure = true;
    }

    // 验证RUBE集成状态
    if (response.rubeIntegration === 'active') {
      validations.rubeIntegration = true;
    }

    // 验证邮件工具发现
    if (response.tools && Array.isArray(response.tools) && response.tools.length > 0) {
      validations.emailTools = true;
    }

    // 验证连接状态
    if (response.connection) {
      validations.connectionStatus = true;
    }

    // 验证计划创建
    if (response.plan && response.plan.workflow_steps) {
      validations.planCreation = true;
    }

    // 验证发送结果
    if (response.sendResult && response.sendResult.success) {
      validations.sendResult = true;
    }

    // 验证分析结果
    if (response.analysis && response.analysis.metrics) {
      validations.analysis = true;
    }

  } catch (error) {
    console.error('[RUBE Email Test] Validation error:', error);
  }

  return {
    ...validations,
    overallScore: Object.values(validations).filter(Boolean).length,
    totalTests: Object.keys(validations).length,
    passRate: Math.round((Object.values(validations).filter(Boolean).length / Object.keys(validations).length) * 100)
  };
}