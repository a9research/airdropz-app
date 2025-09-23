process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let pluginManager, browserService;
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const prepareNext = require('electron-next');
const PouchDB = require('pouchdb');
const db = new PouchDB('mydb');

let mainWindow;

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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }
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
    await prepareNext('./src');
  } catch (error) {
    console.error('Error preparing Next.js:', error);
    // 如果端口被占用，继续运行应用
    if (error.code === 'EADDRINUSE') {
      console.log('Port 8000 is in use, continuing without Next.js server...');
    }
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});