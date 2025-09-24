'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

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

export default function LocalStorageScraperPage() {
  const [url, setUrl] = useState('https://example.com');
  const [targetKeys, setTargetKeys] = useState('userToken,userInfo,sessionId');
  const [loginIndicators, setLoginIndicators] = useState('.login-btn,#login');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleScrape = async () => {
    setIsLoading(true);
    setResult(null);
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
            // 自定义登录完成检测
            const loginButton = document.querySelector('.login-btn, #login, [data-testid="login"]');
            const userInfo = document.querySelector('.user-info, .profile, [data-testid="user"]');
            return !loginButton || userInfo;
          }
        }
      });
      
      setResult(response);
      
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
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckLoginStatus = async () => {
    setIsLoading(true);
    setLogs([]);
    
    addLog('检测登录状态...');
    
    try {
      const indicatorsArray = loginIndicators.split(',').map(i => i.trim()).filter(i => i);
      
      const response = await (window as any).electronAPI.invokePluginAction('proxy-browser', 'checkLoginStatus', {
        url,
        loginIndicators: indicatorsArray
      });
      
      if (response.success) {
        addLog(`登录状态: ${response.isLoggedIn ? '✅ 已登录' : '❌ 未登录'}`);
        addLog(`使用代理: ${response.proxy}`);
      } else {
        addLog(`❌ 检测失败: ${response.error}`);
      }
    } catch (error) {
      addLog(`❌ 发生错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePerformLogin = async () => {
    setIsLoading(true);
    setLogs([]);
    
    addLog('启动有头浏览器进行登录...');
    addLog('请在打开的浏览器中完成登录操作');
    
    try {
      const response = await (window as any).electronAPI.invokePluginAction('proxy-browser', 'performLogin', {
        url,
        loginConfig: {
          waitForLogin: () => {
            const loginButton = document.querySelector('.login-btn, #login, [data-testid="login"]');
            const userInfo = document.querySelector('.user-info, .profile, [data-testid="user"]');
            return !loginButton || userInfo;
          }
        }
      });
      
      if (response.success) {
        addLog('✅ 登录成功！');
        addLog(`保存了 ${response.cookies?.length || 0} 个 cookies`);
        addLog(`保存了 ${Object.keys(response.localStorage || {}).length} 个 localStorage 项`);
      } else {
        addLog(`❌ 登录失败: ${response.error}`);
      }
    } catch (error) {
      addLog(`❌ 发生错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeOnly = async () => {
    setIsLoading(true);
    setLogs([]);
    
    addLog('使用无头浏览器抓取数据...');
    
    try {
      const keysArray = targetKeys.split(',').map(k => k.trim()).filter(k => k);
      
      const response = await (window as any).electronAPI.invokePluginAction('proxy-browser', 'scrapeLocalStorage', {
        url,
        targetKeys: keysArray
      });
      
      if (response.success) {
        addLog('✅ 抓取成功！');
        addLog(`抓取到 ${Object.keys(response.data?.localStorage || {}).length} 个 localStorage 项`);
        setResult(response);
      } else {
        addLog(`❌ 抓取失败: ${response.error}`);
      }
    } catch (error) {
      addLog(`❌ 发生错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value: string) => {
    if (!showSensitiveData && (value.length > 50 || value.includes('token') || value.includes('key'))) {
      return value.substring(0, 20) + '...';
    }
    return value;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LocalStorage 抓取器</h1>
          <p className="text-muted-foreground">
            使用代理访问网站，自动检测登录状态并抓取 localStorage 数据
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSensitiveData(!showSensitiveData)}
        >
          {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showSensitiveData ? '隐藏敏感数据' : '显示敏感数据'}
        </Button>
      </div>

      <Tabs defaultValue="scraper" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scraper">完整抓取</TabsTrigger>
          <TabsTrigger value="step-by-step">分步执行</TabsTrigger>
          <TabsTrigger value="results">结果查看</TabsTrigger>
        </TabsList>

        <TabsContent value="scraper" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>完整抓取流程</CardTitle>
              <CardDescription>
                自动检测登录状态，如需要则打开有头浏览器进行登录，然后使用无头浏览器抓取数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="space-y-2">
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
                disabled={isLoading || !url}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    抓取中...
                  </>
                ) : (
                  '开始完整抓取'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="step-by-step" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. 检测登录状态</CardTitle>
                <CardDescription>检查目标网站是否需要登录</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleCheckLoginStatus} 
                  disabled={isLoading || !url}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '检测登录状态'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. 执行登录</CardTitle>
                <CardDescription>打开有头浏览器进行手动登录</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handlePerformLogin} 
                  disabled={isLoading || !url}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '执行登录'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. 抓取数据</CardTitle>
                <CardDescription>使用无头浏览器抓取 localStorage</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleScrapeOnly} 
                  disabled={isLoading || !url}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '抓取数据'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>抓取结果</CardTitle>
                <CardDescription>显示抓取到的数据和状态</CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {result.success ? '抓取成功' : '抓取失败'}
                      </span>
                    </div>

                    {result.success && result.data && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">网站信息</Label>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>URL: {result.data.url}</div>
                            <div>标题: {result.data.title}</div>
                            <div>时间: {new Date(result.data.timestamp).toLocaleString()}</div>
                            <div>代理: {result.data.proxy}</div>
                            <div>
                              需要登录: 
                              <Badge variant={result.data.loginRequired ? "destructive" : "secondary"} className="ml-2">
                                {result.data.loginRequired ? '是' : '否'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">LocalStorage 数据</Label>
                          <div className="max-h-60 overflow-y-auto border rounded p-3 space-y-2">
                            {Object.entries(result.data.localStorage).map(([key, value]) => (
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

                    {!result.success && (
                      <Alert>
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    暂无抓取结果
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>操作日志</CardTitle>
                <CardDescription>显示详细的操作过程</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  {logs.length > 0 ? (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <div key={index} className="text-sm font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      暂无日志
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
