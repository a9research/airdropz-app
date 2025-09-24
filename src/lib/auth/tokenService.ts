import { SessionManager } from './sessionManager';
import { AuthResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://tools-api.aausti.workers.dev';

export class TokenService {
  private static refreshPromise: Promise<boolean> | null = null;

  /**
   * 刷新token - 当前API不支持refresh token，直接返回false
   */
  static async refreshToken(): Promise<boolean> {
    console.log('⚠️ API不支持refresh token，需要重新登录');
    SessionManager.clearSession();
    return false;
  }

  /**
   * 验证token有效性
   */
  static async validateToken(): Promise<boolean> {
    try {
      const token = SessionManager.getCurrentToken();
      if (!token) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'x-next-auth-session-token': token,
        },
      });

      if (!response.ok) {
        console.log('Token验证失败:', response.status);
        return false;
      }

      const userData = await response.json();
      
      // 根据API文档，直接返回用户对象，不是包装在user字段中
      if (userData.id && userData.username) {
        SessionManager.updateUserData(userData);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token验证异常:', error);
      return false;
    }
  }

  /**
   * 启动自动检查定时器
   */
  static startAutoRefresh(): void {
    // 清除现有的定时器
    this.stopAutoRefresh();

    const checkToken = async () => {
      const session = SessionManager.getSession();
      if (!session) {
        return;
      }

      // 如果token已过期，清除会话
      if (SessionManager.isTokenExpired()) {
        console.log('Token已过期，清除会话');
        SessionManager.clearSession();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return;
      }

      // 如果token即将过期，提醒用户
      if (SessionManager.isTokenExpiringSoon()) {
        console.log('Token即将过期，建议重新登录');
        // 可以在这里显示提醒通知
      }
    };

    // 立即检查一次
    checkToken();

    // 每5分钟检查一次
    const intervalId = setInterval(checkToken, 5 * 60 * 1000);
    
    // 存储定时器ID以便清理
    (window as any).__tokenRefreshInterval = intervalId;
  }

  /**
   * 停止自动刷新
   */
  static stopAutoRefresh(): void {
    const intervalId = (window as any).__tokenRefreshInterval;
    if (intervalId) {
      clearInterval(intervalId);
      (window as any).__tokenRefreshInterval = null;
    }
  }

  /**
   * 获取带认证头的请求配置
   */
  static getAuthHeaders(): Record<string, string> {
    const token = SessionManager.getCurrentToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}
