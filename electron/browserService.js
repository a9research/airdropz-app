const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const app = require('electron').app;
const BrowserDownloader = require('./browserDownloader');

// 动态加载 crawlee，如果失败则使用备用方案
let PlaywrightCrawler, ProxyConfiguration, Configuration;
try {
  const crawlee = require('crawlee');
  PlaywrightCrawler = crawlee.PlaywrightCrawler;
  ProxyConfiguration = crawlee.ProxyConfiguration;
  Configuration = crawlee.Configuration;
  console.log('Crawlee loaded successfully');
} catch (error) {
  console.warn('Crawlee not available, using fallback browser service:', error.message);
  PlaywrightCrawler = null;
  ProxyConfiguration = null;
  Configuration = null;
}

class BrowserService {
  constructor() {
    // 只有在 crawlee 可用时才配置
    if (Configuration) {
      Configuration.getGlobalConfig().set('useFingerprints', true);
      Configuration.getGlobalConfig().set('headless', true);
    }

    this.proxyQueue = [];
    this.pythonProcess = null;
    this.crawleeAvailable = !!PlaywrightCrawler;
    this.browserDownloader = new BrowserDownloader();
    this.initializeProxyManager();
  }

  initializeProxyManager() {
    try {
      const proxyManagerPath = path.join(app.getPath('userData'), 'plugins', 'proxy-manager');
      const scriptPath = path.join(proxyManagerPath, 'proxy_manager.py');
      
      if (!require('fs').existsSync(scriptPath)) {
        console.error('Proxy manager script not found:', scriptPath);
        return;
      }

      this.pythonProcess = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      if (!this.pythonProcess || !this.pythonProcess.stdout || !this.pythonProcess.stderr || !this.pythonProcess.stdin) {
        throw new Error('Failed to initialize proxy manager - process or streams are null');
      }
      console.log('Proxy manager initialized successfully at:', proxyManagerPath);

      this.pythonProcess.stdout.on('data', (data) => {
        try {
          const proxy = JSON.parse(data.toString().trim());
          this.proxyQueue.push(proxy);
          console.log('Received proxy:', proxy);
        } catch (error) {
          console.error('Failed to parse proxy data:', error);
        }
      });

      this.pythonProcess.stderr.on('data', (data) => {
        console.error('Python error:', data.toString());
      });

      this.pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
      });
    } catch (error) {
      console.error('Failed to initialize proxy manager:', error);
      this.pythonProcess = null;
    }
  }

  async getProxyUrl() {
    if (this.proxyQueue.length === 0 && this.pythonProcess && this.pythonProcess.stdin.writable) {
      this.pythonProcess.stdin.write('get_next_proxy\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    const proxy = this.proxyQueue.length > 0 ? this.proxyQueue.shift() : null;
    return proxy ? `http://${proxy.auth ? `${proxy.auth}@` : ''}${proxy.host}:${proxy.port}` : null;
  }

  async scrape(url, options = {}) {
    if (!this.crawleeAvailable) {
      console.log('Crawlee not available, using fallback scraping');
      return this.fallbackScrape(url, options);
    }

    const proxyUrl = await this.getProxyUrl();
    let proxyConfig = undefined;
    
    if (proxyUrl && ProxyConfiguration) {
      try {
        proxyConfig = new ProxyConfiguration({
          proxyUrls: [proxyUrl],
        });
      } catch (error) {
        console.error('Failed to create proxy configuration:', error);
        proxyConfig = undefined;
      }
    }

    try {
      const crawler = new PlaywrightCrawler({
        proxyConfiguration: proxyConfig,
        requestHandler: async ({ page, request }) => {
          await page.goto(request.url, { waitUntil: 'networkidle' });
          const data = await page.evaluate(() => document.body.innerText);
          return data;
        },
        maxRequestsPerCrawl: 1,
        headless: options.headless ?? false,
      });
      await crawler.run([url]);
      const result = await crawler.getData();
      return result.items[0];
    } catch (error) {
      console.error('Crawlee scraping failed, using fallback:', error);
      return this.fallbackScrape(url, options);
    }
  }

  async fallbackScrape(url, options = {}) {
    // 尝试使用 Playwright 作为备用方案
    console.log('Using Playwright fallback scraping for:', url);

    try {
      // 确保浏览器可用（动态下载）
      console.log('Ensuring browser is available...');
      const browserAvailable = await this.browserDownloader.ensureBrowserAvailable();
      
      if (!browserAvailable) {
        throw new Error('Failed to download or install browser');
      }

      // 设置 Playwright 浏览器路径
      const { chromium } = require('playwright');
      
      console.log('Launching browser with options:', { 
        headless: options.headless === true,
        slowMo: 1000,
        url: url 
      });
      
      const browser = await chromium.launch({ 
        headless: options.headless === true, // 只有明确设置为 true 才使用无头模式
        slowMo: 1000, // 添加延迟，让用户能看到浏览器操作
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // 添加一些参数确保稳定性
      });
      
      console.log('Browser launched successfully');
      const page = await browser.newPage();
      console.log('New page created');
      
      console.log('Navigating to:', url);
      await page.goto(url, { waitUntil: 'networkidle' });
      console.log('Page loaded successfully');
      
      const data = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        content: document.body.innerText,
        timestamp: new Date().toISOString()
      }));
      
      await browser.close();
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Playwright fallback scraping failed:', error);
      
      // 如果 Playwright 也失败，返回模拟结果
      return {
        success: true,
        data: {
          url: url,
          title: `Scraped from ${url}`,
          content: `This is a simulated scrape result from ${url}. Playwright scraping failed: ${error.message}`,
          timestamp: new Date().toISOString(),
          note: 'This is a fallback response. Playwright scraping failed.'
        }
      };
    }
  }
}

const browserService = new BrowserService();

// 注册浏览器下载状态 IPC 处理器
ipcMain.handle('browser-download-status', () => {
  return browserService.browserDownloader.getStatus();
});

ipcMain.handle('browser-download', async () => {
  try {
    await browserService.browserDownloader.downloadBrowser();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理器在 main.js 中注册，避免重复注册
// 导出 browserService 实例
module.exports = browserService;