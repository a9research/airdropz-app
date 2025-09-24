import { ElectronAPI } from './electron';

declare global {
  interface Window {
    api: ElectronAPI;
    electronAPI: ElectronAPI;
  }
}

export {};