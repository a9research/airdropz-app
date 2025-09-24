/**
 * 数据库服务基类
 */

import PouchDB from 'pouchdb';
import { DatabaseService, DatabaseInfo, DatabaseDocument, DatabaseQueryResult, DatabaseOperationResult } from '../../types/database';

export class DatabaseServiceBase implements DatabaseService {
  protected db: PouchDB.Database;

  constructor(db: PouchDB.Database) {
    this.db = db;
  }

  /**
   * 获取数据库信息
   */
  async getInfo(): Promise<DatabaseInfo> {
    try {
      const info = await this.db.info();
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
      console.error('Failed to get database info:', error);
      throw error;
    }
  }

  /**
   * 获取所有文档
   */
  async getAllDocs(options: any = {}): Promise<DatabaseQueryResult> {
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        ...options,
      });

      return {
        rows: result.rows.map((row: any) => ({
          id: row.id,
          key: row.key,
          value: {
            rev: row.value.rev,
          },
          doc: row.doc,
        })),
        total_rows: result.total_rows,
        offset: result.offset,
      };
    } catch (error) {
      console.error('Failed to get all docs:', error);
      throw error;
    }
  }

  /**
   * 获取单个文档
   */
  async get(id: string): Promise<DatabaseDocument> {
    try {
      return await this.db.get(id);
    } catch (error) {
      console.error(`Failed to get document ${id}:`, error);
      throw error;
    }
  }

  /**
   * 保存文档
   */
  async put(doc: DatabaseDocument): Promise<DatabaseOperationResult> {
    try {
      const result = await this.db.put(doc);
      return {
        success: true,
        data: {
          id: result.id,
          rev: result.rev,
        },
      };
    } catch (error) {
      console.error('Failed to put document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除文档
   */
  async remove(doc: DatabaseDocument): Promise<DatabaseOperationResult> {
    try {
      const result = await this.db.remove(doc);
      return {
        success: true,
        data: {
          id: result.id,
          rev: result.rev,
        },
      };
    } catch (error) {
      console.error('Failed to remove document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 清空数据库
   */
  async clear(): Promise<DatabaseOperationResult> {
    try {
      // 获取所有文档
      const allDocs = await this.db.allDocs();
      
      // 删除所有文档
      const docsToDelete = allDocs.rows.map(row => ({
        _id: row.id,
        _rev: row.value.rev,
        _deleted: true,
      }));

      if (docsToDelete.length > 0) {
        await this.db.bulkDocs(docsToDelete);
      }

      return {
        success: true,
        data: { deletedCount: docsToDelete.length },
      };
    } catch (error) {
      console.error('Failed to clear database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      console.error('Failed to close database:', error);
      throw error;
    }
  }

  /**
   * 批量操作
   */
  async bulkDocs(docs: DatabaseDocument[]): Promise<DatabaseOperationResult> {
    try {
      const results = await this.db.bulkDocs(docs);
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('Failed to bulk docs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 查询文档
   */
  async find(selector: any, options: any = {}): Promise<DatabaseQueryResult> {
    try {
      const result = await this.db.find({
        selector,
        ...options,
      });

      return {
        rows: result.docs.map(doc => ({
          id: doc._id,
          key: doc._id,
          value: {
            rev: doc._rev,
          },
          doc,
        })),
        total_rows: result.docs.length,
        offset: 0,
      };
    } catch (error) {
      console.error('Failed to find documents:', error);
      throw error;
    }
  }
}
