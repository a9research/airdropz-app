process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let pluginManager, browserService;
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const PouchDB = require('pouchdb');
const db = new PouchDB('mydb');

const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;

let mainWindow;
let server;

function startServer() {
  return new Promise((resolve, reject) => {
    try {
      const expressApp = express();
      const port = 3001; // 使用不同的端口避免冲突
      
      // 设置静态文件服务
      expressApp.use(express.static(path.join(__dirname, '../out')));
      
      // 处理 Next.js 静态资源
      expressApp.use('/_next/static', express.static(path.join(__dirname, '../out/_next/static')));
      
      // 处理所有其他路由，返回index.html（用于SPA路由）
      expressApp.use((req, res) => {
        res.sendFile(path.join(__dirname, '../out/index.html'));
      });
      
      server = expressApp.listen(port, () => {
        resolve();
      });
      
      server.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : 'http://localhost:3001';
  
  mainWindow.loadURL(startUrl);

  // 添加页面加载事件监听
  mainWindow.webContents.on('did-finish-load', () => {
    // 页面加载完成
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('页面加载失败:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 在开发环境自动打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
}

app.whenReady().then(async () => {
  const { ipcMain } = require('electron');
  
  ipcMain.handle('db-put', async (event, doc) => db.put(doc));
  ipcMain.handle('db-get', async (event, id) => db.get(id));
  
  // 代理浏览器处理器
  ipcMain.handle('open-proxy-browser', async (event, url) => {
    const { BrowserWindow } = require('electron');
    const proxyWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    
    await proxyWindow.loadURL(url);
    return proxyWindow;
  });
  
  ipcMain.handle('pluggable-electron', async (event, action, ...args) => {
    const plugin = pluggableElectron.usePlugins().find(p => p.actions && p.actions[action]);
    if (plugin && plugin.actions[action]) {
      return await plugin.actions[action](...args);
    }
    throw new Error(`Action ${action} not found`);
  });
  
  try {
    pluginManager = require('./pluginManager.js');
    browserService = require('./browserService.js');
    console.log('Plugin system initialized successfully');
  } catch (error) {
    console.error('Error initializing plugin system:', error);
  }
  
  try {
    if (!isDev) {
      await startServer();
    }
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});