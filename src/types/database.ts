/**
 * 数据库相关类型定义
 */

export interface DatabaseStats {
  name: string;
  doc_count: number;
  update_seq: number;
  size: number;
  status: 'connected' | 'disconnected' | 'error';
}

export interface DatabaseInfo {
  doc_count: number;
  update_seq: number;
  data_size: number;
  disk_size?: number;
  instance_start_time?: string;
  compact_running?: boolean;
  purge_seq?: number;
  sizes?: {
    file?: number;
    external?: number;
    active?: number;
  };
}

export interface DatabaseConfig {
  name: string;
  adapter: string;
  auto_compaction?: boolean;
  revs_limit?: number;
}

export interface DatabaseDocument {
  _id: string;
  _rev: string;
  [key: string]: any;
}

export interface DatabaseQueryResult {
  rows: Array<{
    id: string;
    key: string;
    value: {
      rev: string;
    };
    doc?: DatabaseDocument;
  }>;
  total_rows: number;
  offset: number;
}

export interface DatabaseOperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface DatabaseService {
  getInfo(): Promise<DatabaseInfo>;
  getAllDocs(options?: any): Promise<DatabaseQueryResult>;
  get(id: string): Promise<DatabaseDocument>;
  put(doc: DatabaseDocument): Promise<DatabaseOperationResult>;
  remove(doc: DatabaseDocument): Promise<DatabaseOperationResult>;
  clear(): Promise<DatabaseOperationResult>;
  close(): Promise<void>;
}

export interface DatabaseManager {
  getDatabase(name: string): DatabaseService;
  getDatabaseInfo(name: string): Promise<DatabaseInfo>;
  clearDatabase(name: string): Promise<void>;
  closeDatabases(): Promise<void>;
  initializeDatabases(): Promise<void>;
}
