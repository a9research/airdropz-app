# 什么是 GitHub Actions 自动打包？

**GitHub Actions 自动打包** 是利用 GitHub 提供的 CI/CD（持续集成/持续部署）工具，在代码提交（push）或拉取请求（pull request）时，自动执行构建、测试和打包过程的自动化工作流。它可以帮助你将 Electron 应用（如你的框架）打包为可分发的二进制文件（例如 .dmg、.exe 或 .deb），并在每次代码更改后确保产品的一致性和可发布性。

## 目的

- **自动化构建**：每次代码提交时，自动运行 npm run make（Electron Forge 的打包命令），生成应用安装包。
- **质量保证**：在打包前运行测试，确保代码无误。
- **跨平台支持**：为 macOS、Windows 和 Linux 生成不同平台的包。
- **发布管理**：将打包结果上传到 GitHub Releases 或其他存储位置，便于分发。
- **节省时间**：避免手动打包，减少人为错误。

## 与你的框架的关系

你的框架（Electron + Next.js + Crawlee + PouchDB + Python 插件）包含多个模块和依赖，手动打包可能需要配置环境、复制插件文件（如 plugins/proxy-manager/）到用户数据目录，并处理跨平台兼容性。GitHub Actions 自动完成这些步骤，确保开发和发布流程高效。

## 如何设置 GitHub Actions 自动打包

以下是针对你项目的具体步骤，基于当前的代码和结构（main.js、pluginManager.js 等）。假设你的项目已托管在 GitHub 上。

### 步骤 1: 创建 GitHub Actions 工作流文件

**创建目录：**

在项目根目录下创建 .github/workflows/ 目录（如果不存在）。

**添加工作流文件：**

创建 .github/workflows/build.yml，内容如下：

```yaml
name: Build Electron App

on:
  push:
    branches:
      - main  # 触发分支，可根据需要调整
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]  # 支持的平台

    steps:
      # 1. 检出代码
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. 设置 Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'  # 根据你的项目需求调整

      # 3. 安装依赖
      - name: Install dependencies
        run: npm install

      # 4. 构建 Next.js
      - name: Build Next.js
        run: npm run build  # 确保 Next.js 有 build 脚本

      # 5. 打包 Electron 应用
      - name: Package Electron App
        run: npm run make
        env:
          NODE_ENV: production

      # 6. 上传构建结果
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: electron-build-${{ matrix.os }}
          path: out/make/

      # 7. 发布到 GitHub Releases（可选）
      - name: Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: out/make/*
```

### 步骤 2: 配置 forge.config.js

确保 forge.config.js 支持打包并复制插件文件：

```javascript
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  packagerConfig: {
    asar: true,
    main: './electron/main.js',
    preload: './electron/preload.js',
    extraResources: ['./plugins/**/*'],
    afterCopy: [
      (buildPath, electronVersion, platform, arch) => {
        if (process.env.NODE_ENV === 'production') {
          const userDataPath = path.join(buildPath, 'resources/app.asar.unpacked/userData/plugins');
          fs.copySync('./plugins', userDataPath);
          console.log(`Copied plugins to ${userDataPath}`);
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
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
```

**变化**：添加 extraResources 和 afterCopy 确保 plugins/ 文件复制到打包目录。

### 步骤 3: 推送代码并测试

**提交更改：**

将 .github/workflows/build.yml 和 forge.config.js 提交到 main 分支：

```bash
git add .github/workflows/build.yml forge.config.js
git commit -m "Add GitHub Actions for automated build"
git push origin main
```

**触发工作流：**

推送后，GitHub 会自动运行 build 工作流。
在仓库的 Actions 标签页查看进度。

**检查结果：**

构建成功后，Artifacts 部分下载 electron-build-${{ matrix.os }} 文件夹。
如果启用了 Release，检查 Releases 标签页下载 .dmg、.exe 等。

### 步骤 4: 优化（可选）

**缓存依赖**：加速构建，添加：

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**测试**：在 build 前运行 npm test（需添加测试脚本）。
**秘钥管理**：如果需要私密依赖，使用 GitHub Secrets。

## 工作流程效果

- **每次 push**：自动构建 macOS、Windows、Linux 版本。
- **Artifacts**：下载打包结果，测试安装包。
- **Release**：打上标签（如 v1.0.0）时，自动发布到 Releases。

## 与你框架的关系

- **PouchDB**：打包后数据库文件保存在用户数据目录。
- **Crawlee**：代理插件打包后仍有效，需确保 plugins/ 复制。
- **Python 插件**：proxy_manager.py 随应用分发，路径正确配置。
- **Next.js**：out/ 目录构建后嵌入。

## 常见问题及解决

- **构建失败**：检查 Actions 日志，确认 npm install 和 npm run make 输出。
- **文件未复制**：验证 afterCopy 脚本路径。
- **权限问题**：在 macOS 上可能需添加 codesign（见 Electron Forge 文档）。
