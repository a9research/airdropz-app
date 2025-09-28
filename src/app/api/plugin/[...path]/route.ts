import { NextRequest, NextResponse } from 'next/server';


// 处理插件API请求
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams.path || [];
  
  if (pathSegments.length < 2) {
    return NextResponse.json({ error: 'Invalid plugin path' }, { status: 400 });
  }
  
  const [pluginName, ...apiPath] = pathSegments;
  
  // 根据插件名称路由到相应的处理器
  switch (pluginName) {
    case 'gaea':
      return handleGaeaRequest(request, 'GET', apiPath);
    default:
      return NextResponse.json({ error: `Unknown plugin: ${pluginName}` }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    
    console.log('🔍 POST请求路径解析:', { pathSegments, url: request.url });
    
    if (pathSegments.length < 2) {
      return NextResponse.json({ error: 'Invalid plugin path' }, { status: 400 });
    }
    
    const [pluginName, ...apiPath] = pathSegments;
    console.log('🔍 解析结果:', { pluginName, apiPath });
    
    // 根据插件名称路由到相应的处理器
    switch (pluginName) {
      case 'gaea':
        return handleGaeaRequest(request, 'POST', apiPath);
      default:
        return NextResponse.json({ error: `Unknown plugin: ${pluginName}` }, { status: 404 });
    }
  } catch (error: any) {
    console.error('❌ POST请求处理失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 处理Gaea插件请求
async function handleGaeaRequest(request: NextRequest, method: string, apiPath: string[]) {
  const endpoint = apiPath[0];
  
  switch (endpoint) {
    case 'accounts':
      return handleAccountsRequest(request, method, apiPath);
    case 'groups':
      return handleGroupsRequest(request, method);
    case 'selection-state':
      return handleSelectionStateRequest(request, method);
    case 'batch-operation':
      return handleBatchOperationRequest(request, method);
    case 'login':
      return handleLoginRequest(request, method);
    case 'tickets':
      return handleTicketsRequest(request, method, apiPath);
    case 'proxy-request':
      return handleProxyRequest(request, method);
    case 'decisions':
      return handleDecisionsRequest(request, method, apiPath);
    case 'training':
      return handleTrainingRequest(request, method, apiPath);
    case 'reward':
      return handleRewardRequest(request, method, apiPath);
    case 'mining':
      return handleMiningRequest(request, method, apiPath);
    default:
      return NextResponse.json({ error: `Unknown Gaea endpoint: ${endpoint}` }, { status: 404 });
  }
}

// 处理账号请求
async function handleAccountsRequest(request: NextRequest, method: string, apiPath: string[]) {
  if (method === 'GET') {
    // 如果有ID参数，处理单个账号请求
    if (apiPath.length > 1) {
      const accountId = apiPath[1];
      console.log('🔍 处理单个账号请求:', accountId);
      
      // 服务端无法直接访问客户端数据库，返回错误让客户端处理
      console.log('❌ 服务端无法获取账号信息，返回错误让客户端处理');
      return NextResponse.json({ 
        success: false, 
        error: '服务端无法获取账号信息，请使用客户端API' 
      }, { status: 500 });
    }
    
    // 返回空列表，实际数据由前端从PouchDB获取
    return NextResponse.json({
      success: true,
      data: []
    });
  }
  
  return NextResponse.json({ error: `Method ${method} not supported for accounts` }, { status: 405 });
}

// 处理分组请求
async function handleGroupsRequest(request: NextRequest, method: string) {
  if (method === 'GET') {
    // 返回空列表，实际数据由前端从PouchDB获取
    return NextResponse.json({
      success: true,
      data: []
    });
  }
  
  return NextResponse.json({ error: `Method ${method} not supported for groups` }, { status: 405 });
}

// 处理选择状态请求
async function handleSelectionStateRequest(request: NextRequest, method: string) {
  if (method === 'GET') {
    return NextResponse.json({
      success: true,
      data: {
        selectedAccounts: [],
        selectedGroups: []
      }
    });
  }
  
  return NextResponse.json({ error: `Method ${method} not supported for selection-state` }, { status: 405 });
}

// 处理批量操作请求
async function handleBatchOperationRequest(request: NextRequest, method: string) {
  if (method === 'POST') {
    const body = await request.json();
    const { operation, accounts, groups } = body;
    
    return NextResponse.json({
      success: true,
      data: {
        operation,
        processed: accounts?.length || 0,
        message: '批量操作完成'
      }
    });
  }
  
  return NextResponse.json({ error: `Method ${method} not supported for batch-operation` }, { status: 405 });
}

// 处理登录请求 - 直接使用Gaea登录服务
async function handleLoginRequest(request: NextRequest, method: string) {
  if (method === 'POST') {
    try {
      const body = await request.json();
      const { username, password, proxy } = body;

      if (!username || !password) {
        return NextResponse.json({
          success: false,
          error: '缺少用户名或密码'
        }, { status: 400 });
      }

      // 直接导入并使用Gaea登录服务
      console.log('🔗 使用Gaea登录服务...');
      console.log('📋 登录信息:', { username, hasPassword: !!password, proxy: proxy ? '已配置' : '未配置' });
      console.log('📋 密码长度:', password ? password.length : 0);
      
      try {
        // 动态导入Gaea登录服务
        const { GaeaLoginService } = await import('../../../../../plugins/gaea/ui/api/login/route');
        
        const loginService = new GaeaLoginService();
        const result = await loginService.login({ username, password, proxy });
        
        console.log('✅ Gaea登录服务返回结果:', result);
        return NextResponse.json(result);
        
      } catch (serviceError: any) {
        console.error('❌ Gaea登录服务调用失败:', serviceError.message);
        console.error('❌ 错误详情:', serviceError);
        return NextResponse.json({
          success: false,
          error: `Gaea登录失败: ${serviceError.message}`
        }, { status: 500 });
      }
      
    } catch (error: any) {
      console.error('Gaea登录失败:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : '登录过程中发生未知错误'
      }, { status: 500 });
    }
  }
  
  return NextResponse.json(
    { success: false, error: `Method ${method} not supported for login` },
    { status: 405 }
  );
}

// 处理Tickets请求
async function handleTicketsRequest(request: NextRequest, method: string, apiPath: string[]) {
  const subEndpoint = apiPath[1];
  
  if (subEndpoint === 'query') {
    if (method === 'POST') {
      try {
        // 动态导入Tickets查询服务
        const { POST: ticketsQueryHandler } = await import('../../../../../plugins/gaea/ui/api/tickets/query/route');
        return await ticketsQueryHandler(request);
      } catch (error: any) {
        console.error('❌ Tickets查询服务调用失败:', error.message);
        return NextResponse.json({
          success: false,
          error: `Tickets查询失败: ${error.message}`
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: `Method ${method} not supported for tickets/query` }, { status: 405 });
  }
  
  return NextResponse.json({ error: `Unknown tickets endpoint: ${subEndpoint}` }, { status: 404 });
}

// 处理代理请求
async function handleProxyRequest(request: NextRequest, method: string) {
  if (method === 'POST') {
    try {
      // 动态导入代理请求服务
      const { POST: proxyRequestHandler } = await import('../../../../../plugins/gaea/ui/api/proxy-request/route');
      return await proxyRequestHandler(request);
    } catch (error: any) {
      console.error('❌ 代理请求服务调用失败:', error.message);
      return NextResponse.json({
        success: false,
        error: `代理请求失败: ${error.message}`
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({ error: `Method ${method} not supported for proxy-request` }, { status: 405 });
}

// 处理决策请求
async function handleDecisionsRequest(request: NextRequest, method: string, apiPath: string[]) {
  if (method === 'POST' && apiPath[1] === 'submit') {
    let accountId: string, accountName: string, token: string, ticket: string, detail: string;
    
    try {
      const requestData = await request.json();
      accountId = requestData.accountId;
      accountName = requestData.accountName;
      token = requestData.token;
      ticket = requestData.ticket;
      detail = requestData.detail;
      const proxyUrl = requestData.proxy; // 从请求中获取代理信息
      
      console.log('🔍 决策提交请求参数检查:');
      console.log('  👤 账号:', accountName, `(${accountId})`);
      console.log('  🎯 决策参数:', detail);
      console.log('  🎫 使用Ticket:', ticket);
      console.log('  🌐 代理配置:', proxyUrl || '无代理');

      if (!accountId || !accountName || !token || !ticket || !detail) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数' },
          { status: 400 }
        );
      }

      // 使用axios进行请求，与tickets接口保持一致
      const axios = (await import('axios')).default;
      
      // 配置axios请求
      const axiosConfig: any = {
        method: 'POST',
        url: 'https://api.aigaea.net/api/choice/complete',
        headers: {
          'accept': 'application/json',
          'accept-language': 'en-US',
          'authorization': `Bearer ${token}`,
          'content-type': 'application/json',
          'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'Referer': 'https://app.aigaea.net/',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        data: {
          chain_id: 8453,
          ticket: ticket,
          detail: detail
        }
      };

      // 如果配置了代理，添加代理设置
      if (proxyUrl) {
          try {
            const proxy = new URL(proxyUrl);
            axiosConfig.proxy = {
              protocol: 'http',
              host: proxy.hostname,
              port: parseInt(proxy.port),
              auth: {
                username: proxy.username,
                password: proxy.password
              }
            };
            console.log('🌐 使用代理访问Gaea决策API:', proxyUrl);
          } catch (proxyError) {
            console.warn('⚠️ 代理配置无效:', proxyError);
          }
        } else {
          console.log('🌐 直接访问Gaea决策API（无代理）');
        }
      
      // 输出请求详情
      console.log(`📋 账号 ${accountName} 决策提交请求详情:`);
      console.log('  👤 账号:', accountName, `(${accountId})`);
      console.log('  🎯 决策参数:', detail);
      console.log('  🎫 使用Ticket:', ticket);
      console.log('  🔗 请求URL:', axiosConfig.url);
      console.log('  📦 请求数据:', JSON.stringify(axiosConfig.data, null, 2));
      console.log('  🔐 认证Token:', token.substring(0, 20) + '...');
      
      const response = await axios(axiosConfig);

      const result = response.data;
      
      // 输出响应详情
      console.log(`📥 账号 ${accountName} 决策提交响应详情:`);
      console.log('  📊 响应状态:', response.status);
      console.log('  📄 响应数据:', JSON.stringify(result, null, 2));
      console.log('  ⏱️ 响应时间:', new Date().toISOString());
      
      if (response.status === 200 && result.success) {
        console.log(`✅ 账号 ${accountName} 决策提交成功，结果:`, result);
        
        return NextResponse.json({
          success: true,
          data: result,
          message: '决策提交成功'
        });
      } else {
        // 检查是否是"已完成"的情况
        const errorMsg = result.msg || result.message || '';
        if (errorMsg.includes('completed') || errorMsg.includes('已完成') || errorMsg.includes('Deepdecision has been completed')) {
          console.log(`✅ 账号 ${accountName} 决策已完成，标记为已提交`);
          return NextResponse.json({
            success: true,
            data: result,
            message: '决策已完成'
          });
        }
        
        console.log(`❌ 账号 ${accountName} 决策提交失败:`, result.msg || '决策提交失败');
        return NextResponse.json({
          success: false,
          error: result.msg || '决策提交失败',
          data: result
        }, { status: response.status });
      }
    } catch (error: any) {
      console.error(`❌ 账号 ${accountName} 决策提交错误详情:`);
      console.error('  👤 账号:', accountName || 'Unknown', `(${accountId || 'Unknown'})`);
      console.error('  🎯 决策参数:', detail || 'Unknown');
      console.error('  🎫 使用Ticket:', ticket || 'Unknown');
      console.error('  ❌ 错误类型:', error.name || 'Unknown');
      console.error('  📝 错误消息:', error.message);
      
      // 动态导入axios来检查错误类型
      try {
        const axios = (await import('axios')).default;
        if (axios.isAxiosError && axios.isAxiosError(error)) {
          console.error('  📊 HTTP状态:', error.response?.status);
          console.error('  📄 响应数据:', error.response?.data);
          console.error('  🔗 请求URL:', error.config?.url);
          
          // 如果是401错误，返回401状态码，让gaeaApiService处理重新登录
          if (error.response?.status === 401) {
            console.log('🔑 收到401错误，返回401状态码让客户端处理自动重新登录');
            return NextResponse.json(
              { success: false, error: 'Token已过期，需要重新登录', tokenExpired: true },
              { status: 401 }
            );
          }
        }
      } catch (axiosImportError) {
        console.error('  ⚠️ 无法导入axios检查错误类型');
      }
      
      console.error('  ⏱️ 错误时间:', new Date().toISOString());
      
      return NextResponse.json(
        { success: false, error: '决策提交失败' },
        { status: 500 }
      );
    }
  }
  
  return NextResponse.json({ error: `Method ${method} not supported for decisions` }, { status: 405 });
}

// 处理训练请求
async function handleTrainingRequest(request: NextRequest, method: string, apiPath: string[]) {
  if (method === 'POST') {
    const action = apiPath[1]; // daily-reward, training, deep-training, claim
    
    let accountId: string, accountName: string, token: string, proxyUrl: string;
    
    try {
      const requestData = await request.json();
      console.log('📥 接收到的原始请求数据:', requestData);
      console.log('📥 数据类型:', typeof requestData);
      console.log('📥 数据键:', Object.keys(requestData));
      
      accountId = requestData.accountId;
      accountName = requestData.accountName;
      token = requestData.token;
      proxyUrl = requestData.proxy;
      
      console.log('🔍 解析后的变量:');
      console.log('  accountId:', accountId, typeof accountId);
      console.log('  accountName:', accountName, typeof accountName);
      console.log('  token:', token ? '有token' : '无token', typeof token);
      console.log('  proxyUrl:', proxyUrl, typeof proxyUrl);
      
      console.log(`🔍 训练${action}请求参数检查:`);
      console.log('  👤 账号:', accountName, `(${accountId})`);
      console.log('  🌐 代理配置:', proxyUrl || '无代理');
      console.log('  🔑 Token:', token ? '有token' : '无token');

      if (!accountId || !accountName || !token) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数' },
          { status: 400 }
        );
      }

      // 使用axios进行请求
      const axios = (await import('axios')).default;
      
      let axiosConfig: any;
      
      switch (action) {
        case 'daily-reward':
          return await handleDailyReward(axios, token, proxyUrl, accountName);
        case 'training':
          return await handleTraining(axios, token, proxyUrl, requestData, accountName);
        case 'deep-training':
          return await handleDeepTraining(axios, token, proxyUrl, requestData, accountName);
        case 'claim':
          return await handleClaim(axios, token, proxyUrl, accountName);
        default:
          return NextResponse.json({ error: `Unknown training action: ${action}` }, { status: 404 });
      }
      
    } catch (error: any) {
      console.error(`❌ 账号 ${accountName} 训练${action}错误详情:`);
      console.error('  📋 请求参数:', { accountId, accountName, action });
      console.error('  🔍 错误信息:', error.name, error.message);
      console.error('  📡 响应状态:', error.response?.status);
      console.error('  📄 响应数据:', error.response?.data);
      console.error('  🌐 请求URL:', error.config?.url);
      
      // 如果是401错误，返回401状态码，让gaeaApiService处理重新登录
      if (error.response?.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Token已过期，需要重新登录', tokenExpired: true },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `训练${action}失败` },
        { status: 500 }
      );
    }
  }
  
  return NextResponse.json({ error: `Method ${method} not supported for training` }, { status: 405 });
}

// 处理每日奖励领取
async function handleDailyReward(axios: any, token: string, proxyUrl: string, accountName: string) {
  console.log(`🎁 开始处理账号 ${accountName} 的每日奖励领取`);
  
  // 配置axios请求
  const axiosConfig: any = {
    method: 'GET',
    url: 'https://api.aigaea.net/api/reward/daily-list',
    headers: {
      'accept': '*/*',
      'accept-language': 'en-US',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': 'https://app.aigaea.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  };

  // 配置代理
  if (proxyUrl) {
    try {
      const proxy = new URL(proxyUrl);
      axiosConfig.proxy = {
        protocol: 'http',
        host: proxy.hostname,
        port: parseInt(proxy.port),
        auth: {
          username: proxy.username,
          password: proxy.password
        }
      };
      console.log('🌐 使用代理访问Gaea每日奖励API:', proxyUrl);
    } catch (proxyError) {
      console.warn('⚠️ 代理配置无效:', proxyError);
    }
  } else {
    console.log('🌐 直接访问Gaea每日奖励API（无代理）');
  }

  // 获取奖励列表
  const listResponse = await axios(axiosConfig);
  console.log(`📥 账号 ${accountName} 每日奖励列表响应:`, listResponse.status, listResponse.data);

  if (listResponse.data.success && listResponse.data.data.list) {
    // 查找没有奖励的项
    const unrewardedItems = listResponse.data.data.list.filter((item: any) => !item.reward || item.reward === '');
    
    if (unrewardedItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有每日奖励已领取',
        data: { claimed: 0, total: listResponse.data.data.list.length }
      });
    }

    // 领取第一个未领取的奖励
    const itemToClaim = unrewardedItems[0];
    console.log(`🎯 账号 ${accountName} 准备领取每日奖励:`, itemToClaim);

    // 领取奖励
    const claimConfig = {
      ...axiosConfig,
      method: 'POST',
      url: 'https://api.aigaea.net/api/reward/daily-complete',
      data: { id: itemToClaim.daily }
    };

    const claimResponse = await axios(claimConfig);
    console.log(`📥 账号 ${accountName} 每日奖励领取响应:`, claimResponse.status, claimResponse.data);

    return NextResponse.json({
      success: true,
      message: '每日奖励领取成功',
      data: claimResponse.data
    });
  } else {
    return NextResponse.json({
      success: false,
      error: '获取每日奖励列表失败'
    }, { status: 400 });
  }
}

// 处理普通训练
async function handleTraining(axios: any, token: string, proxyUrl: string, requestData: any, accountName: string) {
  console.log(`🏃 开始处理账号 ${accountName} 的普通训练`);
  
  const { trainingContent } = requestData; // Positive, Neutral, Negative
  
  // 根据训练内容生成detail参数
  let detail: string;
  switch (trainingContent) {
    case 'Positive':
      detail = '1_2_1';
      break;
    case 'Neutral':
      detail = '2_2_1';
      break;
    case 'Negative':
      detail = '3_2_1';
      break;
    default:
      return NextResponse.json({
        success: false,
        error: '无效的训练内容'
      }, { status: 400 });
  }

  console.log(`🎯 账号 ${accountName} 训练内容: ${trainingContent}, 参数: ${detail}`);

  // 配置axios请求
  const axiosConfig: any = {
    method: 'POST',
    url: 'https://api.aigaea.net/api/ai/complete',
    headers: {
      'accept': 'application/json',
      'accept-language': 'en-US',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': 'https://app.aigaea.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    data: {
      detail: detail
    }
  };

  // 配置代理
  if (proxyUrl) {
    try {
      const proxy = new URL(proxyUrl);
      axiosConfig.proxy = {
        protocol: 'http',
        host: proxy.hostname,
        port: parseInt(proxy.port),
        auth: {
          username: proxy.username,
          password: proxy.password
        }
      };
      console.log('🌐 使用代理访问Gaea训练API:', proxyUrl);
    } catch (proxyError) {
      console.warn('⚠️ 代理配置无效:', proxyError);
    }
  } else {
    console.log('🌐 直接访问Gaea训练API（无代理）');
  }

  const response = await axios(axiosConfig);
  console.log(`📥 账号 ${accountName} 训练响应:`, response.status, response.data);

  return NextResponse.json({
    success: true,
    message: '普通训练完成',
    data: response.data
  });
}

// 处理深度训练
async function handleDeepTraining(axios: any, token: string, proxyUrl: string, requestData: any, accountName: string) {
  console.log(`⚡ 开始处理账号 ${accountName} 的深度训练`);
  
  const { trainingContent } = requestData;
  
  // 根据训练内容生成detail参数
  let detail: string;
  switch (trainingContent) {
    case 'Positive':
      detail = '1';
      break;
    case 'Neutral':
      detail = '2';
      break;
    case 'Negative':
      detail = '3';
      break;
    default:
      return NextResponse.json({
        success: false,
        error: '无效的训练内容'
      }, { status: 400 });
  }

  console.log(`🎯 账号 ${accountName} 深度训练内容: ${trainingContent}, 参数: ${detail}`);

  // 先调用ticket查询接口获取cdkey
  console.log(`🎫 账号 ${accountName} 开始查询ticket...`);
  
  const ticketQueryConfig: any = {
    method: 'POST',
    url: 'https://api.aigaea.net/api/ticket/list',
    headers: {
      'accept': 'application/json',
      'accept-language': 'en-US',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': 'https://app.aigaea.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    data: {
      page: 1,
      limit: 10
    }
  };

  // 配置代理
  if (proxyUrl) {
    try {
      const proxy = new URL(proxyUrl);
      ticketQueryConfig.proxy = {
        protocol: 'http',
        host: proxy.hostname,
        port: parseInt(proxy.port),
        auth: {
          username: proxy.username,
          password: proxy.password
        }
      };
      console.log('🌐 使用代理访问Gaea ticket查询API:', proxyUrl);
    } catch (proxyError) {
      console.warn('⚠️ 代理配置无效:', proxyError);
    }
  } else {
    console.log('🌐 直接访问Gaea ticket查询API（无代理）');
  }

  // 查询ticket
  const ticketResponse = await axios(ticketQueryConfig);
  console.log(`📥 账号 ${accountName} ticket查询响应:`, ticketResponse.status, ticketResponse.data);

  if (!ticketResponse.data.success || !ticketResponse.data.data || !ticketResponse.data.data.list || ticketResponse.data.data.list.length === 0) {
    return NextResponse.json({
      success: false,
      error: '未找到可用的ticket'
    }, { status: 400 });
  }

  // 获取第一个ticket的cdkey
  const firstTicket = ticketResponse.data.data.list[0];
  const cdkey = firstTicket.cdkey;
  
  if (!cdkey) {
    return NextResponse.json({
      success: false,
      error: 'ticket中没有cdkey'
    }, { status: 400 });
  }

  console.log(`🎫 账号 ${accountName} 获取到ticket cdkey: ${cdkey}`);

  // 配置深度训练axios请求
  const axiosConfig: any = {
    method: 'POST',
    url: 'https://api.aigaea.net/api/emotion/complete',
    headers: {
      'accept': 'application/json',
      'accept-language': 'en-US',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': 'https://app.aigaea.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    data: {
      chain_id: 8453,
      detail: detail,
      ticket: cdkey
    }
  };

  // 配置代理
  if (proxyUrl) {
    try {
      const proxy = new URL(proxyUrl);
      axiosConfig.proxy = {
        protocol: 'http',
        host: proxy.hostname,
        port: parseInt(proxy.port),
        auth: {
          username: proxy.username,
          password: proxy.password
        }
      };
      console.log('🌐 使用代理访问Gaea深度训练API:', proxyUrl);
    } catch (proxyError) {
      console.warn('⚠️ 代理配置无效:', proxyError);
    }
  } else {
    console.log('🌐 直接访问Gaea深度训练API（无代理）');
  }

  const response = await axios(axiosConfig);
  console.log(`📥 账号 ${accountName} 深度训练响应:`, response.status, response.data);
  console.log(`🎫 账号 ${accountName} 使用的ticket cdkey: ${cdkey}`);

  return NextResponse.json({
    success: true,
    message: '深度训练已提交到队列',
    data: response.data
  });
}

// 处理领取训练奖励
async function handleClaim(axios: any, token: string, proxyUrl: string, accountName: string) {
  console.log(`🏆 开始处理账号 ${accountName} 的领取训练奖励`);
  
  // 配置axios请求
  const axiosConfig: any = {
    method: 'POST',
    url: 'https://api.aigaea.net/api/ai/complete-mission',
    headers: {
      'accept': '*/*',
      'accept-language': 'en-US',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': 'https://app.aigaea.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    data: null
  };

  // 配置代理
  if (proxyUrl) {
    try {
      const proxy = new URL(proxyUrl);
      axiosConfig.proxy = {
        protocol: 'http',
        host: proxy.hostname,
        port: parseInt(proxy.port),
        auth: {
          username: proxy.username,
          password: proxy.password
        }
      };
      console.log('🌐 使用代理访问Gaea领取训练奖励API:', proxyUrl);
    } catch (proxyError) {
      console.warn('⚠️ 代理配置无效:', proxyError);
    }
  } else {
    console.log('🌐 直接访问Gaea领取训练奖励API（无代理）');
  }

  const response = await axios(axiosConfig);
  console.log(`📥 账号 ${accountName} 领取训练奖励响应:`, response.status, response.data);

  return NextResponse.json({
    success: true,
    message: '训练奖励领取成功',
    data: response.data
  });
}

// 处理奖励请求
async function handleRewardRequest(request: NextRequest, method: string, apiPath: string[]) {
  const action = apiPath[0]; // reward
  const subAction = apiPath[1]; // daily-complete
  
  console.log('🔍 奖励请求路径解析:', { action, subAction, method, apiPath });
  
  if (method === 'POST' && subAction === 'daily-complete') {
    return handleDailyRewardClaim(request);
  }
  
  return NextResponse.json({ error: `Unknown reward action: ${action}/${subAction}` }, { status: 404 });
}

// 处理每日奖励领取
async function handleDailyRewardClaim(request: NextRequest) {
  const axios = require('axios');
  
  try {
    const requestData = await request.json();
    console.log('📥 每日奖励领取请求数据:', requestData);
    
    const { accountId, token, proxy } = requestData;
    const { id } = requestData; // 奖励ID
    
    if (!accountId || !token || !id) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数: accountId, token, id'
      }, { status: 400 });
    }
    
    // 构建请求配置
    const axiosConfig: any = {
      method: 'POST',
      url: 'https://api.aigaea.net/api/reward/daily-complete',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US',
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'Referer': 'https://app.aigaea.net/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      data: { id }
    };
    
    // 配置代理
    if (proxy) {
      try {
        const proxyUrl = new URL(proxy);
        axiosConfig.proxy = {
          protocol: 'http',
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port),
          auth: {
            username: proxyUrl.username,
            password: proxyUrl.password
          }
        };
        console.log('🌐 使用代理访问Gaea每日奖励领取API:', proxy);
      } catch (proxyError) {
        console.warn('⚠️ 代理配置无效:', proxyError);
      }
    } else {
      console.log('🌐 直接访问Gaea每日奖励领取API（无代理）');
    }
    
    try {
      const response = await axios(axiosConfig);
      console.log(`📥 每日奖励领取响应:`, response.status, response.data);
      
      return NextResponse.json({
        success: true,
        message: '每日奖励领取成功',
        data: response.data
      });
    } catch (axiosError: any) {
      // 检查是否是401错误，直接返回让客户端处理
      if (axiosError.response?.status === 401) {
        console.log('🔑 收到401错误，返回401状态码让客户端处理自动重新登录');
        return NextResponse.json({
          success: false,
          error: 'Token已过期，请重新登录'
        }, { status: 401 });
      } else {
        throw axiosError;
      }
    }
    
  } catch (error: any) {
    console.error('❌ 每日奖励领取失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || '每日奖励领取失败'
    }, { status: 500 });
  }
}

