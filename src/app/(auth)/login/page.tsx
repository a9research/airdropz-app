'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import AuthLogin from '../authforms/AuthLogin';
import AuthRegister from '../authforms/AuthRegister';
import { Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const { user, loading } = useAuth();
  const router = useRouter();
  
  console.log('✅ 登录页面组件正在渲染 - loading:', loading, 'user:', !!user, 'mode:', mode);
  console.log('✅ 当前路径:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');

  // 如果用户已登录，重定向到首页
  useEffect(() => {
    console.log('Login page auth check: loading=', loading, 'user=', !!user);
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果用户已登录，不显示认证页面
  if (user) {
    return null;
  }

  const handleSuccess = () => {
    router.push('/');
  };

  const switchToRegister = () => {
    setMode('register');
  };

  const switchToLogin = () => {
    setMode('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {mode === 'login' ? (
          <AuthLogin
            onSuccess={handleSuccess}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <AuthRegister
            onSuccess={handleSuccess}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </div>
    </div>
  );
}
