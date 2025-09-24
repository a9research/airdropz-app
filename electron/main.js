process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let pluginManager, browserService;
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const PouchDB = require('pouchdb');
const { spawn } = require('child_process');
const fs = require('fs');
const db = new PouchDB('mydb');

const isDev = process.env.NODE_ENV === 'development' && app && !app.isPackaged;

let mainWindow;
let server;

// 统一的Python插件执行功能
function executePythonPlugin(pluginName, command, data) {
  return new Promise((resolve, reject) => {
    let executablePath, args;
    
    // 发送日志到前端的函数
    const sendLogToFrontend = (message, type = 'stdout') => {
      const allWindows = BrowserWindow.getAllWindows();
      allWindows.forEach(window => {
        if (window.webContents) {
          window.webContents.send('plugin-log', {
            plugin: pluginName,
            type: type,
            message: message,
            timestamp: new Date().toISOString()
          });
        }
      });
    };
    
    if (isDev) {
      // 开发环境 - 使用Python脚本
      const scriptPath = path.join(__dirname, '../plugins', pluginName, 'plugin.py');
      const pythonCommand = path.join(__dirname, '../runtime/python-env/bin/python3');
      
      executablePath = pythonCommand;
      args = [scriptPath, command, JSON.stringify(data)];
    } else {
      // 生产环境 - 使用打包的可执行文件
      const resourcesPath = process.resourcesPath;
      
      // 根据平台确定可执行文件扩展名
      const executableExtension = process.platform === 'win32' ? '.exe' : '';
      const finalExecutableName = pluginName.replace(/-/g, '_') + executableExtension;
      
      executablePath = path.join(resourcesPath, 'executables', finalExecutableName);
      args = [command, JSON.stringify(data)];
    }
    
    // 检查可执行文件是否存在
    if (!fs.existsSync(executablePath)) {
      reject(new Error(`可执行文件不存在: ${executablePath}`));
      return;
    }
    
    console.log(`[DEBUG] 执行Python插件: ${executablePath}`);
    console.log(`[DEBUG] 参数: ${JSON.stringify(args)}`);
    console.log(`[DEBUG] 插件: ${pluginName}`);
    console.log(`[DEBUG] 命令: ${command}`);
    
    const pythonProcess = spawn(executablePath, args, {
      cwd: isDev ? path.dirname(executablePath) : process.resourcesPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      
      // 实时发送日志到前端
      sendLogToFrontend(output.trim(), 'stdout');
      
      // 检查是否是JSON输出并立即解析（用于快速响应）
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const result = JSON.parse(trimmed);
            
            // 如果是成功消息，立即解析并返回
            if (result.success && !result.error) {
              resolve(result);
              return;
            }
          } catch (e) {
            // 继续处理其他行
          }
        }
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      
      // 实时发送日志到前端
      sendLogToFrontend(output.trim(), 'stderr');
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python插件异常退出 (退出码: ${code})\n错误: ${stderr}\n输出: ${stdout}`));
        return;
      }
      
      // 正常退出时，尝试解析输出
      try {
        // 如果stdout中有JSON输出，解析它
        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const result = JSON.parse(trimmed);
              resolve(result);
              return;
            } catch (e) {
              // 继续尝试下一行
            }
          }
        }
        
        // 如果没有找到JSON输出，返回默认成功结果
        resolve({ success: true, message: '插件执行完成' });
      } catch (error) {
        reject(new Error(`解析插件输出失败: ${error.message}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`启动Python插件进程失败: ${error.message}`));
    });
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    try {
      const expressApp = express();
      const port = 3001; // 使用不同的端口避免冲突
      
      // 在生产环境中，静态文件位于 resources 目录
      let staticPath;
      if (app.isPackaged) {
        // 打包后的路径 - out 目录在 extraResources 中
        staticPath = path.join(process.resourcesPath, 'out');
      } else {
        // 开发环境路径
        staticPath = path.join(__dirname, '../out');
      }
      
      console.log('Static files path:', staticPath);
      console.log('Static path exists:', require('fs').existsSync(staticPath));
      
      // 设置静态文件服务
      expressApp.use(express.static(staticPath));
      
      // 处理 Next.js 静态资源
      expressApp.use('/_next/static', express.static(path.join(staticPath, '_next/static')));
      
      // 处理所有其他路由，返回index.html（用于SPA路由）
      expressApp.use((req, res) => {
        const indexPath = path.join(staticPath, 'index.html');
        console.log('Serving index.html from:', indexPath);
        res.sendFile(indexPath);
      });
      
      server = expressApp.listen(port, () => {
        console.log(`Express server started on port ${port}`);
        console.log(`Serving static files from: ${staticPath}`);
        resolve();
      });
      
      server.on('error', reject);
    } catch (error) {
      console.error('Failed to start Express server:', error);
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
  
  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  
  mainWindow.loadURL(startUrl);

  // 添加页面加载事件监听
  mainWindow.webContents.on('did-finish-load', () => {
    // 页面加载完成
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // 忽略 Turnstile 相关的错误，这些是正常的
    if (validatedURL === 'about:srcdoc' || validatedURL.includes('turnstile') || validatedURL.includes('cloudflare')) {
      console.log('忽略 Turnstile 相关错误:', validatedURL);
      return;
    }
    
    console.error('页面加载失败:', errorCode, errorDescription, validatedURL);
    console.error('Error details:', {
      errorCode,
      errorDescription,
      validatedURL,
      isDev,
      isPackaged: app.isPackaged
    });
  });
    // // 在开发环境自动打开开发者工具
    // if (isDev) {
    //   mainWindow.webContents.openDevTools();
    // }
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 始终打开开发者工具以便调试
    mainWindow.webContents.openDevTools();
  });
}

