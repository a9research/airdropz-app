export interface ElectronAPI {
    dbPut: (doc: any) => Promise<void>;
    dbGet: (id: string) => Promise<any>;
    scrape: (url: string, options?: { headless?: boolean }) => Promise<string>;
    openProxyBrowser: (url: string) => Promise<Electron.BrowserWindow | null>;
  }
  
  declare module 'electron' {
    export interface ElectronAPI extends ElectronAPI {}
  }