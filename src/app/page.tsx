'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Layout from '../components/layout/Layout';

// 声明全局类型
declare global {
  interface Window {
    api: any;
  }
}

export default function Home() {
  console.log('🏠 首页组件正在渲染，当前路径:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // 如果在登录页面，不应该渲染首页组件
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    console.log('⚠️ 首页组件在非首页路径被错误渲染:', window.location.pathname);
    // 强制重定向到正确的路由处理
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">正在加载页面...</p>
        </div>
      </div>
    );
  }
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('https://baidu.com');
  const [browserVisible, setBrowserVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleOpenProxyBrowser = () => {
    addLog('🔍 点击打开代理浏览器按钮');
    if (window.api) {
      addLog('✅ window.api 可用，正在打开浏览器...');
      window.api.openProxyBrowser(testUrl)
        .then((result: any) => {
          if (result && result.success) {
            addLog('✅ 代理浏览器打开成功！');
            setBrowserVisible(true);
          } else {
            addLog('❌ 代理浏览器打开失败: ' + (result?.error || '未知错误'));
          }
        })
        .catch((error: Error) => {
          addLog('❌ 打开代理浏览器时出错: ' + error.message);
        });
    } else {
      addLog('❌ window.api 不可用');
    }
  };

  const handleScrapeWithBrowser = () => {
    addLog('🚀 开始抓取测试（带浏览器窗口）');
    setIsLoading(true);
    
    if (window.api) {
      // 使用 headless: false 确保浏览器可见
      window.api.scrape(testUrl, { headless: false })
        .then((result: any) => {
          addLog('✅ 抓取完成！');
          setScrapeResult(result);
          setIsLoading(false);
        })
        .catch((error: Error) => {
          addLog('❌ 抓取失败: ' + error.message);
          setIsLoading(false);
        });
    } else {
      addLog('❌ window.api 不可用');
      setIsLoading(false);
    }
  };

  const handleScrapeHeadless = () => {
    addLog('🔍 开始抓取测试（无头模式）');
    setIsLoading(true);
    
    if (window.api) {
      window.api.scrape(testUrl, { headless: true })
        .then((result: any) => {
          addLog('✅ 无头抓取完成！');
          setScrapeResult(result);
          setIsLoading(false);
        })
        .catch((error: Error) => {
          addLog('❌ 无头抓取失败: ' + error.message);
          setIsLoading(false);
        });
    } else {
      addLog('❌ window.api 不可用');
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleDownloadBrowser = async () => {
    addLog('📥 开始下载浏览器...');
    try {
      const result = await window.api.browserDownload();
      if (result.success) {
        addLog('✅ 浏览器下载完成！');
      } else {
        addLog('❌ 浏览器下载失败: ' + result.error);
      }
    } catch (error) {
      addLog('❌ 下载浏览器时出错: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const checkDownloadStatus = async () => {
    try {
      const status = await window.api.browserDownloadStatus();
      setDownloadStatus(status);
    } catch (error) {
      console.error('Failed to get download status:', error);
    }
  };

  useEffect(() => {
    // 只在首页进行认证检查，避免在插件路由时重定向
    console.log('Auth check: loading=', loading, 'user=', !!user, 'pathname=', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
    
    // 确保在客户端环境
    if (typeof window === 'undefined') {
      return;
    }
    
    // 如果不在首页，直接返回不处理
    if (window.location.pathname !== '/') {
      console.log('🏠 不在首页，跳过认证检查');
      return;
    }
    
    if (!loading && !user) {
      // 使用 Next.js 路由器进行重定向
      console.log('🔄 用户未登录，重定向到登录页面...');
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    addLog('🎯 页面加载完成，检查 API 可用性...');
    if (typeof window !== 'undefined' && window.api) {
      addLog('✅ window.api 可用');
      checkDownloadStatus();
    } else {
      addLog('❌ window.api 不可用');
    }
  }, []);

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">重定向到登录页面...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🧪 Electron 浏览器抓取测试页面</h1>
      
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试 URL:
          </label>
          <input 
            type="text" 
            value={testUrl} 
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入要测试的网址"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button 
            onClick={handleOpenProxyBrowser}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            🌐 打开代理浏览器
          </button>
          
          <button 
            onClick={handleScrapeWithBrowser}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ 抓取中...' : '🚀 抓取（显示浏览器）'}
          </button>
          
          <button 
            onClick={handleScrapeHeadless}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ 抓取中...' : '🔍 抓取（无头模式）'}
          </button>
          
          <button 
            onClick={handleDownloadBrowser}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors"
          >
            📥 下载浏览器
          </button>
          
          <button 
            onClick={clearLogs}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            🗑️ 清空日志
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 操作日志</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 h-80 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">暂无日志...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1 text-gray-700">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 抓取结果</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 h-80 overflow-y-auto">
              {scrapeResult ? (
                <pre className="text-xs whitespace-pre-wrap break-words text-gray-700">
                  {JSON.stringify(scrapeResult, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500">暂无抓取结果...</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-4">📝 测试说明：</h4>
          <ul className="space-y-2 text-blue-800">
            <li><strong>下载浏览器</strong>：首次使用时需要下载 Playwright 浏览器（约 200MB）</li>
            <li><strong>打开代理浏览器</strong>：会打开一个新的浏览器窗口，显示指定网页</li>
            <li><strong>抓取（显示浏览器）</strong>：会打开浏览器窗口并执行抓取，你可以看到浏览器操作过程</li>
            <li><strong>抓取（无头模式）</strong>：在后台执行抓取，不显示浏览器窗口</li>
            <li>所有操作都会在日志中显示详细过程</li>
          </ul>
          
          {downloadStatus && (
            <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-md">
              <h5 className="font-semibold text-blue-900 mb-2">📊 浏览器状态：</h5>
              <div className="space-y-1 text-blue-800">
                <p>状态: {downloadStatus.status}</p>
                <p>下载中: {downloadStatus.downloading ? '是' : '否'}</p>
                <p>进度: {downloadStatus.progress}%</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}