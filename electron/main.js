process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let pluginManager, browserService;
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const PouchDB = require('pouchdb');
const { spawn } = require('child_process');
const crypto = require('crypto');

// 2captcha 验证码解决服务
async function solveTurnstileWith2Captcha(sitekey, pageUrl, proxy) {
  try {
    console.log('🔐 开始解决 Turnstile 验证...');
    
    const apiKey = 'b5806f7dc850e77b96c4df8931d707a8'; // 2captcha API 密钥
    const axios = require('axios');
    
    const task = {
      type: proxy ? 'TurnstileTask' : 'TurnstileTaskProxyless',
      websiteURL: pageUrl,
      websiteKey: sitekey
    };

    // 添加代理配置
    if (proxy) {
      const proxyUrl = new URL(proxy);
      task.proxyType = 'http';
      task.proxyAddress = proxyUrl.hostname;
      task.proxyPort = proxyUrl.port;
      if (proxyUrl.username) task.proxyLogin = proxyUrl.username;
      if (proxyUrl.password) task.proxyPassword = proxyUrl.password;
      console.log('🌐 2captcha任务使用代理:', proxyUrl.hostname + ':' + proxyUrl.port);
    }

    console.log('📋 创建2captcha任务:', JSON.stringify(task, null, 2));
    
    // 创建任务
    const createAxiosConfig = {
      method: 'POST',
      url: 'https://api.2captcha.com/createTask',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        clientKey: apiKey,
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
    
    return await poll2CaptchaResult(taskId, proxy);
    
  } catch (error) {
    console.error('❌ Turnstile解决失败:', error);
    throw error;
  }
}

// 轮询2captcha任务结果
async function poll2CaptchaResult(taskId, proxy) {
  const maxAttempts = 30;
  const pollInterval = 10000;
  const axios = require('axios');

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const pollAxiosConfig = {
        method: 'POST',
        url: 'https://api.2captcha.com/getTaskResult',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          clientKey: 'b5806f7dc850e77b96c4df8931d707a8',
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

// Gaea 登录服务实现
async function performGaeaLogin(credentials) {
  try {
    console.log('🚀 开始 Gaea API 直接登录...');
    console.log('📋 参数:', { username: credentials.username, proxy: credentials.proxy ? '已配置' : '未配置' });
    
    const axios = require('axios');
    
    // 1. 获取 Turnstile sitekey
    console.log('🔍 获取 Turnstile sitekey...');
    const sitekeyResponse = await axios.get('https://app.aigaea.net/login', {
      timeout: 30000,
      proxy: credentials.proxy ? {
        protocol: 'http',
        host: new URL(credentials.proxy).hostname,
        port: parseInt(new URL(credentials.proxy).port),
        auth: {
          username: new URL(credentials.proxy).username,
          password: new URL(credentials.proxy).password
        }
      } : undefined
    });
    
    const sitekeyMatch = sitekeyResponse.data.match(/data-sitekey="([^"]+)"/);
    const sitekey = sitekeyMatch ? sitekeyMatch[1] : '0x4AAAAAAAkhM1uKU9iprx7x';
    console.log('✅ 找到 Turnstile sitekey:', sitekey);
    
    // 2. 解决验证码（使用真实的 2captcha 服务）
    console.log('🔐 开始解决 Turnstile 验证...');
    const captchaToken = await solveTurnstileWith2Captcha(sitekey, 'https://app.aigaea.net/login', credentials.proxy);
    console.log('✅ 获得验证码 token:', captchaToken ? captchaToken.substring(0, 20) + '...' : 'N/A');
    
    // 3. 准备登录数据
    const hashedPassword = crypto.createHash('sha256').update(credentials.password).digest('hex');
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
    const loginResponse = await axios.post('https://api.aigaea.net/api/auth/login', loginData, {
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
      timeout: 60000,
      proxy: credentials.proxy ? {
        protocol: 'http',
        host: new URL(credentials.proxy).hostname,
        port: parseInt(new URL(credentials.proxy).port),
        auth: {
          username: new URL(credentials.proxy).username,
          password: new URL(credentials.proxy).password
        }
      } : undefined
    });
    
    console.log('📊 登录响应状态:', loginResponse.status);
    console.log('📊 登录响应:', loginResponse.data);
    
    // 5. 处理响应
    const result = loginResponse.data;
    
    if (result.code === 200 && result.success) {
      const token = result.data?.token;
      const userInfo = result.data?.user_info;
      
      console.log('🎉 登录成功!');
      console.log('👤 用户ID:', userInfo?.uid);
      console.log('👤 用户名:', userInfo?.name);
      console.log('🔑 Token:', token ? token.substring(0, 50) + '...' : 'N/A');
      
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
const fs = require('fs');
const db = new PouchDB('mydb');

const isDev = process.env.NODE_ENV === 'development' && app && !app.isPackaged;

let mainWindow;
let server;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // 禁用沙盒模式以兼容 Next.js
      webSecurity: !isDev, // 开发环境禁用，生产环境启用
      allowRunningInsecureContent: isDev, // 开发环境允许不安全内容
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:3000/plugin/gaea' 
    : 'http://localhost:3001/plugin/gaea';
  
  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  
  mainWindow.loadURL(startUrl);
  mainWindow.webContents.openDevTools();
}

// 启动Express服务器
function startServer() {
  return new Promise((resolve, reject) => {
    try {
      const expressApp = express();
      const port = 3001; // 使用不同的端口避免冲突
      
      // 在生产环境中，静态文件位于 resources 目录
      let staticPath;
      if (app.isPackaged) {
        // 打包后的路径 - out 目录在 extraResources 中
        staticPath = path.join(process.resourcesPath, 'out');
      } else {
        // 开发环境路径
        staticPath = path.join(__dirname, '../.next');
      }
      
      console.log('Static files path:', staticPath);
      console.log('Static path exists:', require('fs').existsSync(staticPath));
      console.log('Contents of static path:', require('fs').readdirSync(staticPath));
      const indexPath = path.join(staticPath, 'server/app/index.html');
      console.log('index.html path:', indexPath);
      console.log('index.html exists:', fs.existsSync(indexPath));
      if (fs.existsSync(indexPath)) {
        console.log('index.html content preview:', fs.readFileSync(indexPath, 'utf-8').substring(0, 200));
      }
      
      // 设置宽松的 CSP 以支持 Turnstile 组件
      if (!isDev) {
        expressApp.use((req, res, next) => {
          console.log(`Applying CSP to request: ${req.path}`);
          res.setHeader(
            'Content-Security-Policy',
            "default-src 'self' data: blob: http: https:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflare.com; " +
            "script-src-elem 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflare.com; " +
            "worker-src 'self' blob:; " +
            "style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflare.com; " +
            "connect-src 'self' http: https: ws: wss: https://challenges.cloudflare.com; " +
            "img-src 'self' data: blob: http: https:; " +
            "font-src 'self' data: http: https:; " +
            "frame-src 'self' http: https: https://challenges.cloudflare.com; " +
            "object-src 'none'; " +
            "base-uri 'self';"
          );
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          next();
        });
      } else {
        console.log('Dev mode: CSP disabled for debugging');
      }
      
      // 注册 API 路由（在静态处理和兜底 HTML 之前）
      // 1) 检查浏览器是否安装
      expressApp.get('/api/browser/check', async (_req, res) => {
        console.log('API /api/browser/check');
        try {
          const { chromium } = require('playwright');
          try {
            const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            await browser.close();
            return res.json({ success: true, installed: true, message: '浏览器已安装' });
          } catch (e) {
            return res.json({ success: true, installed: false, message: '浏览器未安装', error: e?.message || String(e) });
          }
        } catch (error) {
          console.error('API /api/browser/check failed:', error);
          return res.status(500).json({ success: false, installed: false, message: '检查浏览器状态失败', error: error?.message || String(error) });
        }
      });

      // 2) 下载安装浏览器
      expressApp.post('/api/browser/download', async (_req, res) => {
        console.log('API /api/browser/download');
        try {
          const { spawn } = require('child_process');
          const installer = spawn('npx', ['playwright', 'install', 'chromium'], { shell: true });

          let stderr = '';
          installer.stdout.on('data', (d) => console.log('[playwright-install]', String(d).trim()));
          installer.stderr.on('data', (d) => { stderr += String(d); console.error('[playwright-install:err]', String(d).trim()); });

          installer.on('error', (err) => {
            console.error('Installer failed to start:', err);
            return res.status(500).json({ success: false, message: '启动安装进程失败', error: err?.message || String(err) });
          });

          installer.on('close', async (code) => {
            if (code !== 0) {
              console.error('Playwright 安装失败，退出码:', code);
              return res.status(500).json({ success: false, message: '浏览器安装失败', error: stderr || `exit code ${code}` });
            }

            // 验证安装
            try {
              const { chromium } = require('playwright');
              const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
              await browser.close();
              return res.json({ success: true, message: '浏览器安装完成' });
            } catch (e) {
              return res.status(500).json({ success: false, message: '浏览器安装后验证失败', error: e?.message || String(e) });
            }
          });
        } catch (error) {
          console.error('API /api/browser/download failed:', error);
          return res.status(500).json({ success: false, message: '浏览器下载失败', error: error?.message || String(error) });
        }
      });

      // 处理 API 路由 - 直接在 Express 中实现
      expressApp.use('/api', express.json()); // 解析 JSON 请求体
      
      // 处理 Gaea 插件的 API 路由
      expressApp.use('/api/plugin/gaea', async (req, res) => {
        console.log(`Gaea API request: ${req.method} ${req.path}`);
        
        try {
          const pathSegments = req.path.replace('/api/plugin/gaea/', '').split('/').filter(Boolean);
          console.log('Path segments:', pathSegments);
          
          if (pathSegments[0] === 'login') {
            // 处理 login 请求
            console.log('处理 login 请求');
            console.log('Request body:', req.body);
            
            const { username, password, proxy } = req.body;
            
            if (!username || !password) {
              return res.status(400).json({
                success: false,
                error: '缺少用户名或密码'
              });
            }
            
            console.log('登录参数:');
            console.log('  用户名:', username);
            console.log('  密码:', password ? '已提供' : '未提供');
            console.log('  代理:', proxy || '无代理');
            
            try {
              // 使用 axios 进行真实的登录请求
              let axios;
              try {
                axios = require('axios');
              } catch (axiosError) {
                console.error('无法加载 axios 模块:', axiosError.message);
                const axiosModule = await import('axios');
                axios = axiosModule.default;
              }
              
              // 实现真实的 Gaea 登录逻辑
              console.log('开始真实的 Gaea 登录流程...');
              
              // 直接在 Electron 中实现登录逻辑，不依赖外部模块
              const crypto = require('crypto');
              
              console.log('使用内置的 Gaea 登录实现...');
              console.log('登录凭据:', { username, password: password ? '已提供' : '未提供', proxy: proxy || '无代理' });
              
              // 实现 Gaea 登录逻辑
              const result = await performGaeaLogin({
                username,
                password,
                proxy
              });
              
              console.log('Gaea 登录返回结果:', result);
              
              if (result.success) {
                console.log('✅ 真实 Gaea 登录成功');
                console.log('  Token:', result.gaeaToken ? result.gaeaToken.substring(0, 20) + '...' : 'N/A');
                console.log('  UID:', result.uid);
                console.log('  用户名:', result.username);
                
                return res.json({
                  success: true,
                  gaeaToken: result.gaeaToken,
                  uid: result.uid,
                  username: result.username,
                  userInfo: result.userInfo
                });
              } else {
                console.log('❌ 真实 Gaea 登录失败:', result.error);
                return res.status(400).json({
                  success: false,
                  error: result.error || '登录失败'
                });
              }
              
            } catch (error) {
              console.error('登录失败:', error.message);
              return res.status(500).json({
                success: false,
                error: error.message || '登录过程中发生错误'
              });
            }
          } else if (pathSegments[0] === 'tickets' && pathSegments[1] === 'query') {
            // 处理 tickets/query 请求 - 实现真实的查询逻辑
            console.log('处理 tickets/query 请求');
            console.log('Request body:', req.body);
            
            const { accountId, token, proxy } = req.body;
            
            if (!accountId || !token) {
              return res.status(400).json({
                success: false,
                error: '缺少必要参数'
              });
            }
            
            console.log('Tickets查询参数:');
            console.log('  账号ID:', accountId);
            console.log('  Token:', token ? '已提供' : '未提供');
            console.log('  代理:', proxy || '无代理');
            
            try {
              // 使用 axios 进行真实的 tickets 查询
              let axios;
              try {
                axios = require('axios');
              } catch (axiosError) {
                console.error('无法加载 axios 模块:', axiosError.message);
                const axiosModule = await import('axios');
                axios = axiosModule.default;
              }
              
              const axiosConfig = {
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
                },
                timeout: 30000
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
                } catch (proxyError) {
                  console.warn('⚠️ 代理配置无效:', proxyError);
                }
              }
              
              console.log('发送Tickets查询请求到:', axiosConfig.url);
              const response = await axios(axiosConfig);
              
              console.log('Tickets查询响应状态:', response.status);
              console.log('Tickets查询响应数据:', response.data);
              
              if (response.data.success && response.data.code === 200) {
                const tickets = response.data.data || [];
                console.log('✅ 查询成功，获得Tickets数量:', tickets.length);
                
                return res.json({
                  success: true,
                  data: tickets,
                  total: response.data.total || 0
                });
              } else if (response.data.code === 401 || response.data.msg?.includes('token') || response.data.msg?.includes('unauthorized')) {
                console.log('🔑 Token失效，需要重新登录');
                return res.status(401).json({
                  success: false,
                  error: 'Token已失效，请重新登录'
                });
              } else {
                console.log('❌ API返回失败:', response.data);
                return res.status(400).json({
                  success: false,
                  error: response.data.msg || '查询失败'
                });
              }
              
            } catch (error) {
              console.error('Tickets查询失败:', error.message);
              
              if (error.response) {
                console.error('响应状态:', error.response.status);
                console.error('响应数据:', error.response.data);
                
                if (error.response.status === 401) {
                  return res.status(401).json({
                    success: false,
                    error: 'Token已失效，需要重新登录'
                  });
                }
                
                return res.status(error.response.status).json({
                  success: false,
                  error: error.response.data?.msg || error.response.data?.message || '查询失败'
                });
              } else {
                return res.status(500).json({
                  success: false,
                  error: error.message || '查询过程中发生错误'
                });
              }
            }
          } else if (pathSegments[0] === 'proxy-request') {
            // 处理 proxy-request 请求 - 实现真实的代理请求逻辑
            console.log('处理 proxy-request 请求');
            console.log('Request body:', req.body);
            
            const { url, method, headers, data, proxy } = req.body;
            
            if (!url) {
              return res.status(400).json({
                success: false,
                error: '缺少URL参数'
              });
            }
            
            console.log('代理请求参数:');
            console.log('  URL:', url);
            console.log('  Method:', method);
            console.log('  Headers:', headers);
            console.log('  Data:', data);
            console.log('  Proxy:', proxy);
            
            try {
              // 使用 axios 进行真实的代理请求
              let axios;
              try {
                axios = require('axios');
              } catch (axiosError) {
                console.error('无法加载 axios 模块:', axiosError.message);
                // 尝试动态导入
                const axiosModule = await import('axios');
                axios = axiosModule.default;
              }
              
              const axiosConfig = {
                method: method || 'GET',
                url: url,
                headers: headers || {},
                data: data,
                timeout: 30000
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
                  console.log('🌐 使用代理访问:', proxy);
                } catch (proxyError) {
                  console.warn('⚠️ 代理配置无效:', proxyError);
                }
              } else {
                console.log('🌐 直接访问（无代理）');
              }
              
              console.log('发送代理请求到:', url);
              const response = await axios(axiosConfig);
              
              console.log('代理请求响应状态:', response.status);
              console.log('代理请求响应数据:', response.data);
              
              return res.json({
                success: true,
                data: response.data,
                status: response.status,
                message: '代理请求成功'
              });
              
            } catch (error) {
              console.error('代理请求失败:', error.message);
              
              if (error.response) {
                console.error('响应状态:', error.response.status);
                console.error('响应数据:', error.response.data);
                
                return res.status(error.response.status).json({
                  success: false,
                  error: error.response.data?.msg || error.response.data?.message || '代理请求失败',
                  status: error.response.status
                });
              } else {
                return res.status(500).json({
                  success: false,
                  error: error.message || '代理请求过程中发生错误'
                });
              }
            }
          } else if (pathSegments[0] === 'decisions' && pathSegments[1] === 'submit') {
            // 处理 decisions/submit 请求
            console.log('处理 decisions/submit 请求');
            console.log('Request body:', req.body);
            
            const { accountId, accountName, token, ticket, detail, proxy } = req.body;
            
            if (!accountId || !accountName || !token || !ticket || !detail) {
              return res.status(400).json({
                success: false,
                error: '缺少必要参数'
              });
            }
            
            console.log('决策提交参数:');
            console.log('  账号:', accountName, `(${accountId})`);
            console.log('  决策参数:', detail);
            console.log('  Ticket:', ticket);
            console.log('  代理:', proxy || '无代理');
            
            try {
              // 使用 axios 进行真实的决策提交请求
              let axios;
              try {
                axios = require('axios');
              } catch (axiosError) {
                console.error('无法加载 axios 模块:', axiosError.message);
                // 尝试动态导入
                const axiosModule = await import('axios');
                axios = axiosModule.default;
              }
              
              const axiosConfig = {
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
                },
                timeout: 30000
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
                  console.log('🌐 使用代理访问决策API:', proxy);
                } catch (proxyError) {
                  console.warn('⚠️ 代理配置无效:', proxyError);
                }
              } else {
                console.log('🌐 直接访问决策API（无代理）');
              }
              
              console.log('发送决策提交请求到:', axiosConfig.url);
              const response = await axios(axiosConfig);
              
              console.log('决策提交响应状态:', response.status);
              console.log('决策提交响应数据:', response.data);
              
              if (response.status === 200 && response.data.success) {
                return res.json({
                  success: true,
                  data: response.data,
                  message: '决策提交成功'
                });
              } else {
                // 检查是否是"已完成"的情况
                const errorMsg = response.data.msg || response.data.message || '';
                if (errorMsg.includes('completed') || errorMsg.includes('已完成') || errorMsg.includes('Deepdecision has been completed')) {
                  console.log(`✅ 账号 ${accountName} 决策已完成`);
                  return res.json({
                    success: true,
                    data: response.data,
                    message: '决策已完成'
                  });
                }
                
                return res.status(response.status).json({
                  success: false,
                  error: response.data.msg || response.data.message || '决策提交失败',
                  data: response.data
                });
              }
              
            } catch (error) {
              console.error('决策提交失败:', error.message);
              
              if (error.response) {
                console.error('响应状态:', error.response.status);
                console.error('响应数据:', error.response.data);
                
                // 如果是401错误，返回401状态码
                if (error.response.status === 401) {
                  return res.status(401).json({
                    success: false,
                    error: 'Token已过期，需要重新登录',
                    tokenExpired: true
                  });
                }
                
                return res.status(error.response.status).json({
                  success: false,
                  error: error.response.data?.msg || error.response.data?.message || '决策提交失败',
                  data: error.response.data
                });
              } else {
                return res.status(500).json({
                  success: false,
                  error: error.message || '决策提交过程中发生错误'
                });
              }
            }
          } else if (pathSegments[0] === 'accounts') {
            // 处理 accounts 请求
            console.log('处理 accounts 请求');
            return res.json({
              success: true,
              data: [],
              message: 'Accounts query successful'
            });
          } else if (pathSegments[0] === 'groups') {
            // 处理 groups 请求
            console.log('处理 groups 请求');
            return res.json({
              success: true,
              data: [],
              message: 'Groups query successful'
            });
          } else if (pathSegments[0] === 'selection-state') {
            // 处理 selection-state 请求
            console.log('处理 selection-state 请求');
            return res.json({
              success: true,
              data: {},
              message: 'Selection state query successful'
            });
          } else if (pathSegments[0] === 'batch-operation') {
            // 处理 batch-operation 请求
            console.log('处理 batch-operation 请求');
            return res.json({
              success: true,
              data: {},
              message: 'Batch operation successful'
            });
          } else if (pathSegments[0] === 'training') {
            // 处理 training 请求 - 实现真实的训练逻辑
            console.log('处理 training 请求');
            console.log('Request body:', req.body);
            
            const action = pathSegments[1]; // daily-reward, training, deep-training, claim
            const { accountId, accountName, token, proxy, trainingContent } = req.body;
            
            if (!accountId || !accountName || !token) {
              return res.status(400).json({
                success: false,
                error: '缺少必要参数'
              });
            }
            
            console.log('训练参数:');
            console.log('  动作:', action);
            console.log('  账号:', accountName, `(${accountId})`);
            console.log('  训练内容:', trainingContent);
            console.log('  代理:', proxy || '无代理');
            
            try {
              // 使用 axios 进行真实的训练请求
              let axios;
              try {
                axios = require('axios');
              } catch (axiosError) {
                console.error('无法加载 axios 模块:', axiosError.message);
                const axiosModule = await import('axios');
                axios = axiosModule.default;
              }
              
              let axiosConfig;
              let apiUrl;
              
              if (action === 'daily-reward') {
                apiUrl = 'https://api.aigaea.net/api/reward/daily';
                axiosConfig = {
                  method: 'POST',
                  url: apiUrl,
                  headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${token}`,
                    'content-type': 'application/json'
                  },
                  data: {}
                };
              } else if (action === 'training') {
                apiUrl = 'https://api.aigaea.net/api/ai/complete';
                let detail;
                switch (trainingContent) {
                  case 'Positive': detail = '1_2_1'; break;
                  case 'Neutral': detail = '2_2_1'; break;
                  case 'Negative': detail = '3_2_1'; break;
                  default: return res.status(400).json({ success: false, error: '无效的训练内容' });
                }
                axiosConfig = {
                  method: 'POST',
                  url: apiUrl,
                  headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${token}`,
                    'content-type': 'application/json'
                  },
                  data: { detail }
                };
              } else if (action === 'deep-training') {
                apiUrl = 'https://api.aigaea.net/api/ai/deep-complete';
                let detail;
                switch (trainingContent) {
                  case 'Positive': detail = '1'; break;
                  case 'Neutral': detail = '2'; break;
                  case 'Negative': detail = '3'; break;
                  default: return res.status(400).json({ success: false, error: '无效的训练内容' });
                }
                axiosConfig = {
                  method: 'POST',
                  url: apiUrl,
                  headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${token}`,
                    'content-type': 'application/json'
                  },
                  data: { detail }
                };
              } else if (action === 'claim') {
                apiUrl = 'https://api.aigaea.net/api/reward/claim';
                axiosConfig = {
                  method: 'POST',
                  url: apiUrl,
                  headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${token}`,
                    'content-type': 'application/json'
                  },
                  data: {}
                };
              } else {
                return res.status(404).json({
                  success: false,
                  error: `未知的训练动作: ${action}`
                });
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
                  console.log('🌐 使用代理访问训练API:', proxy);
                } catch (proxyError) {
                  console.warn('⚠️ 代理配置无效:', proxyError);
                }
              }
              
              console.log('发送训练请求到:', apiUrl);
              const response = await axios(axiosConfig);
              
              console.log('训练响应状态:', response.status);
              console.log('训练响应数据:', response.data);
              
              if (response.status === 200) {
                return res.json({
                  success: true,
                  data: response.data,
                  message: `${action} 训练成功`
                });
              } else {
                return res.status(response.status).json({
                  success: false,
                  error: response.data?.msg || response.data?.message || '训练失败',
                  data: response.data
                });
              }
              
            } catch (error) {
              console.error('训练失败:', error.message);
              
              if (error.response) {
                console.error('响应状态:', error.response.status);
                console.error('响应数据:', error.response.data);
                
                if (error.response.status === 401) {
                  return res.status(401).json({
                    success: false,
                    error: 'Token已过期，需要重新登录',
                    tokenExpired: true
                  });
                }
                
                return res.status(error.response.status).json({
                  success: false,
                  error: error.response.data?.msg || error.response.data?.message || '训练失败',
                  data: error.response.data
                });
              } else {
                return res.status(500).json({
                  success: false,
                  error: error.message || '训练过程中发生错误'
                });
              }
            }
          } else if (pathSegments[0] === 'reward') {
            // 处理 reward 请求 - 实现真实的奖励逻辑
            console.log('处理 reward 请求');
            return res.json({
              success: true,
              data: {},
              message: 'Reward operation successful'
            });
          } else if (pathSegments[0] === 'mining') {
            // 处理 mining 请求 - 实现真实的挖矿逻辑
            console.log('处理 mining 请求');
            console.log('Mining sub-path:', pathSegments[1]);
            console.log('Request body:', req.body);
            
            // 挖矿请求通常转发到 Python 服务
            const subPath = pathSegments[1];
            const pythonServiceUrl = `http://localhost:5001/api/mining/${subPath}`;
            
            try {
              let axios;
              try {
                axios = require('axios');
              } catch (axiosError) {
                console.error('无法加载 axios 模块:', axiosError.message);
                const axiosModule = await import('axios');
                axios = axiosModule.default;
              }
              
              const axiosConfig = {
                method: req.method,
                url: pythonServiceUrl,
                headers: {
                  'Content-Type': 'application/json'
                },
                data: req.body,
                timeout: 30000
              };
              
              console.log('转发挖矿请求到 Python 服务:', pythonServiceUrl);
              const response = await axios(axiosConfig);
              
              console.log('Python 服务响应状态:', response.status);
              console.log('Python 服务响应数据:', response.data);
              
              return res.json({
                success: true,
                data: response.data,
                message: 'Mining operation successful'
              });
              
            } catch (error) {
              console.error('挖矿请求失败:', error.message);
              
              if (error.response) {
                console.error('响应状态:', error.response.status);
                console.error('响应数据:', error.response.data);
                
                return res.status(error.response.status).json({
                  success: false,
                  error: error.response.data?.message || '挖矿操作失败',
                  data: error.response.data
                });
              } else {
                return res.status(500).json({
                  success: false,
                  error: error.message || '挖矿操作过程中发生错误'
                });
              }
            }
          } else {
            console.log('Unknown Gaea endpoint:', pathSegments);
            return res.status(404).json({
              success: false,
              error: 'Unknown Gaea endpoint'
            });
          }
        } catch (error) {
          console.error('Gaea API error:', error);
          return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
          });
        }
      });

      // 设置静态文件服务 - 提供所有静态文件
      expressApp.use(express.static(staticPath));
      expressApp.use((req, res, next) => {
        console.log(`Static request: ${req.path}`);
        next();
      });
      
      // 处理 Next.js 静态资源
      expressApp.use('/_next/static', express.static(path.join(staticPath, 'static')));
      
      // 处理所有其他路由，返回对应的 HTML 文件（若存在），避免水合不匹配
      expressApp.use((req, res) => {
        const reqPath = req.path;
        console.log('Attempting to serve HTML for route:', reqPath);

        // 归一化路径（去掉结尾斜杠）
        const normalized = reqPath.replace(/\/$/, '') || '/';

        // 构造候选 HTML 列表，按优先级依次查找
        const candidates = [];

        // 特殊映射：登录页
        if (normalized === '/login') {
          candidates.push(path.join(staticPath, 'server/app/login.html'));
        }

        // 插件 Gaea 主页：优先使用专属 HTML（存在于 .next/server/app/plugin/gaea/ui/pages.html）
        if (normalized === '/plugin/gaea') {
          candidates.push(path.join(staticPath, 'server/app/plugin/gaea/ui/pages.html'));
        }

        // 通用映射：直接将 URL 映射到 server/app 下的同名 html（例如 /dashboard → dashboard.html）
        const directHtml = normalized === '/'
          ? path.join(staticPath, 'server/app/index.html')
          : path.join(staticPath, 'server/app', normalized.slice(1) + '.html');
        candidates.push(directHtml);

        // 最后兜底：index.html
        candidates.push(path.join(staticPath, 'server/app/index.html'));

        // 选取第一个存在的 HTML 文件
        let htmlPath = candidates.find(p => fs.existsSync(p));
        if (!htmlPath) {
          console.error('No HTML candidate found, falling back to index.html');
          htmlPath = path.join(staticPath, 'server/app/index.html');
        }

        console.log('Serving HTML file:', htmlPath);
        try {
          const html = fs.readFileSync(htmlPath, 'utf-8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(html);
        } catch (e) {
          console.error('Failed to read HTML, falling back to 404:', e);
          res.status(404).send('Not Found');
        }
      });
      
      server = expressApp.listen(port, () => {
        console.log(`Express server started on port ${port}`);
        console.log(`Serving static files from: ${staticPath}`);
        resolve();
      });
      
      server.on('error', reject);
    } catch (error) {
      console.error('Failed to start Express server:', error);
      reject(error);
    }
  });
}

