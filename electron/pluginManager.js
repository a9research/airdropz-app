const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { spawn } = require('child_process');
const pluggableElectron = require('pluggable-electron');
console.log('pluggable-electron loaded:', Object.keys(pluggableElectron));

class PluginManager {
  constructor() {
    this.pluginDir = path.join(app.getPath('userData'), 'plugins');
    console.log('Attempting to set pluginDir:', this.pluginDir);
    if (!fs.existsSync(this.pluginDir)) {
      console.log('Plugin directory does not exist, creating:', this.pluginDir);
      fs.mkdirSync(this.pluginDir, { recursive: true });
    } else {
      console.log('Plugin directory exists:', this.pluginDir);
    }
    this.pythonProcesses = new Map();
  }

  initialize() {
    try {
      if (this.pluginDir) {
        pluggableElectron.init({ pluginDir: this.pluginDir });
        console.log('pluggable-electron initialized successfully');
      } else {
        console.error('pluginDir is undefined or invalid');
      }
    } catch (error) {
      console.error('Failed to initialize pluggable-electron:', error);
    }
  }

  loadPlugins() {
    try {
      fs.readdirSync(this.pluginDir).forEach(pluginName => {
        const pluginPath = path.join(this.pluginDir, pluginName);
        const manifestPath = path.join(pluginPath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath));
          if (manifest.type === 'python') {
            this.startPythonPlugin(pluginPath, manifest.entry).catch(err => console.error(`Failed to start plugin ${pluginName}:`, err));
          } else if (manifest.type === 'js') {
            console.log(`Installing JS plugin: ${pluginName}`);
            pluggableElectron.plugins.install(pluginName); // 安装 JS 插件
          }
        }
      });
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
  }

  async startPythonPlugin(pluginPath, script) {
    const scriptPath = path.join(pluginPath, script);
    try {
      console.log('Starting Python plugin:', scriptPath);
      const pythonProcess = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      if (!pythonProcess || !pythonProcess.stdout || !pythonProcess.stderr || !pythonProcess.stdin) {
        throw new Error('Spawned process or streams are null');
      }
      this.pythonProcesses.set(pluginPath, pythonProcess);

      pythonProcess.stdout.on('data', (data) => {
        console.log(`Python output from ${pluginPath}:`, data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python error from ${pluginPath}:`, data.toString());
      });

      pythonProcess.on('error', (error) => {
        console.error(`Failed to start Python process for ${pluginPath}:`, error);
      });

      pythonProcess.on('exit', (code) => {
        console.log(`Python process for ${pluginPath} exited with code ${code}`);
        this.pythonProcesses.delete(pluginPath);
      });
      return pythonProcess;
    } catch (error) {
      console.error(`Error in startPythonPlugin for ${pluginPath}:`, error);
      throw error;
    }
  }
}

const pm = new PluginManager();
app.whenReady().then(() => {
  pm.initialize();
  pm.loadPlugins();
});