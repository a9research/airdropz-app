/**
 * Gaea登录API路由
 * 处理Gaea账号登录请求
 * 使用API直接登录方式，避免浏览器自动化
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';

export interface LoginCredentials {
  username: string;
  password: string;
  proxy?: string;
}

export interface LoginResult {
  success: boolean;
  gaeaToken?: string;
  uid?: string;
  username?: string;
  userInfo?: any;
  error?: string;
}

export interface TurnstileTask {
  type: string;
  websiteURL: string;
  websiteKey: string;
  action?: string;
  data?: string;
  pagedata?: string;
  proxyType?: string;
  proxyAddress?: string;
  proxyPort?: string;
  proxyLogin?: string;
  proxyPassword?: string;
}

export class GaeaLoginService {
  private apiKey: string = 'b5806f7dc850e77b96c4df8931d707a8';
  private baseUrl: string = 'https://app.aigaea.net';
  private apiUrl: string = 'https://api.aigaea.net/api/auth/login';
  private defaultSitekey: string = '0x4AAAAAAAkhM1uKU9iprx7x';

  /**
   * 密码哈希处理 (SHA256)
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * 获取 Turnstile sitekey
   */
  private async getTurnstileSitekey(proxy?: string): Promise<string> {
    try {
      console.log('🔍 获取 Turnstile sitekey...');
      
      const axiosConfig: any = {
        method: 'GET',
        url: this.baseUrl + '/login',
        timeout: 30000
      };
      
      // 如果提供了代理，使用代理
      if (proxy) {
        console.log('🌐 使用代理获取sitekey:', proxy);
        axiosConfig.proxy = {
          protocol: 'http',
          host: new URL(proxy).hostname,
          port: parseInt(new URL(proxy).port),
          auth: {
            username: new URL(proxy).username,
            password: new URL(proxy).password
          }
        };
        console.log('📡 代理配置已应用到sitekey请求');
      } else {
        console.log('📡 直接连接获取sitekey（无代理）');
      }
      
      const response = await axios(axiosConfig);
      const content = response.data;
      
      // 查找 sitekey
      const sitekeyMatch = content.match(/data-sitekey="([^"]+)"/);
      if (sitekeyMatch) {
        const sitekey = sitekeyMatch[1];
        console.log('✅ 找到 Turnstile sitekey:', sitekey);
        return sitekey;
      } else {
        console.log('⚠️ 未找到 sitekey，使用默认值');
        return this.defaultSitekey;
      }
    } catch (error) {
      console.log('⚠️ 获取 sitekey 失败，使用默认值:', error);
      return this.defaultSitekey;
    }
  }

  /**
   * 解析代理字符串
   */
  private parseProxy(proxyString: string): { server: string; username?: string; password?: string } | null {
    try {
      const url = new URL(proxyString);
      return {
        server: `${url.protocol}//${url.hostname}:${url.port}`,
        username: url.username || undefined,
        password: url.password || undefined
      };
    } catch (error) {
      console.error('代理解析失败:', error);
      return null;
    }
  }

  /**
   * 验证代理是否生效
   */
  private async verifyProxy(proxy?: string): Promise<boolean> {
    if (!proxy) {
      console.log('ℹ️ 未配置代理，跳过验证');
      return true;
    }

    try {
      console.log('🔍 验证代理连接...');
      
      const axiosConfig: any = {
        method: 'GET',
        url: 'https://httpbin.org/ip',
        timeout: 10000
      };
      
      // 配置代理
      axiosConfig.proxy = {
        protocol: 'http',
        host: new URL(proxy).hostname,
        port: parseInt(new URL(proxy).port),
        auth: {
          username: new URL(proxy).username,
          password: new URL(proxy).password
        }
      };
      
      const response = await axios(axiosConfig);
      
      if (response.status === 200) {
        console.log('✅ 代理验证成功');
        console.log('🌐 通过代理获取的IP:', response.data.origin);
        return true;
      } else {
        console.log('❌ 代理验证失败，状态码:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ 代理验证失败:', error);
      return false;
    }
  }

  /**
   * 使用 2captcha API 解决 Turnstile 验证
   */
  private async solveTurnstile(sitekey: string, pageUrl: string, proxy?: string): Promise<string> {
    try {
      console.log('🔐 开始解决 Turnstile 验证...');
      
      const task: TurnstileTask = {
        type: proxy ? 'TurnstileTask' : 'TurnstileTaskProxyless',
        websiteURL: pageUrl,
        websiteKey: sitekey
      };

      // 添加代理配置
      if (proxy) {
        const proxyConfig = this.parseProxy(proxy);
        if (proxyConfig) {
          const proxyUrl = new URL(proxyConfig.server);
          task.proxyType = 'http';
          task.proxyAddress = proxyUrl.hostname;
          task.proxyPort = proxyUrl.port;
          if (proxyConfig.username) task.proxyLogin = proxyConfig.username;
          if (proxyConfig.password) task.proxyPassword = proxyConfig.password;
          console.log('🌐 2captcha任务使用代理:', proxyUrl.hostname + ':' + proxyUrl.port);
        }
      }

      console.log('📋 创建2captcha任务:', JSON.stringify(task, null, 2));
      
      // 创建任务
      const createAxiosConfig: any = {
        method: 'POST',
        url: 'https://api.2captcha.com/createTask',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          clientKey: this.apiKey,
          task
        },
        timeout: 30000
      };
      
      // 如果提供了代理，使用代理
      if (proxy) {
        console.log('🌐 使用代理调用2captcha API:', proxy);
        createAxiosConfig.proxy = {
          protocol: 'http',
          host: new URL(proxy).hostname,
          port: parseInt(new URL(proxy).port),
          auth: {
            username: new URL(proxy).username,
            password: new URL(proxy).password
          }
        };
        console.log('📡 代理配置已应用到2captcha创建任务请求');
      } else {
        console.log('📡 直接连接调用2captcha API（无代理）');
      }
      
      const createResponse = await axios(createAxiosConfig);
      const createResult = createResponse.data;
      console.log('📊 2captcha创建任务响应:', createResult);
      
      if (createResult.errorId !== 0) {
        throw new Error(`2captcha创建任务失败: ${createResult.errorDescription}`);
      }
      
      const taskId = createResult.taskId;
      console.log('🆔 任务ID:', taskId);
      
      return await this.pollTaskResult(taskId, proxy);
      
    } catch (error) {
      console.error('❌ Turnstile解决失败:', error);
      throw error;
    }
  }

  /**
   * 轮询2captcha任务结果
   */
  private async pollTaskResult(taskId: number, proxy?: string): Promise<string> {
    const maxAttempts = 30;
    const pollInterval = 10000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const pollAxiosConfig: any = {
          method: 'POST',
          url: 'https://api.2captcha.com/getTaskResult',
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            clientKey: this.apiKey,
            taskId
          },
          timeout: 30000
        };
        
        // 如果提供了代理，使用代理
        if (proxy) {
          pollAxiosConfig.proxy = {
            protocol: 'http',
            host: new URL(proxy).hostname,
            port: parseInt(new URL(proxy).port),
            auth: {
              username: new URL(proxy).username,
              password: new URL(proxy).password
            }
          };
          console.log('📡 代理配置已应用到2captcha轮询请求');
        }
        
        const response = await axios(pollAxiosConfig);
        const result = response.data;
        console.log(`第${i + 1}次查询结果:`, result);
        
        if (result.errorId !== 0) {
          throw new Error(`2captcha获取结果失败: ${result.errorDescription}`);
        }

        if (result.status === 'ready') {
          if (result.solution && result.solution.token) {
            console.log('获得Turnstile token:', result.solution.token.substring(0, 20) + '...');
            return result.solution.token;
          }
          throw new Error('任务完成但未返回有效token');
        }

        if (result.status === 'processing') {
          console.log(`等待2captcha结果... (${i + 1}/${maxAttempts})`);
          continue;
        }

        throw new Error(`任务状态异常: ${result.status}`);
      } catch (error) {
        console.error(`第${i + 1}次查询失败:`, error);
        if (i === maxAttempts - 1) throw error;
      }
    }

    throw new Error('2captcha任务超时');
  }


  /**
   * 执行登录
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      console.log('🚀 开始 Gaea API 直接登录...');
      console.log('📋 参数:', { username: credentials.username, proxy: credentials.proxy ? '已配置' : '未配置' });
      
      if (credentials.proxy) {
        console.log('🌐 使用代理:', credentials.proxy);
        
        // 验证代理连接
        const proxyValid = await this.verifyProxy(credentials.proxy);
        if (!proxyValid) {
          console.log('⚠️ 代理验证失败，但继续尝试登录...');
        }
      }
      
      // 1. 获取 Turnstile sitekey
      const sitekey = await this.getTurnstileSitekey(credentials.proxy);
      
      // 2. 解决验证码
      const captchaToken = await this.solveTurnstile(sitekey, this.baseUrl + '/login', credentials.proxy);
      
      if (!captchaToken) {
        throw new Error('验证码解决失败');
      }
      
      // 3. 准备登录数据
      const hashedPassword = this.hashPassword(credentials.password);
      
      const loginData = {
        username: credentials.username,
        password: hashedPassword,
        remember_me: false,
        recaptcha_token: captchaToken
      };
      
      console.log('📋 登录数据:', {
        username: loginData.username,
        password: loginData.password.substring(0, 20) + '...',
        recaptcha_token: loginData.recaptcha_token.substring(0, 20) + '...'
      });
      
      // 4. 发送登录请求
      const loginAxiosConfig: any = {
        method: 'POST',
        url: this.apiUrl,
        headers: {
          'accept': 'application/json',
          'accept-language': 'en-US',
          'authorization': 'Bearer',
          'content-type': 'application/json',
          'priority': 'u=1, i',
          'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'Referer': 'https://app.aigaea.net/',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        data: loginData,
        timeout: 60000
      };
      
      // 如果提供了代理，使用代理
      if (credentials.proxy) {
        console.log('🌐 使用代理访问Gaea API:', credentials.proxy);
        loginAxiosConfig.proxy = {
          protocol: 'http',
          host: new URL(credentials.proxy).hostname,
          port: parseInt(new URL(credentials.proxy).port),
          auth: {
            username: new URL(credentials.proxy).username,
            password: new URL(credentials.proxy).password
          }
        };
        console.log('📡 代理配置已应用到Gaea登录请求');
      } else {
        console.log('📡 直接连接访问Gaea API（无代理）');
      }
      
      const response = await axios(loginAxiosConfig);
      
      console.log('📊 登录响应状态:', response.status);
      
      // 5. 处理响应
      const result = response.data;
      
      console.log('📊 登录响应:', result);
      
      if (result.code === 200 && result.success) {
        const token = result.data?.token;
        const userInfo = result.data?.user_info;
        
        console.log('🎉 登录成功!');
        console.log('👤 用户ID:', userInfo?.uid);
        console.log('👤 用户名:', userInfo?.name);
        console.log('🔑 Token:', token ? token.substring(0, 50) + '...' : 'N/A');
        
        // 注意：数据库存储将在客户端进行
        console.log('💾 登录信息将在客户端保存到数据库');
        
        return {
          success: true,
          gaeaToken: token,
          uid: userInfo?.uid,
          username: userInfo?.name,
          userInfo: userInfo
        };
      } else {
        const errorMsg = result.msg || '未知错误';
        console.log('❌ 登录失败:', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
      
    } catch (error) {
      console.error('❌ Gaea 登录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, proxy } = body;

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '缺少用户名或密码'
      }, { status: 400 });
    }

    const loginService = new GaeaLoginService();
    const credentials: LoginCredentials = {
      username,
      password,
      proxy
    };

    const result = await loginService.login(credentials);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('登录API错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}
