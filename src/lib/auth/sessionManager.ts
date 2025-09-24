import { SessionData, User } from '@/types/auth';

const SESSION_KEY = 'airdropz_session';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分钟前开始刷新token

export class SessionManager {
  /**
   * 保存会话数据到localStorage
   */
  static saveSession(sessionData: SessionData): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('保存会话数据失败:', error);
    }
  }

  /**
   * 从localStorage获取会话数据
   */
  static getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (!sessionStr) return null;
      
      const sessionData = JSON.parse(sessionStr) as SessionData;
      
      // 检查数据完整性
      if (!sessionData.token || !sessionData.user || !sessionData.expires) {
        this.clearSession();
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('获取会话数据失败:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * 清除会话数据
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('清除会话数据失败:', error);
    }
  }

  /**
   * 检查token是否即将过期
   */
  static isTokenExpiringSoon(): boolean {
    const session = this.getSession();
    if (!session) return true;

    const expiresAt = new Date(session.expires).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    return timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD;
  }

  /**
   * 检查token是否已过期
   */
  static isTokenExpired(): boolean {
    const session = this.getSession();
    if (!session) return true;

    const expiresAt = new Date(session.expires).getTime();
    const now = Date.now();

    return now >= expiresAt;
  }

  /**
   * 获取剩余时间（毫秒）
   */
  static getTimeUntilExpiry(): number {
    const session = this.getSession();
    if (!session) return 0;

    const expiresAt = new Date(session.expires).getTime();
    const now = Date.now();

    return Math.max(0, expiresAt - now);
  }

  /**
   * 获取格式化的剩余时间
   */
  static getFormattedTimeUntilExpiry(): string {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    
    if (timeUntilExpiry === 0) return '已过期';

    const hours = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 更新会话中的用户数据
   */
  static updateUserData(user: User): void {
    const session = this.getSession();
    if (!session) return;

    session.user = user;
    this.saveSession(session);
  }

  /**
   * 更新token
   */
  static updateToken(token: string, expires: string): void {
    const session = this.getSession();
    if (!session) return;

    session.token = token;
    session.expires = expires;
    this.saveSession(session);
  }

  /**
   * 检查是否有有效的会话
   */
  static hasValidSession(): boolean {
    const session = this.getSession();
    if (!session) return false;

    return !this.isTokenExpired();
  }

  /**
   * 获取当前token
   */
  static getCurrentToken(): string | null {
    const session = this.getSession();
    return session?.token || null;
  }

  /**
   * 获取当前用户
   */
  static getCurrentUser(): User | null {
    const session = this.getSession();
    return session?.user || null;
  }
}
