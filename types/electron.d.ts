export interface ElectronAPI {
  dbPut: (doc: Record<string, unknown>) => Promise<void>;
  dbGet: (id: string) => Promise<Record<string, unknown> | null>;
  scrape: (url: string, options?: { headless?: boolean }) => Promise<any>;
  openProxyBrowser: (url: string) => Promise<Electron.BrowserWindow | null>;
  browserDownloadStatus: () => Promise<{
    downloading: boolean;
    progress: number;
    status: string;
  }>;
  browserDownload: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  invokePluginAction: (pluginName: string, actionName: string, ...args: any[]) => Promise<any>;
}
  
  declare module 'electron' {
    export interface ElectronAPI extends ElectronAPI {}
  }