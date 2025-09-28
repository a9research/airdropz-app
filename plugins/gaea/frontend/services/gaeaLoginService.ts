/**
 * Gaea登录服务 - 客户端版本
 * 通过API路由处理登录，避免Node.js模块在客户端的问题
 */

export interface LoginCredentials {
  username: string;
  password: string;
  proxy?: string;
}

export interface LoginResult {
  success: boolean;
  gaeaToken?: string;
  uid?: string;
  username?: string;
  userInfo?: any;
  browserId?: string;
  error?: string;
}

export class GaeaLoginService {
  /**
   * 执行登录
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      console.log('开始Gaea登录流程...');
      
      const response = await fetch('/api/plugin/gaea/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }

      const result = await response.json();
      
      // 如果登录成功，保存到数据库
      if (result.success && result.gaeaToken) {
        try {
          await this.saveToDatabase({
            username: credentials.username,
            password: credentials.password,
            proxy: credentials.proxy,
            gaeaToken: result.gaeaToken,
            uid: result.uid,
            userInfo: result.userInfo
          });
          console.log('💾 登录信息已保存到数据库');
        } catch (dbError) {
          console.error('❌ 数据库存储失败:', dbError);
          // 即使数据库存储失败，也返回登录成功
        }
      }
      
      return result;
    } catch (error) {
      console.error('Gaea登录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 保存登录信息到数据库
   */
  private async saveToDatabase(loginData: {
    username: string;
    password: string;
    proxy?: string;
    gaeaToken: string;
    uid: string;
    userInfo: any;
  }): Promise<void> {
    try {
      console.log('💾 开始保存登录信息到数据库...');
      console.log('🔑 准备保存的token:', loginData.gaeaToken ? loginData.gaeaToken.substring(0, 50) + '...' : 'N/A');
      
      // 动态导入数据库服务
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 查找现有账号记录（通过用户名匹配）
      let existingDoc = null;
      let accountId = null;
      
      try {
        // 获取所有文档，查找匹配的用户名
        const allDocs = await dbService.getAllDocs({ include_docs: true });
        console.log('🔍 搜索现有账号记录，用户名:', loginData.username);
        
        for (const row of allDocs.rows) {
          if (row.doc && row.doc.username === loginData.username) {
            existingDoc = row.doc;
            accountId = row.doc._id;
            console.log('📄 找到现有账号记录:', accountId);
            console.log('🔄 更新前的token:', existingDoc.token ? existingDoc.token.substring(0, 50) + '...' : 'N/A');
            break;
          }
        }
        
        if (!existingDoc) {
          console.log('❌ 未找到现有账号记录，无法更新');
          throw new Error(`未找到用户名为 ${loginData.username} 的现有账号记录`);
        }
      } catch (error: any) {
        console.error('❌ 查找现有账号记录失败:', error);
        throw error;
      }
      
      // 准备账号数据（更新现有记录）
      const accountData: any = {
        ...existingDoc, // 保留所有现有字段
        token: loginData.gaeaToken, // 更新token
        uid: loginData.uid, // 更新uid
        user_info: loginData.userInfo, // 更新用户信息
        updated_at: new Date().toISOString() // 更新修改时间
      };
      
      // 如果提供了代理，更新代理信息
      if (loginData.proxy) {
        accountData.proxy = loginData.proxy;
      }
      
      console.log('🔄 更新账号数据:', {
        _id: accountData._id,
        name: accountData.name,
        username: accountData.username,
        token: accountData.token ? accountData.token.substring(0, 50) + '...' : 'N/A',
        uid: accountData.uid,
        updated_at: accountData.updated_at
      });
      
      // 保存到数据库
      await dbService.put(accountData);
      
      console.log('✅ 账号信息已保存到数据库:', accountId);
      
      // 验证保存的数据，从数据库中读取并显示token
      try {
        if (accountId) {
          const savedDoc = await dbService.get(accountId);
          console.log('🔍 验证保存的token:', {
            accountId: savedDoc._id,
            token: savedDoc.token ? savedDoc.token.substring(0, 50) + '...' : 'N/A',
            tokenLength: savedDoc.token ? savedDoc.token.length : 0,
            updated_at: savedDoc.updated_at
          });
        }
      } catch (verifyError) {
        console.warn('⚠️ 验证保存数据失败:', verifyError);
      }
      console.log('📋 保存的数据:', {
        name: accountData.name,
        username: accountData.username,
        uid: accountData.uid,
        token: accountData.token ? accountData.token.substring(0, 50) + '...' : 'N/A',
        hasToken: !!accountData.token,
        hasProxy: !!accountData.proxy
      });
      
      console.log('💾 登录信息已保存到数据库');
      
      // 显示完整的保存数据（用于调试）
      console.log('🔍 完整保存数据:', {
        _id: accountData._id,
        name: accountData.name,
        username: accountData.username,
        token: accountData.token ? accountData.token.substring(0, 100) + '...' : 'N/A',
        uid: accountData.uid,
        proxy: accountData.proxy ? '已配置' : '未配置',
        group_name: accountData.group_name,
        created_at: accountData.created_at,
        updated_at: accountData.updated_at
      });
      
    } catch (error) {
      console.error('❌ 数据库保存失败:', error);
      throw error;
    }
  }

  /**
   * 更新账号的token信息
   */
  async updateAccountTokens(accountId: string, gaeaToken: string, browserId: string | null): Promise<boolean> {
    try {
      // 动态导入数据库服务
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取现有账号数据
      const existingDoc = await dbService.get(accountId);
      
      // 更新token信息，保留原有的browser_id（如果新browserId为null）
      const updatedDoc = {
        ...existingDoc,
        token: gaeaToken,
        browser_id: browserId || existingDoc.browser_id, // 保留原有browser_id如果新值为null
        updated_at: new Date().toISOString()
      };
      
      // 保存到数据库
      await dbService.put(updatedDoc);
      
      console.log(`账号 ${accountId} 的token信息已更新`);
      return true;
    } catch (error) {
      console.error('更新账号token失败:', error);
      return false;
    }
  }
}