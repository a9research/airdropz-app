/**
 * Gaea API 统一请求服务
 * 处理401错误自动重新登录
 */

import { GaeaLoginService, LoginCredentials } from './gaeaLoginService';

export interface GaeaApiRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  proxy?: string;
}

export interface GaeaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  newToken?: string;
}

export class GaeaApiService {
  private loginService: GaeaLoginService;
  private accountCache: Map<string, { username: string; password: string; proxy?: string }> = new Map();
  private tokenCache: Map<string, { token: string; timestamp: number }> = new Map();
  private readonly TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  private readonly LOG_LEVEL = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

  constructor() {
    this.loginService = new GaeaLoginService();
  }

  /**
   * 条件日志输出
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.LOG_LEVEL as keyof typeof levels] || 1;
    const messageLevel = levels[level];
    
    if (messageLevel >= currentLevel) {
      console[level](message, ...args);
    }
  }

  /**
   * 设置账号信息缓存
   */
  setAccountInfo(accountId: string, username: string, password: string, proxy?: string) {
    this.accountCache.set(accountId, { username, password, proxy });
  }

  /**
   * 清除账号信息缓存
   */
  clearAccountInfo(accountId: string) {
    this.accountCache.delete(accountId);
  }

  /**
   * 从数据库获取账号信息
   */
  private async getAccountInfo(accountId: string): Promise<{ username: string; password: string; proxy?: string } | null> {
    // 先从缓存获取
    const cached = this.accountCache.get(accountId);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      const accountDoc = await dbService.get(accountId);
      
      console.log('🔍 从数据库获取账号信息:', {
        accountId,
        hasDoc: !!accountDoc,
        username: accountDoc?.username,
        hasPassword: !!accountDoc?.password,
        passwordLength: accountDoc?.password?.length || 0,
        hasProxy: !!accountDoc?.proxy
      });
      
      if (accountDoc && accountDoc.username && accountDoc.password) {
        const accountInfo = {
          username: accountDoc.username,
          password: accountDoc.password,
          proxy: accountDoc.proxy
        };
        
        // 缓存账号信息
        this.accountCache.set(accountId, accountInfo);
        return accountInfo;
      } else {
        console.log('❌ 账号信息不完整:', {
          hasUsername: !!accountDoc?.username,
          hasPassword: !!accountDoc?.password,
          passwordValue: accountDoc?.password
        });
      }
    } catch (error) {
      console.error('❌ 获取账号信息失败:', error);
    }
    
