import { ElectronAPI } from './electron';

// Crawlee服务相关类型定义
interface CrawleeServiceAPI {
  /**
   * 调用Crawlee服务执行浏览器自动化
   * @param platform 平台名称 (gaea, twitter, discord, generic)
   * @param action 操作类型 (login, post, scrape, etc.)
   * @param data 请求数据
   */
  callCrawleeService(platform: string, action: string, data: any): Promise<CrawleeServiceResponse>;
  
  /**
   * 检查Crawlee服务健康状态
   */
  checkCrawleeHealth(): Promise<boolean>;
  
  /**
   * 获取支持的平台和操作列表
   */
  getSupportedPlatforms(): Promise<CrawleePlatformConfig>;
}

interface CrawleeServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  details?: {
    message: string;
    stack?: string;
    type: string;
  };
}

interface CrawleePlatformConfig {
  platforms: string[];
  supportedActions: {
    [platform: string]: string[];
  };
}

interface ElectronAPI {
  // 现有的Electron API...
  openProxyBrowser(url: string): Promise<any>;
  scrape(url: string, options: any): Promise<any>;
  browserDownload(): Promise<any>;
  browserDownloadStatus(): Promise<any>;
  
  // 新增Crawlee服务API
  crawleeService: CrawleeServiceAPI;
}

declare global {
  interface Window {
    api: ElectronAPI;
    electronAPI: ElectronAPI;
  }
}

export {};