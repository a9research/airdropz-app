/**
 * 客户端专用的数据库工具
 * 确保只在客户端环境中使用 PouchDB
 */

/**
 * 检查是否在客户端环境
 */
export const isClient = typeof window !== 'undefined';

/**
 * 安全的数据库操作包装器
 */
export async function safeDatabaseOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  if (!isClient) {
    console.warn('Database operation attempted on server side');
    return fallback || null;
  }

  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    return fallback || null;
  }
}
