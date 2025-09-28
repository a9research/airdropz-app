import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { accountId, token, proxy } = await request.json();

    console.log('🔍 Tickets查询API被调用:');
    console.log('  📋 请求参数:', { accountId, token: token ? '已配置' : '无token', proxy: proxy || '无代理' });

    if (!accountId || !token) {
      console.log('❌ 缺少必要参数');
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }

    console.log('🔍 开始查询Tickets:', { accountId, proxy: proxy ? '已配置' : '未配置' });

    // 配置axios代理
    const axiosConfig: any = {
      method: 'GET',
      url: 'https://api.aigaea.net/api/ticket/list',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US',
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'Referer': 'https://app.aigaea.net/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    };

    // 如果配置了代理，添加代理设置
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
        console.log('🌐 使用代理访问Gaea API:', proxy);
      } catch (error) {
        console.error('❌ 代理配置解析失败:', error);
        return NextResponse.json({
          success: false,
          error: '代理配置格式错误'
        }, { status: 400 });
      }
    }

    // 调用Gaea API获取Tickets
    const response = await axios(axiosConfig);

    console.log('📊 Tickets查询响应:', response.data);

    if (response.data.success && response.data.code === 200) {
      const tickets = response.data.data || [];
      console.log('✅ 查询成功，获得Tickets数量:', tickets.length);
      
      return NextResponse.json({
        success: true,
        data: tickets,
        total: response.data.total || 0
      });
    } else if (response.data.code === 401 || response.data.msg?.includes('token') || response.data.msg?.includes('unauthorized')) {
      console.log('🔑 Token失效，需要重新登录');
      return NextResponse.json({
        success: false,
        error: 'Token已失效，请重新登录'
      }, { status: 401 });
    } else {
      console.log('❌ API返回失败:', response.data);
      return NextResponse.json({
        success: false,
        error: response.data.msg || '查询失败'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ 查询Tickets失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '查询过程中发生未知错误'
    }, { status: 500 });
  }
}