// 确保 app 对象可用后再调用 whenReady
if (app && app.whenReady) {
  app.whenReady().then(async () => {
  const { ipcMain } = require('electron');
  
  ipcMain.handle('db-put', async (event, doc) => db.put(doc));
  ipcMain.handle('db-get', async (event, id) => db.get(id));
  
  // 代理浏览器处理器在下面统一注册
  
  ipcMain.handle('pluggable-electron', async (event, action, ...args) => {
    const plugin = pluggableElectron.usePlugins().find(p => p.actions && p.actions[action]);
    if (plugin && plugin.actions[action]) {
      return await plugin.actions[action](...args);
    }
    throw new Error(`Action ${action} not found`);
  });
  
  // 尝试加载完整的插件系统
  try {
    console.log('Loading pluginManager...');
    pluginManager = require('./pluginManager.js');
    console.log('PluginManager loaded successfully');
    
    console.log('Loading browserService...');
    browserService = require('./browserService.js');
    console.log('BrowserService loaded successfully');
    
    console.log('Plugin system initialized successfully');
  } catch (error) {
    console.error('Error initializing plugin system:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // 如果插件系统加载失败，设置 browserService 为 null
    browserService = null;
  }
  
  // 注册 browser-scrape 处理器
  ipcMain.handle('browser-scrape', async (event, url, options) => {
    console.log('browser-scrape called with:', url, options);
    
    try {
      // 尝试使用 browserService
      if (browserService && typeof browserService.scrape === 'function') {
        console.log('Using browserService for scraping');
        return await browserService.scrape(url, options);
      } else {
        // 如果 browserService 不可用，使用备用方案
        console.log('BrowserService not available, using fallback');
        return {
          success: true,
          data: {
            url: url,
            title: `Scraped from ${url}`,
            content: `This is a simulated scrape result from ${url}. The actual browser service is not available.`,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error('browser-scrape error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 注册 open-proxy-browser 处理器
  ipcMain.handle('open-proxy-browser', async (event, url) => {
    console.log('open-proxy-browser called with:', url);
    
    try {
      const { BrowserWindow } = require('electron');
      const proxyWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: true, // 确保窗口可见
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });
      
      await proxyWindow.loadURL(url);
      console.log('Proxy browser opened successfully');
      
      // 返回窗口的基本信息而不是窗口对象本身
      return {
        success: true,
        windowId: proxyWindow.id,
        url: url,
        message: 'Proxy browser opened successfully'
      };
    } catch (error) {
      console.error('Failed to open proxy browser:', error);
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  });
  
  // 注册 Python 插件执行处理器
  ipcMain.handle('execute-python-plugin', async (event, pluginName, command, data) => {
    console.log(`execute-python-plugin called: ${pluginName}, command: ${command}`);
    
    try {
      const result = await executePythonPlugin(pluginName, command, data);
      return result;
    } catch (error) {
      console.error('Python plugin execution error:', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('IPC handlers registered successfully');
  
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
} else {
  console.error('App object not available');
}

if (app) {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}