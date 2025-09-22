# GitHub Actions 应用方案

## 概述

本文档介绍如何使用 GitHub Actions 自动构建包含 Python 插件的 Electron 应用。通过 PyInstaller 将 Python 插件打包为可执行文件，实现跨平台分发。

## 实现步骤

### 1. 准备 Python 插件

#### 确认插件结构

确保 `plugins/my-python-plugin/` 包含以下文件：

**manifest.json：**
```json
{
  "name": "my-python-plugin",
  "type": "python",
  "entry": "my_plugin"
}
```

**my_plugin.py：** 你的 Python 插件脚本

#### 测试 Python 脚本

运行 `python my_plugin.py`（手动输入 stdin 命令），确认功能正常。

### 2. 安装 PyInstaller

确保本地 Python 环境安装 PyInstaller：

```bash
pip install pyinstaller
```

### 3. 修改 pluginManager.js

更新 `startPythonPlugin` 以运行 PyInstaller 打包的可执行文件。

**示例代码：**

```javascript
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
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
            pluggableElectron.plugins.install(pluginName);
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
      console.log('Starting Python plugin executable:', scriptPath);
      const executableName = process.platform === 'win32' ? `${script}.exe` : script;
      const executablePath = path.join(pluginPath, executableName);
      if (!fs.existsSync(executablePath)) {
        throw new Error(`Executable not found at ${executablePath}`);
      }
      const pythonProcess = spawn(executablePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
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

      // 示例：发送命令
      await new Promise(resolve => setTimeout(() => {
        pythonProcess.stdin.write(JSON.stringify({ type: 'db_all', data: {} }) + '\n');
        resolve(null);
      }, 1000));

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
```

**主要更改：** 使用 `spawn` 运行打包后的可执行文件（`my_plugin` 或 `my_plugin.exe`），根据平台选择文件名。

### 4. 更新 forge.config.js

确保打包时包含 PyInstaller 生成的可执行文件。

**示例配置：**

```javascript
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResources: [
      './plugins/**/*', // 包含插件目录
    ],
    afterCopy: [
      (buildPath, electronVersion, platform, arch) => {
        const pluginDir = path.join(buildPath, 'resources/app.asar.unpacked/plugins');
        fs.ensureDirSync(pluginDir);
        fs.copySync(path.resolve(__dirname, 'plugins'), pluginDir);
        // 复制 PyInstaller 输出
        const distPath = path.join(__dirname, 'dist');
        if (fs.existsSync(distPath)) {
          const executableName = platform === 'win32' ? 'my_plugin.exe' : 'my_plugin';
          const sourcePath = path.join(distPath, executableName);
          if (fs.existsSync(sourcePath)) {
            fs.copySync(sourcePath, path.join(pluginDir, 'my-python-plugin', executableName));
            console.log(`Copied ${executableName} to ${pluginDir}/my-python-plugin`);
          }
        }
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAsar]: true,
    }),
  ],
};
```

**说明：** `afterCopy` 动态复制平台特定的 PyInstaller 输出（`my_plugin` 或 `my_plugin.exe`）。

### 5. 配置 GitHub Actions

创建 `.github/workflows/build.yml`：

