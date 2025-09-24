'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TurnstileWrapper from '@/components/TurnstileWrapper';
import { useAuth } from '@/app/context/AuthContext';
import { useToastSonner } from '@/hooks/use-toast-sonner';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, '用户名或邮箱不能为空'),
  password: z.string().min(1, '密码不能为空'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface AuthLoginProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export default function AuthLogin({ 
  onSuccess, 
  onSwitchToRegister, 
  onSwitchToForgotPassword 
}: AuthLoginProps) {
  const { login, loading, error, clearError } = useAuth();
  const { toast } = useToastSonner();
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  // 清除错误当表单数据变化时
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [watch('username'), watch('password'), clearError]);


  const onSubmit = async (data: LoginFormData) => {
    try {
      if (!turnstileToken) {
        setTurnstileError('请完成人机验证');
        return;
      }

      setTurnstileError('');
      setIsSubmittingForm(true);
      console.log('开始登录流程');
      
      await login({
        username: data.username,
        password: data.password,
        cf_turnstile_token: turnstileToken,
      });

      console.log('登录成功，显示成功提示');
      toast({
        title: '登录成功',
        description: '欢迎回来！',
        type: 'success',
      });

      onSuccess?.();
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : '登录失败，请重试';
      console.log('显示错误Toast:', errorMessage);
      
      toast({
        title: '登录失败',
        description: errorMessage,
        type: 'error',
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };


  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
    setTurnstileError('');
  };

  const handleTurnstileError = () => {
    setTurnstileToken('');
    setTurnstileError('人机验证失败，请重试');
    setTurnstileKey(prev => prev + 1); // 重新渲染Turnstile组件
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken('');
    setTurnstileError('人机验证已过期，请重新验证');
    setTurnstileKey(prev => prev + 1); // 重新渲染Turnstile组件
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">登录</h2>
          <p className="text-gray-600">欢迎回来，请登录您的账户</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 用户名/邮箱输入 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              用户名或邮箱
            </label>
            <input
              {...register('username')}
              type="text"
              id="username"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入用户名或邮箱"
              disabled={isSubmitting || loading}
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.username.message}
              </p>
            )}
          </div>

          {/* 密码输入 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入密码"
                disabled={isSubmitting || loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting || loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* 记住我和忘记密码 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                {...register('rememberMe')}
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isSubmitting || loading}
              />
              <span className="ml-2 text-sm text-gray-700">记住我</span>
            </label>
            {onSwitchToForgotPassword && (
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                disabled={isSubmitting || loading}
              >
                忘记密码？
              </button>
            )}
          </div>

          {/* Cloudflare Turnstile 验证 */}
          <div>
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
              <TurnstileWrapper
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={handleTurnstileSuccess}
                onError={handleTurnstileError}
                onExpire={handleTurnstileExpire}
                theme="light"
                size="normal"
                turnstileKey={turnstileKey}
              />
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  人机验证配置缺失，请检查环境变量 NEXT_PUBLIC_TURNSTILE_SITE_KEY
                </p>
              </div>
            )}
            {turnstileError && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {turnstileError}
              </p>
            )}
          </div>

          {/* 全局错误显示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error.message}
              </p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isSubmittingForm || loading || !turnstileToken}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {(isSubmittingForm || loading) && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {isSubmittingForm || loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* 注册链接 */}
        {onSwitchToRegister && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                disabled={isSubmitting || loading}
              >
                立即注册
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
