import { EventEmitter } from 'events';

export interface BrowserDownloadProgress {
  status: 'checking' | 'downloading' | 'installing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export class BrowserDownloader extends EventEmitter {
  private isDownloading = false;
  private isInstalled = false;

  constructor() {
    super();
  }

  /**
   * 检查浏览器是否已安装
   */
  async checkBrowserInstalled(): Promise<boolean> {
    try {
      // 通过API检查浏览器状态
      const response = await fetch('/api/browser/check');
      const result = await response.json();
      
      if (result.success && result.installed) {
        this.isInstalled = true;
        return true;
      } else {
        this.isInstalled = false;
        return false;
      }
    } catch (error) {
      console.log('检查浏览器状态失败:', error);
      this.isInstalled = false;
      return false;
    }
  }

  /**
   * 下载并安装浏览器
   */
  async downloadBrowser(): Promise<void> {
    if (this.isDownloading) {
      throw new Error('浏览器下载已在进行中');
    }

    if (this.isInstalled) {
      this.emit('progress', {
        status: 'completed',
        progress: 100,
        message: '浏览器已安装'
      });
      return;
    }

    this.isDownloading = true;

    try {
      this.emit('progress', {
        status: 'checking',
        progress: 0,
        message: '检查浏览器状态...'
      });

      // 检查是否已安装
      const installed = await this.checkBrowserInstalled();
      if (installed) {
        this.isInstalled = true;
        this.emit('progress', {
          status: 'completed',
          progress: 100,
          message: '浏览器已安装'
        });
        return;
      }

      this.emit('progress', {
        status: 'downloading',
        progress: 10,
        message: '开始下载浏览器...'
      });

      // 通过API下载浏览器
      const response = await fetch('/api/browser/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`下载请求失败: ${response.status}`);
      }

      // 监听下载进度
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取下载流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progressData = JSON.parse(line);
              this.emit('progress', progressData);
            } catch (e) {
              console.log('解析进度数据失败:', line);
            }
          }
        }
      }

      // 验证安装是否成功
      const isInstalled = await this.checkBrowserInstalled();
      if (isInstalled) {
        this.isInstalled = true;
        this.emit('progress', {
          status: 'completed',
          progress: 100,
          message: '浏览器安装完成'
        });
      } else {
        this.emit('progress', {
          status: 'error',
          progress: 0,
          message: '浏览器安装失败',
          error: '安装后验证失败'
        });
        throw new Error('浏览器安装后验证失败');
      }

    } catch (error) {
      this.isDownloading = false;
      this.emit('progress', {
        status: 'error',
        progress: 0,
        message: '浏览器下载失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
      throw error;
    }
  }

  /**
   * 获取下载状态
   */
  getDownloadStatus(): { isDownloading: boolean; isInstalled: boolean } {
    return {
      isDownloading: this.isDownloading,
      isInstalled: this.isInstalled
    };
  }
}

// 单例实例
export const browserDownloader = new BrowserDownloader();
