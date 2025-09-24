/**
 * 安全的数据库服务
 * 提供错误处理和客户端检查
 */

import { getDatabase } from './config';
import { safeDatabaseOperation, isClient } from './client-only';

export class SafeDatabaseService {
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  /**
   * 安全地获取数据库实例
   */
  private async getSafeDatabase() {
    if (!isClient) {
      console.warn(`Database ${this.dbName} not available on server side`);
      return null;
    }
    
    return safeDatabaseOperation(async () => {
      return getDatabase(this.dbName);
    });
  }

  /**
   * 安全地执行数据库操作
   */
  async safeOperation<T>(operation: (db: any) => Promise<T>): Promise<T | null> {
    const db = await this.getSafeDatabase();
    if (!db) {
      console.warn(`Database ${this.dbName} not available`);
      return null;
    }

    return safeDatabaseOperation(() => operation(db));
  }

  /**
   * 获取数据库信息
   */
  async getInfo() {
    return this.safeOperation(async (db) => {
      return await db.info();
    });
  }

  /**
   * 创建文档
   */
  async create(doc: any) {
    return this.safeOperation(async (db) => {
      return await db.put(doc);
    });
  }

  /**
   * 获取文档
   */
  async get(id: string) {
    return this.safeOperation(async (db) => {
      return await db.get(id);
    });
  }

  /**
   * 更新文档
   */
  async update(doc: any) {
    return this.safeOperation(async (db) => {
      return await db.put(doc);
    });
  }

  /**
   * 删除文档
   */
  async delete(id: string, rev: string) {
    return this.safeOperation(async (db) => {
      return await db.remove(id, rev);
    });
  }

  /**
   * 查询所有文档
   */
  async getAllDocs(options: any = {}) {
    const result = await this.safeOperation(async (db) => {
      return await db.allDocs({
        include_docs: true,
        ...options
      });
    });
    
    if (result) {
      // 提取完整的文档内容
      const docs = result.rows.map((row: any) => ({
        id: row.id,
        key: row.key,
        value: row.value,
        doc: row.doc
      }));
      
      return {
        success: true,
        data: docs
      };
    } else {
      return {
        success: false,
        data: []
      };
    }
  }

  /**
   * 清空数据库
   */
  async clear() {
    return this.safeOperation(async (db) => {
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

      return {
        success: true,
        data: { deletedCount: docsToDelete.length },
      };
    });
  }
}
