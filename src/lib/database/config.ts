/**
 * 数据库配置和初始化
 */

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import { DatabaseConfig, DatabaseInfo, DatabaseService } from '../../types/database';

// 启用find插件
PouchDB.plugin(PouchDBFind);

// 数据库配置
export const DATABASE_CONFIG: Record<string, DatabaseConfig> = {
  notifications: {
    name: 'airdropz_notifications',
    adapter: 'idb',
    auto_compaction: true,
    revs_limit: 10,
  },
  gaea_accounts: {
    name: 'airdropz_gaea_accounts',
    adapter: 'idb',
    auto_compaction: true,
    revs_limit: 10,
  },
  gaea_groups: {
    name: 'airdropz_gaea_groups',
    adapter: 'idb',
    auto_compaction: true,
    revs_limit: 10,
  },
  gaea_tickets: {
    name: 'airdropz_gaea_tickets',
    adapter: 'idb',
    auto_compaction: true,
    revs_limit: 10,
  },
  gaea_decisions: {
    name: 'airdropz_gaea_decisions',
    adapter: 'idb',
    auto_compaction: true,
    revs_limit: 10,
  },
  gaea_decision_settings: {
    name: 'airdropz_gaea_decision_settings',
    adapter: 'idb',
    auto_compaction: true,
    revs_limit: 5,
  },
};

// 数据库实例缓存
const databaseInstances: Record<string, PouchDB.Database> = {};

/**
 * 获取数据库实例
 */
export const getDatabase = (name: string): PouchDB.Database => {
  // 在服务端渲染时抛出明确的错误
  if (typeof window === 'undefined') {
    throw new Error(`Database '${name}' cannot be accessed on server side. Use client-side components only.`);
  }

  if (!databaseInstances[name]) {
    const config = DATABASE_CONFIG[name];
    if (!config) {
      throw new Error(`Database configuration not found for: ${name}`);
    }

    databaseInstances[name] = new PouchDB(config.name, {
      adapter: config.adapter,
      auto_compaction: config.auto_compaction,
      revs_limit: config.revs_limit,
    });
  }

  return databaseInstances[name];
};
/**
 * 获取数据库信息
 */
export const getDatabaseInfo = async (name: string): Promise<DatabaseInfo> => {
  try {
    const db = getDatabase(name);
    const info = await db.info();
    
    return {
      doc_count: info.doc_count || 0,
      update_seq: Number(info.update_seq) || 0,
      data_size: (info as any).data_size || 0,
      disk_size: (info as any).disk_size || 0,
      instance_start_time: (info as any).instance_start_time || new Date().toISOString(),
      compact_running: (info as any).compact_running || false,
      purge_seq: (info as any).purge_seq || 0,
      sizes: (info as any).sizes || {},
    };
  } catch (error) {
    console.error(`Failed to get database info for ${name}:`, error);
    throw error;
  }
};

/**
 * 清理数据库
 */
export const clearDatabase = async (name: string): Promise<void> => {
  try {
    const db = getDatabase(name);
    
    // 获取所有文档
    const allDocs = await db.allDocs();
    
    // 删除所有文档
    const docsToDelete = allDocs.rows.map((row: any) => ({
      _id: row.id,
      _rev: row.value.rev,
      _deleted: true,
    }));

    if (docsToDelete.length > 0) {
      await db.bulkDocs(docsToDelete);
    }
  } catch (error) {
    console.error(`Failed to clear database ${name}:`, error);
    throw error;
  }
};

/**
 * 关闭所有数据库连接
 */
export const closeDatabases = async (): Promise<void> => {
  const closePromises = Object.keys(databaseInstances).map(async (name) => {
    try {
      await databaseInstances[name].close();
      delete databaseInstances[name];
    } catch (error) {
      console.error(`Failed to close database ${name}:`, error);
    }
  });

  await Promise.all(closePromises);
};

/**
 * 初始化所有数据库
 */
export const initializeDatabases = async (): Promise<void> => {
  const initPromises = Object.keys(DATABASE_CONFIG).map(async (name) => {
    try {
      const db = getDatabase(name);
      // 测试连接
      await db.info();
      console.log(`Database ${name} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize database ${name}:`, error);
      throw error;
    }
  });

  await Promise.all(initPromises);
};

/**
 * 检查数据库是否可用
 */
export const isDatabaseAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  } catch {
    return false;
  }
};

/**
 * 获取数据库大小（字节）
 */
export const getDatabaseSize = async (name: string): Promise<number> => {
  try {
    const info = await getDatabaseInfo(name);
    return info.data_size || 0;
  } catch {
    return 0;
  }
};

/**
 * 格式化字节大小
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

