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
    // 应用基本信息（从 package.json 读取）
    name: packageJson.name, // 应用名称
    executableName: packageJson.name, // 可执行文件名
    appVersion: packageJson.version, // 应用版本号
    // 应用图标配置（使用 public 目录）
    icon: path.resolve(__dirname, 'public/icon'), // 图标文件路径（不包含扩展名，Electron Forge 会自动添加 .icns/.ico/.png）
    // 输出目录配置
    out: path.resolve(__dirname, 'out'),
    // 增加对 Next.js 输出的支持
    extraResources: [
      '.next/**/*', 
      'plugins/**/*'
    ], // 包含插件目录
    afterCopy: [
      (buildPath, electronVersion, platform, arch) => {
        if (process.env.NODE_ENV === 'production') {
          // 确保 electron-next 构建后文件可用
          console.log(`Copying Next.js output to ${buildPath}`);
        }
        
        // 复制插件目录到应用资源目录
        const pluginDir = path.join(buildPath, 'resources/app.asar.unpacked/plugins');
        fs.ensureDirSync(pluginDir);
        fs.copySync(path.resolve(__dirname, 'plugins'), pluginDir);
        console.log(`Copied plugins to ${pluginDir}`);
      },
    ],
    afterExtract: [
      (buildPath, electronVersion, platform, arch) => {
        // 确保输出目录存在
        const outDir = path.resolve(__dirname, 'out');
        const targetDir = path.join(outDir, `${packageJson.name}-${platform}-${arch}`);
        fs.ensureDirSync(targetDir);
        
        // 复制应用到输出目录
        const appName = platform === 'darwin' ? `${packageJson.name}.app` : `${packageJson.name}.exe`;
        const targetAppPath = path.join(targetDir, appName);
        
        if (fs.existsSync(buildPath)) {
          fs.copySync(buildPath, targetAppPath);
          console.log(`Copied app to ${targetAppPath}`);
        }
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {},
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
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
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
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
    // 注意：不添加 @electron-forge/plugin-webpack，因为 electron-next 接管 renderer
  ],
};