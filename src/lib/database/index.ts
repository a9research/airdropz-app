/**
 * 数据库模块导出
 */

// 导出配置和工具函数
export * from './config';

// 导出服务基类
export { DatabaseServiceBase } from './service';

// 导出类型定义
export * from '@/types/database';

// 数据库管理器
import { getDatabase, getDatabaseInfo, clearDatabase, closeDatabases, initializeDatabases } from './config';
import { DatabaseServiceBase } from './service';

/**
 * 数据库管理器类
 */
export class DatabaseManager {
  /**
   * 获取数据库实例
   */
  static getDatabase(name: string) {
    const db = getDatabase(name);
    return new DatabaseServiceBase(db);
  }

  /**
   * 获取数据库信息
   */
  static async getDatabaseInfo(name: string) {
    return getDatabaseInfo(name);
  }

  /**
   * 清理数据库
   */
  static async clearDatabase(name: string) {
    return clearDatabase(name);
  }

  /**
   * 关闭所有数据库
   */
  static async closeDatabases() {
    return closeDatabases();
  }

  /**
   * 初始化所有数据库
   */
  static async initializeDatabases() {
    return initializeDatabases();
  }
}

// 便捷的导出函数
export const getDatabaseService = (name: string) => DatabaseManager.getDatabase(name);
export const getDatabaseInfoService = (name: string) => DatabaseManager.getDatabaseInfo(name);
export const clearDatabaseService = (name: string) => DatabaseManager.clearDatabase(name);
export const closeDatabasesService = () => DatabaseManager.closeDatabases();
export const initializeDatabasesService = () => DatabaseManager.initializeDatabases();
