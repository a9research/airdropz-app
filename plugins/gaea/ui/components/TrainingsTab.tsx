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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Brain,
  Play,
  Pause,
  Award,
  Gift,
  Zap,
  Activity,
  XCircle,
  Loader2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTablePagination } from './DataTablePagination';
import { TrainingAccount } from './types';
import { gaeaApiService } from '../../frontend/services/gaeaApiService';

interface TrainingsTabProps {
  onRefresh?: () => void;
  loading?: boolean;
  toast?: (options: { title: string; description: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export function TrainingsTab({ onRefresh, loading: externalLoading, toast }: TrainingsTabProps) {
  // 操作状态管理
  const [operatingAccounts, setOperatingAccounts] = useState<Set<string>>(new Set());
  const [operationStatus, setOperationStatus] = useState<Record<string, 'idle' | 'operating' | 'success' | 'error'>>({});
  
  // 账号数据
  const [accounts, setAccounts] = useState<TrainingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

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
        case 'training_status':
          aValue = a.training_status || '';
          bValue = b.training_status || '';
          break;
        case 'advanced_training_status':
          aValue = a.advanced_training_status || '';
          bValue = b.advanced_training_status || '';
          break;
        case 'daily_reward_status':
          aValue = a.daily_reward_status || '';
          bValue = b.daily_reward_status || '';
          break;
        case 'training_reward_status':
          aValue = a.training_reward_status || '';
          bValue = b.training_reward_status || '';
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

  // 检查是否需要重置状态（每天UTC 0点）
  const checkAndResetDailyStatus = useCallback(async (): Promise<boolean> => {
    // 获取当前UTC时间
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const today = utcNow.toISOString().split('T')[0];
    
    console.log('🕐 时间检查:', {
      localTime: now.toISOString(),
      utcTime: utcNow.toISOString(),
      today: today,
      timezoneOffset: now.getTimezoneOffset()
    });
    
    // 检查本地存储的最后重置日期
    const lastResetDate = localStorage.getItem('training_last_reset_date');
    
    console.log('📅 重置日期检查:', {
      lastResetDate,
      today,
      shouldReset: lastResetDate !== today
    });
    
    if (lastResetDate !== today) {
      // 检查是否在最近5分钟内已经重置过（避免重复重置）
      const lastResetTime = localStorage.getItem('training_last_reset_time');
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      if (lastResetTime && parseInt(lastResetTime) > fiveMinutesAgo) {
        console.log('⏰ 最近5分钟内已重置过，跳过本次重置');
        return false;
      }
      
      console.log('🔄 检测到新的一天，重置训练状态...');
      console.log('📝 重置原因:', lastResetDate ? `上次重置: ${lastResetDate}, 今天: ${today}` : '首次运行或手动重置后');
      localStorage.setItem('training_last_reset_date', today);
      localStorage.setItem('training_last_reset_time', now.toString());
      
      // 重置所有账号的训练状态（内存）
      setAccounts(prevAccounts => 
        prevAccounts.map(account => ({
          ...account,
          training_status: '未训练',
          daily_reward_status: '未领取',
          training_reward_status: '未领取',
          advanced_training_status: '未训练'
        }))
      );
      
      // 同步重置状态到数据库
      try {
        const { getDatabaseService } = await import('@/lib/database');
        const dbService = getDatabaseService('gaea_accounts');
        
        // 获取所有账号数据
        const result = await dbService.getAllDocs({ include_docs: true });
        
        for (const row of result.rows) {
          if (row.doc) {
            const updatedDoc = {
              ...row.doc,
              training_status: '未训练',
              daily_reward_status: '未领取',
              training_reward_status: '未领取',
              advanced_training_status: '未训练',
              updated_at: new Date().toISOString()
            };
            
            await dbService.put(updatedDoc);
            console.log('💾 重置账号状态到数据库:', row.doc.name);
          }
        }
        
        console.log('✅ 所有账号状态已重置到数据库');
        return true; // 返回true表示执行了重置
      } catch (error) {
        console.error('❌ 重置状态到数据库失败:', error);
        return true; // 即使数据库更新失败，也认为重置了
      }
    }
    
    return false; // 返回false表示没有执行重置
  }, []);

  // 更新数据库中的训练状态
  const updateAccountStatus = useCallback(async (accountId: string, statusUpdates: Partial<TrainingAccount>) => {
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取现有账号数据
      const existingDoc = await dbService.get(accountId);
      
      // 更新状态字段
      const updatedDoc = {
        ...existingDoc,
        ...statusUpdates,
        updated_at: new Date().toISOString()
      };
      
      // 保存到数据库
      await dbService.put(updatedDoc);
      console.log('💾 训练状态已保存到数据库:', accountId, statusUpdates);
      
    } catch (error) {
      console.error('❌ 保存训练状态失败:', error);
    }
  }, []);

  // 从数据库加载账号数据
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📋 开始加载训练账号数据...');
      
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取所有账号数据
      const result = await dbService.getAllDocs({ include_docs: true });
      console.log('📊 数据库查询结果:', result);
      
      const accountList: TrainingAccount[] = [];
      
      for (const row of result.rows) {
        if (row.doc) {
          const account: TrainingAccount = {
            id: row.doc._id,
            name: row.doc.name || '未知账号',
            uid: row.doc.uid || '',
            username: row.doc.username || '',
            password: row.doc.password || '',
            token: row.doc.token || '',
            proxy: row.doc.proxy || '',
            training_content: row.doc.training_content || 'Positive',
            training_status: row.doc.training_status || '未训练',
            daily_reward_status: row.doc.daily_reward_status || '未领取',
            training_reward_status: row.doc.training_reward_status || '未领取',
            advanced_training_status: row.doc.advanced_training_status || '未训练',
            created_at: row.doc.created_at || new Date().toISOString(),
            updated_at: row.doc.updated_at || new Date().toISOString()
          };
          accountList.push(account);
        }
      }
      
      console.log('📋 加载的账号数据:', accountList);
      setAccounts(accountList);
      
      // 检查是否需要重置状态
      checkAndResetDailyStatus();
      
    } catch (error) {
      console.error('❌ 加载账号数据失败:', error);
      toast?.({
        title: '加载失败',
        description: '无法加载账号数据',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [checkAndResetDailyStatus, toast]);

  // 组件加载时获取账号数据
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // 智能定时器：如果本日已重置则停止，下个UTC 0点再激活
  useEffect(() => {
    // 立即检查一次
    console.log('⏰ 组件挂载，立即检查重置状态...');
    checkAndResetDailyStatus();
    
    // 检查是否需要启动定时器
    const shouldStartTimer = () => {
      const now = new Date();
      const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const today = utcNow.toISOString().split('T')[0];
      const lastResetDate = localStorage.getItem('training_last_reset_date');
      
      // 如果今天已经重置过，不需要定时器
      if (lastResetDate === today) {
        console.log('✅ 今日已重置，停止定时器');
        return false;
      }
      
      console.log('🔄 今日未重置，启动定时器');
      return true;
    };
    
    let interval: NodeJS.Timeout | null = null;
    
    if (shouldStartTimer()) {
      interval = setInterval(async () => {
        console.log('⏰ 定期检查重置状态...');
        console.log('📅 当前本地存储的重置日期:', localStorage.getItem('training_last_reset_date'));
        
        const resetResult = await checkAndResetDailyStatus();
        
        // 如果重置成功，停止定时器
        if (resetResult) {
          console.log('✅ 重置完成，停止定时器');
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      }, 5 * 60 * 1000); // 5分钟
    }

    return () => {
      console.log('⏰ 组件卸载，清理定时器');
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkAndResetDailyStatus]);

  // 页面可见性变化时检查重置状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ 页面重新可见，检查重置状态...');
        checkAndResetDailyStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAndResetDailyStatus]);

  // 下个UTC 0点重新激活定时器
  useEffect(() => {
    const scheduleNextDayTimer = () => {
      const now = new Date();
      const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const today = utcNow.toISOString().split('T')[0];
      const lastResetDate = localStorage.getItem('training_last_reset_date');
      
      // 如果今天已经重置过，计算到下个UTC 0点的时间
      if (lastResetDate === today) {
        const nextDay = new Date(utcNow);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        nextDay.setUTCHours(0, 0, 0, 0);
        
        const timeUntilNextDay = nextDay.getTime() - utcNow.getTime();
        
        console.log('⏰ 今日已重置，将在下个UTC 0点重新激活定时器');
        console.log('📅 下个UTC 0点时间:', nextDay.toISOString());
        console.log('⏱️ 距离下个UTC 0点:', Math.round(timeUntilNextDay / 1000 / 60), '分钟');
        
        // 设置定时器在下个UTC 0点重新激活
        const nextDayTimer = setTimeout(() => {
          console.log('🔄 下个UTC 0点到达，重新激活定时器');
          // 这里可以触发组件重新渲染或重新检查
          window.location.reload(); // 简单粗暴的方式，或者可以发送事件
        }, timeUntilNextDay);
        
        return () => clearTimeout(nextDayTimer);
      }
      
      return () => {}; // 不需要清理
    };
    
    return scheduleNextDayTimer();
  }, []);

  // 分页处理函数
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 处理每日奖励领取
  const handleDailyReward = async (account: TrainingAccount) => {
    try {
      setOperatingAccounts(prev => new Set(prev).add(account.id));
      setOperationStatus(prev => ({ ...prev, [account.id]: 'operating' }));

      console.log('🎁 开始领取每日奖励:', account.name);
      console.log('📋 账号信息详情:', {
        id: account.id,
        name: account.name,
        username: account.username,
        token: account.token ? '有token' : '无token',
        proxy: account.proxy || '无代理'
      });

      // 设置账号信息到gaeaApiService缓存
      gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

      const requestBody = {
        accountId: account.id,
        accountName: account.name,
        token: account.token,
        proxy: account.proxy
      };
      
      console.log('📤 发送的请求数据:', requestBody);

      // 使用gaeaApiService调用外部Gaea API，通过代理处理CORS问题
      const response = await gaeaApiService.request(account.id, {
        url: 'https://api.aigaea.net/api/reward/daily-list',
        method: 'GET',
        headers: {
          'accept': '*/*',
          'accept-language': 'en-US',
          'authorization': `Bearer ${account.token}`,
          'content-type': 'application/json',
          'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'Referer': 'https://app.aigaea.net/',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        proxy: account.proxy
      });

      if (response.success) {
        // 处理每日奖励列表，查找未领取的奖励
        console.log('📊 每日奖励API响应数据:', response.data);
        console.log('📊 数据类型:', typeof response.data);
        console.log('📊 是否为数组:', Array.isArray(response.data));
        
        // 检查响应数据结构
        let rewards = [];
        if (response.data && response.data.data) {
          // 如果响应有嵌套的data字段，检查是否有list属性
          const dataObj = response.data.data;
          console.log('📊 嵌套data对象:', dataObj);
          
          if (dataObj.list && Array.isArray(dataObj.list)) {
            // 使用list数组
            rewards = dataObj.list;
            console.log('📊 使用list数组:', rewards);
          } else if (Array.isArray(dataObj)) {
            // 如果dataObj直接是数组
            rewards = dataObj;
            console.log('📊 使用直接数组:', rewards);
          } else {
            console.error('❌ 无法解析奖励数据，dataObj不是数组也没有list属性:', dataObj);
            throw new Error('每日奖励数据格式错误，无法找到奖励列表');
          }
        } else if (Array.isArray(response.data)) {
          // 如果response.data直接是数组
          rewards = response.data;
          console.log('📊 使用直接数组:', rewards);
        } else {
          console.error('❌ 无法解析奖励数据:', response.data);
          throw new Error('每日奖励数据格式错误，无法解析奖励列表');
        }
        
        console.log('📊 处理后的rewards:', rewards);
        
        if (!Array.isArray(rewards)) {
          console.error('❌ rewards不是数组格式:', rewards);
          throw new Error('每日奖励数据格式错误，期望数组但收到: ' + typeof rewards);
        }
        
        const unrewardedRewards = rewards.filter((reward: any) => !reward.is_rewarded);
        
        if (unrewardedRewards.length > 0) {
          // 领取第一个未领取的奖励
          const rewardToClaim = unrewardedRewards[0];
          console.log('🎯 准备领取的奖励对象:', rewardToClaim);
          console.log('🎯 奖励ID (daily字段):', rewardToClaim.daily);
          console.log('🎯 奖励ID类型:', typeof rewardToClaim.daily);
          
          const claimResponse = await gaeaApiService.request(account.id, {
            url: '/api/plugin/gaea/reward/daily-complete',
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'accept-language': 'en-US',
              'authorization': `Bearer ${account.token}`,
              'content-type': 'application/json'
            },
            body: {
              accountId: account.id,
              token: account.token,
              proxy: account.proxy,
              id: rewardToClaim.daily
            }
          });

          if (claimResponse.success) {
            setOperationStatus(prev => ({ ...prev, [account.id]: 'success' }));
            
            // 更新内存状态
            setAccounts(prev => prev.map(acc => 
              acc.id === account.id 
                ? { ...acc, daily_reward_status: '已领取' }
                : acc
            ));
            
            // 更新数据库状态
            await updateAccountStatus(account.id, { daily_reward_status: '已领取' });
            
            toast?.({
              title: '领取成功',
              description: `账号 ${account.name} 每日奖励领取成功`,
              type: 'success'
            });
          } else {
            throw new Error(claimResponse.error || '领取失败');
          }
        } else {
          // 没有可领取的奖励
          setOperationStatus(prev => ({ ...prev, [account.id]: 'success' }));
          
          // 更新内存状态
          setAccounts(prev => prev.map(acc => 
            acc.id === account.id 
              ? { ...acc, daily_reward_status: '已领取' }
              : acc
          ));
          
          // 更新数据库状态
          await updateAccountStatus(account.id, { daily_reward_status: '已领取' });
          
          toast?.({
            title: '领取成功',
            description: `账号 ${account.name} 没有可领取的每日奖励`,
            type: 'success'
          });
        }
      } else {
        throw new Error(response.error || '获取奖励列表失败');
      }
    } catch (error) {
      console.error('❌ 每日奖励领取失败:', error);
      setOperationStatus(prev => ({ ...prev, [account.id]: 'error' }));
      toast?.({
        title: '领取失败',
        description: `${account.name} 每日奖励领取失败`,
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

  // 处理训练奖励领取
  const handleTrainingReward = async (account: TrainingAccount) => {
    try {
      setOperatingAccounts(prev => new Set(prev).add(account.id));
      setOperationStatus(prev => ({ ...prev, [account.id]: 'operating' }));

      console.log('🏆 开始领取训练奖励:', account.name);

      // 设置账号信息到gaeaApiService缓存
      gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

      const response = await gaeaApiService.request(account.id, {
        url: '/api/plugin/gaea/training/claim',
        method: 'POST',
        body: {
          accountId: account.id,
          accountName: account.name,
          token: account.token,
          proxy: account.proxy
        }
      });

      if (response.success) {
        setOperationStatus(prev => ({ ...prev, [account.id]: 'success' }));
        
        // 更新内存状态
        setAccounts(prev => prev.map(acc => 
          acc.id === account.id 
            ? { ...acc, training_reward_status: '已领取' }
            : acc
        ));
        
        // 更新数据库状态
        await updateAccountStatus(account.id, { training_reward_status: '已领取' });
        
        toast?.({
          title: '领取成功',
          description: `${account.name} 训练奖励领取成功`,
          type: 'success'
        });
      } else {
        throw new Error(response.error || '领取失败');
      }
    } catch (error) {
      console.error('❌ 训练奖励领取失败:', error);
      setOperationStatus(prev => ({ ...prev, [account.id]: 'error' }));
      toast?.({
        title: '领取失败',
        description: `${account.name} 训练奖励领取失败`,
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

  // 处理普通训练
  const handleTraining = async (account: TrainingAccount) => {
    try {
      setOperatingAccounts(prev => new Set(prev).add(account.id));
      setOperationStatus(prev => ({ ...prev, [account.id]: 'operating' }));

      console.log('🏃 开始普通训练:', account.name);

      // 设置账号信息到gaeaApiService缓存
      gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

      const response = await gaeaApiService.request(account.id, {
        url: '/api/plugin/gaea/training/training',
        method: 'POST',
        body: {
          accountId: account.id,
          accountName: account.name,
          token: account.token,
          proxy: account.proxy,
          trainingContent: account.training_content
        }
      });

      if (response.success) {
        setOperationStatus(prev => ({ ...prev, [account.id]: 'success' }));
        
        // 更新内存状态
        setAccounts(prev => prev.map(acc => 
          acc.id === account.id 
            ? { ...acc, training_status: '训练成功' }
            : acc
        ));
        
        // 更新数据库状态
        await updateAccountStatus(account.id, { training_status: '训练成功' });
        
        toast?.({
          title: '训练成功',
          description: `${account.name} 普通训练完成`,
          type: 'success'
        });
      } else {
        throw new Error(response.error || '训练失败');
      }
    } catch (error) {
      console.error('❌ 普通训练失败:', error);
      setOperationStatus(prev => ({ ...prev, [account.id]: 'error' }));
      
      // 更新内存状态
      setAccounts(prev => prev.map(acc => 
        acc.id === account.id 
          ? { ...acc, training_status: '训练失败' }
          : acc
      ));
      
      // 更新数据库状态
      await updateAccountStatus(account.id, { training_status: '训练失败' });
      
      toast?.({
        title: '训练失败',
        description: `${account.name} 普通训练失败`,
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

  // 批量普通训练
  const handleBatchNormalTraining = async () => {
    if (selectedAccounts.size === 0) {
      toast?.({
        title: '提示',
        description: '请先选择要操作的账号',
        type: 'warning'
      });
      return;
    }

    const selectedAccountList = accounts.filter(acc => selectedAccounts.has(acc.id));
    console.log('🏃 开始批量普通训练:', selectedAccountList.length, '个账号');

    let successCount = 0;
    let failedCount = 0;

    for (const account of selectedAccountList) {
      try {
        console.log('🏃 处理账号:', account.name);
        
        // 设置账号信息到gaeaApiService缓存
        gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

        const response = await gaeaApiService.request(account.id, {
          url: '/api/plugin/gaea/training/training',
          method: 'POST',
          body: {
            accountId: account.id,
            accountName: account.name,
            token: account.token,
            proxy: account.proxy,
            trainingContent: account.training_content
          }
        });

        if (response.success) {
          // 更新内存状态
          setAccounts(prev => prev.map(acc => 
            acc.id === account.id 
              ? { ...acc, training_status: '训练成功' }
              : acc
          ));
          
          // 更新数据库状态
          await updateAccountStatus(account.id, { training_status: '训练成功' });
          
          successCount++;
          console.log('✅ 账号', account.name, '普通训练成功');
        } else {
          // 更新内存状态
          setAccounts(prev => prev.map(acc => 
            acc.id === account.id 
              ? { ...acc, training_status: '训练失败' }
              : acc
          ));
          
          // 更新数据库状态
          await updateAccountStatus(account.id, { training_status: '训练失败' });
          
          failedCount++;
          console.log('❌ 账号', account.name, '普通训练失败:', response.error);
        }
      } catch (error) {
        // 更新内存状态
        setAccounts(prev => prev.map(acc => 
          acc.id === account.id 
            ? { ...acc, training_status: '训练失败' }
            : acc
        ));
        
        // 更新数据库状态
        await updateAccountStatus(account.id, { training_status: '训练失败' });
        
        failedCount++;
        console.error('❌ 账号', account.name, '普通训练错误:', error);
      }
    }

    // 显示结果
    toast?.({
      title: '批量普通训练完成',
      description: `成功 ${successCount} 个，失败 ${failedCount} 个`,
      type: failedCount > 0 ? 'warning' : 'success'
    });

    // 清空选择
    setSelectedAccounts(new Set());
  };

  // 批量高级训练
  const handleBatchAdvancedTraining = async () => {
    if (selectedAccounts.size === 0) {
      toast?.({
        title: '提示',
        description: '请先选择要操作的账号',
        type: 'warning'
      });
      return;
    }

    const selectedAccountList = accounts.filter(acc => selectedAccounts.has(acc.id));
    
    // 检查前置条件：只有完成普通训练的账号才能进行高级训练
    const eligibleAccounts = selectedAccountList.filter(acc => acc.training_status === '训练成功');
    const ineligibleAccounts = selectedAccountList.filter(acc => acc.training_status !== '训练成功');
    
    if (ineligibleAccounts.length > 0) {
      toast?.({
        title: '前置条件检查',
        description: `${ineligibleAccounts.length} 个账号未完成普通训练，无法进行高级训练。只有完成普通训练的账号才能进行高级训练。`,
        type: 'warning'
      });
      
      if (eligibleAccounts.length === 0) {
        return; // 没有符合条件的账号，直接返回
      }
    }
    
    console.log('⚡ 开始批量高级训练:', eligibleAccounts.length, '个符合条件的账号');

    let successCount = 0;
    let failedCount = 0;

    for (const account of eligibleAccounts) {
      try {
        console.log('⚡ 处理账号:', account.name);
        
        // 设置账号信息到gaeaApiService缓存
        gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

        const response = await gaeaApiService.request(account.id, {
          url: '/api/plugin/gaea/training/deep-training',
          method: 'POST',
          body: {
            accountId: account.id,
            accountName: account.name,
            token: account.token,
            proxy: account.proxy,
            trainingContent: account.training_content
          }
        });

        if (response.success) {
          // 更新内存状态
          setAccounts(prev => prev.map(acc => 
            acc.id === account.id 
              ? { ...acc, advanced_training_status: '训练成功' }
              : acc
          ));
          
          // 更新数据库状态
          await updateAccountStatus(account.id, { advanced_training_status: '训练成功' });
          
          successCount++;
          console.log('✅ 账号', account.name, '高级训练成功');
        } else {
          // 更新内存状态
          setAccounts(prev => prev.map(acc => 
            acc.id === account.id 
              ? { ...acc, advanced_training_status: '训练失败' }
              : acc
          ));
          
          // 更新数据库状态
          await updateAccountStatus(account.id, { advanced_training_status: '训练失败' });
          
          failedCount++;
          console.log('❌ 账号', account.name, '高级训练失败:', response.error);
        }
      } catch (error) {
        // 更新内存状态
        setAccounts(prev => prev.map(acc => 
          acc.id === account.id 
            ? { ...acc, advanced_training_status: '训练失败' }
            : acc
        ));
        
        // 更新数据库状态
        await updateAccountStatus(account.id, { advanced_training_status: '训练失败' });
        
        failedCount++;
        console.error('❌ 账号', account.name, '高级训练错误:', error);
      }
    }

    // 显示结果
    toast?.({
      title: '批量高级训练完成',
      description: `成功 ${successCount} 个，失败 ${failedCount} 个`,
      type: failedCount > 0 ? 'warning' : 'success'
    });

    // 清空选择
    setSelectedAccounts(new Set());
  };

  // 批量领取每日奖励
  const handleBatchDailyReward = async () => {
    if (selectedAccounts.size === 0) {
      toast?.({
        title: '提示',
        description: '请先选择要操作的账号',
        type: 'warning'
      });
      return;
    }

    const selectedAccountList = accounts.filter(acc => selectedAccounts.has(acc.id));
    console.log('🎁 开始批量领取每日奖励:', selectedAccountList.length, '个账号');

    let successCount = 0;
    let failedCount = 0;

    for (const account of selectedAccountList) {
      try {
        console.log('🎁 处理账号:', account.name);
        
        // 设置账号信息到gaeaApiService缓存
        gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

        const requestBody = {
          accountId: account.id,
          accountName: account.name,
          token: account.token,
          proxy: account.proxy
        };
        
        // 使用gaeaApiService调用外部Gaea API
        const response = await gaeaApiService.request(account.id, {
          url: 'https://api.aigaea.net/api/reward/daily-list',
          method: 'GET',
          headers: {
            'accept': '*/*',
            'accept-language': 'en-US',
            'authorization': `Bearer ${account.token}`,
            'content-type': 'application/json',
            'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'Referer': 'https://app.aigaea.net/',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
          },
          proxy: account.proxy
        });

        if (response.success) {
          // 处理每日奖励列表
          let rewards = [];
          if (response.data && response.data.data) {
            const dataObj = response.data.data;
            if (dataObj.list && Array.isArray(dataObj.list)) {
              rewards = dataObj.list;
            } else if (Array.isArray(dataObj)) {
              rewards = dataObj;
            }
          } else if (Array.isArray(response.data)) {
            rewards = response.data;
          }
          
          const unrewardedRewards = rewards.filter((reward: any) => !reward.is_rewarded);
          
          if (unrewardedRewards.length > 0) {
            const rewardToClaim = unrewardedRewards[0];
            
            const claimResponse = await gaeaApiService.request(account.id, {
              url: '/api/plugin/gaea/reward/daily-complete',
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'accept-language': 'en-US',
                'authorization': `Bearer ${account.token}`,
                'content-type': 'application/json'
              },
              body: {
                accountId: account.id,
                token: account.token,
                proxy: account.proxy,
                id: rewardToClaim.daily
              }
            });

            if (claimResponse.success) {
              // 更新内存状态
              setAccounts(prev => prev.map(acc => 
                acc.id === account.id 
                  ? { ...acc, daily_reward_status: '已领取' }
                  : acc
              ));
              
              // 更新数据库状态
              await updateAccountStatus(account.id, { daily_reward_status: '已领取' });
              
              successCount++;
              console.log('✅ 账号', account.name, '每日奖励领取成功');
            } else {
              failedCount++;
              console.log('❌ 账号', account.name, '每日奖励领取失败:', claimResponse.error);
            }
          } else {
            // 没有可领取的奖励，标记为已领取
            setAccounts(prev => prev.map(acc => 
              acc.id === account.id 
                ? { ...acc, daily_reward_status: '已领取' }
                : acc
            ));
            
            await updateAccountStatus(account.id, { daily_reward_status: '已领取' });
            
            successCount++;
            console.log('✅ 账号', account.name, '没有可领取的每日奖励');
          }
        } else {
          failedCount++;
          console.log('❌ 账号', account.name, '获取每日奖励列表失败:', response.error);
        }
      } catch (error) {
        failedCount++;
        console.error('❌ 账号', account.name, '每日奖励领取错误:', error);
      }
    }

    // 显示结果
    toast?.({
      title: '批量领取每日奖励完成',
      description: `成功 ${successCount} 个，失败 ${failedCount} 个`,
      type: failedCount > 0 ? 'warning' : 'success'
    });

    // 清空选择
    setSelectedAccounts(new Set());
  };

  // 手动重置状态
  const handleManualReset = async () => {
    try {
      console.log('🔄 手动重置训练状态...');
      
      // 更新本地存储的重置日期为今天，避免定期检查重复重置
      const now = new Date();
      const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const today = utcNow.toISOString().split('T')[0];
      localStorage.setItem('training_last_reset_date', today);
      localStorage.setItem('training_last_reset_time', Date.now().toString());
      
      // 重置所有账号的训练状态（内存）
      setAccounts(prevAccounts => 
        prevAccounts.map(account => ({
          ...account,
          training_status: '未训练',
          daily_reward_status: '未领取',
          training_reward_status: '未领取',
          advanced_training_status: '未训练'
        }))
      );
      
      // 同步重置状态到数据库
      try {
        const { getDatabaseService } = await import('@/lib/database');
        const dbService = getDatabaseService('gaea_accounts');
        
        // 获取所有账号数据
        const result = await dbService.getAllDocs({ include_docs: true });
        
        for (const row of result.rows) {
          if (row.doc) {
            const updatedDoc = {
              ...row.doc,
              training_status: '未训练',
              daily_reward_status: '未领取',
              training_reward_status: '未领取',
              advanced_training_status: '未训练',
              updated_at: new Date().toISOString()
            };
            
            await dbService.put(updatedDoc);
            console.log('💾 重置账号状态到数据库:', row.doc.name);
          }
        }
        
        console.log('✅ 所有账号状态已重置到数据库');
        
        toast?.({
          title: '重置成功',
          description: '所有训练状态已重置',
          type: 'success'
        });
      } catch (error) {
        console.error('❌ 重置状态到数据库失败:', error);
        toast?.({
          title: '重置失败',
          description: '数据库重置失败',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('❌ 手动重置失败:', error);
      toast?.({
        title: '重置失败',
        description: '重置过程中发生错误',
        type: 'error'
      });
    }
  };

  // 批量领取训练奖励
  const handleBatchTrainingReward = async () => {
    if (selectedAccounts.size === 0) {
      toast?.({
        title: '提示',
        description: '请先选择要操作的账号',
        type: 'warning'
      });
      return;
    }

    const selectedAccountList = accounts.filter(acc => selectedAccounts.has(acc.id));
    
    // 检查前置条件：只有完成深度训练的账号才能领取训练奖励
    const eligibleAccounts = selectedAccountList.filter(acc => acc.advanced_training_status === '训练成功');
    const ineligibleAccounts = selectedAccountList.filter(acc => acc.advanced_training_status !== '训练成功');
    
    if (ineligibleAccounts.length > 0) {
      toast?.({
        title: '前置条件检查',
        description: `${ineligibleAccounts.length} 个账号未完成深度训练，无法领取训练奖励。只有完成深度训练的账号才能领取训练奖励。`,
        type: 'warning'
      });
      
      if (eligibleAccounts.length === 0) {
        return; // 没有符合条件的账号，直接返回
      }
    }
    
    console.log('🏆 开始批量领取训练奖励:', eligibleAccounts.length, '个符合条件的账号');

    let successCount = 0;
    let failedCount = 0;

    for (const account of eligibleAccounts) {
      try {
        console.log('🏆 处理账号:', account.name);
        
        // 设置账号信息到gaeaApiService缓存
        gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

        const response = await gaeaApiService.request(account.id, {
          url: '/api/plugin/gaea/training/claim',
          method: 'POST',
          body: {
            accountId: account.id,
            accountName: account.name,
            token: account.token,
            proxy: account.proxy
          }
        });

        if (response.success) {
          // 更新内存状态
          setAccounts(prev => prev.map(acc => 
            acc.id === account.id 
              ? { ...acc, training_reward_status: '已领取' }
              : acc
          ));
          
          // 更新数据库状态
          await updateAccountStatus(account.id, { training_reward_status: '已领取' });
          
          successCount++;
          console.log('✅ 账号', account.name, '训练奖励领取成功');
        } else {
          failedCount++;
          console.log('❌ 账号', account.name, '训练奖励领取失败:', response.error);
        }
      } catch (error) {
        failedCount++;
        console.error('❌ 账号', account.name, '训练奖励领取错误:', error);
      }
    }

    // 显示结果
    toast?.({
      title: '批量领取训练奖励完成',
      description: `成功 ${successCount} 个，失败 ${failedCount} 个`,
      type: failedCount > 0 ? 'warning' : 'success'
    });

    // 清空选择
    setSelectedAccounts(new Set());
  };

  // 处理深度训练
  const handleDeepTraining = async (account: TrainingAccount) => {
    try {
      setOperatingAccounts(prev => new Set(prev).add(account.id));
      setOperationStatus(prev => ({ ...prev, [account.id]: 'operating' }));

      console.log('⚡ 开始深度训练:', account.name);

      // 设置账号信息到gaeaApiService缓存
      gaeaApiService.setAccountInfo(account.id, account.username, account.password || '', account.proxy);

      const response = await gaeaApiService.request(account.id, {
        url: '/api/plugin/gaea/training/deep-training',
        method: 'POST',
        body: {
          accountId: account.id,
          accountName: account.name,
          token: account.token,
          proxy: account.proxy,
          trainingContent: account.training_content
        }
      });

      if (response.success) {
        setOperationStatus(prev => ({ ...prev, [account.id]: 'success' }));
        
        // 更新内存状态
        setAccounts(prev => prev.map(acc => 
          acc.id === account.id 
            ? { ...acc, advanced_training_status: '训练成功' }
            : acc
        ));
        
        // 更新数据库状态
        await updateAccountStatus(account.id, { advanced_training_status: '训练成功' });
        
        toast?.({
          title: '深度训练成功',
          description: `${account.name} 深度训练已提交到队列`,
          type: 'success'
        });
      } else {
        throw new Error(response.error || '深度训练失败');
      }
    } catch (error) {
      console.error('❌ 深度训练失败:', error);
      setOperationStatus(prev => ({ ...prev, [account.id]: 'error' }));
      
      // 更新内存状态
      setAccounts(prev => prev.map(acc => 
        acc.id === account.id 
          ? { ...acc, advanced_training_status: '训练失败' }
          : acc
      ));
      
      // 更新数据库状态
      await updateAccountStatus(account.id, { advanced_training_status: '训练失败' });
      
      toast?.({
        title: '深度训练失败',
        description: `${account.name} 深度训练失败`,
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

  // 训练状态处理函数
  const getTrainingStatusColor = (status: string) => {
    switch (status) {
      case '未训练': return 'bg-gray-100 text-gray-800';
      case '训练中': return 'bg-blue-100 text-blue-800';
      case '训练成功': return 'bg-green-100 text-green-800';
      case '训练失败': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrainingStatusIcon = (status: string) => {
    switch (status) {
      case '未训练': return <Pause className="w-3 h-3" />;
      case '训练中': return <Loader2 className="w-3 h-3 animate-spin" />;
      case '训练成功': return <CheckCircle className="w-3 h-3" />;
      case '训练失败': return <XCircle className="w-3 h-3" />;
      default: return <Pause className="w-3 h-3" />;
    }
  };

  // 奖励状态处理函数
  const getRewardStatusColor = (status: string) => {
    switch (status) {
      case '已领取': return 'bg-green-100 text-green-800';
      case '未领取': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRewardStatusIcon = (status: string) => {
    switch (status) {
      case '已领取': return <CheckCircle className="w-3 h-3" />;
      case '未领取': return <Gift className="w-3 h-3" />;
      default: return <Gift className="w-3 h-3" />;
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
              <Brain className="w-5 h-5" />
              <span>训练管理</span>
            </CardTitle>
            <CardDescription className="mt-3" style={{ marginTop: '0.5rem' }}>
              共 {accounts.length} 个账号的训练信息
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRefresh || loadAccounts}
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
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center space-x-1"
              onClick={handleBatchNormalTraining}
              disabled={selectedAccounts.size === 0}
            >
              <Activity className="w-4 h-4" />
              <span>批量普通训练</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center space-x-1"
              onClick={handleBatchAdvancedTraining}
              disabled={selectedAccounts.size === 0}
            >
              <Zap className="w-4 h-4" />
              <span>批量高级训练</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center space-x-1"
              onClick={handleBatchDailyReward}
              disabled={selectedAccounts.size === 0}
            >
              <Gift className="w-4 h-4" />
              <span>批量领取每日奖励</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center space-x-1"
              onClick={handleBatchTrainingReward}
              disabled={selectedAccounts.size === 0}
            >
              <Award className="w-4 h-4" />
              <span>批量领取训练奖励</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center space-x-1 text-orange-600 hover:text-orange-700"
              onClick={handleManualReset}
            >
              <RefreshCw className="w-4 h-4" />
              <span>手动重置状态</span>
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
                <TableHead className="w-32">
                  <button
                    onClick={() => handleSort('training_content')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>训练内容</span>
                    {sortField === 'training_content' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-32">
                  <button
                    onClick={() => handleSort('training_status')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>训练状态</span>
                    {sortField === 'training_status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-32">
                  <button
                    onClick={() => handleSort('advanced_training_status')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>高级训练状态</span>
                    {sortField === 'advanced_training_status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-24">
                  <button
                    onClick={() => handleSort('daily_reward_status')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>每日奖励</span>
                    {sortField === 'daily_reward_status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-24">
                  <button
                    onClick={() => handleSort('training_reward_status')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>训练奖励</span>
                    {sortField === 'training_reward_status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-20 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                      加载中...
                    </div>
                  </TableCell>
                </TableRow>
              ) : !hasAccounts ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
                      <Select defaultValue={account.training_content}>
                        <SelectTrigger className="w-24 h-8 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Positive">Positive</SelectItem>
                          <SelectItem value="Neutral">Neutral</SelectItem>
                          <SelectItem value="Negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTrainingStatusIcon(account.training_status)}
                        <Badge className={`text-xs ${getTrainingStatusColor(account.training_status)}`}>
                          {account.training_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTrainingStatusIcon(account.advanced_training_status)}
                        <Badge className={`text-xs ${getTrainingStatusColor(account.advanced_training_status)}`}>
                          {account.advanced_training_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getRewardStatusIcon(account.daily_reward_status)}
                        <Badge className={`text-xs ${getRewardStatusColor(account.daily_reward_status)}`}>
                          {account.daily_reward_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getRewardStatusIcon(account.training_reward_status)}
                        <Badge className={`text-xs ${getRewardStatusColor(account.training_reward_status)}`}>
                          {account.training_reward_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-yellow-600 hover:text-yellow-700"
                                onClick={() => handleDailyReward(account)}
                                disabled={operatingAccounts.has(account.id) || account.daily_reward_status === '已领取'}
                              >
                                {operatingAccounts.has(account.id) && operationStatus[account.id] === 'operating' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Gift className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>领取每日奖励</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleTrainingReward(account)}
                                disabled={operatingAccounts.has(account.id) || account.training_reward_status === '已领取'}
                              >
                                {operatingAccounts.has(account.id) && operationStatus[account.id] === 'operating' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Award className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>领取训练奖励</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleTraining(account)}
                                disabled={operatingAccounts.has(account.id) || account.training_status === '训练成功'}
                              >
                                {operatingAccounts.has(account.id) && operationStatus[account.id] === 'operating' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Activity className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>开始普通训练</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-purple-600 hover:text-purple-700"
                                onClick={() => handleDeepTraining(account)}
                                disabled={operatingAccounts.has(account.id) || account.advanced_training_status === '训练成功'}
                              >
                                {operatingAccounts.has(account.id) && operationStatus[account.id] === 'operating' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Zap className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>开始深度训练</p>
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
