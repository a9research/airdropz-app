/**
 * 动态插件页面处理器
 * 处理所有插件的页面请求
 */

import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';

interface PluginPageProps {
  params: Promise<{ path: string[] }>;
}

// 创建客户端组件来处理动态导入
const ClientPluginPage = dynamic(
  () => import('./client-plugin-page'),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-circle w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }
);

export default async function PluginPage({ params }: PluginPageProps) {
  try {
    const { path: pathSegments } = await params;
    
    if (pathSegments.length === 0) {
      notFound();
    }

    const [pluginName] = pathSegments;
    
    return <ClientPluginPage pluginName={pluginName} />;
  } catch (error) {
    console.error('Plugin page error:', error);
    notFound();
  }
}
