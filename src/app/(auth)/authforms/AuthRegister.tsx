'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TurnstileWrapper from '@/components/TurnstileWrapper';
import { useAuth } from '@/app/context/AuthContext';
import { useToastSonner } from '@/hooks/use-toast-sonner';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
  activationCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "密码不匹配",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface AuthRegisterProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function AuthRegister({ 
  onSuccess, 
  onSwitchToLogin 
}: AuthRegisterProps) {
  const { register: registerUser, loading, error, clearError } = useAuth();
  const { toast } = useToastSonner();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      referralCode: '',
      activationCode: '',
    },
  });

  // 清除错误当表单数据变化时
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [watch('username'), watch('email'), watch('password'), clearError]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      if (!turnstileToken) {
        setTurnstileError('请完成人机验证');
        return;
      }

      setTurnstileError('');
      setIsSubmittingForm(true);
      console.log('开始注册流程');
      
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        cf_turnstile_token: turnstileToken,
        referral_code: data.referralCode || undefined,
        activation_code: data.activationCode || undefined,
      });

      console.log('注册成功，显示成功提示');
      toast({
        title: '注册成功',
        description: '欢迎加入！',
        type: 'success',
      });

      onSuccess?.();
    } catch (err) {
      console.error('Register error:', err);
      const errorMessage = err instanceof Error ? err.message : '注册失败，请重试';
      console.log('显示错误Toast:', errorMessage);
      
      toast({
        title: '注册失败',
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
    setTurnstileKey(prev => prev + 1);
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken('');
    setTurnstileError('人机验证已过期，请重新验证');
    setTurnstileKey(prev => prev + 1);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">注册</h2>
          <p className="text-gray-600">创建您的新账户</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 用户名输入 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              {...register('username')}
              type="text"
              id="username"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入用户名"
              disabled={isSubmitting || loading}
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.username.message}
              </p>
            )}
          </div>

          {/* 邮箱输入 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入邮箱地址"
              disabled={isSubmitting || loading}
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email.message}
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

          {/* 确认密码输入 */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              确认密码
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请再次输入密码"
                disabled={isSubmitting || loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting || loading}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* 推荐码输入 */}
          <div>
            <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-2">
              推荐码（可选）
            </label>
            <input
              {...register('referralCode')}
              type="text"
              id="referralCode"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入推荐码"
              disabled={isSubmitting || loading}
            />
          </div>

          {/* 激活码输入 */}
          <div>
            <label htmlFor="activationCode" className="block text-sm font-medium text-gray-700 mb-2">
              激活码（可选）
            </label>
            <input
              {...register('activationCode')}
              type="text"
              id="activationCode"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入激活码"
              disabled={isSubmitting || loading}
            />
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
            {isSubmittingForm || loading ? '注册中...' : '注册'}
          </button>
        </form>

        {/* 登录链接 */}
        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              已有账户？{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                disabled={isSubmitting || loading}
              >
                立即登录
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
