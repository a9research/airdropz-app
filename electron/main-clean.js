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

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }
}

// 启动Express服务器
function startServer() {
  const app = express();
  app.use(express.static(path.join(__dirname, '../out')));
  
  server = app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

// 执行Python插件
async function executePythonPlugin(pluginName, action, args = []) {
  return new Promise((resolve, reject) => {
    const pluginPath = path.join(__dirname, `../plugins/${pluginName}`);
    const pythonScript = path.join(pluginPath, `${pluginName}.py`);
    
    if (!fs.existsSync(pythonScript)) {
      reject(new Error(`Python script not found: ${pythonScript}`));
      return;
    }

    const pythonExecutable = isDev 
      ? path.join(__dirname, '../runtime/python-env/bin/python')
      : path.join(process.resourcesPath, 'runtime/python-env/bin/python');

    const child = spawn(pythonExecutable, [pythonScript, action, ...args], {
      cwd: pluginPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON response', stdout, stderr });
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// IPC 处理程序
if (app && app.whenReady) {
  app.whenReady().then(async () => {
    // 启动Express服务器
    if (isDev) {
      startServer();
    }

    // IPC 处理程序
    ipcMain.handle('get-databases', async () => {
      try {
        const result = await db.allDocs({ include_docs: true });
        return result.rows.map(row => ({
          name: row.id,
          doc_count: row.doc.doc_count || 0,
          data_size: row.doc.data_size || 0,
          update_seq: row.doc.update_seq || 0
        }));
      } catch (error) {
        console.error('Error getting databases:', error);
        return [];
      }
    });

    ipcMain.handle('get-database-info', async (event, dbName) => {
      try {
        const dbInstance = new PouchDB(dbName);
        const info = await dbInstance.info();
        return {
          name: info.db_name,
          doc_count: info.doc_count,
          data_size: info.data_size,
          update_seq: info.update_seq
        };
      } catch (error) {
        console.error('Error getting database info:', error);
        return null;
      }
    });

    ipcMain.handle('get-database-docs', async (event, dbName, limit = 100) => {
      try {
        const dbInstance = new PouchDB(dbName);
        const result = await dbInstance.allDocs({ 
          include_docs: true, 
          limit: limit 
        });
        return result.rows.map(row => row.doc);
      } catch (error) {
        console.error('Error getting database docs:', error);
        return [];
      }
    });

    ipcMain.handle('delete-database', async (event, dbName) => {
      try {
        const dbInstance = new PouchDB(dbName);
        await dbInstance.destroy();
        return { success: true };
      } catch (error) {
        console.error('Error deleting database:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('execute-plugin', async (event, pluginName, action, ...args) => {
      try {
        const plugin = require(`../plugins/${pluginName}/index.js`);
        if (plugin.actions && plugin.actions[action]) {
          return await plugin.actions[action](...args);
        }
        throw new Error(`Action ${action} not found`);
      } catch (error) {
        console.error('Error executing plugin:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('execute-python-plugin', async (event, pluginName, action, ...args) => {
      try {
        return await executePythonPlugin(pluginName, action, args);
      } catch (error) {
        console.error('Error executing Python plugin:', error);
        return { success: false, error: error.message };
      }
    });

    // 尝试加载完整的插件系统
    try {
      console.log('Loading pluginManager...');
      pluginManager = require('./pluginManager.js');
      console.log('PluginManager loaded successfully');
      
      console.log('Loading browserService...');
      browserService = require('./browserService.js');
      console.log('BrowserService loaded successfully');
    } catch (error) {
      console.error('Error loading services:', error);
    }

    createWindow();
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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 应用退出前清理
  app.on('before-quit', () => {
    console.log('🛑 应用即将退出，清理资源...');
  });
}
