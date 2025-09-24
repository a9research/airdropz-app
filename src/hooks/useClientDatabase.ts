'use client';

/**
 * 客户端数据库 Hook
 * 提供安全的数据库访问
 */

import { useEffect, useState } from 'react';
import { isClient } from '@/lib/database/client-only';

export function useClientDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isClient) {
      setIsReady(true);
    } else {
      setError('Database not available on server side');
    }
  }, []);

  return { 
    isReady, 
    isClient, 
    error,
    hasError: !!error 
  };
}
