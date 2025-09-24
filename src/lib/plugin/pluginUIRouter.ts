/**
 * 插件 UI 路由管理器
 * 负责动态注册和管理插件的 UI 页面和 API 路由
 */

import path from 'path';
import fs from 'fs/promises';

interface PluginUIRoute {
  pluginName: string;
  route: string;
  type: 'page' | 'api';
  filePath: string;
}

class PluginUIRouter {
  private routes: Map<string, PluginUIRoute> = new Map();
  private isInitialized: boolean = false;

  /**
   * 初始化插件 UI 路由
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('Initializing Plugin UI Router...');
    await this.scanPluginUIRoutes();
    this.isInitialized = true;
    console.log('Plugin UI Router initialized.');
  }

  /**
   * 扫描插件 UI 路由
   */
  private async scanPluginUIRoutes() {
    const pluginsDir = path.join(process.cwd(), 'plugins');
    
    try {
      const pluginNames = await fs.readdir(pluginsDir);
      
      for (const pluginName of pluginNames) {
        const pluginPath = path.join(pluginsDir, pluginName);
        const manifestPath = path.join(pluginPath, 'manifest.json');
        
        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          
          if (manifest.ui?.enabled && manifest.ui?.route) {
            await this.registerPluginRoutes(pluginName, pluginPath, manifest);
          }
        } catch (error) {
          console.error(`Failed to load manifest for plugin ${pluginName}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to scan plugin UI routes:', error);
    }
  }

  /**
   * 注册插件路由
   */
  private async registerPluginRoutes(pluginName: string, pluginPath: string, manifest: any) {
    const baseRoute = manifest.ui.route;
    
    // 注册页面路由
    const pagesPath = path.join(pluginPath, 'ui', 'pages');
    if (await this.pathExists(pagesPath)) {
      const pageFiles = await this.findPageFiles(pagesPath);
      for (const pageFile of pageFiles) {
        const route = this.getRouteFromFilePath(pageFile, pagesPath, baseRoute);
        this.routes.set(route, {
          pluginName,
          route,
          type: 'page',
          filePath: pageFile
        });
        console.log(`Registered page route: ${route} -> ${pageFile}`);
      }
    }

    // 注册 API 路由
    const apiPath = path.join(pluginPath, 'ui', 'api');
    if (await this.pathExists(apiPath)) {
      const apiFiles = await this.findApiFiles(apiPath);
      for (const apiFile of apiFiles) {
        const route = this.getApiRouteFromFilePath(apiFile, apiPath, baseRoute);
        this.routes.set(route, {
          pluginName,
          route,
          type: 'api',
          filePath: apiFile
        });
        console.log(`Registered API route: ${route} -> ${apiFile}`);
      }
    }
  }

  /**
   * 查找页面文件
   */
  private async findPageFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findPageFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name === 'page.tsx' || entry.name === 'page.js')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * 查找 API 文件
   */
  private async findApiFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findApiFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name === 'route.ts' || entry.name === 'route.js')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Failed to scan API directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * 从文件路径生成页面路由
   */
  private getRouteFromFilePath(filePath: string, basePath: string, pluginRoute: string): string {
    const relativePath = path.relative(basePath, filePath);
    const routePath = path.dirname(relativePath);
    
    if (routePath === '.') {
      return pluginRoute;
    }
    
    return `${pluginRoute}/${routePath}`;
  }

  /**
   * 从文件路径生成 API 路由
   */
  private getApiRouteFromFilePath(filePath: string, basePath: string, pluginRoute: string): string {
    const relativePath = path.relative(basePath, filePath);
    const routePath = path.dirname(relativePath);
    
    return `/api${pluginRoute}/${routePath}`;
  }

  /**
   * 检查路径是否存在
   */
  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取所有注册的路由
   */
  getRoutes(): PluginUIRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * 根据路由获取插件信息
   */
  getRouteInfo(route: string): PluginUIRoute | undefined {
    return this.routes.get(route);
  }

  /**
   * 获取插件的所有路由
   */
  getPluginRoutes(pluginName: string): PluginUIRoute[] {
    return Array.from(this.routes.values()).filter(route => route.pluginName === pluginName);
  }
}

export const pluginUIRouter = new PluginUIRouter();
