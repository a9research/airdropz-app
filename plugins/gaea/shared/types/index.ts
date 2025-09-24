/**
 * Gaea 插件共享类型定义
 */

export interface GaeaAccount {
  _id?: string;
  name: string;
  browser_id: string;
  token: string;
  proxy?: string;
  uid: string;
  username: string;
  password: string;
  group_name: string;
  created_at?: string;
  updated_at?: string;
  group_color?: string;
  group_description?: string;
}

export interface GaeaGroup {
  _id?: string;
  name: string;
  description?: string;
  color?: string;
  type?: string;
  created_at?: string;
  account_count?: number;
}

export interface GaeaSelectionState {
  _id?: string;
  account_id: string;
  session_id: string;
  selected: boolean;
  type?: string;
  created_at?: string;
}

export interface GaeaQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  group?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GaeaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GaeaBatchOperationParams {
  accountIds: string[];
  operation: 'delete' | 'change_group' | 'export';
  data?: any;
}

export interface GaeaImportResult {
  success_count: number;
  failed_count: number;
  errors: string[];
}