```yaml
name: Build Electron App with Python Executables

on:
  push:
    branches: [ main ]
    paths:
      - 'plugins/**'
      - 'electron/**'
      - 'src/**'
      - 'package.json'
      - 'forge.config.js'
      - '.github/workflows/build.yml'
  workflow_dispatch: # 允许手动触发

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
        include:
          - os: macos-latest
            platform: darwin
            arch: arm64
          - os: windows-latest
            platform: win32
            arch: x64
      fail-fast: false  # 允许一个平台失败不影响另一个平台
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.13'
        
    - name: Install dependencies
      run: |
        echo "Installing Node.js dependencies..."
        npm ci
        echo "Installing Python dependencies..."
        python -m pip install --upgrade pip
        pip install pyinstaller
        echo "Dependencies installed successfully"
      shell: bash
        
    - name: Build Next.js
      run: |
        echo "Building Next.js application..."
        npm run build
        echo "Next.js build completed"
      shell: bash
        
    - name: Build Python executables
      run: |
        echo "Building Python executables..."
        echo "Current directory: $(pwd)"
        echo "Python plugins directory:"
        if [ "$RUNNER_OS" = "Windows" ]; then
          dir plugins/
        else
          ls -la plugins/
        fi
        
        # 为每个 Python 插件构建可执行文件
        for plugin_dir in plugins/*/; do
          if [ -d "$plugin_dir" ]; then
            plugin_name=$(basename "$plugin_dir")
            echo "Processing plugin: $plugin_name"
            
            # 检查是否有 Python 文件
            python_files=$(find "$plugin_dir" -name "*.py" -type f)
            if [ -n "$python_files" ]; then
              echo "Found Python files in $plugin_name:"
              echo "$python_files"
              
              # 进入插件目录
              cd "$plugin_dir"
              
              # 为每个 Python 文件构建可执行文件
              for py_file in *.py; do
                if [ -f "$py_file" ]; then
                  echo "Building $py_file..."
                  pyinstaller --onefile --distpath ./dist "$py_file"
                  
                  # 移动生成的可执行文件到插件根目录
                  if [ "$RUNNER_OS" = "Windows" ]; then
                    if [ -f "dist/${py_file%.py}.exe" ]; then
                      move "dist\\${py_file%.py}.exe" "${py_file%.py}.exe"
                      echo "Created ${py_file%.py}.exe"
                    fi
                  else
                    if [ -f "dist/${py_file%.py}" ]; then
                      mv "dist/${py_file%.py}" "${py_file%.py}"
                      echo "Created ${py_file%.py}"
                    fi
                  fi
                fi
              done
              
              # 返回项目根目录
              cd ../..
            fi
          fi
        done
        
        echo "Python executables built successfully"
        echo "Generated executables:"
        if [ "$RUNNER_OS" = "Windows" ]; then
          find plugins/ -name "*.exe" -type f
        else
          find plugins/ -name "*" -type f -executable | grep -v ".py"
        fi
      shell: bash
      
    - name: Package Electron App (macOS)
      if: matrix.os == 'macos-latest'
      run: |
        echo "Packaging Electron app for macOS..."
        npm run make
        echo "macOS packaging completed"
        ls -la out/make/*.dmg
      shell: bash
      env:
        NODE_ENV: production
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Package Electron App (Windows)
      if: matrix.os == 'windows-latest'
      run: |
        echo "Packaging Electron app for Windows..."
        npm run make
        echo "Windows packaging completed"
        dir out\\make\\*.exe
      shell: bash
      env:
        NODE_ENV: production
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
    - name: Upload macOS build
      if: matrix.os == 'macos-latest'
      uses: actions/upload-artifact@v4
      with:
        name: framework-macos
        path: out/make/*.dmg
        
    - name: Upload Windows build
      if: matrix.os == 'windows-latest'
      uses: actions/upload-artifact@v4
      with:
        name: framework-windows
        path: out/make/*.exe
        
    - name: Create Release
      if: startsWith(github.ref, 'refs/tags/')
      uses: softprops/action-gh-release@v1
      with:
        files: |
          out/make/*.dmg
          out/make/*.exe
        draft: false
        prerelease: false
```

**主要特性：**
- **智能触发**：只在相关文件变更时触发构建
- **自动发现插件**：自动扫描 `plugins/` 目录中的所有 Python 插件
- **跨平台支持**：支持 macOS 和 Windows 两个平台
- **并行构建**：两个平台并行构建，提高效率
- **手动触发**：支持通过 GitHub 界面手动触发构建
- **自动发布**：支持通过 Git 标签自动创建 Release

### 6. 本地测试

#### 打包插件

1. 运行 `pyinstaller --onefile plugins/my-python-plugin/my_plugin.py`
2. 将 `dist/my_plugin` 或 `dist/my_plugin.exe` 复制到 `plugins/my-python-plugin/`，覆盖 `my_plugin.py`

#### 运行应用

运行 `npm run dev`，确认插件以可执行文件运行。

### 7. 打包和验证

#### 本地打包

运行 `npm run make`，检查 `out/make/` 中的文件。

#### GitHub Actions 测试

推送代码到 `main` 分支，下载 Artifacts，安装并运行。

### 8. 注意事项

- **依赖：** 确保 `my_plugin.py` 引用的库（如 json）在 PyInstaller 中可用，添加 `--hidden-import` 如果需要
- **文件大小：** 打包后 `.exe` 可能较大（10-50MB），影响分发
- **调试：** 打包后问题可能增加，建议添加日志

## 使用说明

### 触发构建

1. **自动触发**：当以下文件发生变更时自动触发构建
   - `plugins/**` - 插件相关文件
   - `electron/**` - Electron 主进程文件
   - `src/**` - Next.js 源码文件
   - `package.json` - 依赖配置
   - `forge.config.js` - 打包配置

2. **手动触发**：
   - 进入 GitHub 仓库的 Actions 页面
   - 选择 "Build Electron App with Python Executables" 工作流
   - 点击 "Run workflow" 按钮

### 构建流程

1. **环境准备**：安装 Node.js 20 和 Python 3.13
2. **依赖安装**：安装 npm 依赖和 PyInstaller
3. **Next.js 构建**：构建前端应用
4. **Python 插件构建**：自动扫描并构建所有 Python 插件
5. **Electron 打包**：生成平台特定的安装包
6. **产物上传**：上传构建结果到 GitHub Artifacts

### 查看构建结果

- **Artifacts**：在 Actions 页面下载 `framework-macos` 或 `framework-windows`
- **Release**：如果推送了 Git 标签，会自动创建 Release

## 预期结果

- GitHub Actions 自动为 macOS 和 Windows 生成安装包
- 应用运行时无需本地 Python，插件以独立可执行文件运行
- 跨平台兼容，日志显示 Python output
- 支持自动发现和构建多个 Python 插件