// 处理挖矿请求
async function handleMiningRequest(request: NextRequest, method: string, apiPath: string[]) {
  const subPath = apiPath[1]; // 例如: mining/sync-accounts -> subPath = 'sync-accounts'
  const accountId = apiPath[2]; // 例如: mining/start/account_123 -> accountId = 'account_123'
  
  console.log('🔧 处理挖矿请求:', { method, apiPath, subPath, accountId });
  
  // 构建Python服务的URL
  let pythonServiceUrl = `http://localhost:5001/api/mining/${subPath}`;
  
  // 对于start和stop请求，需要特殊处理
  let requestBody = null;
  if (subPath === 'start' || subPath === 'stop') {
    // 如果有路径参数accountId，使用路径参数
    if (accountId) {
      pythonServiceUrl = `http://localhost:5001/api/mining/${subPath}/${accountId}`;
    } else if (method === 'POST') {
      // 如果没有路径参数，尝试从请求体获取accountId
      try {
        requestBody = await request.json();
        if (requestBody.accountId) {
          pythonServiceUrl = `http://localhost:5001/api/mining/${subPath}/${requestBody.accountId}`;
        }
      } catch (error) {
        console.warn('⚠️ 无法解析请求体:', error);
      }
    }
  } else if (method === 'POST') {
    // 对于其他POST请求（如sync-accounts），也需要读取请求体
    try {
      requestBody = await request.json();
    } catch (error) {
      console.warn('⚠️ 无法解析请求体:', error);
    }
  }
  
  try {
    let response;
    
    if (method === 'GET') {
      // 处理GET请求
      const url = new URL(request.url);
      const queryParams = url.searchParams.toString();
      const fullUrl = queryParams ? `${pythonServiceUrl}?${queryParams}` : pythonServiceUrl;
      
      // 减少GET请求日志输出
      if (subPath !== 'status') {
        console.log('📡 转发GET请求到Python服务:', fullUrl);
      }
      response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else if (method === 'POST') {
      // 处理POST请求
      const body = requestBody;
      
      console.log('📡 转发POST请求到Python服务:', pythonServiceUrl);
             // 减少同步账号的日志输出
             if (subPath !== 'sync-accounts') {
               console.log('📦 请求数据:', body);
             }
      
      // 对于start和stop请求，不需要发送请求体
      const fetchConfig: any = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // 只有非start/stop请求才发送请求体
      if (subPath !== 'start' && subPath !== 'stop') {
        fetchConfig.body = JSON.stringify(body);
      }
      
      console.log('🌐 准备请求Python服务:', pythonServiceUrl);
      response = await fetch(pythonServiceUrl, fetchConfig);
      console.log('📡 Python服务响应状态:', response.status, response.statusText);
    } else {
      return NextResponse.json({ error: 'Unsupported method' }, { status: 405 });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Python服务响应错误:', response.status, errorText);
      throw new Error(`Python服务响应错误: ${response.status} - ${errorText}`);
    }
    
    const responseText = await response.text();
    
    // 减少status请求的详细日志输出
    if (subPath !== 'status') {
      console.log('📥 Python服务原始响应:', responseText);
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON解析失败:', parseError);
      console.error('❌ 响应内容:', responseText);
      throw new Error(`JSON解析失败: ${parseError.message}`);
    }
    
    // 减少status请求的详细日志输出
    if (subPath !== 'status') {
      console.log('✅ Python服务响应:', data);
    }
    
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('❌ 挖矿请求失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || '挖矿请求失败'
    }, { status: 500 });
  }
}