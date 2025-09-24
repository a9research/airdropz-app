#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 检测平台
const platform = os.platform();
const isWindows = platform === 'win32';
const isMacOS = platform === 'darwin';
const isLinux = platform === 'linux';

console.log('🔧 开始打包Python脚本...');
console.log(`📱 目标平台: ${platform}`);

// 确保目录存在
const distDir = path.join(__dirname, '..', 'dist', 'executables');
const buildDir = path.join(__dirname, '..', 'build');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 获取PyInstaller路径
let pyinstallerPath;
if (isWindows) {
  // Windows 路径 - 先尝试通过命令查找
  try {
    pyinstallerPath = execSync('where pyinstaller', { encoding: 'utf8' }).toString().trim().split('\n')[0];
  } catch (e) {
    // 尝试默认路径
    pyinstallerPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Python', 'Python313', 'Scripts', 'pyinstaller.exe');
    if (!fs.existsSync(pyinstallerPath)) {
      // 尝试其他可能的路径
      const altPath = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'Scripts', 'pyinstaller.exe');
      if (fs.existsSync(altPath)) {
        pyinstallerPath = altPath;
      } else {
        pyinstallerPath = 'pyinstaller';
      }
    }
  }
} else {
  // macOS/Linux 路径 - 先尝试通过命令查找
  try {
    pyinstallerPath = execSync('which pyinstaller', { encoding: 'utf8' }).toString().trim();
  } catch (e) {
    // 尝试用户安装路径
    if (isMacOS) {
      pyinstallerPath = '/Users/austin/Library/Python/3.13/bin/pyinstaller';
      if (!fs.existsSync(pyinstallerPath)) {
        pyinstallerPath = 'pyinstaller';
      }
    } else {
      pyinstallerPath = 'pyinstaller';
    }
  }
}

// 检查PyInstaller是否存在
try {
  execSync(`${pyinstallerPath} --version`, { stdio: 'ignore' });
} catch (e) {
  console.log('❌ PyInstaller未找到，请先安装: pip install pyinstaller');
  process.exit(1);
}

console.log(`🐍 PyInstaller路径: ${pyinstallerPath}`);

// 定义要打包的脚本 - 扫描plugins目录下的Python插件
const scripts = [];

// 扫描plugins目录下的Python插件
const pluginsDir = path.join(__dirname, '..', 'plugins');
if (fs.existsSync(pluginsDir)) {
  const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const pluginDir of pluginDirs) {
    const manifestPath = path.join(pluginsDir, pluginDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.type === 'python' && manifest.entry) {
          const scriptPath = path.join(pluginsDir, pluginDir, manifest.entry);
          if (fs.existsSync(scriptPath)) {
            scripts.push({
              name: pluginDir.replace(/-/g, '_'),
              path: scriptPath,
              plugin: pluginDir
            });
            console.log(`📦 发现Python插件: ${pluginDir} -> ${manifest.entry}`);
          }
        }
      } catch (error) {
        console.log(`⚠️  无法解析插件配置: ${pluginDir}`);
      }
    }
  }
}

if (scripts.length === 0) {
  console.log('⚠️  未找到Python插件，跳过打包');
  process.exit(0);
}

// 构建PyInstaller命令
function buildPyInstallerCommand(scriptName, scriptPath) {
  // 根据平台确定最终的可执行文件名
  const finalName = isWindows ? scriptName + '.exe' : scriptName;
  
  const args = [
    '--onefile',
    '--name', finalName,
    '--distpath', './dist/executables',
    '--workpath', './build',
    '--specpath', './build',
    '--hidden-import', 'aiohttp',
    '--hidden-import', 'aiohttp_socks',
    '--hidden-import', 'fake_useragent',
    '--hidden-import', 'fake_useragent.data',
    '--hidden-import', 'fake_useragent.utils',
    '--hidden-import', 'pytz',
    '--collect-all', 'fake_useragent',
    scriptPath
  ];

  return `${pyinstallerPath} ${args.join(' ')}`;
}

// 打包每个脚本
for (const script of scripts) {
  console.log(`📦 正在打包 ${script.name} (插件: ${script.plugin})...`);
  
  if (!fs.existsSync(script.path)) {
    console.log(`⚠️  脚本文件不存在: ${script.path}，跳过...`);
    continue;
  }

  try {
    const command = buildPyInstallerCommand(script.name, script.path);
    console.log(`🔧 执行命令: ${command}`);
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log(`✅ ${script.name} 打包成功`);
  } catch (error) {
    console.error(`❌ ${script.name} 打包失败:`, error.message);
    process.exit(1);
  }
}

console.log('🎉 所有脚本打包完成！');
console.log('📁 可执行文件位置: dist/executables/');

// 显示生成的文件
try {
  const files = fs.readdirSync(distDir);
  console.log('📋 生成的文件:');
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${file} (${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB)`);
  });
} catch (error) {
  console.log('⚠️  无法列出生成的文件');
}

