const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded'); // 调试日志
contextBridge.exposeInMainWorld('api', {
  dbPut: (doc) => {
    console.log('dbPut called with:', doc);
    return ipcRenderer.invoke('db-put', doc);
  },
  dbGet: (id) => {
    console.log('dbGet called with:', id);
    return ipcRenderer.invoke('db-get', id);
  },
  scrape: (url, options) => ipcRenderer.invoke('browser-scrape', url, options),
  openProxyBrowser: (url) => ipcRenderer.invoke('open-proxy-browser', url),
});