const { PlaywrightCrawler, ProxyConfiguration, Configuration } = require('crawlee');
const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

module.exports = (context) => {
  let pythonProcess = null;
  let proxyQueue = [];

  // 初始化 Python 代理管理进程
  function initializeProxyManager() {
    const proxyManagerPath = path.join(app.getPath('userData'), 'plugins', 'proxy-manager');
    const scriptPath = path.join(proxyManagerPath, 'proxy_manager.py');

    if (!require('fs').existsSync(scriptPath)) {
      console.error('Proxy manager script not found:', scriptPath);
      return;
    }

    pythonProcess = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    if (!pythonProcess || !pythonProcess.stdout || !pythonProcess.stderr || !pythonProcess.stdin) {
      console.error('Failed to initialize proxy manager - process or streams are null');
      return;
    }

    console.log('Proxy manager initialized successfully at:', proxyManagerPath);

    pythonProcess.stdout.on('data', (data) => {
      try {
        const proxy = JSON.parse(data.toString().trim());
        proxyQueue.push(proxy);
        console.log('Received proxy:', proxy);
      } catch (error) {
        console.error('Failed to parse proxy data:', error);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
    });

    pythonProcess.on('exit', (code) => {
      console.log('Python process exited with code:', code);
    });
  }

  // 获取代理 URL
  async function getProxyUrl() {
    if (proxyQueue.length === 0 && pythonProcess && pythonProcess.stdin.writable) {
      pythonProcess.stdin.write('get_next_proxy\n');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待代理响应
    }
    return proxyQueue.length > 0 ? proxyQueue.shift() : null;
  }

  // 打开带代理的浏览器窗口
  async function openProxyBrowser(url) {
    const proxyUrl = await getProxyUrl();
    if (!proxyUrl) {
      console.error('No proxy available');
      return null;
    }

    const proxyConfig = new ProxyConfiguration({
      proxyUrls: [proxyUrl],
      rotateProxies: false,
    });

    const browserWindow = new context.BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      const crawler = new PlaywrightCrawler({
        browserPoolOptions: {
          browserPlugins: [
            {
              connectOptions: {
                proxy: {
                  server: proxyUrl,
                },
              },
            },
          ],
        },
        proxyConfiguration: proxyConfig,
        launchContext: {
          launchOptions: {
            headless: false, // 头显模式，便于观察
          },
        },
        requestHandler: async ({ page }) => {
          await page.goto(url, { waitUntil: 'networkidle2' });
          console.log(`Loaded ${url} with proxy ${proxyUrl}`);
        },
      });

      await crawler.run([url]);
      browserWindow.loadURL(url); // 直接加载 URL
    } catch (error) {
      console.error('Error opening proxy browser:', error);
      browserWindow.close();
    }

    return browserWindow;
  }

  // 检测登录状态
  async function checkLoginStatus(url, loginIndicators = []) {
    const proxyUrl = await getProxyUrl();
    if (!proxyUrl) {
      console.error('No proxy available for login check');
      return { success: false, error: 'No proxy available' };
    }

    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        proxy: {
          server: proxyUrl
        }
      });
      
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // 检查登录状态
      const isLoggedIn = await page.evaluate((indicators) => {
        // 默认检查常见的登录指示器
        const defaultIndicators = [
          'button[data-testid="login"]',
          'a[href*="login"]',
          '.login-button',
          '#login',
          '[class*="login"]'
        ];
        
        const allIndicators = [...defaultIndicators, ...indicators];
        
        for (const selector of allIndicators) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            return false; // 找到登录按钮，说明未登录
          }
        }
        
        // 检查是否有用户信息显示
        const userIndicators = [
          '[data-testid="user"]',
          '.user-info',
          '.profile',
          '[class*="user"]',
          '[class*="profile"]'
        ];
        
        for (const selector of userIndicators) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            return true; // 找到用户信息，说明已登录
          }
        }
        
        return false; // 默认认为未登录
      }, loginIndicators);
      
      await browser.close();
      
      return {
        success: true,
        isLoggedIn,
        proxy: proxyUrl
      };
    } catch (error) {
      console.error('Login status check failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 有头浏览器登录
  async function performLogin(url, loginConfig = {}) {
    const proxyUrl = await getProxyUrl();
    if (!proxyUrl) {
      console.error('No proxy available for login');
      return { success: false, error: 'No proxy available' };
    }

    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ 
        headless: false, // 有头模式，便于用户操作
        slowMo: 1000,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        proxy: {
          server: proxyUrl
        }
      });
      
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      
      console.log('请在有头浏览器中完成登录操作...');
      
      // 等待用户完成登录
      if (loginConfig.waitForLogin) {
        await page.waitForFunction(loginConfig.waitForLogin, {}, { timeout: 300000 }); // 5分钟超时
      } else {
        // 默认等待登录完成：等待登录按钮消失或用户信息出现
        await page.waitForFunction(() => {
          const loginButton = document.querySelector('button[data-testid="login"], a[href*="login"], .login-button, #login');
          const userInfo = document.querySelector('[data-testid="user"], .user-info, .profile');
          return !loginButton || userInfo;
        }, {}, { timeout: 300000 });
      }
      
      // 保存 cookies 和 localStorage
      const cookies = await context.cookies();
      const localStorage = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          storage[key] = window.localStorage.getItem(key);
        }
        return storage;
      });
      
      await browser.close();
      
      return {
        success: true,
        cookies,
        localStorage,
        proxy: proxyUrl
      };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 抓取 localStorage 信息
  async function scrapeLocalStorage(url, targetKeys = [], sessionData = null) {
    const proxyUrl = await getProxyUrl();
    if (!proxyUrl) {
      console.error('No proxy available for scraping');
      return { success: false, error: 'No proxy available' };
    }

    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ 
        headless: true, // 无头模式
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        proxy: {
          server: proxyUrl
        }
      });
      
      // 如果有会话数据，恢复 cookies
      if (sessionData && sessionData.cookies) {
        await context.addCookies(sessionData.cookies);
      }
      
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // 抓取 localStorage 数据
      const localStorageData = await page.evaluate((keys) => {
        const storage = {};
        
        if (keys.length === 0) {
          // 如果没有指定键，抓取所有 localStorage
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            storage[key] = window.localStorage.getItem(key);
          }
        } else {
          // 只抓取指定的键
          for (const key of keys) {
            storage[key] = window.localStorage.getItem(key);
          }
        }
        
        return storage;
      }, targetKeys);
      
      // 获取页面基本信息
      const pageInfo = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      }));
      
      await browser.close();
      
      return {
        success: true,
        data: {
          ...pageInfo,
          localStorage: localStorageData,
          proxy: proxyUrl
        }
      };
    } catch (error) {
      console.error('LocalStorage scraping failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 完整的抓取流程：检测登录状态 -> 登录（如需要）-> 抓取数据
  async function scrapeWithLogin(url, options = {}) {
    const {
      targetKeys = [], // 要抓取的 localStorage 键
      loginIndicators = [], // 登录状态检测指示器
      loginConfig = {}, // 登录配置
      maxRetries = 3
    } = options;

    try {
      console.log('开始抓取流程:', url);
      
      // 步骤1: 检测登录状态
      console.log('检测登录状态...');
      const loginStatus = await checkLoginStatus(url, loginIndicators);
      
      if (!loginStatus.success) {
        return {
          success: false,
          error: `登录状态检测失败: ${loginStatus.error}`
        };
      }
      
      let sessionData = null;
      
      if (!loginStatus.isLoggedIn) {
        console.log('未登录，需要执行登录操作...');
        
        // 步骤2: 执行登录
        const loginResult = await performLogin(url, loginConfig);
        
        if (!loginResult.success) {
          return {
            success: false,
            error: `登录失败: ${loginResult.error}`
          };
        }
        
        sessionData = {
          cookies: loginResult.cookies,
          localStorage: loginResult.localStorage
        };
        
        console.log('登录成功，保存会话数据');
      } else {
        console.log('已登录，直接进行数据抓取');
      }
      
      // 步骤3: 抓取 localStorage 数据
      console.log('开始抓取 localStorage 数据...');
      const scrapeResult = await scrapeLocalStorage(url, targetKeys, sessionData);
      
      if (!scrapeResult.success) {
        return {
          success: false,
          error: `数据抓取失败: ${scrapeResult.error}`
        };
      }
      
      console.log('抓取完成');
      
      return {
        success: true,
        data: {
          ...scrapeResult.data,
          loginRequired: !loginStatus.isLoggedIn,
          sessionData: sessionData
        }
      };
      
    } catch (error) {
      console.error('完整抓取流程失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 插件初始化
  function init() {
    initializeProxyManager();
    context.registerAction('openProxyBrowser', openProxyBrowser);
    context.registerAction('checkLoginStatus', checkLoginStatus);
    context.registerAction('performLogin', performLogin);
    context.registerAction('scrapeLocalStorage', scrapeLocalStorage);
    context.registerAction('scrapeWithLogin', scrapeWithLogin);
    console.log('Proxy Browser plugin initialized with localStorage scraping capabilities');
  }

  return {
    init,
  };
};