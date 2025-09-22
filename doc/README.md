# Airdropz 框架

一个基于 Electron + Next.js + Python 插件的跨平台桌面应用框架，专为自动化任务、数据采集和代理管理而设计。

## 🚀 核心特性

- 🖥️ **跨平台支持**：支持 Windows、macOS、Linux
- ⚡ **现代前端**：Next.js + React + TypeScript
- 🔌 **双插件系统**：支持 JavaScript 和 Python 插件
- 🕷️ **智能爬取**：Crawlee + Playwright 网页抓取
- 💾 **本地存储**：PouchDB 数据持久化
- 🌐 **代理管理**：内置代理池和轮换机制
- 🚀 **自动化构建**：GitHub Actions 自动打包

## 📁 项目结构

```
framework/
├── electron/                 # Electron 主进程
│   ├── main.js              # 应用入口
│   ├── pluginManager.js     # 插件管理器
│   ├── browserService.js    # 浏览器服务
│   └── preload.js           # 预加载脚本
├── src/                     # Next.js 前端
│   └── app/                 # 应用页面
├── plugins/                 # 插件目录
│   ├── proxy-browser/       # JS 代理浏览器插件
│   └── proxy-manager/       # Python 代理管理插件
├── public/                  # 静态资源
├── doc/                     # 项目文档
└── .github/workflows/       # GitHub Actions
```

## 🛠️ 快速开始

### 环境要求

- Node.js 20+
- Python 3.13+
- Git

### 安装和运行

```bash
# 克隆项目
git clone <repository-url>
cd framework

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建和打包

```bash
# 构建应用
npm run build

# 打包应用
npm run make
```

## 📚 文档

- [系统架构概述](./doc/系统架构概述.md) - 了解系统整体架构
- [开发指南](./doc/开发指南.md) - 学习如何开发应用
- [插件开发指南](./doc/插件开发指南.md) - 开发 JavaScript 和 Python 插件
- [GitHub Actions 应用方案](./doc/Github Action应用方案.md) - 自动化构建配置

## 🔌 插件系统

### JavaScript 插件

```javascript
// plugins/my-plugin/index.js
module.exports = (context) => {
  const myAction = async (params) => {
    // 插件逻辑
    return { success: true, data: result };
  };

  return {
    init() {
      context.registerAction('myAction', myAction);
    }
  };
};
```

### Python 插件

```python
# plugins/my-plugin/my_plugin.py
import sys
import json

for line in sys.stdin:
    command = line.strip()
    if command == "my_command":
        result = {"status": "success", "data": "Hello from Python!"}
        print(json.dumps(result))
        sys.stdout.flush()
```

## 🎯 使用场景

- **数据采集**：自动化网页数据抓取
- **代理管理**：代理池管理和轮换
- **任务自动化**：批量处理任务
- **数据分析**：数据处理和可视化
- **API 集成**：第三方服务集成

## 🛡️ 安全特性

- 上下文隔离
- 禁用 Node 集成
- 预加载脚本安全机制
- 插件沙箱运行

## 🚀 部署

### 本地部署

```bash
npm run make
```

### GitHub Actions 自动部署

推送代码到 main 分支即可自动触发构建和部署。

## 🤝 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 支持

如有问题，请查看文档或创建 Issue。

---

**Airdropz** - 让桌面应用开发更简单、更强大！
