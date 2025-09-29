// src/lib/plugin/pluginResourceManager.ts
import path from 'path';
import fs from 'fs/promises';

interface PluginManifest {
  name: string;
  type: 'frontend' | 'backend' | 'hybrid';
  entry?: {
    frontend?: string;
    backend?: string;
  };
  resources?: {
    frontend?: string[];
    backend?: string[];
    shared?: string[];
  };
  [key: string]: any;
}

class PluginResourceManager {
  private plugins: Map<string, {
    manifest: PluginManifest;
    services: Map<string, any>;
    components: Map<string, any>;
    types: Map<string, any>;
    initialized: boolean;
  }> = new Map();

  private pluginDir: string;
  private isInitialized: boolean = false;

  constructor() {
    this.pluginDir = path.join(process.cwd(), 'plugins');
  }

  async init() {
    if (this.isInitialized) {
      return;
    }
    
    // 在构建时跳过插件加载
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      console.log('Skipping plugin loading during build...');
      this.isInitialized = true;
      return;
    }
    
    console.log('Initializing PluginResourceManager...');
    await this.loadAllPlugins();
    this.isInitialized = true;
    console.log('PluginResourceManager initialized.');
  }

  private async loadAllPlugins() {
    try {
      const pluginNames = await fs.readdir(this.pluginDir);
      for (const pluginName of pluginNames) {
        const pluginPath = path.join(this.pluginDir, pluginName);
        const manifestPath = path.join(pluginPath, 'manifest.json');
        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest: PluginManifest = JSON.parse(manifestContent);
          this.plugins.set(pluginName, {
            manifest,
            services: new Map(),
            components: new Map(),
            types: new Map(),
            initialized: false,
          });
          await this.loadPluginResources(pluginName, pluginPath, manifest);
        } catch (error) {
          console.error(`Failed to load manifest for plugin ${pluginName}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to read plugins directory:', error);
    }
  }

  private async loadPluginResources(pluginName: string, pluginPath: string, manifest: PluginManifest) {
    const pluginEntry = this.plugins.get(pluginName);
    if (!pluginEntry) return;

    console.log(`Loading resources for plugin: ${pluginName}`);

    // Load shared resources (types, constants, utils)
    if (manifest.resources?.shared) {
      for (const resourcePath of manifest.resources.shared) {
        const fullPath = path.join(pluginPath, resourcePath);
        try {
          // 只处理 JavaScript/TypeScript 文件，跳过其他文件类型
          if (this.isValidModuleFile(resourcePath)) {
            // 使用绝对路径导入，避免 webpack 分析
            const module = await import(/* webpackIgnore: true */ fullPath);
            pluginEntry.types.set(path.basename(resourcePath, path.extname(resourcePath)), module);
            console.log(`Loaded shared resource: ${resourcePath}`);
          } else {
            console.log(`Skipping non-module file: ${resourcePath}`);
          }
        } catch (error) {
          console.error(`Failed to load shared resource ${resourcePath} for plugin ${pluginName}:`, error);
        }
      }
    }

    // Load frontend resources (services, components)
    if (manifest.resources?.frontend) {
      for (const resourcePath of manifest.resources.frontend) {
        const fullPath = path.join(pluginPath, resourcePath);
        try {
          // 只处理 JavaScript/TypeScript 文件，跳过其他文件类型
          if (this.isValidModuleFile(resourcePath)) {
            // 使用绝对路径导入，避免 webpack 分析
            const module = await import(/* webpackIgnore: true */ fullPath);
            const serviceName = path.basename(resourcePath, path.extname(resourcePath));
            if (module.default) {
              pluginEntry.services.set(serviceName, module.default);
            } else if (Object.keys(module).length > 0) {
              pluginEntry.services.set(serviceName, module[Object.keys(module)[0]]);
            }
            console.log(`Loaded frontend service: ${resourcePath}`);
          } else {
            console.log(`Skipping non-module file: ${resourcePath}`);
          }
        } catch (error) {
          console.error(`Failed to load frontend resource ${resourcePath} for plugin ${pluginName}:`, error);
        }
      }
    }

    // Load UI resources (pages, components)
    const uiPagesPath = path.join(pluginPath, 'ui', 'pages');
    const uiApiPath = path.join(pluginPath, 'ui', 'api');
    
    try {
      // 检查是否存在 UI 页面
      if (await this.pathExists(uiPagesPath)) {
        console.log(`Found UI pages for plugin ${pluginName}`);
        // 这里可以添加页面注册逻辑
      }
      
      // 检查是否存在 UI API
      if (await this.pathExists(uiApiPath)) {
        console.log(`Found UI API for plugin ${pluginName}`);
        // 这里可以添加 API 注册逻辑
      }
    } catch (error) {
      console.error(`Failed to load UI resources for plugin ${pluginName}:`, error);
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private isValidModuleFile(filePath: string): boolean {
    const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const ext = path.extname(filePath).toLowerCase();
    
    // 检查文件扩展名
    if (!validExtensions.includes(ext)) {
      return false;
    }
    
    // 跳过特定文件
    const fileName = path.basename(filePath).toLowerCase();
    const skipFiles = ['readme', 'test', 'spec', 'config', 'setup'];
    
    for (const skipFile of skipFiles) {
      if (fileName.includes(skipFile)) {
        return false;
      }
    }
    
    return true;
  }

  getPluginService(pluginName: string, serviceName: string): any | undefined {
    const pluginEntry = this.plugins.get(pluginName);
    if (!pluginEntry) {
      console.warn(`Plugin ${pluginName} not found.`);
      return undefined;
    }
    const service = pluginEntry.services.get(serviceName);
    if (!service) {
      console.warn(`Service ${serviceName} not found for plugin ${pluginName}.`);
    }
    return service;
  }

  getPluginComponent(pluginName: string, componentName: string): any | undefined {
    const pluginEntry = this.plugins.get(pluginName);
    if (!pluginEntry) {
      console.warn(`Plugin ${pluginName} not found.`);
      return undefined;
    }
    const component = pluginEntry.components.get(componentName);
    if (!component) {
      console.warn(`Component ${componentName} not found for plugin ${pluginName}.`);
    }
    return component;
  }

  getPluginTypes(pluginName: string): Map<string, any> | undefined {
    const pluginEntry = this.plugins.get(pluginName);
    if (!pluginEntry) {
      console.warn(`Plugin ${pluginName} not found.`);
      return undefined;
    }
    return pluginEntry.types;
  }
}

export const pluginResourceManager = new PluginResourceManager();