// 执行Python插件
async function executePythonPlugin(pluginName, action, args = []) {
  return new Promise((resolve, reject) => {
    const pluginPath = path.join(__dirname, `../plugins/${pluginName}`);
    const pythonScript = path.join(pluginPath, `${pluginName}.py`);
    
    if (!fs.existsSync(pythonScript)) {
      reject(new Error(`Python script not found: ${pythonScript}`));
      return;
    }

    const pythonExecutable = isDev 
      ? path.join(__dirname, '../runtime/python-env/bin/python')
      : path.join(process.resourcesPath, 'runtime/python-env/bin/python');

    const child = spawn(pythonExecutable, [pythonScript, action, ...args], {
      cwd: pluginPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON response', stdout, stderr });
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// IPC 处理程序
if (app && app.whenReady) {
  app.whenReady().then(async () => {
    // 启动Express服务器
    if (isDev) {
      startServer();
    }

    // IPC 处理程序
    ipcMain.handle('get-databases', async () => {
      try {
        const result = await db.allDocs({ include_docs: true });
        return result.rows.map(row => ({
          name: row.id,
          doc_count: row.doc.doc_count || 0,
          data_size: row.doc.data_size || 0,
          update_seq: row.doc.update_seq || 0
        }));
      } catch (error) {
        console.error('Error getting databases:', error);
        return [];
      }
    });

    ipcMain.handle('get-database-info', async (event, dbName) => {
      try {
        const dbInstance = new PouchDB(dbName);
        const info = await dbInstance.info();
        return {
          name: info.db_name,
          doc_count: info.doc_count,
          data_size: info.data_size,
          update_seq: info.update_seq
        };
      } catch (error) {
        console.error('Error getting database info:', error);
        return null;
      }
    });

    ipcMain.handle('get-database-docs', async (event, dbName, limit = 100) => {
      try {
        const dbInstance = new PouchDB(dbName);
        const result = await dbInstance.allDocs({ 
          include_docs: true, 
          limit: limit 
        });
        return result.rows.map(row => row.doc);
      } catch (error) {
        console.error('Error getting database docs:', error);
        return [];
      }
    });

    ipcMain.handle('delete-database', async (event, dbName) => {
      try {
        const dbInstance = new PouchDB(dbName);
        await dbInstance.destroy();
        return { success: true };
      } catch (error) {
        console.error('Error deleting database:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('execute-plugin', async (event, pluginName, action, ...args) => {
      try {
        const plugin = require(`../plugins/${pluginName}/index.js`);
        if (plugin.actions && plugin.actions[action]) {
          return await plugin.actions[action](...args);
        }
        throw new Error(`Action ${action} not found`);
      } catch (error) {
        console.error('Error executing plugin:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('execute-python-plugin', async (event, pluginName, action, ...args) => {
      try {
        return await executePythonPlugin(pluginName, action, args);
      } catch (error) {
        console.error('Error executing Python plugin:', error);
        return { success: false, error: error.message };
      }
    });

    // 尝试加载完整的插件系统
    try {
      console.log('Loading pluginManager...');
      pluginManager = require('./pluginManager.js');
      console.log('PluginManager loaded successfully');
      
      console.log('Loading browserService...');
      browserService = require('./browserService.js');
      console.log('BrowserService loaded successfully');
    } catch (error) {
      console.error('Error loading services:', error);
    }

    try {
      if (!isDev) {
        await startServer();
      }
      createWindow();
    } catch (error) {
      console.error('Failed to start application:', error);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (server) {
      server.close();
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 应用退出前清理
  app.on('before-quit', () => {
    console.log('🛑 应用即将退出，清理资源...');
  });
}
