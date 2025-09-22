const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs-extra');

// 从 package.json 读取版本信息
const packageJson = require(path.resolve(__dirname, 'package.json'));

module.exports = {
  packagerConfig: {
    asar: true,
    main: path.resolve(__dirname, 'electron/main.js'),
    preload: path.resolve(__dirname, 'electron/preload.js'),
    name: packageJson.name,
    executableName: packageJson.name,
    appVersion: packageJson.version,
    icon: path.resolve(__dirname, 'public/icon'),
    out: path.resolve(__dirname, 'out'),
    extraResources: [
      '.next/**/*', 
      'plugins/**/*'
    ],
    afterCopy: [
      (buildPath, electronVersion, platform, arch) => {
        // 复制插件到应用包
        const pluginDir = path.join(buildPath, 'resources/app.asar.unpacked/plugins');
        fs.ensureDirSync(pluginDir);
        fs.copySync(path.resolve(__dirname, 'plugins'), pluginDir);
        console.log(`Copied plugins to ${pluginDir}`);
      },
    ],
    afterExtract: [
      (buildPath, electronVersion, platform, arch) => {
        // 确保输出目录存在并复制应用包
        const outDir = path.resolve(__dirname, 'out');
        const targetDir = path.join(outDir, `${packageJson.name}-${platform}-${arch}`);
        fs.ensureDirSync(targetDir);
        
        const appName = platform === 'darwin' ? `${packageJson.name}.app` : `${packageJson.name}.exe`;
        const targetAppPath = path.join(targetDir, appName);
        
        if (fs.existsSync(buildPath)) {
          if (platform === 'darwin') {
            // 对于 macOS，从 Electron.app 复制内容
            const electronAppPath = path.join(buildPath, 'Electron.app');
            if (fs.existsSync(electronAppPath)) {
              fs.copySync(electronAppPath, targetAppPath);
              console.log(`Copied Electron.app to ${targetAppPath}`);
              
              // 为 DMG maker 复制实际的应用包（而不是符号链接）
              const dmgAppPath = path.resolve(__dirname, `${packageJson.name}.app`);
              if (fs.existsSync(dmgAppPath)) {
                fs.removeSync(dmgAppPath);
              }
              fs.copySync(targetAppPath, dmgAppPath);
              console.log(`Copied app for DMG: ${targetAppPath} -> ${dmgAppPath}`);
            }
          } else {
            // 对于 Windows，直接复制
            fs.copySync(buildPath, targetAppPath);
            console.log(`Copied app to ${targetAppPath}`);
            
            // 为 Windows makers 复制必要的文件结构
            const appContentsPath = path.join(targetAppPath, 'resources', 'app');
            if (fs.existsSync(appContentsPath)) {
              // 复制应用内容到目标目录的根目录
              const targetAppContents = path.join(targetDir, 'resources', 'app');
              fs.ensureDirSync(path.dirname(targetAppContents));
              fs.copySync(appContentsPath, targetAppContents);
              console.log(`Copied app contents to ${targetAppContents}`);
              
              // 复制其他必要的目录和文件
              const localesPath = path.join(targetAppPath, 'locales');
              if (fs.existsSync(localesPath)) {
                const targetLocalesPath = path.join(targetDir, 'locales');
                fs.copySync(localesPath, targetLocalesPath);
                console.log(`Copied locales to ${targetLocalesPath}`);
              }
              
              // 复制其他可能需要的目录
              const resourcesPath = path.join(targetAppPath, 'resources');
              if (fs.existsSync(resourcesPath)) {
                const targetResourcesPath = path.join(targetDir, 'resources');
                fs.copySync(resourcesPath, targetResourcesPath);
                console.log(`Copied resources to ${targetResourcesPath}`);
              }
            }
          }
        }
      },
    ],
  },
  rebuildConfig: {},
  hooks: {
    afterMake: async (config, makeResults) => {
      // 清理构建过程中创建的符号链接
      const symlinkPath = path.resolve(__dirname, `${packageJson.name}.app`);
      if (fs.existsSync(symlinkPath)) {
        fs.removeSync(symlinkPath);
        console.log(`Cleaned up symlink: ${symlinkPath}`);
      }
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        icon: path.resolve(__dirname, 'public/icon.icns'),
        iconSize: 80,
        contents: [
          { x: 448, y: 344, type: 'link', path: '/Applications' },
          { x: 192, y: 344, type: 'file', path: `${packageJson.name}.app` }
        ]
      },
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {},
    },
    {
      name: '@electron-forge/maker-wix',
      platforms: ['win32'],
      config: {
        icon: path.resolve(__dirname, 'public/icon.ico'),
      },
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
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};