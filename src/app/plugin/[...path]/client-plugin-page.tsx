'use client';

import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

interface ClientPluginPageProps {
  pluginName: string;
}

export default function ClientPluginPage({ pluginName }: ClientPluginPageProps) {
  const [PluginComponent, setPluginComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlugin = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`🔄 开始加载插件页面: ${pluginName}`);

        // 为避免可变 import 路径在打包后解析失败，这里采用显式映射
        let pluginModule: { default: React.ComponentType } | null = null;
        if (pluginName === 'gaea') {
          pluginModule = await import('../../../../plugins/gaea/ui/pages/page');
        } else {
          throw new Error(`未知插件: ${pluginName}`);
        }

        setPluginComponent(() => pluginModule.default);
        console.log(`✅ 插件组件设置完成`);
      } catch (err: any) {
        console.error(`❌ 插件页面加载失败 ${pluginName}:`, err);
        setError(`加载插件失败: ${err.message || '未知错误'}`);
      } finally {
        setLoading(false);
      }
    };

    console.log(`🚀 开始为插件 ${pluginName} 加载页面`);
    loadPlugin();
  }, [pluginName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-circle w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle w-8 h-8 mx-auto mb-4 text-red-600" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p className="text-red-600 mb-2">插件加载失败</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!PluginComponent) {
    notFound();
  }

  return <PluginComponent />;
}
