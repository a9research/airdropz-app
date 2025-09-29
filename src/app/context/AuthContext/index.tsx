'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginCredentials, RegisterCredentials, AuthError, AuthContextType, AuthResponse, SessionData } from '@/types/auth';
import { SessionManager } from '@/lib/auth/sessionManager';
// import { TokenService } from '@/lib/auth/tokenService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://tools-api.aausti.workers.dev';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // 从会话存储恢复用户状态
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 开始初始化认证...');
        console.log('Current localStorage keys:', Object.keys(localStorage));
        const session = SessionManager.getSession();
        console.log('📦 获取到的会话数据:', session);
        
        if (session) {
          console.log('✅ 找到会话数据，检查token状态...');
          console.log('⏰ Token过期时间:', session.expires);
          console.log('🕐 当前时间:', new Date().toISOString());
          console.log('❓ Token是否过期:', SessionManager.isTokenExpired());
          
          // 检查token是否已过期
          if (SessionManager.isTokenExpired()) {
            console.log('⚠️ Token已过期，清除会话');
            SessionManager.clearSession();
            setUser(null);
            console.log('❌ Token已过期，用户未登录');
          } else {
            console.log('✅ Token仍然有效，直接设置用户状态');
            // Token仍然有效，直接设置用户状态
            setUser(session.user);
            console.log('✅ 用户已登录，会话有效');
          }
        } else {
          console.log('❌ 没有找到会话数据，用户未登录');
        }
      } catch (err) {
        console.error('❌ 初始化认证失败:', err);
        console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
        SessionManager.clearSession();
        setUser(null);
      } finally {
        console.log('🔄 认证初始化完成，设置 loading = false');
        setLoading(false);
      }
    };

    initializeAuth();

    // 启动自动token刷新（现在修复了，不会干扰初始认证）
    // TokenService.startAutoRefresh();

    // 监听登出事件
    const handleLogout = () => {
      setUser(null);
      setError(null);
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      // TokenService.stopAutoRefresh();
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      if (data.user && data.session) {
        const { user: userData, session } = data as AuthResponse;
        
        console.log('🔐 登录响应数据:', { user: userData, session });
        
        // 保存会话数据
        const sessionData = {
          token: session.token,
          expires: session.expires,
          user: userData,
        };
        
        console.log('💾 准备保存的会话数据:', sessionData);
        SessionManager.saveSession(sessionData);
        
        // 验证保存是否成功
        const savedSession = SessionManager.getSession();
        console.log('✅ 保存后的会话数据:', savedSession);
        
        setUser(userData);
        console.log('🎉 登录成功，会话已保存');
      } else {
        console.error('❌ 登录响应格式错误:', data);
        throw new Error('登录响应格式错误');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登录失败，请重试';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || '注册失败');
      }

      // 注册成功后自动登录
      await login({
        username: credentials.username,
        password: credentials.password,
        cf_turnstile_token: credentials.cf_turnstile_token,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '注册失败，请重试';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // 停止自动刷新
      // TokenService.stopAutoRefresh();
      
      // 清除会话数据
      SessionManager.clearSession();
      
      setUser(null);
      setError(null);
      
      console.log('用户已登出');
    } catch (err) {
      console.error('登出失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      // return await TokenService.refreshToken();
      return false;
    } catch (err) {
      console.error('刷新token失败:', err);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
