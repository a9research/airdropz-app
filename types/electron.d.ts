export interface ElectronAPI {
    dbPut: (doc: Record<string, unknown>) => Promise<void>;
    dbGet: (id: string) => Promise<Record<string, unknown> | null>;
    scrape: (url: string, options?: { headless?: boolean }) => Promise<string>;
    openProxyBrowser: (url: string) => Promise<Electron.BrowserWindow | null>;
  }
  
  declare module 'electron' {
    export interface ElectronAPI extends ElectronAPI {}
  }