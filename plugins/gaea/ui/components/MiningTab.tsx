'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Edit, 
  Trash2, 
  Plus,
  RefreshCw,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Play,
  Pause,
  Zap,
  Coins,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTablePagination } from './DataTablePagination';
import { MiningAccount } from './types';

interface MiningTabProps {
  onRefresh?: () => void;
  loading?: boolean;
  toast?: (options: { title: string; description: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export function MiningTab({ onRefresh, loading: externalLoading, toast }: MiningTabProps) {
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  
  // 挖矿状态
  const [miningStatus, setMiningStatus] = useState({
    total_accounts: 0,
    running_accounts: 0,
    stopped_accounts: 0,
    error_accounts: 0,
    total_soul: 0,
    total_core: 0,
    last_update: ''
  });
  
  // 账号数据
  const [accounts, setAccounts] = useState<MiningAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 日志状态
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  
  // 操作状态
  const [operatingAccounts, setOperatingAccounts] = useState<Set<string>>(new Set());
  const [operationStatus, setOperationStatus] = useState<Record<string, 'idle' | 'operating' | 'success' | 'error'>>({});

  // 计算全选状态
  const isAllSelected = selectedAccounts.size === accounts.length && accounts.length > 0;
  const hasAccounts = accounts.length > 0;

  // 排序和分页计算
  const sortedAccounts = useMemo(() => {
    if (!sortField) return accounts;
    
    return [...accounts].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'uid':
          aValue = a.uid || '';
          bValue = b.uid || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'last_ping':
          aValue = a.last_ping ? new Date(a.last_ping).getTime() : 0;
          bValue = b.last_ping ? new Date(b.last_ping).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [accounts, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedAccounts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAccounts = sortedAccounts.slice(startIndex, endIndex);

  // 从数据库加载账号数据
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📋 开始加载挖矿账号数据...');
      
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取所有账号数据
      const result = await dbService.getAllDocs({ include_docs: true });
      console.log('📊 数据库查询结果:', result);
      
      const accountList: MiningAccount[] = [];
      
      for (const row of result.rows) {
        if (row.doc) {
          const account: MiningAccount = {
            id: row.doc._id,
            name: row.doc.name || '未知账号',
            uid: row.doc.uid || '',
            browser_id: row.doc.browserId || row.doc.browser_id || '',
            token: row.doc.token || '',
            proxy: row.doc.proxy || '',
            status: 'stopped', // 默认停止状态
            last_ping: null,
            last_info: null,
            error_count: 0,
            created_at: row.doc.created_at || new Date().toISOString(),
            updated_at: row.doc.updated_at || new Date().toISOString()
          };
          
          accountList.push(account);
        }
      }
      
      console.log('📋 加载的账号数据:', accountList);
      setAccounts(accountList);
      
      // 同步账号数据到Python服务
      try {
        const syncResponse = await fetch('/api/plugin/gaea/mining/sync-accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accounts: accountList }),
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log('✅ 同步账号数据到Python服务:', syncData.message);
        } else {
          console.warn('⚠️ 同步账号数据到Python服务失败');
        }
      } catch (syncError) {
        console.warn('⚠️ 同步账号数据到Python服务失败:', syncError);
      }
      
      // 从Python服务获取真实的账号状态
      try {
        const statusResponse = await fetch('/api/plugin/gaea/mining/status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success && statusData.data.accounts) {
            // 更新账号状态
            const updatedAccounts = accountList.map(account => {
              const pythonAccount = statusData.data.accounts[account.id];
              if (pythonAccount) {
                return {
                  ...account,
                  status: pythonAccount.status || 'stopped',
                  last_ping: pythonAccount.last_ping || null,
                  last_info: pythonAccount.last_info || null,
                  error_count: pythonAccount.error_count || 0
                };
              }
              return account;
            });
            setAccounts(updatedAccounts);
            accountList.splice(0, accountList.length, ...updatedAccounts);
          }
        }
      } catch (statusError) {
        console.warn('⚠️ 获取账号状态失败:', statusError);
      }
      
      // 计算总Soul和总Core
      const totalSoul = accountList.reduce((sum, account) => {
        return sum + (account.last_info?.total_soul || 0);
      }, 0);
      
      const totalCore = accountList.reduce((sum, account) => {
        return sum + (account.last_info?.total_core || 0);
      }, 0);

      // 计算运行状态
      const runningAccounts = accountList.filter(account => account.status === 'running').length;
      const stoppedAccounts = accountList.filter(account => account.status === 'stopped').length;
      const errorAccounts = accountList.filter(account => account.status === 'error').length;
      
      // 更新挖矿状态
      setMiningStatus({
        total_accounts: accountList.length,
        running_accounts: runningAccounts,
        stopped_accounts: stoppedAccounts,
        error_accounts: errorAccounts,
        total_soul: totalSoul,
        total_core: totalCore,
        last_update: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ 加载挖矿账号数据失败:', error);
      toast?.({
        title: '加载失败',
        description: '无法加载账号数据',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 加载日志
  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/plugin/gaea/mining/logs?limit=50');
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  }, []);

  // 组件加载时获取数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadAccounts();
        await loadLogs();
      } catch (error) {
        console.warn('初始加载失败，将在1秒后重试');
        setTimeout(() => {
          loadAccounts();
        }, 1000);
      }
    };
    
    initializeData();
    
    // 每30秒更新一次状态
    const interval = setInterval(() => {
      loadAccounts();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAccounts]);

  // 分页处理函数
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 排序处理函数
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // 全选处理
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedAccounts(new Set(accounts.map(acc => acc.id)));
    } else {
      setSelectedAccounts(new Set());
    }
  }, [accounts]);

  // 单个选择处理
  const handleSelectAccount = useCallback((accountId: string, checked: boolean) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(accountId);
      } else {
        newSet.delete(accountId);
      }
      return newSet;
    });
  }, []);

  // 开始单个账号挖矿
  const handleStartMining = async (account: MiningAccount) => {
    try {
      setOperatingAccounts(prev => new Set(prev).add(account.id));
      setOperationStatus(prev => ({ ...prev, [account.id]: 'operating' }));

      const response = await fetch('/api/plugin/gaea/mining/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: account.id }),
      });

      const data = await response.json();

      if (data.success) {
        setOperationStatus(prev => ({ ...prev, [account.id]: 'success' }));
        toast?.({
          title: '开始成功',
          description: `${account.name} 挖矿已开始`,
          type: 'success'
        });
        await loadAccounts();
      } else {
        throw new Error(data.error || '开始挖矿失败');
      }
    } catch (error) {
      console.error('开始挖矿失败:', error);
      setOperationStatus(prev => ({ ...prev, [account.id]: 'error' }));
      toast?.({
        title: '开始失败',
        description: `${account.name} 挖矿开始失败`,
        type: 'error'
      });
    } finally {
      setOperatingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(account.id);
        return newSet;
      });
    }
  };

  // 停止单个账号挖矿
  const handleStopMining = async (account: MiningAccount) => {
    try {
      setOperatingAccounts(prev => new Set(prev).add(account.id));
      setOperationStatus(prev => ({ ...prev, [account.id]: 'operating' }));

      const response = await fetch('/api/plugin/gaea/mining/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: account.id }),
      });

      const data = await response.json();

      if (data.success) {
        setOperationStatus(prev => ({ ...prev, [account.id]: 'success' }));
        toast?.({
          title: '停止成功',
          description: `${account.name} 挖矿已停止`,
          type: 'success'
        });
        await loadAccounts();
      } else {
        throw new Error(data.error || '停止挖矿失败');
      }
    } catch (error) {
      console.error('停止挖矿失败:', error);
      setOperationStatus(prev => ({ ...prev, [account.id]: 'error' }));
      toast?.({
        title: '停止失败',
        description: `${account.name} 挖矿停止失败`,
        type: 'error'
      });
    } finally {
      setOperatingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(account.id);
        return newSet;
      });
    }
  };

  // 开始所有账号挖矿
  const handleStartAllMining = async () => {
    try {
      const response = await fetch('/api/plugin/gaea/mining/start-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast?.({
          title: '批量开始成功',
          description: `已开始 ${data.count} 个账号挖矿`,
          type: 'success'
        });
        await loadAccounts();
      } else {
        throw new Error(data.error || '批量开始失败');
      }
    } catch (error) {
      console.error('批量开始失败:', error);
      toast?.({
        title: '批量开始失败',
        description: '批量开始挖矿失败',
        type: 'error'
      });
    }
  };

  // 停止所有账号挖矿
  const handleStopAllMining = async () => {
    try {
      const response = await fetch('/api/plugin/gaea/mining/stop-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast?.({
          title: '批量停止成功',
          description: `已停止 ${data.count} 个账号挖矿`,
          type: 'success'
        });
        await loadAccounts();
      } else {
        throw new Error(data.error || '批量停止失败');
      }
    } catch (error) {
      console.error('批量停止失败:', error);
      toast?.({
        title: '批量停止失败',
        description: '批量停止挖矿失败',
        type: 'error'
      });
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'stopped': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'stopped': return '已停止';
      case 'error': return '错误';
      default: return '未知';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'stopped': return <XCircle className="w-4 h-4 text-gray-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  // 解析日志并设置颜色
  const parseLogLine = (log: string) => {
    // 检查是否包含错误信息
    if (log.includes('ERROR') || log.includes('错误') || log.includes('失败') || log.includes('Exception')) {
      return { text: log, color: '#f87171' }; // 红色
    }
    // 检查是否包含成功信息
    if (log.includes('SUCCESS') || log.includes('成功') || log.includes('完成') || log.includes('启动')) {
      return { text: log, color: '#4ade80' }; // 绿色
    }
    // 检查是否包含警告信息
    if (log.includes('WARNING') || log.includes('警告') || log.includes('注意')) {
      return { text: log, color: '#fbbf24' }; // 黄色
    }
    // 检查是否包含INFO信息（时间戳日志）
    if (log.includes('INFO') || log.includes(' - ')) {
      return { text: log, color: '#86efac' }; // 浅绿色
    }
    // 默认信息颜色 - 使用白色
    return { text: log, color: '#ffffff' }; // 白色
  };

  return (
    <div className="space-y-4">
      {/* 状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>挂机挖矿状态</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-blue-600">{miningStatus.total_accounts}</div>
              <div className="text-sm text-gray-600">总账号</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-green-600">{miningStatus.running_accounts}</div>
              <div className="text-sm text-gray-600">运行中</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-600">{miningStatus.stopped_accounts}</div>
              <div className="text-sm text-gray-600">已停止</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-red-600">{miningStatus.error_accounts}</div>
              <div className="text-sm text-gray-600">错误</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-purple-600">{miningStatus.total_soul.toLocaleString('en-US')}</div>
              <div className="text-sm text-gray-600">总Soul</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-orange-600">{miningStatus.total_core.toLocaleString('en-US')}</div>
              <div className="text-sm text-gray-600">总Core</div>
            </div>
          </div>
          {miningStatus.last_update && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              最后更新: {new Date(miningStatus.last_update).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日志卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>挖矿日志</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? '隐藏日志' : '显示日志'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadLogs}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {showLogs && (
          <CardContent>
            <div className="h-64 w-full rounded-lg border bg-black overflow-y-auto">
              <style jsx>{`
                div::-webkit-scrollbar {
                  width: 8px !important;
                }
                div::-webkit-scrollbar-track {
                  background: #1f2937 !important;
                  border-radius: 4px !important;
                }
                div::-webkit-scrollbar-thumb {
                  background: #ffffff !important;
                  border-radius: 4px !important;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #f3f4f6 !important;
                }
              `}</style>
              <div className="p-4">
                {logs.length > 0 ? (
                  logs.map((log, index) => {
                    const { text, color } = parseLogLine(log);
                    return (
                      <div key={index} className="mb-1 font-mono text-sm" style={{ color: color }}>
                        {text}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-500 font-mono text-sm">暂无日志</div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 账号管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="w-5 h-5" />
                <span>挖矿账号管理</span>
              </CardTitle>
              <CardDescription className="mt-3" style={{ marginTop: '0.5rem' }}>
                共 {accounts.length} 个账号的挖矿信息
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartAllMining}
                disabled={loading || miningStatus.running_accounts === miningStatus.total_accounts}
              >
                <Play className="w-4 h-4 mr-1" />
                全部开始
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStopAllMining}
                disabled={loading || miningStatus.running_accounts === 0}
              >
                <Pause className="w-4 h-4 mr-1" />
                全部停止
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadAccounts}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>名称</span>
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('uid')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>UID</span>
                      {sortField === 'uid' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>状态</span>
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>总Soul</TableHead>
                  <TableHead>总Core</TableHead>
                  <TableHead>时代Gaea</TableHead>
                  <TableHead>今日Gaea</TableHead>
                  <TableHead>今日在线时间</TableHead>
                  <TableHead>在线状态</TableHead>
                  <TableHead>最后Ping</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedAccounts.has(account.id)}
                        onChange={(e) => handleSelectAccount(account.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{account.uid}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(account.status)}
                        <Badge className={`text-xs ${getStatusColor(account.status)}`}>
                          {getStatusText(account.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {(account.last_info?.total_soul || 0).toLocaleString('en-US')}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {(account.last_info?.total_core || 0).toLocaleString('en-US')}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {account.last_info?.era_gaea || 0}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {account.last_info?.today_gaea || 0}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {account.last_info?.today_uptime || 0}
                    </TableCell>
                    <TableCell className="text-sm">
                      {account.last_info?.online ? (
                        <Badge className="bg-green-100 text-green-800">在线</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">离线</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {account.last_ping ? new Date(account.last_ping).toLocaleString() : '从未'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {account.status === 'running' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStopMining(account)}
                            disabled={operatingAccounts.has(account.id)}
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartMining(account)}
                            disabled={operatingAccounts.has(account.id)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {accounts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              暂无挖矿账号数据
            </div>
          )}
          
          {accounts.length > 0 && (
            <div className="mt-4">
              <DataTablePagination
                totalItems={accounts.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}