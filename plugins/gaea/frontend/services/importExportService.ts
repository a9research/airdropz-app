import { CSVAccountData, ImportResult } from '../../shared/types/import-export';

export class ImportExportService {
  /**
   * 从CSV数据导入账号
   */
  async importFromCSV(csvData: CSVAccountData[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      accounts: []
    };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 1;

        try {
          // 验证必填字段
          if (!row.Name || !row.Username || !row.UID) {
            result.failed++;
            result.errors.push(`第${rowNumber}行: 缺少必填字段 (Name, Username, UID)`);
            continue;
          }

          // 构建账号数据
          const accountData = {
            name: row.Name.trim(),
            username: row.Username.trim(),
            uid: row.UID.trim(),
            browserId: row.Browser_ID?.trim() || '',
            token: row.Token?.trim() || '',
            proxy: row.Proxy?.trim() || '',
            password: row.Password?.trim() || '',
            group: row.Group?.trim() || 'Default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // 直接使用数据库服务创建账号
          const { getDatabaseService } = await import('@/lib/database');
          const dbService = getDatabaseService('gaea_accounts');
          
          // 创建账号文档
          const accountDoc = {
            _id: `account_${Date.now()}_${i}`,
            name: accountData.name,
            browserId: accountData.browserId,
            token: accountData.token,
            proxy: accountData.proxy,
            uid: accountData.uid,
            username: accountData.username,
            password: accountData.password,
            group: accountData.group,
            createdAt: accountData.createdAt,
            updatedAt: accountData.updatedAt
          } as any;
          
          // 保存到数据库
          await dbService.put(accountDoc);
          
          result.success++;
          result.accounts.push(accountDoc);
        } catch (error) {
          result.failed++;
          result.errors.push(`第${rowNumber}行: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    } catch (error) {
      result.errors.push(`导入过程出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return result;
  }

  /**
   * 导出账号为CSV格式
   */
  async exportToCSV(): Promise<string> {
    try {
      const response = await fetch('/api/plugin/gaea/accounts?limit=10000');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} 错误`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data.accounts) {
        return '';
      }

      const accounts = data.data.accounts;
      
      // CSV表头
      const headers = ['Name', 'Browser_ID', 'Token', 'Proxy', 'UID', 'Username', 'Password', 'Group'];
      
      // 构建CSV内容
      const csvRows = [headers.join(',')];
      
      accounts.forEach((account: any) => {
        const row = [
          account.name || '',
          account.browserId || '',
          account.token || '',
          account.proxy || '',
          account.uid || '',
          account.username || '',
          account.password || '',
          account.group || 'Default'
        ].map(field => `"${field}"`); // 用引号包围字段，防止CSV解析问题
        
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('导出CSV失败:', error);
      throw error;
    }
  }

  /**
   * 导出账号为JSON格式
   */
  async exportToJSON(): Promise<string> {
    try {
      const response = await fetch('/api/plugin/gaea/accounts?limit=10000');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} 错误`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data.accounts) {
        return JSON.stringify([], null, 2);
      }

      return JSON.stringify(data.data.accounts, null, 2);
    } catch (error) {
      console.error('导出JSON失败:', error);
      throw error;
    }
  }
}
