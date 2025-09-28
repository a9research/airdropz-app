/**
 * 代理请求API
 * 处理需要代理的Gaea API请求
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { url, method = 'GET', headers = {}, body, proxy } = await request.json();

    if (!url) {
      return NextResponse.json({
        success: false,
        error: '缺少URL参数'
      }, { status: 400 });
    }

    // 配置axios
    const axiosConfig: any = {
      method: method.toLowerCase(),
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 30000
    };

    if (body) {
      axiosConfig.data = body;
    }

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
        console.log('🌐 使用代理访问:', proxyUrl.hostname);
      } catch (error) {
        console.error('❌ 代理配置解析失败:', error);
        return NextResponse.json({
          success: false,
          error: '代理配置格式错误'
        }, { status: 400 });
      }
    }

    // 发送请求
    const response = await axios(axiosConfig);

    // 返回响应
    return NextResponse.json({
      success: true,
      data: response.data,
      status: response.status
    });

  } catch (error: any) {
    console.error('❌ 代理请求失败:', error);
    
    if (error.response) {
      // 如果是401错误，返回401状态码，让gaeaApiService处理重新登录
      if (error.response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Token已过期，需要重新登录',
          tokenExpired: true
        }, { status: 401 });
      }
      
      // 服务器返回了错误响应
      return NextResponse.json({
        success: false,
        error: error.response.data?.msg || error.response.data?.message || '请求失败',
        status: error.response.status,
        data: error.response.data
      }, { status: error.response.status });
    } else if (error.request) {
      // 请求发送失败
      return NextResponse.json({
        success: false,
        error: '网络请求失败'
      }, { status: 500 });
    } else {
      // 其他错误
      return NextResponse.json({
        success: false,
        error: error.message || '请求过程中发生未知错误'
      }, { status: 500 });
    }
  }
}