    return null;
  }

  /**
   * 执行登录
   */
  private async performLogin(accountId: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🔑 开始自动重新登录流程:', accountId);
      
      // 检查token缓存
      const cachedToken = this.tokenCache.get(accountId);
      if (cachedToken && (Date.now() - cachedToken.timestamp) < this.TOKEN_CACHE_DURATION) {
        console.log('🔄 使用缓存的token，避免重复登录');
        return { success: true, token: cachedToken.token };
      }
      
      const accountInfo = await this.getAccountInfo(accountId);
      console.log('🔍 获取到的账号信息:', accountInfo);
      
      if (!accountInfo) {
        console.log('❌ 无法获取账号信息，返回失败');
        return { success: false, error: '无法获取账号信息' };
      }

      console.log('🔑 自动重新登录账号:', accountId);
      
      const credentials: LoginCredentials = {
        username: accountInfo.username,
        password: accountInfo.password,
        proxy: accountInfo.proxy
      };

      const result = await this.loginService.login(credentials);
      
      if (result.success && result.gaeaToken) {
        // 更新数据库中的token
        const updateSuccess = await this.loginService.updateAccountTokens(
          accountId,
          result.gaeaToken,
          result.browserId || null
        );
        
        if (updateSuccess) {
          // 缓存新token
          this.tokenCache.set(accountId, {
            token: result.gaeaToken,
            timestamp: Date.now()
          });
          
          console.log('✅ 自动重新登录成功:', accountId);
          return { success: true, token: result.gaeaToken };
        }
      }
      
      return { success: false, error: result.error || '登录失败' };
    } catch (error) {
      console.error('❌ 自动重新登录失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '登录过程中发生未知错误' };
    }
  }

  /**
   * 发送API请求（带401自动重试）
   */
  async request<T = any>(accountId: string, request: GaeaApiRequest): Promise<GaeaApiResponse<T>> {
    console.log('🔥🔥🔥 gaeaApiService.request 方法被调用!', { accountId, url: request.url, method: request.method });
    try {
      console.log('🚀 开始发送API请求:', { accountId, url: request.url, method: request.method });
      
      // 第一次请求
      const response = await this.makeRequest(request);
      console.log('📡 第一次请求响应状态:', response.status);
      console.log('📡 响应详情:', { status: response.status, ok: response.ok });
      
      // 检查响应状态和内容
      if (response.status === 401) {
        console.log('🔑 收到401错误，token失效，开始自动重新登录...');
        
        // 执行登录
        const loginResult = await this.performLogin(accountId);
        
        if (loginResult.success && loginResult.token) {
          console.log('✅ 重新登录成功，使用新token重试原请求...');
          console.log('🔄 重试请求详情:', { 
            url: request.url, 
            method: request.method, 
            newToken: loginResult.token.substring(0, 20) + '...' 
          });
          
          // 使用新token重试原来的请求
          const retryRequest = {
            ...request,
            headers: {
              ...request.headers,
              'Authorization': `Bearer ${loginResult.token}`
            },
            // 如果是服务端代理请求，需要更新body中的token
            body: request.body ? {
              ...request.body,
              token: loginResult.token
            } : undefined
          };
          
          console.log('🔄 开始重试请求...');
          console.log('🔄 重试请求详情:', {
            url: retryRequest.url,
            method: retryRequest.method,
            hasNewToken: !!loginResult.token,
            bodyToken: retryRequest.body?.token ? retryRequest.body.token.substring(0, 20) + '...' : 'none'
          });
          
          const retryResponse = await this.makeRequest(retryRequest);
          console.log('📡 重试请求响应状态:', retryResponse.status);
          
          if (retryResponse.status === 200) {
            const data = await retryResponse.json();
            console.log('✅ 使用新token重试成功，返回原业务流程结果');
            return {
              success: true,
              data: data.data || data,
              newToken: loginResult.token
            };
          } else {
            console.log('❌ 使用新token重试仍然失败:', retryResponse.status);
            return {
              success: false,
              error: '重新登录后请求仍然失败'
            };
          }
        } else {
          console.log('❌ 自动重新登录失败:', loginResult.error);
          return {
            success: false,
            error: '自动重新登录失败: ' + (loginResult.error || '未知错误')
          };
        }
      } else if (response.status === 200) {
        const data = await response.json();
        
        // 检查业务逻辑状态，不仅仅是HTTP状态码
        if (data.success === false || data.code === 400) {
          console.log('❌ 业务逻辑失败:', {
            httpStatus: response.status,
            businessSuccess: data.success,
            businessCode: data.code,
            message: data.msg || data.message
          });
          return {
            success: false,
            error: data.msg || data.message || '业务逻辑失败'
          };
        }
        
        console.log('✅ 业务逻辑成功:', {
          httpStatus: response.status,
          businessSuccess: data.success,
          businessCode: data.code
        });
        
        return {
          success: true,
          data: data.data || data
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.msg || errorData.message || `请求失败 (${response.status})`
        };
      }
    } catch (error) {
      console.error('❌ API请求失败:', error);
      console.error('❌ 错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        accountId,
        requestUrl: request.url
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求过程中发生未知错误'
      };
    }
  }

  /**
   * 执行实际的HTTP请求
   */
  private async makeRequest(request: GaeaApiRequest): Promise<Response> {
    const { url, method = 'GET', headers = {}, body, proxy } = request;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    // 如果有代理，需要通过服务器端代理
    if (proxy) {
      // 通过服务器端API代理请求
      const proxyResponse = await fetch('/api/plugin/gaea/proxy-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          method,
          headers,
          body,
          proxy
        })
      });
      
      // 创建一个模拟的Response对象，包含正确的status
      const responseData = await proxyResponse.json();
      return {
        status: proxyResponse.status,
        json: async () => responseData,
        ok: proxyResponse.ok
      } as Response;
    } else {
      // 直接请求
      return fetch(url, requestOptions);
    }
  }

  /**
   * 查询Tickets
   */
  async queryTickets(accountId: string, token: string, proxy?: string): Promise<GaeaApiResponse> {
    console.log('🔍 开始查询Tickets:', { accountId, hasToken: !!token, hasProxy: !!proxy });
    
    const result = await this.request(accountId, {
      url: 'https://api.aigaea.net/api/ticket/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      proxy
    });
    
    console.log('📊 Tickets查询结果:', { 
      success: result.success, 
      hasData: !!result.data, 
      hasNewToken: !!result.newToken,
      error: result.error 
    });
    
    return result;
  }

  /**
   * 查询决策数据
   */
  async queryDecisions(accountId: string, token: string, proxy?: string): Promise<GaeaApiResponse> {
    return this.request(accountId, {
      url: 'https://api.aigaea.net/api/decision/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      proxy
    });
  }

  /**
   * 查询训练数据
   */
  async queryTrainings(accountId: string, token: string, proxy?: string): Promise<GaeaApiResponse> {
    return this.request(accountId, {
      url: 'https://api.aigaea.net/api/training/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      proxy
    });
  }

  /**
   * 查询挖矿数据
   */
  async queryMining(accountId: string, token: string, proxy?: string): Promise<GaeaApiResponse> {
    return this.request(accountId, {
      url: 'https://api.aigaea.net/api/mining/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      proxy
    });
  }
}

// 创建单例实例
export const gaeaApiService = new GaeaApiService();
