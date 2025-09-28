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
import { Progress } from '@/components/ui/progress';
import { 
  Edit, 
  Trash2, 
  Plus,
  RefreshCw,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Ticket as TicketIcon,
  Eye,
  EyeOff,
  Search,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SupplementTicketsDialog } from './SupplementTicketsDialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { DataTablePagination } from './DataTablePagination';
import { TicketAccount, Ticket } from './types';
import { gaeaApiService } from '../../frontend/services/gaeaApiService';

interface TicketsTabProps {
  onRefresh?: () => void;
  onSupplementTickets?: () => void;
  onLogin?: (accountId: string) => Promise<boolean>;
  loading?: boolean;
  toast?: (options: { title: string; description: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export function TicketsTab({ onRefresh, onSupplementTickets, onLogin, loading: externalLoading, toast }: TicketsTabProps) {
  // 查询状态管理
  const [queryingAccounts, setQueryingAccounts] = useState<Set<string>>(new Set());
  const [queryStatus, setQueryStatus] = useState<Record<string, 'idle' | 'querying' | 'success' | 'error' | 'pending'>>({});
  
  // 账号数据
  const [accounts, setAccounts] = useState<TicketAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showTickets, setShowTickets] = useState<{ [key: string]: boolean }>({});
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  
  // 批量查询状态
  const [isBatchQuerying, setIsBatchQuerying] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [currentQueryingAccount, setCurrentQueryingAccount] = useState<string>('');
  const [batchResults, setBatchResults] = useState({ success: 0, failed: 0 });

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
        case 'tickets_count':
          aValue = a.tickets_count || 0;
          bValue = b.tickets_count || 0;
          break;
        case 'last_query_time':
          aValue = a.last_query_time ? new Date(a.last_query_time).getTime() : 0;
          bValue = b.last_query_time ? new Date(b.last_query_time).getTime() : 0;
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
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const handleSelectAccount = useCallback((accountId: string, selected: boolean) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(accountId);
      } else {
        newSet.delete(accountId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!Array.isArray(accounts) || accounts.length === 0) return;
    
    const allSelected = selectedAccounts.size === accounts.length;
    const accountIds = accounts.map(acc => acc.id);
    
    if (allSelected) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accountIds));
    }
  }, [accounts, selectedAccounts.size]);

  // 分页处理函数
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
  }, []);

  const toggleTicketsVisibility = (accountId: string) => {
    setShowTickets(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  // 从数据库加载账号数据
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📋 开始加载账号数据...');
      
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取所有账号数据
      const result = await dbService.getAllDocs({ include_docs: true });
      console.log('📊 数据库查询结果:', result);
      
      const accountList: TicketAccount[] = [];
      
      for (const row of result.rows) {
        if (row.doc) {
          const account: TicketAccount = {
            id: row.doc._id,
            name: row.doc.name || '未知账号',
            uid: row.doc.uid || '',
            username: row.doc.username || '',
            password: row.doc.password || '',
            tickets: [], // 初始为空，通过查询获取
            tickets_count: 0,
            created_at: row.doc.created_at || new Date().toISOString(),
            updated_at: row.doc.updated_at || new Date().toISOString(),
            token: row.doc.token,
            last_query_time: row.doc.last_query_time,
            proxy: row.doc.proxy
          };
          
          // 尝试从tickets数据库加载已有的tickets数据
          try {
            const ticketsDbService = getDatabaseService('gaea_tickets');
            const ticketsResult = await ticketsDbService.getAllDocs({ 
              include_docs: true
            });
            
            // 查找该账号的tickets记录
            for (const ticketRow of ticketsResult.rows) {
              if (ticketRow.doc && ticketRow.doc.accountId === row.doc._id) {
                if (ticketRow.doc.tickets) {
                  // 处理tickets数据格式
                  let ticketsArray = ticketRow.doc.tickets;
                  if (typeof ticketRow.doc.tickets === 'object' && !Array.isArray(ticketRow.doc.tickets)) {
                    // 如果是对象，尝试获取data数组
                    if (ticketRow.doc.tickets.data && Array.isArray(ticketRow.doc.tickets.data)) {
                      ticketsArray = ticketRow.doc.tickets.data;
                    } else {
                      ticketsArray = [];
                    }
                  } else if (!Array.isArray(ticketRow.doc.tickets)) {
                    ticketsArray = [];
                  }
                  
                  account.tickets = ticketsArray;
                  account.tickets_count = ticketsArray.length;
                  account.last_query_time = ticketRow.doc.query_time;
                  
                  // 如果有tickets记录（无论数量多少），说明查询过，设置查询状态为成功
                  setQueryStatus(prev => ({ ...prev, [account.id]: 'success' }));
                }
                break; // 找到最新的记录就停止
              }
            }
          } catch (ticketsError) {
            console.warn('⚠️ 加载Tickets数据失败:', ticketsError);
          }
          
          accountList.push(account);
        }
      }
      
      console.log('✅ 加载账号数据完成:', accountList.length, '个账号');
      
      // 更新账号数据
      setAccounts(accountList);
      
    } catch (error) {
      console.error('❌ 加载账号数据失败:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件加载时获取账号数据
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // 查询单个账号的Tickets
  const queryAccountTickets = async (account: TicketAccount) => {
    try {
      // 设置查询状态
      setQueryingAccounts(prev => new Set(prev).add(account.id));
      setQueryStatus(prev => ({ ...prev, [account.id]: 'querying' }));

      // 检查是否有token
      if (!account.token) {
        console.error('❌ 账号缺少token:', account.id);
        setQueryStatus(prev => ({ ...prev, [account.id]: 'error' }));
        return;
      }

      console.log('🔍 查询账号Tickets:', {
        accountId: account.id,
        name: account.name,
        hasToken: !!account.token,
        hasProxy: !!account.proxy
      });

      // 设置账号信息到API服务缓存
      gaeaApiService.setAccountInfo(account.id, account.username, account.password, account.proxy);

      // 使用统一API服务查询Tickets
      const result = await gaeaApiService.queryTickets(account.id, account.token || '', account.proxy);

      if (result.success) {
        // 处理tickets数据格式
        let ticketsData = result.data || [];
        if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
          if (result.data.data && Array.isArray(result.data.data)) {
            ticketsData = result.data.data;
          } else {
            ticketsData = [];
          }
        }
        
        // 更新账号的tickets数据
        const updatedAccounts = accounts.map(acc => {
          if (acc.id === account.id) {
            const updatedAccount = {
              ...acc,
              tickets: ticketsData,
              tickets_count: ticketsData.length,
              last_query_time: new Date().toISOString(),
            };
            
            // 如果有新token，更新token
            if (result.newToken) {
              updatedAccount.token = result.newToken;
              console.log('🔄 更新账号token:', account.id);
            }
            
            return updatedAccount;
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        setQueryStatus(prev => ({ ...prev, [account.id]: 'success' }));
        
        // 处理tickets数据格式，确保传递的是数组
        let processedTicketsData = result.data || [];
        if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
          if (result.data.data && Array.isArray(result.data.data)) {
            processedTicketsData = result.data.data;
          } else {
            processedTicketsData = [];
          }
        }
        
        // 保存到数据库
        await saveTicketsToDatabase(account.id, processedTicketsData);
        
        // 如果有新token，更新账号数据库中的token
        if (result.newToken) {
          await updateAccountToken(account.id, result.newToken);
        }
      } else {
        setQueryStatus(prev => ({ ...prev, [account.id]: 'error' }));
      }
    } catch (error) {
      console.error('查询Tickets失败:', error);
      setQueryStatus(prev => ({ ...prev, [account.id]: 'error' }));
    } finally {
      setQueryingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(account.id);
        return newSet;
      });
    }
  };

  // 保存Tickets到数据库
  const saveTicketsToDatabase = async (accountId: string, tickets: any[]) => {
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_tickets');
      
      // 查找现有记录
      const allDocs = await dbService.getAllDocs({ include_docs: true });
      let existingDoc: any = null;
      
      for (const row of allDocs.rows) {
        if (row.doc && row.doc.accountId === accountId) {
          existingDoc = row.doc;
          break;
        }
      }
      
      // 获取账号信息
      const account = accounts.find(acc => acc.id === accountId);
      const accountName = account?.name || '未知账号';
      
      const ticketData: any = {
        _id: existingDoc?._id || `tickets_${accountId}_${Date.now()}`,
        _rev: existingDoc?._rev, // 如果存在，保留_rev用于更新
        accountId: accountId,
        accountName: accountName,
        tickets: tickets,
        query_time: new Date().toISOString(),
        created_at: existingDoc?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await dbService.put(ticketData);
      console.log('Tickets已保存到数据库:', accountId, '账号名称:', accountName);
    } catch (error) {
      console.error('保存Tickets到数据库失败:', error);
    }
  };

  // 更新账号token
  const updateAccountToken = async (accountId: string, newToken: string) => {
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取现有账号数据
      const allDocs = await dbService.getAllDocs({ include_docs: true });
      let accountDoc: any = null;
      
      for (const row of allDocs.rows) {
        if (row.doc && row.doc._id === accountId) {
          accountDoc = row.doc;
          break;
        }
      }
      
      if (accountDoc) {
        // 更新token
        accountDoc.token = newToken;
        accountDoc.updated_at = new Date().toISOString();
        
        await dbService.put(accountDoc);
        console.log('✅ 账号token已更新:', accountId);
      } else {
        console.warn('⚠️ 未找到账号记录:', accountId);
      }
    } catch (error) {
      console.error('❌ 更新账号token失败:', error);
    }
  };

  // 批量查询函数
  const handleBatchQuery = useCallback(async () => {
    if (selectedAccounts.size === 0) {
      return;
    }

    try {
      setIsBatchQuerying(true);
      setBatchProgress(0);
      setBatchTotal(selectedAccounts.size);
      setCurrentQueryingAccount('');
      setBatchResults({ success: 0, failed: 0 });
      
      // 获取选中的账号
      const selectedAccountList = accounts.filter(account => selectedAccounts.has(account.id));
      
      // 先将所有选中账号设置为等待查询状态
      const selectedAccountIds = selectedAccountList.map(acc => acc.id);
      setQueryStatus(prev => {
        const newStatus = { ...prev };
        selectedAccountIds.forEach(id => {
          newStatus[id] = 'pending';
        });
        return newStatus;
      });
      console.log(`🔄 设置 ${selectedAccountIds.length} 个账号为等待查询状态`);
      
      // 随机打乱顺序
      const shuffledAccounts = [...selectedAccountList].sort(() => Math.random() - 0.5);
      
      
      // 统计结果
      let successCount = 0;
      let failedCount = 0;
      
      // 逐个查询
      for (let i = 0; i < shuffledAccounts.length; i++) {
        const account = shuffledAccounts[i];
        
        // 设置当前查询的账号
        setCurrentQueryingAccount(account.name);
        
        try {
          // 设置查询状态
          setQueryingAccounts(prev => new Set(prev).add(account.id));
          setQueryStatus(prev => ({ ...prev, [account.id]: 'querying' }));

          // 设置账号信息到API服务缓存
          gaeaApiService.setAccountInfo(account.id, account.username, account.password, account.proxy);

          // 使用统一API服务查询Tickets
          const result = await gaeaApiService.queryTickets(account.id, account.token || '', account.proxy);

          if (result.success) {
            // 处理tickets数据格式
            let ticketsData = result.data || [];
            if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
              if (result.data.data && Array.isArray(result.data.data)) {
                ticketsData = result.data.data;
              } else {
                ticketsData = [];
              }
            }
            
            // 保存tickets到数据库
            await saveTicketsToDatabase(account.id, ticketsData);
            
            // 更新账号状态
            setAccounts(prev => prev.map(acc => {
              if (acc.id === account.id) {
                return {
                  ...acc,
                  tickets: ticketsData,
                  tickets_count: ticketsData.length,
                  last_query_time: new Date().toISOString(),
                  // 如果有新token，更新token
                  token: result.newToken || acc.token
                };
              }
              return acc;
            }));
            
            // 如果有新token，更新数据库中的token
            if (result.newToken) {
              await updateAccountToken(account.id, result.newToken);
            }
            
            setQueryStatus(prev => ({ ...prev, [account.id]: 'success' }));
            successCount++;
            setBatchResults(prev => ({ ...prev, success: prev.success + 1 }));
          } else {
            setQueryStatus(prev => ({ ...prev, [account.id]: 'error' }));
            failedCount++;
            setBatchResults(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        } catch (error) {
          setQueryStatus(prev => ({ ...prev, [account.id]: 'error' }));
          failedCount++;
          setBatchResults(prev => ({ ...prev, failed: prev.failed + 1 }));
        } finally {
          // 移除查询状态
          setQueryingAccounts(prev => {
            const newSet = new Set(prev);
            newSet.delete(account.id);
            return newSet;
          });
        }
        
        // 更新进度
        setBatchProgress(i + 1);
        
        // 添加延迟，避免请求过于频繁
        if (i < shuffledAccounts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      
      // 显示完成toast
      if (toast) {
        toast({
          title: '批量查询完成',
          description: `成功 ${successCount} 个，失败 ${failedCount} 个`,
          type: failedCount === 0 ? 'success' : 'warning'
        });
      }
      
    } catch (error) {
      console.error('❌ 批量查询失败:', error);
    } finally {
      setIsBatchQuerying(false);
      setCurrentQueryingAccount('');
      
      // 5秒后隐藏进度条
      setTimeout(() => {
        setBatchProgress(0);
        setBatchTotal(0);
        setBatchResults({ success: 0, failed: 0 });
      }, 5000);
    }
  }, [selectedAccounts, accounts, saveTicketsToDatabase, batchResults]);

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'pending': return '等待中';
      default: return '未知';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TicketIcon className="w-5 h-5" />
              <span>Tickets 管理</span>
            </CardTitle>
            <CardDescription className="mt-3" style={{ marginTop: '0.5rem' }}>
              共 {accounts.length} 个账号的 Tickets 信息
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadAccounts}
                    disabled={externalLoading || loading}
                    className="flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${(externalLoading || loading) ? 'animate-spin' : ''}`} />
                    <span>刷新</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>刷新列表数据</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBatchQuery}
                    disabled={externalLoading || loading || isBatchQuerying || selectedAccounts.size === 0}
                    className="flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${isBatchQuerying ? 'animate-spin' : ''}`} />
                    <span>批量查询 ({selectedAccounts.size})</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>批量查询选中的账号Tickets ({selectedAccounts.size}个)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <SupplementTicketsDialog accounts={accounts}>
              <Button
                size="sm"
                variant="outline"
                disabled={externalLoading || loading}
                className="flex items-center space-x-1"
              >
                <TicketIcon className="w-4 h-4" />
                <span>补充Ticket</span>
              </Button>
            </SupplementTicketsDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 批量查询进度条 */}
        {(isBatchQuerying || batchTotal > 0) && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                批量查询进度
              </span>
              <span className="text-sm text-blue-600">
                {batchProgress} / {batchTotal}
              </span>
            </div>
            <Progress 
              value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0} 
              className="w-full mb-2 mx-2"
            />
            {currentQueryingAccount && (
              <div className="text-xs text-blue-600 text-center">
                正在查询第 {batchProgress + 1} 个账号: {currentQueryingAccount}
              </div>
            )}
          </div>
        )}
        
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead className="w-32">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>名称</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-24">
                  <button
                    onClick={() => handleSort('uid')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>UID</span>
                    {sortField === 'uid' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead className="w-48">
                  <button
                    onClick={() => handleSort('tickets_count')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>Ticket列表</span>
                    {sortField === 'tickets_count' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-28">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>最后查询时间</span>
                    {sortField === 'created_at' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                      加载中...
                    </div>
                  </TableCell>
                </TableRow>
              ) : !hasAccounts ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedAccounts.has(account.id)}
                        onChange={(e) => handleSelectAccount(account.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {account.name}
                    </TableCell>
                    <TableCell>
                      <div 
                        className="max-w-20 truncate" 
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '80px'
                        }}
                        title={account.uid}
                      >
                        {account.uid}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {queryingAccounts.has(account.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-600">查询中</span>
                          </>
                        ) : queryStatus[account.id] === 'pending' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-pulse text-yellow-600" />
                            <span className="text-sm text-yellow-600">等待查询</span>
                          </>
                        ) : queryStatus[account.id] === 'success' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">查询成功</span>
                          </>
                        ) : queryStatus[account.id] === 'error' ? (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">查询失败</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">未查询</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center space-x-2 cursor-pointer">
                            <span className="text-sm text-gray-500">
                              {account.tickets_count} 张 Tickets
                            </span>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 bg-white">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Ticket编号列表</h4>
                            <div className="space-y-1">
                              {(Array.isArray(account.tickets) ? account.tickets : []).map((ticket, index) => (
                                <div key={`ticket-${account.id}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">#{index + 1}</span>
                                  <span className="text-xs text-blue-600 font-mono">{ticket.cdkey || '未知'}</span>
                                </div>
                              ))}
                              {account.tickets.length === 0 && (
                                <span className="text-sm text-gray-500">暂无Tickets</span>
                              )}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {account.last_query_time ? formatDate(account.last_query_time) : formatDate(account.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => queryAccountTickets(account)}
                                disabled={queryingAccounts.has(account.id)}
                              >
                                <Search className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>查询Tickets</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* 分页组件 */}
        {hasAccounts && (
          <DataTablePagination
            totalItems={accounts.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </CardContent>
    </Card>
  );
}
