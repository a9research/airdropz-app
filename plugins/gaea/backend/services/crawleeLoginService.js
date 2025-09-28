/**
 * Gaea登录服务 - 生产环境Crawlee+Playwright实现
 * 符合.cursorrules中的Crawlee+Playwright框架要求
 */

const { PlaywrightCrawler } = require('@crawlee/playwright');

/**
 * 使用Crawlee+Playwright框架进行Gaea登录
 * @param {Object} credentials - 登录凭据
 * @param {string} credentials.username - 用户名
 * @param {string} credentials.password - 密码
 * @param {string} credentials.proxy - 代理配置（可选）
 * @returns {Promise<Object>} 登录结果
 */
async function performGaeaLogin({ username, password, proxy }) {
  try {
    console.log('开始使用Crawlee+Playwright进行Gaea登录...');
    console.log('配置信息:', { username, proxy: proxy ? '已配置' : '未配置' });
    
    // 配置代理
    let proxyConfiguration = undefined;
    if (proxy) {
      try {
        const proxyUrl = new URL(proxy);
        const { ProxyConfiguration } = require('@crawlee/core');
        proxyConfiguration = new ProxyConfiguration({
          proxyUrls: [`${proxyUrl.protocol}//${proxyUrl.hostname}:${proxyUrl.port}`],
        });
        console.log('使用代理:', proxyUrl.hostname + ':' + proxyUrl.port);
      } catch (error) {
        console.error('代理解析失败:', error);
        throw new Error('代理配置格式错误');
      }
    }

    // 配置Crawlee爬虫选项 - 使用正确的Crawlee API
    const crawlerOptions = {
      proxyConfiguration: proxyConfiguration,
      launchContext: {
        launchOptions: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      },
      requestHandler: async ({ page, request }) => {
        console.log('访问登录页面...');
        await page.goto('https://app.aigaea.net/login', { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');
        
        console.log('查找登录表单...');
        await page.waitForSelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]', { timeout: 10000 });
        await page.waitForSelector('input[type="password"]', { timeout: 10000 });
        
        console.log('填写登录信息...');
        const usernameSelector = 'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]';
        const passwordSelector = 'input[type="password"]';
        
        await page.fill(usernameSelector, username);
        await page.fill(passwordSelector, password);
        
        console.log('检查Turnstile验证...');
        const hasTurnstile = await page.locator('[data-sitekey]').count() > 0;
        
        if (hasTurnstile) {
          console.log('检测到Turnstile验证，开始处理...');
          
          // 获取Turnstile参数
          const turnstileData = await page.evaluate(() => {
            const turnstileElement = document.querySelector('[data-sitekey]');
            if (!turnstileElement) return null;
            
            return {
              sitekey: turnstileElement.getAttribute('data-sitekey'),
              action: turnstileElement.getAttribute('data-action'),
              cData: turnstileElement.getAttribute('data-c'),
              chlPageData: turnstileElement.getAttribute('data-chl-page-data')
            };
          });

          if (!turnstileData?.sitekey) {
            throw new Error('无法找到Turnstile sitekey');
          }

          // 使用2captcha API解决Turnstile
          const turnstileToken = await solveTurnstile(turnstileData, 'https://app.aigaea.net/login', proxy);
          console.log('获得Turnstile token:', turnstileToken.substring(0, 20) + '...');
          
          // 注入token到页面
          await page.evaluate((token) => {
            const responseInput = document.querySelector('input[name="cf-turnstile-response"]') || 
                                 document.querySelector('input[name="g-recaptcha-response"]');
            if (responseInput) {
              responseInput.value = token;
              responseInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            if (window.tsCallback) {
              window.tsCallback(token);
            }
          }, turnstileToken);
          
          await page.waitForTimeout(2000);
        }
        
        console.log('点击登录按钮...');
        const loginButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("登录"), button:has-text("Login"), button:has-text("Sign in")').first();
        await loginButton.click();
        
        console.log('等待登录完成...');
        await page.waitForURL('**/app.aigaea.net/**', { timeout: 30000 });
        
        console.log('获取Local Storage数据...');
        const localStorageData = await page.evaluate(() => {
          return {
            gaeaToken: localStorage.getItem('gaea_token'),
            browserId: localStorage.getItem('browser_id')
          };
        });
        
        if (!localStorageData.gaeaToken || !localStorageData.browserId) {
          throw new Error('无法获取登录后的token信息');
        }
        
        console.log('登录成功！');
        console.log('Gaea Token:', localStorageData.gaeaToken.substring(0, 20) + '...');
        console.log('Browser ID:', localStorageData.browserId);
        
        // 将结果存储到request的userData中
        request.userData = {
          gaeaToken: localStorageData.gaeaToken,
          browserId: localStorageData.browserId
        };
      }
    };

    // 创建并运行爬虫
    const crawler = new PlaywrightCrawler(crawlerOptions);
    await crawler.run(['https://app.aigaea.net/login']);
    
    // 获取结果 - 使用Crawlee的正确方式
    const results = await crawler.getData();
    
    if (results && results.items && results.items.length > 0 && results.items[0].userData) {
      return {
        success: true,
        gaeaToken: results.items[0].userData.gaeaToken,
        browserId: results.items[0].userData.browserId,
        message: '使用Crawlee+Playwright成功完成登录'
      };
    } else {
      throw new Error('登录失败，无法获取结果');
    }
    
  } catch (error) {
    console.error('Gaea登录失败:', error);
    return {
      success: false,
      error: error.message || '登录过程中发生未知错误'
    };
  }
}

/**
 * 使用2captcha API解决Cloudflare Turnstile验证
 * @param {Object} turnstileData - Turnstile数据
 * @param {string} pageUrl - 页面URL
 * @param {string} proxy - 代理配置（可选）
 * @returns {Promise<string>} Turnstile token
 */
async function solveTurnstile(turnstileData, pageUrl, proxy) {
  const API_KEY = 'b5806f7dc850e77b96c4df8931d707a8';
  
  try {
    console.log('开始解决Turnstile验证...');
    
    // 根据2captcha文档创建TurnstileTask
    const task = {
      type: 'TurnstileTask',
      websiteURL: pageUrl,
      websiteKey: turnstileData.sitekey
    };

    // 添加可选参数
    if (turnstileData.action) task.action = turnstileData.action;
    if (turnstileData.cData) task.data = turnstileData.cData;
    if (turnstileData.chlPageData) task.pagedata = turnstileData.chlPageData;

    // 添加代理配置
    if (proxy) {
      try {
        const proxyUrl = new URL(proxy);
        task.proxyType = 'http';
        task.proxyAddress = proxyUrl.hostname;
        task.proxyPort = proxyUrl.port;
        if (proxyUrl.username) task.proxyLogin = proxyUrl.username;
        if (proxyUrl.password) task.proxyPassword = proxyUrl.password;
        console.log('2captcha任务使用代理:', proxyUrl.hostname + ':' + proxyUrl.port);
      } catch (error) {
        console.warn('代理解析失败，跳过代理配置:', error.message);
      }
    }

    console.log('创建2captcha任务:', JSON.stringify(task, null, 2));
    
    // 创建任务
    const createResponse = await fetch('https://api.2captcha.com/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientKey: API_KEY,
        task
      })
    });
    
    const createResult = await createResponse.json();
    console.log('2captcha创建任务响应:', createResult);
    
    if (createResult.errorId !== 0) {
      throw new Error(`2captcha创建任务失败: ${createResult.errorDescription}`);
    }
    
    const taskId = createResult.taskId;
    console.log('任务ID:', taskId);
    
    // 轮询获取结果
    const maxAttempts = 30;
    const pollInterval = 10000; // 10秒
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const resultResponse = await fetch('https://api.2captcha.com/getTaskResult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientKey: API_KEY,
          taskId
        })
      });
      
      const result = await resultResponse.json();
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
    }
    
    throw new Error('验证码解决超时');
    
  } catch (error) {
    console.error('Turnstile解决失败:', error);
    throw error;
  }
}

module.exports = {
  performGaeaLogin,
  solveTurnstile
};
