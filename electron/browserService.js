const { PlaywrightCrawler, ProxyConfiguration, Configuration } = require('crawlee');
const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const app = require('electron').app;

class BrowserService {
  constructor() {
    Configuration.getGlobalConfig().set('useFingerprints', true);
    Configuration.getGlobalConfig().set('headless', true);

    this.proxyQueue = [];
    this.pythonProcess = null;
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
    const proxyUrl = await this.getProxyUrl();
    let proxyConfig = undefined;
    
    if (proxyUrl) {
      try {
        proxyConfig = new ProxyConfiguration({
          proxyUrls: [proxyUrl],
        });
      } catch (error) {
        console.error('Failed to create proxy configuration:', error);
        proxyConfig = undefined;
      }
    }

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
  }
}

const browserService = new BrowserService();
ipcMain.handle('browser-scrape', async (event, url, options) => browserService.scrape(url, options));