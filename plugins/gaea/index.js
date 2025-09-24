/**
 * Gaea 账号管理插件
 * 纯前端实现，使用 PouchDB 进行数据存储
 */

const { getDatabaseService } = require('../../src/lib/database');

class GaeaPlugin {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init(context) {
    try {
      console.log('Gaea plugin initializing...');
      
      // 初始化数据库
      this.db = getDatabaseService('gaea_accounts');
      
      // 注册插件动作
      context.registerAction('get_accounts', this.getAccounts.bind(this));
      context.registerAction('create_account', this.createAccount.bind(this));
      context.registerAction('update_account', this.updateAccount.bind(this));
      context.registerAction('delete_account', this.deleteAccount.bind(this));
      context.registerAction('get_groups', this.getGroups.bind(this));
      context.registerAction('create_group', this.createGroup.bind(this));
      context.registerAction('update_group', this.updateGroup.bind(this));
      context.registerAction('delete_group', this.deleteGroup.bind(this));
      context.registerAction('batch_operation', this.batchOperation.bind(this));
      context.registerAction('get_selection_state', this.getSelectionState.bind(this));
      context.registerAction('set_selection_state', this.setSelectionState.bind(this));
      context.registerAction('clear_selection_state', this.clearSelectionState.bind(this));
      
      this.initialized = true;
      console.log('Gaea plugin initialized successfully');
      
      return { success: true, message: 'Gaea plugin initialized' };
    } catch (error) {
      console.error('Gaea plugin initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  async cleanup() {
    try {
      if (this.db) {
        await this.db.close();
      }
      this.initialized = false;
      console.log('Gaea plugin cleaned up');
      return { success: true, message: 'Gaea plugin cleaned up' };
    } catch (error) {
      console.error('Gaea plugin cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 账号管理方法
  async getAccounts(params = {}) {
    try {
      const { page = 1, limit = 50, search = '', group = 'all', sortBy = 'name', sortOrder = 'asc' } = params;
      
      // 构建查询条件
      let selector = {};
      if (search) {
        selector = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
            { uid: { $regex: search, $options: 'i' } }
          ]
        };
      }
      
      if (group !== 'all') {
        selector.group_name = group;
      }

      const result = await this.db.find(selector, {
        skip: (page - 1) * limit,
        limit: limit,
        sort: [{ [sortBy]: sortOrder }]
      });

      return {
        success: true,
        data: {
          accounts: result.docs || [],
          total: result.total_rows || 0,
          page: page,
          limit: limit,
          total_pages: Math.ceil((result.total_rows || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error getting accounts:', error);
      return { success: false, error: error.message };
    }
  }

  async createAccount(accountData) {
    try {
      const account = {
        _id: `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...accountData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await this.db.create(account);
      
      return {
        success: true,
        data: result,
        message: '账号创建成功'
      };
    } catch (error) {
      console.error('Error creating account:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAccount(accountId, updateData) {
    try {
      const account = await this.db.get(accountId);
      if (!account) {
        return { success: false, error: '账号不存在' };
      }

      const updatedAccount = {
        ...account,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.db.update(updatedAccount);
      
      return {
        success: true,
        data: result,
        message: '账号更新成功'
      };
    } catch (error) {
      console.error('Error updating account:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteAccount(accountId) {
    try {
      await this.db.delete(accountId);
      
      return {
        success: true,
        message: '账号删除成功'
      };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { success: false, error: error.message };
    }
  }

  // 分组管理方法
  async getGroups() {
    try {
      const result = await this.db.find({ type: 'group' });
      
      return {
        success: true,
        data: result.docs || []
      };
    } catch (error) {
      console.error('Error getting groups:', error);
      return { success: false, error: error.message };
    }
  }

  async createGroup(groupData) {
    try {
      const group = {
        _id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'group',
        ...groupData,
        created_at: new Date().toISOString()
      };

      const result = await this.db.create(group);
      
      return {
        success: true,
        data: result,
        message: '分组创建成功'
      };
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGroup(groupId, updateData) {
    try {
      const group = await this.db.get(groupId);
      if (!group) {
        return { success: false, error: '分组不存在' };
      }

      const updatedGroup = {
        ...group,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.db.update(updatedGroup);
      
      return {
        success: true,
        data: result,
        message: '分组更新成功'
      };
    } catch (error) {
      console.error('Error updating group:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteGroup(groupId) {
    try {
      await this.db.delete(groupId);
      
      return {
        success: true,
        message: '分组删除成功'
      };
    } catch (error) {
      console.error('Error deleting group:', error);
      return { success: false, error: error.message };
    }
  }

  // 批量操作方法
  async batchOperation(params) {
    try {
      const { accountIds, operation, data = {} } = params;
      
      switch (operation) {
        case 'delete':
          for (const accountId of accountIds) {
            await this.db.delete(accountId);
          }
          return { success: true, message: `已删除 ${accountIds.length} 个账号` };
          
        case 'change_group':
          for (const accountId of accountIds) {
            await this.updateAccount(accountId, { group_name: data.group_name });
          }
          return { success: true, message: `已将 ${accountIds.length} 个账号移动到分组 ${data.group_name}` };
          
        default:
          return { success: false, error: `不支持的操作: ${operation}` };
      }
    } catch (error) {
      console.error('Error in batch operation:', error);
      return { success: false, error: error.message };
    }
  }

  // 选择状态管理
  async getSelectionState(sessionId = 'default') {
    try {
      const result = await this.db.find({ 
        type: 'selection_state', 
        session_id: sessionId,
        selected: true 
      });
      
      return {
        success: true,
        data: result.docs.map(doc => doc.account_id)
      };
    } catch (error) {
      console.error('Error getting selection state:', error);
      return { success: false, error: error.message };
    }
  }

  async setSelectionState(params) {
    try {
      const { accountIds, selected, sessionId = 'default' } = params;
      
      for (const accountId of accountIds) {
        const selectionDoc = {
          _id: `selection_${sessionId}_${accountId}`,
          type: 'selection_state',
          account_id: accountId,
          session_id: sessionId,
          selected: selected,
          created_at: new Date().toISOString()
        };
        
        await this.db.create(selectionDoc);
      }
      
      return {
        success: true,
        message: `已${selected ? '选择' : '取消选择'} ${accountIds.length} 个账号`
      };
    } catch (error) {
      console.error('Error setting selection state:', error);
      return { success: false, error: error.message };
    }
  }

  async clearSelectionState(sessionId = 'default') {
    try {
      const result = await this.db.find({ 
        type: 'selection_state', 
        session_id: sessionId 
      });
      
      for (const doc of result.docs) {
        await this.db.delete(doc._id);
      }
      
      return {
        success: true,
        message: '选择状态已清除'
      };
    } catch (error) {
      console.error('Error clearing selection state:', error);
      return { success: false, error: error.message };
    }
  }
}

// 导出插件函数
module.exports = function(context) {
  const plugin = new GaeaPlugin();
  
  return {
    init: () => plugin.init(context),
    cleanup: () => plugin.cleanup()
  };
};
