const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class BrowserDownloader {
  constructor() {
    this.downloadStatus = {
      downloading: false,
      progress: 0,
      status: 'idle'
    };
    this.listeners = [];
  }

  // 添加状态监听器
  onStatusChange(callback) {
    this.listeners.push(callback);
  }

  // 更新状态并通知监听器
  updateStatus(status, progress = 0) {
    this.downloadStatus = { ...this.downloadStatus, ...status, progress };
    this.listeners.forEach(callback => callback(this.downloadStatus));
  }

  // 检查浏览器是否已安装
  async checkBrowserInstalled() {
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      return true;
    } catch (error) {
      console.log('Browser not installed:', error.message);
      return false;
    }
  }

  // 获取用户数据目录
  getUserDataPath() {
    if (app && app.isPackaged) {
      // 生产环境：使用应用数据目录
      return path.join(app.getPath('userData'), 'playwright-browsers');
    } else {
      // 开发环境：使用默认缓存目录
      return path.join(require('os').homedir(), 'Library', 'Caches', 'ms-playwright');
    }
  }

  // 下载浏览器
  async downloadBrowser() {
    if (this.downloadStatus.downloading) {
      console.log('Download already in progress');
      return this.downloadStatus;
    }

    this.updateStatus({
      downloading: true,
      status: 'starting',
      progress: 0
    });

    try {
      console.log('Starting browser download...');
      
      // 设置 Playwright 浏览器路径
      const browserPath = this.getUserDataPath();
      process.env.PLAYWRIGHT_BROWSERS_PATH = browserPath;
      
      console.log('Browser download path:', browserPath);

      return new Promise((resolve, reject) => {
        // 使用 npx playwright install chromium
        const child = spawn('npx', ['playwright', 'install', 'chromium'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browserPath }
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
          console.log('Download output:', data.toString());
          
          // 简单的进度解析
          if (data.toString().includes('Downloading')) {
            this.updateStatus({
              status: 'downloading',
              progress: 50
            });
          }
        });

        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.log('Download error:', data.toString());
        });

        child.on('close', (code) => {
          if (code === 0) {
            console.log('Browser download completed successfully');
            this.updateStatus({
              downloading: false,
              status: 'completed',
              progress: 100
            });
            resolve(this.downloadStatus);
          } else {
            console.error('Browser download failed with code:', code);
            console.error('Error output:', errorOutput);
            this.updateStatus({
              downloading: false,
              status: 'failed',
              progress: 0
            });
            reject(new Error(`Download failed with code ${code}: ${errorOutput}`));
          }
        });

        child.on('error', (error) => {
          console.error('Download process error:', error);
          this.updateStatus({
            downloading: false,
            status: 'failed',
            progress: 0
          });
          reject(error);
        });
      });

    } catch (error) {
      console.error('Download error:', error);
      this.updateStatus({
        downloading: false,
        status: 'failed',
        progress: 0
      });
      throw error;
    }
  }

  // 确保浏览器可用（检查并下载）
  async ensureBrowserAvailable() {
    console.log('Checking if browser is available...');
    
    const isInstalled = await this.checkBrowserInstalled();
    
    if (isInstalled) {
      console.log('Browser already installed');
      this.updateStatus({
        downloading: false,
        status: 'ready',
        progress: 100
      });
      return true;
    }

    console.log('Browser not installed, starting download...');
    try {
      await this.downloadBrowser();
      return true;
    } catch (error) {
      console.error('Failed to download browser:', error);
      return false;
    }
  }

  // 获取下载状态
  getStatus() {
    return this.downloadStatus;
  }
}

module.exports = BrowserDownloader;
