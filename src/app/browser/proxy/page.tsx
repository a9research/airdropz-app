'use client';

import Layout from '@/components/layout/Layout';
import { Globe, Play, Pause, RotateCcw, Database, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScrapeResult {
  success: boolean;
  data?: {
    url: string;
    title: string;
    timestamp: string;
    localStorage: Record<string, string>;
    proxy: string;
    loginRequired: boolean;
    sessionData?: any;
  };
  error?: string;
}

export default function ProxyBrowser() {
  const [url, setUrl] = useState('https://example.com');
  const [targetKeys, setTargetKeys] = useState('userToken,userInfo,sessionId');
  const [loginIndicators, setLoginIndicators] = useState('.login-btn,#login');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [showScraper, setShowScraper] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleScrape = async () => {
    setIsScraping(true);
    setScrapeResult(null);
    setLogs([]);
    
    addLog('开始抓取流程...');
    
    try {
      const keysArray = targetKeys.split(',').map(k => k.trim()).filter(k => k);
      const indicatorsArray = loginIndicators.split(',').map(i => i.trim()).filter(i => i);
      
      addLog(`目标URL: ${url}`);
      addLog(`目标键: ${keysArray.length > 0 ? keysArray.join(', ') : '全部'}`);
      addLog(`登录指示器: ${indicatorsArray.join(', ')}`);
      
      const response = await (window as any).electronAPI.invokePluginAction('proxy-browser', 'scrapeWithLogin', {
        url,
        targetKeys: keysArray,
        loginIndicators: indicatorsArray,
        loginConfig: {
          waitForLogin: () => {
            const loginButton = document.querySelector('.login-btn, #login, [data-testid="login"]');
            const userInfo = document.querySelector('.user-info, .profile, [data-testid="user"]');
            return !loginButton || userInfo;
          }
        }
      });
      
      setScrapeResult(response);
      
      if (response.success) {
        addLog('✅ 抓取成功！');
        addLog(`代理: ${response.data?.proxy}`);
        addLog(`需要登录: ${response.data?.loginRequired ? '是' : '否'}`);
        addLog(`抓取到 ${Object.keys(response.data?.localStorage || {}).length} 个 localStorage 项`);
      } else {
        addLog(`❌ 抓取失败: ${response.error}`);
      }
    } catch (error) {
      addLog(`❌ 发生错误: ${error instanceof Error ? error.message : String(error)}`);
      setScrapeResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsScraping(false);
    }
  };

  const formatValue = (value: string) => {
    if (!showSensitiveData && (value.length > 50 || value.includes('token') || value.includes('key'))) {
      return value.substring(0, 20) + '...';
    }
    return value;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">代理浏览器</h1>
          <p className="text-gray-600 mt-2">管理代理浏览器和网页抓取任务</p>
        </div>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">控制面板</h2>
          <div className="flex flex-wrap gap-4">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Play className="w-4 h-4 mr-2" />
              启动浏览器
            </button>
            <button className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors">
              <Pause className="w-4 h-4 mr-2" />
              暂停任务
            </button>
            <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
              <RotateCcw className="w-4 h-4 mr-2" />
              重置状态
            </button>
            <Button 
              onClick={() => setShowScraper(!showScraper)}
              variant={showScraper ? "secondary" : "default"}
              className="flex items-center"
            >
              <Database className="w-4 h-4 mr-2" />
              {showScraper ? '隐藏抓取器' : 'LocalStorage 抓取器'}
            </Button>
          </div>
        </div>

        {/* 代理状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">代理状态</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-green-800">代理 1 - 192.168.1.100:8080</span>
                </div>
                <span className="text-sm text-green-600">活跃</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-green-800">代理 2 - 192.168.1.101:8080</span>
                </div>
                <span className="text-sm text-green-600">活跃</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-red-800">代理 3 - 192.168.1.102:8080</span>
                </div>
                <span className="text-sm text-red-600">离线</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">浏览器状态</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">浏览器实例</span>
                <span className="font-medium">2 个运行中</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">活跃标签页</span>
                <span className="font-medium">5 个</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">内存使用</span>
                <span className="font-medium">256 MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">CPU 使用率</span>
                <span className="font-medium">15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* LocalStorage 抓取器 */}
        {showScraper && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">LocalStorage 抓取器</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSensitiveData(!showSensitiveData)}
              >
                {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSensitiveData ? '隐藏敏感数据' : '显示敏感数据'}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="url">目标网站 URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetKeys">目标 localStorage 键（逗号分隔）</Label>
                <Input
                  id="targetKeys"
                  value={targetKeys}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetKeys(e.target.value)}
                  placeholder="userToken,userInfo,sessionId"
                />
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="loginIndicators">登录按钮选择器（逗号分隔）</Label>
              <Input
                id="loginIndicators"
                value={loginIndicators}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginIndicators(e.target.value)}
                placeholder=".login-btn,#login,[data-testid='login']"
              />
            </div>

            <Button 
              onClick={handleScrape} 
              disabled={isScraping || !url}
              className="w-full mb-4"
            >
              {isScraping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  抓取中...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  开始抓取 LocalStorage
                </>
              )}
            </Button>

            {/* 抓取结果 */}
            {scrapeResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {scrapeResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {scrapeResult.success ? '抓取成功' : '抓取失败'}
                  </span>
                </div>

                {scrapeResult.success && scrapeResult.data && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">网站信息</Label>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>URL: {scrapeResult.data.url}</div>
                        <div>标题: {scrapeResult.data.title}</div>
                        <div>时间: {new Date(scrapeResult.data.timestamp).toLocaleString()}</div>
                        <div>代理: {scrapeResult.data.proxy}</div>
                        <div>
                          需要登录: 
                          <Badge variant={scrapeResult.data.loginRequired ? "destructive" : "secondary"} className="ml-2">
                            {scrapeResult.data.loginRequired ? '是' : '否'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">LocalStorage 数据</Label>
                      <div className="max-h-60 overflow-y-auto border rounded p-3 space-y-2">
                        {Object.entries(scrapeResult.data.localStorage).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <div className="font-medium text-blue-600">{key}:</div>
                            <div className="text-muted-foreground break-all">
                              {formatValue(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!scrapeResult.success && (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{scrapeResult.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* 操作日志 */}
            {logs.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium">操作日志</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-3 mt-2">
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-sm font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
