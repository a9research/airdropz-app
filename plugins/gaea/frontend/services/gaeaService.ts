/**
 * Gaea 账号管理服务
 * 纯前端实现，使用 PouchDB 进行数据存储
 */

import { getDatabaseService } from '../../../../src/lib/database';
import { 
  GaeaAccount, 
  GaeaGroup, 
  GaeaSelectionState, 
  GaeaQueryParams,
  GaeaApiResponse,
  GaeaBatchOperationParams,
  GaeaImportResult
} from '../../shared/types';

export class GaeaService {
  private db: any;
  private initialized: boolean = false;

  constructor() {
    this.db = null;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.db = getDatabaseService('gaea_accounts');
      this.initialized = true;
      console.log('Gaea service initialized');
    } catch (error) {
      console.error('Failed to initialize Gaea service:', error);
      throw error;
    }
  }

  // 账号管理
  async getAccounts(params: GaeaQueryParams = {}): Promise<{
    accounts: GaeaAccount[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    await this.init();
    
    const { page = 1, limit = 50, search = '', group = 'all', sortBy = 'name', sortOrder = 'asc' } = params;
    
    // 构建查询条件
    let selector: any = {};
    
    if (search) {
      selector = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { uid: { $regex: search, $options: 'i' } },
          { browser_id: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    if (group !== 'all') {
      if (selector.$or) {
        selector = {
          $and: [
            selector,
            { group_name: group }
          ]
        };
      } else {
        selector.group_name = group;
      }
    }

    try {
      const result = await this.db.find(selector, {
        skip: (page - 1) * limit,
        limit: limit,
        sort: [{ [sortBy]: sortOrder }]
      });

      return {
        accounts: result.docs || [],
        total: result.total_rows || 0,
        page: page,
        limit: limit,
        total_pages: Math.ceil((result.total_rows || 0) / limit)
      };
    } catch (error) {
      console.error('Error getting accounts:', error);
      throw error;
    }
  }

  async createAccount(accountData: Omit<GaeaAccount, '_id' | 'created_at' | 'updated_at'>): Promise<GaeaAccount> {
    await this.init();
    
    const account: GaeaAccount = {
      _id: `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...accountData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const result = await this.db.create(account);
      return result;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async updateAccount(accountId: string, updateData: Partial<GaeaAccount>): Promise<GaeaAccount> {
    await this.init();
    
    try {
      const account = await this.db.get(accountId);
      if (!account) {
        throw new Error('账号不存在');
      }

      const updatedAccount = {
        ...account,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.db.update(updatedAccount);
      return result;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.init();
    
    try {
      await this.db.delete(accountId);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // 分组管理
  async getGroups(): Promise<GaeaGroup[]> {
    await this.init();
    
    try {
      const result = await this.db.find({ type: 'group' });
      return result.docs || [];
    } catch (error) {
      console.error('Error getting groups:', error);
      throw error;
    }
  }

  async createGroup(groupData: Omit<GaeaGroup, '_id' | 'created_at'>): Promise<GaeaGroup> {
    await this.init();
    
    const group: GaeaGroup = {
      _id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'group',
      ...groupData,
      created_at: new Date().toISOString()
    };

    try {
      const result = await this.db.create(group);
      return result;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async updateGroup(groupId: string, updateData: Partial<GaeaGroup>): Promise<GaeaGroup> {
    await this.init();
    
    try {
      const group = await this.db.get(groupId);
      if (!group) {
        throw new Error('分组不存在');
      }

      const updatedGroup = {
        ...group,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.db.update(updatedGroup);
      return result;
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.init();
    
    try {
      await this.db.delete(groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // 批量操作
  async batchOperation(accountIds: string[], operation: string, data: any = {}): Promise<string> {
    await this.init();
    
    try {
      switch (operation) {
        case 'delete':
          for (const accountId of accountIds) {
            await this.db.delete(accountId);
          }
          return `已删除 ${accountIds.length} 个账号`;
          
        case 'change_group':
          for (const accountId of accountIds) {
            await this.updateAccount(accountId, { group_name: data.group_name });
          }
          return `已将 ${accountIds.length} 个账号移动到分组 ${data.group_name}`;
          
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }
    } catch (error) {
      console.error('Error in batch operation:', error);
      throw error;
    }
  }

  // 选择状态管理
  async getSelectionState(sessionId: string = 'default'): Promise<string[]> {
    await this.init();
    
    try {
      const result = await this.db.find({ 
        type: 'selection_state', 
        session_id: sessionId,
        selected: true 
      });
      
      return result.docs.map((doc: GaeaSelectionState) => doc.account_id);
    } catch (error) {
      console.error('Error getting selection state:', error);
      throw error;
    }
  }

  async setSelectionState(accountIds: string[], selected: boolean, sessionId: string = 'default'): Promise<void> {
    await this.init();
    
    try {
      for (const accountId of accountIds) {
        const selectionDoc: GaeaSelectionState = {
          _id: `selection_${sessionId}_${accountId}`,
          type: 'selection_state',
          account_id: accountId,
          session_id: sessionId,
          selected: selected,
          created_at: new Date().toISOString()
        };
        
        await this.db.create(selectionDoc);
      }
    } catch (error) {
      console.error('Error setting selection state:', error);
      throw error;
    }
  }

  async clearSelectionState(sessionId: string = 'default'): Promise<void> {
    await this.init();
    
    try {
      const result = await this.db.find({ 
        type: 'selection_state', 
        session_id: sessionId 
      });
      
      for (const doc of result.docs) {
        await this.db.delete(doc._id);
      }
    } catch (error) {
      console.error('Error clearing selection state:', error);
      throw error;
    }
  }

  // 导入导出
  async exportAccounts(accountIds?: string[]): Promise<string> {
    await this.init();
    
    try {
      let accounts: GaeaAccount[];
      
      if (accountIds && accountIds.length > 0) {
        accounts = [];
        for (const accountId of accountIds) {
          const account = await this.db.get(accountId);
          accounts.push(account);
        }
      } else {
        const result = await this.db.find({});
        accounts = result.docs;
      }

      // 转换为 CSV 格式
      const headers = ['Name', 'Browser_ID', 'Token', 'Proxy', 'UID', 'Username', 'Password', 'Group'];
      const csvRows = [headers.join(',')];
      
      for (const account of accounts) {
        const row = [
          account.name,
          account.browser_id,
          account.token,
          account.proxy || '',
          account.uid,
          account.username,
          account.password,
          account.group_name
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }
      
      return csvRows.join('\n');
    } catch (error) {
      console.error('Error exporting accounts:', error);
      throw error;
    }
  }

  async importAccounts(csvData: string): Promise<{
    success_count: number;
    failed_count: number;
    errors: string[];
  }> {
    await this.init();
    
    try {
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      const accounts = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
          const account: any = {};
          
          headers.forEach((header, index) => {
            account[header.toLowerCase().replace('_', '_')] = values[index];
          });
          
          accounts.push(account);
        }
      }

      let success_count = 0;
      let failed_count = 0;
      const errors: string[] = [];

      for (let i = 0; i < accounts.length; i++) {
        try {
          const accountData = {
            name: accounts[i].name,
            browser_id: accounts[i].browser_id,
            token: accounts[i].token,
            proxy: accounts[i].proxy || '',
            uid: accounts[i].uid,
            username: accounts[i].username,
            password: accounts[i].password,
            group_name: accounts[i].group || 'default'
          };
          
          await this.createAccount(accountData);
          success_count++;
        } catch (error) {
          failed_count++;
          errors.push(`第 ${i + 1} 行: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return { success_count, failed_count, errors };
    } catch (error) {
      console.error('Error importing accounts:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const gaeaService = new GaeaService();
