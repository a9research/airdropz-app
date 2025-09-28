/**
 * Gaea 登录服务
 * 使用 API 直接登录，获取 token 和用户信息
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

class GaeaLoginService {
  constructor(config) {
    this.apiKey = config.apiKey || 'b5806f7dc850e77b96c4df8931d707a8';
    this.baseUrl = config.baseUrl || 'https://app.aigaea.net';
    this.apiUrl = config.apiUrl || 'https://api.aigaea.net/api/auth/login';
    this.defaultSitekey = '0x4AAAAAAAkhM1uKU9iprx7x';
  }

  /**
   * 密码哈希处理 (SHA256)
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * 使用 2captcha API 解决 Turnstile 验证
   */
  async solveTurnstile(sitekey, pageUrl, proxy) {
    try {
      console.log('🔐 开始解决 Turnstile 验证...');
      
      const task = {
        type: 'TurnstileTaskProxyless',
        websiteURL: pageUrl,
        websiteKey: sitekey
      };

      console.log('📋 创建2captcha任务:', JSON.stringify(task, null, 2));
      
      // 创建任务
      const createResponse = await fetch('https://api.2captcha.com/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientKey: this.apiKey,
          task
        })
      });
      
      const createResult = await createResponse.json();
      console.log('📊 2captcha创建任务响应:', createResult);
      
      if (createResult.errorId !== 0) {
        throw new Error(`2captcha创建任务失败: ${createResult.errorDescription}`);
      }
      
      const taskId = createResult.taskId;
      console.log('🆔 任务ID:', taskId);
      
      // 轮询获取结果
      const maxAttempts = 30; // 最多等待5分钟
      const pollInterval = 10000; // 每10秒查询一次
      
      for (let i = 0; i < maxAttempts; i++) {
        console.log(`⏳ 等待2captcha结果... (${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const resultResponse = await fetch('https://api.2captcha.com/getTaskResult', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientKey: this.apiKey,
            taskId
          })
        });
        
        const result = await resultResponse.json();
        console.log(`📊 第${i + 1}次查询结果:`, result);
        
        if (result.errorId !== 0) {
          throw new Error(`2captcha获取结果失败: ${result.errorDescription}`);
        }
        
        if (result.status === 'ready') {
          if (result.solution && result.solution.token) {
            console.log('✅ 获得Turnstile token:', result.solution.token.substring(0, 20) + '...');
            console.log('💰 解决费用:', result.cost);
            console.log('⏱️ 解决时间:', result.endTime - result.createTime, '秒');
            return result.solution.token;
          }
          throw new Error('任务完成但未返回有效token');
        }
        
        if (result.status === 'processing') {
          continue;
        }
        
        throw new Error(`任务状态异常: ${result.status}`);
      }
      
      throw new Error('验证码解决超时');
      
    } catch (error) {
      console.error('❌ Turnstile解决失败:', error);
      throw error;
    }
  }

  /**
   * 获取 Turnstile sitekey
   */
  async getTurnstileSitekey() {
    try {
      console.log('🔍 获取 Turnstile sitekey...');
      
      const response = await fetch(this.baseUrl + '/login', {
        timeout: 30000
      });
      
      const content = await response.text();
      
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
      console.log('⚠️ 获取 sitekey 失败，使用默认值:', error.message);
      return this.defaultSitekey;
    }
  }

  /**
   * 执行 Gaea 登录
   */
  async login(username, password, proxy = null) {
    try {
      console.log('🚀 开始 Gaea 登录...');
      console.log('📋 参数:', { username, proxy: proxy ? '已配置' : '未配置' });
      
      // 1. 获取 Turnstile sitekey
      const sitekey = await this.getTurnstileSitekey();
      
      // 2. 解决验证码
      const captchaToken = await this.solveTurnstile(sitekey, this.baseUrl + '/login', proxy);
      
      if (!captchaToken) {
        throw new Error('验证码解决失败');
      }
      
      // 3. 准备登录数据
      const hashedPassword = this.hashPassword(password);
      
      const loginData = {
        username: username,
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
      const response = await fetch(this.apiUrl, {
        method: 'POST',
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
        body: JSON.stringify(loginData),
        timeout: 30000
      });
      
      console.log('📊 登录响应状态:', response.status);
      
      // 5. 处理响应
      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.log('⚠️ JSON解析失败，尝试文本解析...');
        const text = await response.text();
        console.log('📄 响应文本:', text.substring(0, 500));
        
        // 尝试提取JSON
        const jsonMatch = text.match(/\{.*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('无法解析响应');
        }
      }
      
      console.log('📊 登录响应:', result);
      
      if (result.code === 200 && result.success) {
        const token = result.data?.token;
        const userInfo = result.data?.user_info;
        
        console.log('🎉 登录成功!');
        console.log('👤 用户ID:', userInfo?.uid);
        console.log('👤 用户名:', userInfo?.name);
        console.log('🔑 Token:', token ? token.substring(0, 50) + '...' : 'N/A');
        
        return {
          success: true,
          token: token,
          uid: userInfo?.uid,
          username: userInfo?.name,
          userInfo: userInfo,
          message: '登录成功'
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
      console.error('❌ Gaea 登录失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GaeaLoginService;
