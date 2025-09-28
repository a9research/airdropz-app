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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
  Send,
  Save
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { DataTablePagination } from './DataTablePagination';
import { DecisionAccount, Decision } from './types';
import { getDatabaseService } from '@/lib/database';

interface DecisionsTabProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export function DecisionsTab({ onRefresh, loading: externalLoading }: DecisionsTabProps) {
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  
  // 账号数据
  const [accounts, setAccounts] = useState<DecisionAccount[]>([]);

  const [loading, setLoading] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 决策状态管理（参考TicketsTab模式）
  const [decisionStatus, setDecisionStatus] = useState<Record<string, 'idle' | 'submitting' | 'success' | 'error' | 'waiting_query' | 'waiting_retry'>>({});

  // UTC+12时区的新一天检测
  const getCurrentUTCDay = () => {
    const now = new Date();
    const utc12Time = new Date(now.getTime() + (12 * 60 * 60 * 1000)); // UTC+12
    return utc12Time.toISOString().split('T')[0]; // YYYY-MM-DD格式
  };

  const isNewDay = (lastCheckDay: string | null) => {
    const currentDay = getCurrentUTCDay();
    return lastCheckDay !== currentDay;
  };

  // 获取历史决策的日期分组
  const getHistoryDecisionsByDate = (decisions: Decision[]) => {
    const today = getCurrentUTCDay();
    const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayBeforeYesterday = new Date(new Date(today).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('🔍 当前UTC+12日期信息:', {
      today: today,
      yesterday: yesterday,
      dayBeforeYesterday: dayBeforeYesterday,
      currentTime: new Date().toISOString(),
      currentUTC12Time: new Date(new Date().getTime() + (12 * 60 * 60 * 1000)).toISOString()
    });
    
    const grouped = {
      today: [] as Decision[],
      yesterday: [] as Decision[],
      dayBeforeYesterday: [] as Decision[]
    };
    
    decisions.forEach(decision => {
      // 将决策记录的UTC时间转换为UTC+12时区的日期进行比较
      const decisionDate = new Date(decision.created_at);
      // 正确的UTC+12时区转换：将UTC时间加12小时
      const decisionUTC12Time = new Date(decisionDate.getTime() + (12 * 60 * 60 * 1000));
      const decisionUTC12Day = decisionUTC12Time.toISOString().split('T')[0];
      
      console.log('🔍 历史决策日期分组:', {
        originalCreatedAt: decision.created_at,
        decisionDate: decisionDate.toISOString(),
        decisionUTC: decisionDate.toISOString().split('T')[0],
        decisionUTC12Time: decisionUTC12Time.toISOString(),
        decisionUTC12: decisionUTC12Day,
        today: today,
        yesterday: yesterday,
        dayBeforeYesterday: dayBeforeYesterday,
        isToday: decisionUTC12Day === today,
        isYesterday: decisionUTC12Day === yesterday,
        isDayBeforeYesterday: decisionUTC12Day === dayBeforeYesterday
      });
      
      if (decisionUTC12Day === today) {
        grouped.today.push(decision);
        console.log('✅ 决策被分类为今天:', decision.option);
      } else if (decisionUTC12Day === yesterday) {
        grouped.yesterday.push(decision);
        console.log('✅ 决策被分类为昨天:', decision.option);
      } else if (decisionUTC12Day === dayBeforeYesterday) {
        grouped.dayBeforeYesterday.push(decision);
        console.log('✅ 决策被分类为前天:', decision.option);
      } else {
        console.log('❌ 决策未被分类:', decision.option, '日期:', decisionUTC12Day);
      }
    });
    
    return grouped;
  };
  
  // 加载账号数据
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📋 开始加载决策账号数据...');
      
      // 检查是否是新的一天
      const currentDay = getCurrentUTCDay();
      const lastCheckDay = localStorage.getItem('gaea_last_check_day');
      
      if (isNewDay(lastCheckDay)) {
        console.log('🔄 检测到新的一天，重置账号状态');
        // 更新最后检查日期
        localStorage.setItem('gaea_last_check_day', currentDay);
      }
      
      const { getDatabaseService } = await import('@/lib/database');
      const accountsDbService = getDatabaseService('gaea_accounts');
      
      // 获取所有账号数据
      const accountsResult = await accountsDbService.getAllDocs({ include_docs: true });
      console.log('📊 账号数据库查询结果:', accountsResult);
      
      const accountsData: DecisionAccount[] = [];
      
      for (const row of accountsResult.rows) {
        if (row.doc) {
          console.log(`📋 处理账号数据:`, {
            id: row.doc._id,
            name: row.doc.name,
            token: row.doc.token ? '已配置' : '无token',
            proxy: row.doc.proxy || '无代理'
          });
          
          // 获取该账号的历史决策数据
          let historyDecisions: any[] = [];
          let status: 'submitted' | 'not_submitted' = 'not_submitted';
          let currentDecision = '1';
          
          try {
            const decisionsDbService = getDatabaseService('gaea_decisions');
            const decisionsResult = await decisionsDbService.getAllDocs({ include_docs: true });
            
            // 查找该账号的决策记录
            console.log(`🔍 查找账号 ${row.doc.name} 的决策记录:`, {
              accountId: row.doc._id,
              totalDecisionsInDb: decisionsResult.rows.length
            });
            
            const accountDecisions = decisionsResult.rows
              .filter((decisionRow: any) => decisionRow.doc && decisionRow.doc.accountId === row.doc?._id)
              .map((decisionRow: any) => ({
                id: decisionRow.doc._id,
                option: decisionRow.doc.option,
                created_at: decisionRow.doc.created_at
              }))
              .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            console.log(`📊 账号 ${row.doc.name} 的决策记录:`, {
              accountId: row.doc._id,
              foundDecisions: accountDecisions.length,
              decisions: accountDecisions.map(d => ({
                id: d.id,
                option: d.option,
                created_at: d.created_at
              }))
            });
            
            // 如果是新的一天，重置状态为未提交
            if (isNewDay(lastCheckDay)) {
              status = 'not_submitted';
              currentDecision = '1';
              // 只保留历史决策，不包含今天的决策
              const today = getCurrentUTCDay();
              historyDecisions = accountDecisions.filter((decision: any) => {
                const decisionDate = new Date(decision.created_at).toISOString().split('T')[0];
                return decisionDate !== today;
              }).slice(-3);
            } else {
              // 获取历史决策的日期分组
              const historyByDate = getHistoryDecisionsByDate(accountDecisions);
              
              console.log('🔍 历史决策分组结果:', {
                accountName: row.doc.name,
                dayBeforeYesterday: historyByDate.dayBeforeYesterday.length,
                yesterday: historyByDate.yesterday.length,
                today: historyByDate.today.length,
                allDecisions: accountDecisions.length
              });
              
              console.log('🔍 历史决策分组详情:', {
                accountName: row.doc.name,
                dayBeforeYesterday: historyByDate.dayBeforeYesterday,
                yesterday: historyByDate.yesterday,
                today: historyByDate.today
              });
              
              // 按前天、昨天、今天的顺序排列，确保显示3个位置
              const dayBeforeYesterdayDecision = historyByDate.dayBeforeYesterday[0] || null;
              const yesterdayDecision = historyByDate.yesterday[0] || null;
              const todayDecision = historyByDate.today[0] || null;
              
              // 构建固定3个位置的数组：[前天, 昨天, 今天]
              historyDecisions = [
                dayBeforeYesterdayDecision,
                yesterdayDecision, 
                todayDecision
              ];
              
              console.log('🔍 最终历史决策数组:', {
                accountName: row.doc.name,
                historyDecisions: historyDecisions.map(d => d ? {
                  option: d.option,
                  created_at: d.created_at
                } : null)
              });
              
              // 获取最新的决策状态
              const latestDecision = accountDecisions[accountDecisions.length - 1];
              if (latestDecision) {
                // 检查最新决策是否是今天的（使用UTC+12时区判断）
                const decisionDate = new Date(latestDecision.created_at);
                const decisionUTCDay = decisionDate.toISOString().split('T')[0]; // UTC日期
                const decisionUTC12Day = new Date(decisionDate.getTime() + (12 * 60 * 60 * 1000)).toISOString().split('T')[0]; // UTC+12日期
                const currentUTC12Day = getCurrentUTCDay(); // 当前UTC+12日期
                
                console.log('🔍 决策日期判断:', {
                  accountName: row.doc.name,
                  decisionUTC: decisionUTCDay,
                  decisionUTC12: decisionUTC12Day,
                  currentUTC12: currentUTC12Day,
                  isToday: decisionUTC12Day === currentUTC12Day
                });
                
                if (decisionUTC12Day === currentUTC12Day) {
                  status = 'submitted';
                  currentDecision = latestDecision.option;
                }
              }
            }
          } catch (decisionsError) {
            console.warn('⚠️ 加载决策数据失败，使用默认状态:', decisionsError);
            // 决策数据库不存在时，使用默认状态
            status = 'not_submitted';
            currentDecision = '1';
            historyDecisions = [];
          }
          
          const account: DecisionAccount = {
            id: row.doc._id,
            name: row.doc.name || '未知账号',
            uid: row.doc.uid || '',
            current_decision: currentDecision,
            status: status,
            history_decisions: historyDecisions,
            created_at: row.doc.created_at || new Date().toISOString(),
            updated_at: row.doc.updated_at || new Date().toISOString(),
            token: row.doc.token,
            proxy: row.doc.proxy
          };
          
          accountsData.push(account);
        }
      }
      
      console.log('✅ 加载决策账号数据完成:', accountsData.length, '个账号');
      console.log('📊 账号决策选项详情:', accountsData.map(acc => ({
        name: acc.name,
        current_decision: acc.current_decision,
        status: acc.status,
        proxy: acc.proxy ? '已配置' : '无代理'
      })));
      setAccounts(accountsData);
      
    } catch (error) {
      console.error('❌ 加载决策账号数据失败:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载决策设定
  const loadDecisionSettings = async () => {
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const settingsDbService = getDatabaseService('gaea_decision_settings');
      
      const settingsDoc = await settingsDbService.get('gaea_decision_settings');
      if (settingsDoc) {
        setDecisionSettings({
          option1: settingsDoc.option1 || '1.6',
          option2: settingsDoc.option2 || '0.7',
          option3: settingsDoc.option3 || '1.5',
          option4: settingsDoc.option4 || '1.2'
        });
        console.log('✅ 决策设定已加载:', settingsDoc);
      }
    } catch (error) {
      console.log('📝 使用默认决策设定');
      // 使用默认设置，不显示错误
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadDecisionSettings();
        await loadAccounts();
      } catch (error) {
        console.warn('初始加载失败，将在1秒后重试');
        // 1秒后重试
        setTimeout(() => {
          loadAccounts();
        }, 1000);
      }
    };
    
    initializeData();
  }, []);
  
  // 决策设定状态
  const [decisionSettings, setDecisionSettings] = useState({
    option1: '1.6',
    option2: '0.7', 
    option3: '1.5',
    option4: '1.2'
  });

  // 批量提交状态
  const [batchSubmitMode, setBatchSubmitMode] = useState<'auto' | 'manual'>('auto');
  const [allocationSettings, setAllocationSettings] = useState({
    option1: 0,
    option2: 0,
    option3: 0,
    option4: 0
  });
  
  // 批量提交进度状态
  const [batchSubmitProgress, setBatchSubmitProgress] = useState({
    isVisible: false,
    current: 0,
    total: 0,
    currentAccount: '',
    successCount: 0,
    failedCount: 0,
    waitingRetryCount: 0
  });

  // 排序逻辑
  const sortedAccounts = useMemo(() => {
    if (!sortField) return accounts;
    
    return [...accounts].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'uid':
          aValue = a.uid || '';
          bValue = b.uid || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [accounts, sortField, sortDirection]);

  // 分页计算
  const totalPages = Math.ceil(sortedAccounts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAccounts = sortedAccounts.slice(startIndex, endIndex);

  // 计算全选状态 - 只考虑未提交状态的账号
  const selectableAccounts = accounts.filter(acc => acc.status === 'not_submitted');
  const isAllSelected = selectedAccounts.size === selectableAccounts.length && selectableAccounts.length > 0;
  const hasAccounts = accounts.length > 0;

  // 分页处理函数
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
  }, []);

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
    
    // 只选择未提交状态的账号
    const selectableAccounts = accounts.filter(acc => acc.status === 'not_submitted');
    const selectableAccountIds = selectableAccounts.map(acc => acc.id);
    
    // 检查是否所有可选择的账号都已选中
    const allSelectableSelected = selectableAccountIds.every(id => selectedAccounts.has(id));
    
    if (allSelectableSelected && selectableAccountIds.length > 0) {
      // 取消选择所有可选择的账号
      setSelectedAccounts(prev => {
        const newSet = new Set(prev);
        selectableAccountIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // 选择所有可选择的账号
      setSelectedAccounts(prev => {
        const newSet = new Set(prev);
        selectableAccountIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [accounts, selectedAccounts]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'not_submitted': return 'bg-gray-100 text-gray-800';
      case 'waiting_query': return 'bg-blue-100 text-blue-800';
      case 'waiting_retry': return 'bg-orange-100 text-orange-800';
      case 'submitting': return 'bg-purple-100 text-purple-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return '已提交';
      case 'not_submitted': return '未提交';
      case 'waiting_query': return '查询中';
      case 'waiting_retry': return '等待重试';
      case 'submitting': return '提交中';
      case 'success': return '成功';
      case 'error': return '失败';
      default: return '未知';
    }
  };

  const getHistoryDecisionColor = (option: string) => {
    switch (option) {
      case '1': return 'bg-blue-500 text-white';
      case '2': return 'bg-green-500 text-white';
      case '3': return 'bg-purple-500 text-white';
      case '4': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  const handleDecisionChange = (accountId: string, newDecision: string) => {
    console.log('🔄 决策选项变更:', { accountId, newDecision });
    setAccounts(prev => prev.map(account => 
      account.id === accountId 
        ? { ...account, current_decision: newDecision }
        : account
    ));
  };

  // 单个账号提交决策
  const handleSingleAccountSubmit = async (account: DecisionAccount) => {
    console.log('🚀 开始单个账号提交:', account.name);
    try {
      setLoading(true);
      
      // 获取决策参数
      const decisionParams = generateDecisionParams(decisionSettings);
      console.log('生成的决策参数:', decisionParams);
      
      // 调用submitSingleAccountWithRetry函数处理提交逻辑（带重试）
      const result = await submitSingleAccountWithRetry(account, decisionParams);
      
      if (result.success) {
        // 状态更新已在submitSingleAccount中通过updateSingleAccountStatus完成
        
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast({
            title: '提交成功',
            description: `账号 ${account.name} 决策提交成功`,
            type: 'success'
          });
        }
      } else {
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast({
            title: '提交失败',
            description: `账号 ${account.name} 决策提交失败: ${result.error}`,
            type: 'error'
          });
        }
      }
      
    } catch (error) {
      console.error(`账号 ${account.name} 决策提交错误:`, error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: '提交错误',
          description: `账号 ${account.name} 决策提交失败: ${error}`,
          type: 'error'
        });
      } else {
        console.error(`❌ 账号 ${account.name} 决策提交失败: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleSaveSettings = async () => {
    try {
      // 验证输入值
      const values = Object.values(decisionSettings).map(v => parseFloat(v));
      if (values.some(v => isNaN(v) || v <= 0)) {
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast({
            title: '输入错误',
            description: '请输入有效的正数',
            type: 'error'
          });
        } else {
          console.error('❌ 请输入有效的正数');
        }
        return;
      }
      
      // 使用数据库服务存储
      const { getDatabaseService } = await import('@/lib/database');
      const settingsDbService = getDatabaseService('gaea_decision_settings');
      
      // 尝试获取现有设置
      let existingDoc;
      try {
        existingDoc = await settingsDbService.get('gaea_decision_settings');
      } catch (error) {
        // 如果文档不存在，创建新文档
        existingDoc = { _id: 'gaea_decision_settings' };
      }
      
      // 更新设置
      const updatedDoc: any = {
        ...existingDoc,
        ...decisionSettings,
        updated_at: new Date().toISOString()
      };
      
      await settingsDbService.put(updatedDoc);
      console.log('决策设定已保存:', decisionSettings);
      
      // 显示成功toast
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: '保存成功',
          description: '决策设定已保存',
          type: 'success'
        });
      } else {
        // 使用更现代的toast替代alert
        console.log('✅ 决策设定已保存');
      }
    } catch (error) {
      console.error('保存决策设定失败:', error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: '保存失败',
          description: '决策设定保存失败',
          type: 'error'
        });
      } else {
        // 使用console.error替代alert
        console.error('❌ 决策设定保存失败');
      }
    }
  };

  const handleSettingChange = (option: string, value: string) => {
    setDecisionSettings(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // 生成决策提交参数
  const generateDecisionParams = (settings: typeof decisionSettings) => {
    const optionMapping = {
      option1: '3', // 选项一对应3
      option2: '1', // 选项二对应1  
      option3: '2', // 选项三对应2
      option4: '4'  // 选项四对应4
    };
    
    const params: Record<string, string> = {};
    
    Object.entries(settings).forEach(([key, value]) => {
      const optionNumber = optionMapping[key as keyof typeof optionMapping];
      const multiplier = parseFloat(value);
      const secondPart = Math.round(multiplier * 10); // 乘以10并四舍五入
      const thirdPart = '1'; // 第三部分默认为1
      
      params[key] = `${optionNumber}_${secondPart}_${thirdPart}`;
    });
    
    return params;
  };

  // 计算账号统计（基于选中的账号）
  const selectedAccountIds = Array.from(selectedAccounts);
  const selectedAccountsData = accounts.filter(acc => 
    selectedAccountIds.includes(acc.id) && acc.status === 'not_submitted'
  );
  const unassignedAccounts = selectedAccountsData.length;
  const assignedAccounts = Object.values(allocationSettings).reduce((sum, count) => sum + count, 0);
  const isOverAllocated = assignedAccounts > unassignedAccounts;

  // 处理分配设置变化
  const handleAllocationChange = (option: string, value: number) => {
    setAllocationSettings(prev => ({
      ...prev,
      [option]: Math.max(0, value) // 确保不为负数
    }));
  };

  // 生成自动分配
  const generateAutoAllocation = async (): Promise<DecisionAccount[]> => {
    // 只在选中的账号中进行分配
    const selectedAccountIds = Array.from(selectedAccounts);
    const selectedAccountsData = accounts.filter(acc => 
      selectedAccountIds.includes(acc.id) && acc.status === 'not_submitted'
    );
    
    const accountsToSubmit: DecisionAccount[] = [];
    
    // 根据分配设置随机选择账号
    const options = ['1', '2', '3', '4'] as const;
    
    for (const option of options) {
      const count = allocationSettings[`option${option}` as keyof typeof allocationSettings];
      if (count > 0) {
        // 随机选择指定数量的账号（从选中的账号中）
        const shuffled = [...selectedAccountsData].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        
        // 为选中的账号设置决策选项
        selected.forEach(account => {
          accountsToSubmit.push({
            ...account,
            current_decision: option
          });
        });
      }
    }
    
    return accountsToSubmit;
  };

  // 批量设置账号状态为等待查询（参考TicketsTab模式）
  const setAccountsToWaitingQuery = (accountIds: string[]) => {
    // 先设置决策状态
    setDecisionStatus(prev => {
      const newStatus = { ...prev };
      accountIds.forEach(id => {
        newStatus[id] = 'waiting_query';
      });
      return newStatus;
    });
    
    // 然后更新账号状态
    setAccounts(prevAccounts => {
      return prevAccounts.map(acc => {
        if (accountIds.includes(acc.id)) {
          return {
            ...acc,
            status: 'waiting_query' as const
          };
        }
        return acc;
      });
    });
  };

  // 增量更新单个账号的状态（参考TicketsTab模式）
  const updateSingleAccountStatus = async (accountId: string, decisionRecord: any) => {
    try {
      // 更新决策状态
      setDecisionStatus(prev => ({
        ...prev,
        [accountId]: decisionRecord.status === 'submitted' ? 'success' : 
                   decisionRecord.status === 'waiting_query' ? 'waiting_query' :
                   decisionRecord.status === 'waiting_retry' ? 'waiting_retry' :
                   decisionRecord.status === 'not_submitted' ? 'error' : 'idle'
      }));
      
      // 更新账号数据
      setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
          if (acc.id === accountId) {
            let updatedAccount;
            
            // 根据传入的状态决定更新逻辑
            if (decisionRecord.status === 'waiting_query') {
              // 等待查询状态
              updatedAccount = {
                ...acc,
                status: 'waiting_query' as const
              };
            } else if (decisionRecord.status === 'waiting_retry') {
              // 等待重试状态
              updatedAccount = {
                ...acc,
                status: 'waiting_retry' as const,
                current_decision: decisionRecord.option || acc.current_decision
              };
            } else if (decisionRecord.status === 'not_submitted') {
              // 重试失败，恢复为未提交状态
              updatedAccount = {
                ...acc,
                status: 'not_submitted' as const,
                current_decision: decisionRecord.option || acc.current_decision
              };
            } else {
              // 成功提交状态
              updatedAccount = {
                ...acc,
                status: 'submitted' as const,
                current_decision: decisionRecord.option || 'unknown', // 不确定时设为unknown
                history_decisions: [
                  acc.history_decisions[0] || null, // 前天
                  acc.history_decisions[1] || null, // 昨天  
                  decisionRecord // 今天（最右边）
                ]
              };
            }
            
            console.log(`🔄 增量更新账号 ${acc.name} 状态:`, {
              status: updatedAccount.status,
              current_decision: updatedAccount.current_decision,
              history_decisions: updatedAccount.history_decisions ? updatedAccount.history_decisions.map(d => d ? d.option : null) : 'N/A'
            });
            return updatedAccount;
          }
          return acc;
        });
      });
    } catch (error) {
      console.error(`❌ 增量更新账号状态失败:`, error);
    }
  };

  // 延迟重试函数
  const delayRetry = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 提交单个账号（带重试逻辑）
  const submitSingleAccountWithRetry = async (account: DecisionAccount, decisionParams: Record<string, string>, retryCount: number = 0) => {
    try {
      const result = await submitSingleAccount(account, decisionParams);
      
      // 检查是否是"Please wait for the last completion"错误
      if (!result.success && result.error && result.error.includes('Please wait for the last completion')) {
        if (retryCount === 0) {
          console.log(`⏳ 账号 ${account.name} 需要等待，5分钟后重试...`);
          
          // 更新账号状态为等待重试
          updateSingleAccountStatus(account.id, { 
            status: 'waiting_retry', 
            option: account.current_decision,
            created_at: new Date().toISOString()
          });
          
          // 非阻塞延迟重试 - 使用setTimeout而不是await
          setTimeout(async () => {
            console.log(`🔄 账号 ${account.name} 开始重试...`);
            try {
              const retryResult = await submitSingleAccount(account, decisionParams);
              if (retryResult.success) {
                console.log(`✅ 账号 ${account.name} 重试成功`);
                // 存储决策结果到数据库
                const decisionRecord = {
                  account_id: account.id,
                  account_name: account.name,
                  option: (retryResult as any).data?.option || account.current_decision,
                  created_at: new Date().toISOString()
                };
                
                // 存储到客户端数据库
                try {
                  const db = await getDatabaseService('gaea_decisions');
                  await db.put({
                    _id: `decision_${account.id}_${Date.now()}`,
                    ...decisionRecord
                  } as any);
                  console.log(`✅ 账号 ${account.name} 重试决策结果已存储到客户端数据库:`, decisionRecord);
                } catch (dbError) {
                  console.error(`❌ 存储重试决策结果失败:`, dbError);
                }
                
                // 增量更新UI
                updateSingleAccountStatus(account.id, decisionRecord);
              } else {
                console.log(`❌ 账号 ${account.name} 重试后仍然失败:`, retryResult.error);
                // 更新状态为失败
                updateSingleAccountStatus(account.id, { 
                  status: 'not_submitted', 
                  option: account.current_decision,
                  created_at: new Date().toISOString()
                });
              }
            } catch (retryError) {
              console.error(`❌ 账号 ${account.name} 重试过程出错:`, retryError);
              // 更新状态为失败
              updateSingleAccountStatus(account.id, { 
                status: 'not_submitted', 
                option: account.current_decision,
                created_at: new Date().toISOString()
              });
            }
          }, 5 * 60 * 1000); // 5分钟后执行
          
          // 立即返回失败结果，不阻塞其他账号处理
          return { success: false, error: 'Please wait for the last completion - 已安排5分钟后重试' };
        } else {
          console.log(`❌ 账号 ${account.name} 重试后仍然失败`);
          return result;
        }
      }
      
      return result;
    } catch (error) {
      console.error(`❌ 账号 ${account.name} 提交错误:`, error);
      return { success: false, error: error instanceof Error ? error.message : '未知错误' };
    }
  };

  // 提交单个账号
  const submitSingleAccount = async (account: DecisionAccount, decisionParams: Record<string, string>) => {
    try {
      console.log(`🚀 开始处理账号 ${account.name} 的决策提交`);
      console.log(`📋 账号信息:`, {
        id: account.id,
        name: account.name,
        token: account.token ? '已配置' : '无token',
        proxy: account.proxy || '无代理'
      });
      
      // 详细检查代理信息
      if (account.proxy) {
        console.log(`🌐 账号 ${account.name} 代理信息:`, account.proxy);
      } else {
        console.log(`⚠️ 账号 ${account.name} 没有代理信息！`);
      }
      
      // 调用ticket查询API获取最新的cdkey列表
      console.log(`🔍 为账号 ${account.name} 查询最新ticket数据...`);
      console.log(`📡 调用ticket查询API: /api/plugin/gaea/tickets/query`);
      
      const ticketResponse = await fetch('/api/plugin/gaea/tickets/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: account.id,
          token: account.token,
          proxy: account.proxy
        })
      });
      
      console.log(`📡 ticket查询API响应状态:`, ticketResponse.status);
      
      const ticketResult = await ticketResponse.json();
      
      if (!ticketResult.success) {
        console.log(`账号 ${account.name} ticket查询失败:`, ticketResult.error);
        return { success: false, error: `ticket查询失败: ${ticketResult.error}` };
      }
      
      const ticketsArray = ticketResult.data || [];
      
      if (ticketsArray.length === 0) {
        console.log(`账号 ${account.name} 没有可用的ticket`);
        return { success: false, error: '没有可用的ticket' };
      }
      
      // 使用第一个ticket
      const ticket = ticketsArray[0].cdkey;
      const detail = decisionParams[`option${account.current_decision}`];
      
      if (!detail) {
        console.log(`账号 ${account.name} 的决策选项 ${account.current_decision} 没有对应的参数`);
        return { success: false, error: '没有对应的参数' };
      }
      
      // 调用决策提交API
      const response = await fetch('/api/plugin/gaea/decisions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: account.id,
          accountName: account.name,
          token: account.token,
          ticket: ticket,
          detail: detail,
          proxy: account.proxy
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ 账号 ${account.name} 决策提交成功`);
        
        // 存储决策结果到客户端数据库
        try {
          const { getDatabaseService } = await import('@/lib/database');
          const decisionsDbService = getDatabaseService('gaea_decisions');
          
          const decisionRecord: any = {
            _id: `decision_${account.id}_${Date.now()}`,
            accountId: account.id,
            accountName: account.name,
            option: account.current_decision, // 使用账号的当前决策选项
            detail: detail,
            ticket: ticket,
            result: result.data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          await decisionsDbService.put(decisionRecord);
          console.log(`✅ 账号 ${account.name} 决策结果已存储到客户端数据库:`, decisionRecord);
          
          // 增量更新UI状态，避免全量刷新
          await updateSingleAccountStatus(account.id, {
            ...decisionRecord,
            status: 'submitted'
          });
        } catch (dbError) {
          console.error(`❌ 账号 ${account.name} 存储决策结果失败:`, dbError);
          // 即使数据库存储失败，也不影响提交成功
        }
        
        return { success: true };
      } else {
        // 检查是否是"已完成"的情况
        const errorMsg = result.error || '';
        if (errorMsg.includes('completed') || errorMsg.includes('已完成') || errorMsg.includes('Deepdecision has been completed')) {
          console.log(`✅ 账号 ${account.name} 决策已完成`);
          
          // 存储"已完成"的决策结果到客户端数据库
          try {
            const { getDatabaseService } = await import('@/lib/database');
            const decisionsDbService = getDatabaseService('gaea_decisions');
            
            const decisionRecord: any = {
              _id: `decision_${account.id}_${Date.now()}`,
              accountId: account.id,
              accountName: account.name,
              option: '', // 不确定选项时设为空
              detail: detail,
              ticket: ticket,
              result: result.data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await decisionsDbService.put(decisionRecord);
            console.log(`✅ 账号 ${account.name} 决策已完成结果已存储到客户端数据库:`, decisionRecord);
            
            // 增量更新UI状态，避免全量刷新
            await updateSingleAccountStatus(account.id, {
              ...decisionRecord,
              status: 'submitted'
            });
          } catch (dbError) {
            console.error(`❌ 账号 ${account.name} 存储决策已完成结果失败:`, dbError);
          }
          
          return { success: true };
        } else {
          console.error(`❌ 账号 ${account.name} 决策提交失败:`, result.error);
          console.log(`📋 账号 ${account.name} 失败详情:`, {
            error: result.error,
            response: result
          });
          
          // 更新账号状态为失败，避免停留在查询中状态
          await updateSingleAccountStatus(account.id, {
            status: 'not_submitted' // 重置为未提交状态
          });
          
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      console.error(`账号 ${account.name} 决策提交错误:`, error);
      
      // 更新账号状态为失败，避免停留在查询中状态
      await updateSingleAccountStatus(account.id, {
        status: 'not_submitted' // 重置为未提交状态
      });
      
      return { success: false, error: error };
    }
  };

  // 开始提交（参考TicketsTab的批量处理模式）
  const handleStartSubmit = async () => {
    console.log('🚀 开始批量提交按钮被点击');
    console.log('📊 提交状态检查:', {
      loading,
      batchSubmitMode,
      isOverAllocated,
      selectedAccounts: Array.from(selectedAccounts),
      accountsCount: accounts.length
    });
    
    try {
      setLoading(true);
      
      // 获取决策参数
      const decisionParams = generateDecisionParams(decisionSettings);
      console.log('生成的决策参数:', decisionParams);
      
      let accountsToSubmit: DecisionAccount[] = [];
      
      if (batchSubmitMode === 'manual') {
        // 使用列表中的选择
        const selectedAccountIds = Array.from(selectedAccounts);
        accountsToSubmit = accounts.filter(acc => 
          selectedAccountIds.includes(acc.id) && acc.status === 'not_submitted'
        );
      } else {
        // 自动分配模式
        accountsToSubmit = await generateAutoAllocation();
      }
      
      if (accountsToSubmit.length === 0) {
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast({
            title: '提示',
            description: '没有可提交的账号',
            type: 'warning'
          });
        } else {
          console.warn('⚠️ 没有可提交的账号');
        }
        return;
      }
      
      // 参考TicketsTab模式：先设置所有账号为等待状态
      const accountIds = accountsToSubmit.map(acc => acc.id);
      setAccountsToWaitingQuery(accountIds);
      
      // 显示进度条
      setBatchSubmitProgress({
        isVisible: true,
        current: 0,
        total: accountsToSubmit.length,
        currentAccount: '',
        successCount: 0,
        failedCount: 0,
        waitingRetryCount: 0
      });
      
      // 随机打乱账号顺序
      const shuffledAccounts = [...accountsToSubmit].sort(() => Math.random() - 0.5);
      
      let successCount = 0;
      let failedCount = 0;
      let waitingRetryCount = 0;
      
      // 逐个提交账号（参考TicketsTab的逐个处理模式）
      for (let i = 0; i < shuffledAccounts.length; i++) {
        const account = shuffledAccounts[i];
        
        // 更新进度
        setBatchSubmitProgress(prev => ({
          ...prev,
          current: i + 1,
          currentAccount: account.name
        }));
        
        // 设置当前账号为提交中状态
        setDecisionStatus(prev => ({ ...prev, [account.id]: 'submitting' }));
        
        try {
          const result = await submitSingleAccountWithRetry(account, decisionParams);
          if (result.success) {
            successCount++;
            // 状态更新已在submitSingleAccount中通过增量更新完成
          } else {
            // 检查是否是等待重试的情况
            if (result.error && result.error.includes('Please wait for the last completion - 已安排5分钟后重试')) {
              console.log(`⏳ 账号 ${account.name} 已安排5分钟后重试，不计入失败统计`);
              waitingRetryCount++;
            } else {
              failedCount++;
            }
          }
        } catch (error) {
          console.error(`账号 ${account.name} 提交错误:`, error);
          failedCount++;
          // 设置错误状态
          setDecisionStatus(prev => ({ ...prev, [account.id]: 'error' }));
        }
        
        // 更新进度统计
        setBatchSubmitProgress(prev => ({
          ...prev,
          successCount,
          failedCount,
          waitingRetryCount
        }));
        
        // 添加延迟，避免请求过于频繁
        if (i < shuffledAccounts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 隐藏进度条
      setTimeout(() => {
        setBatchSubmitProgress(prev => ({ ...prev, isVisible: false }));
      }, 5000);
      
      // 显示完成toast
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: '批量提交完成',
          description: `成功 ${successCount} 个，失败 ${failedCount} 个，等待重试 ${waitingRetryCount} 个`,
          type: failedCount > 0 ? 'warning' : 'success'
        });
      }
      
      // 清空选择
      setSelectedAccounts(new Set());
      
    } catch (error) {
      console.error('批量提交错误:', error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: '批量提交失败',
          description: '批量提交过程中发生错误',
          type: 'error'
        });
      } else {
        console.error('❌ 批量提交失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 决策设定组件 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>参数设定（输入选项当日倍数）</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium whitespace-nowrap">选项一</Label>
                <Input
                  type="text"
                  value={decisionSettings.option1}
                  onChange={(e) => handleSettingChange('option1', e.target.value)}
                  className="w-12"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium whitespace-nowrap">选项二</Label>
                <Input
                  type="text"
                  value={decisionSettings.option2}
                  onChange={(e) => handleSettingChange('option2', e.target.value)}
                  className="w-12"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium whitespace-nowrap">选项三</Label>
                <Input
                  type="text"
                  value={decisionSettings.option3}
                  onChange={(e) => handleSettingChange('option3', e.target.value)}
                  className="w-12"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium whitespace-nowrap">选项四</Label>
                <Input
                  type="text"
                  value={decisionSettings.option4}
                  onChange={(e) => handleSettingChange('option4', e.target.value)}
                  className="w-12"
                />
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSaveSettings}
                className="flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>保存</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 决策管理表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>决策管理</span>
              </CardTitle>
              <CardDescription className="mt-3" style={{ marginTop: '0.5rem' }}>
                共 {accounts.length} 个账号的决策信息
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex items-center space-x-1"
                    disabled={selectedAccounts.size === 0}
                  >
                    <Send className="w-4 h-4" />
                    <span>批量提交决策 ({selectedAccounts.size})</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-white">
                  <div className="space-y-4">
                    {/* 模式选择 */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-center">提交模式</h4>
                      <Tabs 
                        value={batchSubmitMode} 
                        onValueChange={(value) => setBatchSubmitMode(value as 'auto' | 'manual')}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="auto">自动分配</TabsTrigger>
                          <TabsTrigger value="manual">使用列表中的选择</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <Separator className="bg-gray-300" />

                    {/* 自动分配模式 */}
                    {batchSubmitMode === 'auto' && (
                      <div className="space-y-4">
                        {/* 账号统计卡片 */}
                        <div className="grid grid-cols-2 gap-3">
                          <Card className="p-3">
                            <CardContent className="p-0">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{unassignedAccounts}</div>
                                <div className="text-sm text-gray-600">选中未分配账号</div>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="p-3">
                            <CardContent className="p-0">
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${isOverAllocated ? 'text-red-600' : 'text-green-600'}`}>
                                  {assignedAccounts}
                                </div>
                                <div className="text-sm text-gray-600">已分配账号</div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* 分配设置 */}
                        <div className="space-y-3">
                          <h4 className="font-medium">分配设置</h4>
                          <div className="text-sm text-gray-600">
                            将在选中的 {unassignedAccounts} 个账号中按以下设置进行分配：
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {['option1', 'option2', 'option3', 'option4'].map((option, index) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Label className="text-sm whitespace-nowrap">选项{index + 1}:</Label>
                                <Input
                                  type="number"
                                  value={allocationSettings[option as keyof typeof allocationSettings]}
                                  onChange={(e) => handleAllocationChange(option, parseInt(e.target.value) || 0)}
                                  className="w-16 h-8"
                                  min="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 使用列表中的选择模式 */}
                    {batchSubmitMode === 'manual' && (
                      <div className="space-y-4">
                        <div className="text-center text-gray-600">
                          将使用列表中已选择的账号进行提交
                        </div>
                      </div>
                    )}

                    {/* 批量提交进度条 */}
                    {batchSubmitProgress.isVisible && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>批量提交进度</span>
                          <span>{batchSubmitProgress.current}/{batchSubmitProgress.total}</span>
                        </div>
                        <Progress 
                          value={(batchSubmitProgress.current / batchSubmitProgress.total) * 100} 
                          className="w-full"
                        />
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>当前: {batchSubmitProgress.currentAccount}</span>
                          <span>成功: {batchSubmitProgress.successCount} 失败: {batchSubmitProgress.failedCount} 等待重试: {batchSubmitProgress.waitingRetryCount || 0}</span>
                        </div>
                      </div>
                    )}

                    {/* 开始提交按钮 */}
                    <div className="flex justify-center">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    console.log('🔘 按钮点击事件触发');
                    console.log('🔍 按钮状态:', {
                      loading,
                      batchSubmitMode,
                      isOverAllocated,
                      disabled: loading || (batchSubmitMode === 'auto' && isOverAllocated)
                    });
                    handleStartSubmit();
                  }}
                  disabled={loading || (batchSubmitMode === 'auto' && isOverAllocated) || selectedAccounts.size === 0}
                  className="flex items-center space-x-1 border border-gray-300"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>提交中...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>开始提交 ({selectedAccounts.size})</span>
                    </>
                  )}
                </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {onRefresh && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          // 只刷新数据，不重新加载整个列表
                          console.log('🔄 刷新决策数据...');
                          if (onRefresh) onRefresh();
                        }}
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
              )}
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
                <TableHead className="w-32">决策选项</TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead className="w-48">历史决策</TableHead>
                <TableHead className="w-28">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>提交时间</span>
                    {sortField === 'created_at' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-20 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                      加载中...
                    </div>
                  </TableCell>
                </TableRow>
              ) : !hasAccounts ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
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
                        disabled={account.status === 'submitted' || account.status === 'waiting_query' || account.status === 'waiting_retry'}
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
                      {account.status === 'submitted' ? (
                        // 已提交状态：显示当前选择，不可点击
                        <div className="flex flex-row space-x-1">
                          {account.current_decision === 'unknown' ? (
                            // 不确定选项时，显示灰色圆形
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400 bg-gray-400 flex items-center justify-center">
                              </div>
                              <span className="text-xs text-gray-400">不确定</span>
                            </div>
                          ) : (
                            // 确定选项时，显示具体选择
                            ['1', '2', '3', '4'].map((option) => (
                              <div key={option} className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  account.current_decision === option 
                                    ? 'border-blue-500 bg-blue-500' 
                                    : 'border-gray-300'
                                }`}>
                                  {account.current_decision === option && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                  )}
                                </div>
                                <span className={`text-xs ${account.status === 'submitted' ? 'text-gray-400' : 'text-gray-700'}`}>
                                  {option}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      ) : account.status === 'waiting_query' ? (
                        // 等待查询状态：显示加载中
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-blue-600">查询中...</span>
                        </div>
                      ) : account.status === 'waiting_retry' ? (
                        // 等待重试状态：显示倒计时
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-pulse"></div>
                          <span className="text-xs text-orange-600">等待重试...</span>
                        </div>
                      ) : (
                        // 未提交状态：可选择的RadioGroup
                        <RadioGroup 
                          value={account.current_decision} 
                          className="flex flex-row space-x-1"
                          onValueChange={(value) => handleDecisionChange(account.id, value)}
                        >
                          {['1', '2', '3', '4'].map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option} 
                                id={`${account.id}-${option}`}
                              />
                              <Label 
                                htmlFor={`${account.id}-${option}`} 
                                className="text-xs text-gray-700"
                              >
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getStatusColor(decisionStatus[account.id] || account.status)}`}>
                        {getStatusText(decisionStatus[account.id] || account.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {(() => {
                          // 确保显示3个位置：前天(左) → 昨天(中) → 今天(右)
                          const displayItems = [];
                          
                          // 按固定顺序显示：前天、昨天、今天
                          for (let i = 0; i < 3; i++) {
                            const decision = account.history_decisions[i];
                            if (decision && decision !== null) {
                              // 有数据，检查选项是否确定
                              const isUncertain = !decision.option || decision.option === 'unknown' || decision.option === '';
                              
                              if (isUncertain) {
                                // 不确定选项，显示灰色圆形
                                displayItems.push(
                                  <div
                                    key={decision.id}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gray-400 text-white"
                                    title={`${decision.created_at} - 选项不确定`}
                                  >
                                  </div>
                                );
                              } else {
                                // 确定选项，显示对应颜色和数字
                                displayItems.push(
                                  <div
                                    key={decision.id}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${getHistoryDecisionColor(decision.option)}`}
                                    title={`${decision.created_at} - 选项${decision.option}`}
                                  >
                                    {decision.option}
                                  </div>
                                );
                              }
                            } else {
                              // 没有数据，显示灰色"-"
                              displayItems.push(
                                <div
                                  key={`empty-${account.id}-${i}`}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gray-300 text-gray-600"
                                  title="无决策数据"
                                >
                                  -
                                </div>
                              );
                            }
                          }
                          
                          return displayItems;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(account.created_at)}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log('🔘 单个账号提交按钮被点击:', account.name);
                                handleSingleAccountSubmit(account);
                              }}
                              className={`${
                                account.status === 'submitted' || account.status === 'waiting_query' || account.status === 'waiting_retry'
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-blue-600 hover:text-blue-700'
                              }`}
                              disabled={account.status === 'submitted' || account.status === 'waiting_query' || account.status === 'waiting_retry'}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              {account.status === 'submitted' ? '已提交' : 
                               account.status === 'waiting_query' ? '查询中' : 
                               account.status === 'waiting_retry' ? '等待重试' : '提交'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{account.status === 'submitted' ? '决策已提交' : 
                                account.status === 'waiting_query' ? '正在查询ticket' : 
                                account.status === 'waiting_retry' ? '等待5分钟后重试' : '提交决策'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
    </div>
  );
}
