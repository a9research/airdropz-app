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

  // 插件初始化
  function init() {
    initializeProxyManager();
    context.registerAction('openProxyBrowser', openProxyBrowser);
    console.log('Proxy Browser plugin initialized');
  }

  return {
    init,
  };
};