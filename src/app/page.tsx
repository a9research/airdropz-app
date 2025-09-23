'use client';

import { useEffect, useState } from 'react';

export default function Home() {
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
    addLog('🎯 页面加载完成，检查 API 可用性...');
    if (window.api) {
      addLog('✅ window.api 可用');
      checkDownloadStatus();
    } else {
      addLog('❌ window.api 不可用');
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Electron 浏览器抓取测试页面</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          测试 URL: 
          <input 
            type="text" 
            value={testUrl} 
            onChange={(e) => setTestUrl(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleOpenProxyBrowser}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🌐 打开代理浏览器
        </button>
        
        <button 
          onClick={handleScrapeWithBrowser}
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳ 抓取中...' : '🚀 抓取（显示浏览器）'}
        </button>
        
        <button 
          onClick={handleScrapeHeadless}
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳ 抓取中...' : '🔍 抓取（无头模式）'}
        </button>
        
        <button 
          onClick={handleDownloadBrowser}
          style={{ 
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📥 下载浏览器
        </button>
        
        <button 
          onClick={clearLogs}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🗑️ 清空日志
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3>📋 操作日志</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '5px', 
            padding: '10px', 
            height: '300px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#6c757d' }}>暂无日志...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '5px' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>📊 抓取结果</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '5px', 
            padding: '10px', 
            height: '300px', 
            overflowY: 'auto'
          }}>
            {scrapeResult ? (
              <pre style={{ 
                fontSize: '12px', 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(scrapeResult, null, 2)}
              </pre>
            ) : (
              <div style={{ color: '#6c757d' }}>暂无抓取结果...</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
        <h4>📝 测试说明：</h4>
        <ul>
          <li><strong>下载浏览器</strong>：首次使用时需要下载 Playwright 浏览器（约 200MB）</li>
          <li><strong>打开代理浏览器</strong>：会打开一个新的浏览器窗口，显示指定网页</li>
          <li><strong>抓取（显示浏览器）</strong>：会打开浏览器窗口并执行抓取，你可以看到浏览器操作过程</li>
          <li><strong>抓取（无头模式）</strong>：在后台执行抓取，不显示浏览器窗口</li>
          <li>所有操作都会在日志中显示详细过程</li>
        </ul>
        
        {downloadStatus && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '3px' }}>
            <h5>📊 浏览器状态：</h5>
            <p>状态: {downloadStatus.status}</p>
            <p>下载中: {downloadStatus.downloading ? '是' : '否'}</p>
            <p>进度: {downloadStatus.progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}