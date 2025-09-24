'use client';

import React, { useEffect, useState } from 'react';
import Turnstile from 'react-cloudflare-turnstile';

interface TurnstileWrapperProps {
  sitekey: string;
  onSuccess: (token: string) => void;
  onError: () => void;
  onExpire: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  turnstileKey?: string | number;
}

export default function TurnstileWrapper({
  sitekey,
  onSuccess,
  onError,
  onExpire,
  theme = 'light',
  size = 'normal',
  turnstileKey,
}: TurnstileWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, [sitekey, turnstileKey]);

  // 确保只在客户端渲染
  if (!isMounted) {
    return (
      <div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm">加载人机验证中...</span>
      </div>
    );
  }

  // 确保sitekey存在且有效
  if (!sitekey || typeof sitekey !== 'string') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">
          人机验证配置错误：sitekey 无效
        </p>
      </div>
    );
  }

  return (
    <Turnstile
      turnstileSiteKey={sitekey}
      callback={onSuccess}
      errorCallback={onError}
      expiredCallback={onExpire}
      theme={theme}
      size={size}
      key={turnstileKey}
    />
  );
}
