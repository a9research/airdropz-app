'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { BrowserDownloadModal } from '@/components/BrowserDownloadModal';
import { useBrowserCheck } from '@/hooks/useBrowserCheck';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users,
  Ticket,
  Settings,
  Brain,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToastSonner } from '@/hooks/use-toast-sonner';
import { ImportExportService } from '../../frontend/services/importExportService';
import { GaeaLoginService, LoginCredentials, LoginResult } from '../../frontend/services/gaeaLoginService';
import { CSVAccountData } from '../../shared/types/import-export';
import { Account, Group, ImportResult } from '../components/types';
import { AccountsTab } from '../components/AccountsTab';
import { TicketsTab, DecisionsTab, TrainingsTab, MiningTab } from '../components/TabsContent';
import { DeepTrainingCountdown, DecisionCountdown } from '../components/CountdownTimer';

export default function GaeaPluginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToastSonner();
  
  // 浏览器检查
  const {
    isChecking,
    isInstalled,
    showDownloadModal,
    error: browserError,
    handleDownloadComplete,
    handleDownloadClose
  } = useBrowserCheck();

  // 导入导出服务
  const importExportService = new ImportExportService();
  
  // 状态管理
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<Account>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Account>>({});
  const [newGroup, setNewGroup] = useState<Partial<Group>>({});
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showEditGroups, setShowEditGroups] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<Group>>({});
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetGroup, setTargetGroup] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 登录相关状态
  const [loggingInAccounts, setLoggingInAccounts] = useState<Set<string>>(new Set());
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [selectedAccountForLogin, setSelectedAccountForLogin] = useState<Account | null>(null);
  
  // 排序状态
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 认证检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 加载数据
  useEffect(() => {
    if (user) {
      loadAccounts();
      loadGroups();
    }
  }, [user, currentPage, pageSize, searchTerm, selectedGroup, sortField, sortDirection]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        console.log('服务器端环境，跳过数据库操作');
        setAccounts([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      // 动态导入数据库服务
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取所有账号数据
      const result = await dbService.getAllDocs({
        include_docs: true
      });

      // 转换数据格式
      const rows = result.rows || [];
      let accounts = rows.map((row: any) => {
        const doc = row.doc;
        return {
          id: doc._id,
          name: doc.name || '',
          browser_id: doc.browserId || '',
          token: doc.token || '',
          proxy: doc.proxy || '',
          uid: doc.uid || '',
          username: doc.username || '',
          password: doc.password || '',
          group_name: doc.group || 'Default',
          group_color: '#3B82F6',
          group_description: '',
          created_at: doc.createdAt || new Date().toISOString(),
          updated_at: doc.updatedAt || new Date().toISOString()
        };
      });

      // 应用搜索过滤
      if (searchTerm) {
        accounts = accounts.filter((account: any) => 
          account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.uid?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // 应用分组过滤
      if (selectedGroup && selectedGroup !== 'all') {
        accounts = accounts.filter((account: any) => 
          (account.group || account.group_name || 'Default') === selectedGroup
        );
      }

      // 应用排序
      if (sortField) {
        accounts = accounts.sort((a: any, b: any) => {
          let aValue = a[sortField];
          let bValue = b[sortField];
          
          // 处理字符串比较
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
          
          // 处理日期比较
          if (sortField === 'created_at' || sortField === 'updated_at') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }
          
          if (aValue < bValue) {
            return sortDirection === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortDirection === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      // 应用分页
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedAccounts = accounts.slice(startIndex, endIndex);

      setAccounts(paginatedAccounts);
      setTotal(accounts.length);
      setTotalPages(Math.ceil(accounts.length / pageSize));
      
    } catch (error) {
      console.error('加载账号失败:', error);
      toast({ title: '加载失败', description: '获取账号数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      // 从本地存储获取分组数据
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_groups');
      
      const result = await dbService.getAllDocs();
      console.log('分组查询结果:', result);
      
      // 添加默认分组
      const defaultGroup = {
        _id: 'default',
        name: 'Default',
        description: '默认分组',
        color: '#3B82F6',
        account_count: 0,
        created_at: new Date().toISOString()
      };
      
      // 检查返回的数据结构
      const data = (result as any).data || (result as any).rows || [];
      console.log('提取的数据:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        // 提取文档内容
        const customGroups = data
          .map((doc: any) => doc.doc || doc)
          .filter(Boolean)
          .map((group: any) => ({
            _id: group._id,
            name: group.name,
            description: group.description || '',
            color: group.color || '#3B82F6',
            account_count: group.account_count || 0,
            created_at: group.created_at || group.createdAt || new Date().toISOString()
          }));
        
        const allGroups = [defaultGroup, ...customGroups];
        console.log('所有分组:', allGroups);
        setGroups(allGroups);
      } else {
        // 如果数据库为空，只显示默认分组
        console.log('数据库为空，只显示默认分组');
        setGroups([defaultGroup]);
      }
    } catch (error) {
      console.error('加载分组失败:', error);
      // 出错时显示默认分组
      const defaultGroup = {
        _id: 'default',
        name: 'Default',
        description: '默认分组',
        color: '#3B82F6',
        account_count: 0,
        created_at: new Date().toISOString()
      };
      setGroups([defaultGroup]);
    }
  };

  // 事件处理函数
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleGroupFilter = (groupName: string) => {
    if (groupName === 'add-group') {
      setShowAddGroup(true);
      return;
    }
    if (groupName === 'edit-groups') {
      setShowEditGroups(true);
      return;
    }
    setSelectedGroup(groupName === 'all' ? '' : groupName);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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

  // 刷新账号数据
  const handleRefreshAccounts = useCallback(async () => {
    setLoading(true);
    try {
      await loadAccounts();
      await loadGroups();
    } catch (error) {
      console.error('刷新账号数据失败:', error);
      toast({ title: '刷新失败', description: '刷新账号数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [loadAccounts, loadGroups, toast]);

  // 通用登录函数，供TicketsTab使用
  const handleLoginAccount = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      // 从账号列表中找到对应的账号
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) {
        console.error('❌ 未找到账号:', accountId);
        return false;
      }

      console.log('🔑 开始登录账号:', account.name);
      const loginService = new GaeaLoginService();
      
      const credentials: LoginCredentials = {
        username: account.username,
        password: account.password,
        proxy: account.proxy
      };
      
      const result = await loginService.login(credentials);
      
      if (result.success && result.gaeaToken && result.browserId) {
        const updateSuccess = await loginService.updateAccountTokens(
          account.id, 
          result.gaeaToken, 
          result.browserId
        );
        
        if (updateSuccess) {
          console.log('✅ 账号登录成功:', account.name);
          // 更新本地账号状态
          setAccounts(prev => prev.map(acc => {
            if (acc.id === accountId) {
              return {
                ...acc,
                token: result.gaeaToken || acc.token,
                browser_id: result.browserId || acc.browser_id,
                updated_at: new Date().toISOString()
              };
            }
            return acc;
          }));
          return true;
        }
      }
      
      console.error('❌ 账号登录失败:', account.name, result.error);
      return false;
    } catch (error) {
      console.error('❌ 登录过程中发生错误:', error);
      return false;
    }
  }, [accounts]);

  // 刷新其他标签页数据（暂时使用模拟数据）
  const handleRefreshTickets = useCallback(async () => {
    console.log('刷新Tickets数据');
    toast({ title: '刷新成功', description: 'Tickets数据已刷新', type: 'success' });
  }, [toast]);

  const handleRefreshDecisions = useCallback(async () => {
    console.log('刷新决策数据');
    toast({ title: '刷新成功', description: '决策数据已刷新', type: 'success' });
  }, [toast]);

  const handleRefreshTrainings = useCallback(async () => {
    console.log('刷新训练数据');
    toast({ title: '刷新成功', description: '训练数据已刷新', type: 'success' });
  }, [toast]);

  const handleRefreshMining = useCallback(async () => {
    console.log('刷新挖矿数据');
    toast({ title: '刷新成功', description: '挖矿数据已刷新', type: 'success' });
  }, [toast]);

  // Tickets相关功能
  const handleSupplementTickets = useCallback(async () => {
    console.log('补充Tickets');
    toast({ title: '开始补充', description: '正在为账号补充缺失的Tickets...', type: 'info' });
  }, [toast]);

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const handleStartEdit = (account: Account) => {
    setEditingRowId(account.id);
    setEditingData({ ...account });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  const handleSaveEdit = async () => {
    if (!editingData || !editingRowId) return;
    
    try {
      if (typeof window === 'undefined') {
        toast({ title: '失败', description: '服务器端环境无法操作数据库', type: 'error' });
        return;
      }

      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      const existingDoc = await dbService.get(editingRowId);
      
      const updatedDoc = {
        ...existingDoc,
        name: editingData.name,
        browserId: editingData.browser_id,
        token: editingData.token,
        proxy: editingData.proxy,
        uid: editingData.uid,
        username: editingData.username,
        password: editingData.password,
        group: editingData.group_name,
        updatedAt: new Date().toISOString()
      };
      
      await dbService.put(updatedDoc);
      
      toast({ title: '成功', description: '账号更新成功', type: 'success' });
      setEditingRowId(null);
      setEditingData({});
      loadAccounts();
      
    } catch (error) {
      console.error('更新账号失败:', error);
      toast({ title: '更新失败', description: '更新账号失败', type: 'error' });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('确定要删除这个账号吗？')) return;
    
    try {
      if (typeof window === 'undefined') {
        toast({ title: '失败', description: '服务器端环境无法操作数据库', type: 'error' });
        return;
      }

      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      const existingDoc = await dbService.get(accountId.toString());
      await dbService.remove(existingDoc);
      
      toast({ title: '成功', description: '账号删除成功', type: 'success' });
      loadAccounts();
      
    } catch (error) {
      console.error('删除账号失败:', error);
      toast({ title: '删除失败', description: '删除账号失败', type: 'error' });
    }
  };

  const handleLogin = async (account: Account) => {
    if (!account.username || !account.password) {
      toast({ title: '登录失败', description: '账号缺少用户名或密码', type: 'error' });
      return;
    }

    setLoggingInAccounts(prev => new Set(prev).add(account.id));
    setLoginResult(null);
    
    try {
      const loginService = new GaeaLoginService();
      
      const credentials: LoginCredentials = {
        username: account.username,
        password: account.password,
        proxy: account.proxy
      };
      
      console.log('开始登录账号:', account.name);
      const result = await loginService.login(credentials);
      
      if (result.success && result.gaeaToken) {
        const updateSuccess = await loginService.updateAccountTokens(
          account.id, 
          result.gaeaToken, 
          result.browserId || null
        );
        
        if (updateSuccess) {
          toast({ 
            title: '登录成功', 
            description: `账号 ${account.name} 登录成功，token已更新`, 
            type: 'success' 
          });
          await loadAccounts();
        } else {
          toast({ 
            title: '部分成功', 
            description: '登录成功但更新数据库失败', 
            type: 'warning' 
          });
        }
      } else {
        toast({ 
          title: '登录失败', 
          description: result.error || '未知错误', 
          type: 'error' 
        });
      }
      
      setLoginResult(result);
    } catch (error) {
      console.error('登录过程出错:', error);
      toast({ 
        title: '登录失败', 
        description: error instanceof Error ? error.message : '未知错误', 
        type: 'error' 
      });
    } finally {
      setLoggingInAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(account.id);
        return newSet;
      });
    }
  };

  const handleAddAccount = async () => {
    try {
      if (typeof window === 'undefined') {
        toast({ title: '失败', description: '服务器端环境无法操作数据库', type: 'error' });
        return;
      }

      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      const accountDoc = {
        _id: `account_${Date.now()}`,
        name: newAccount.name || '新账号',
        browserId: newAccount.browser_id || '',
        token: newAccount.token || '',
        proxy: newAccount.proxy || '',
        uid: newAccount.uid || '',
        username: newAccount.username || '',
        password: newAccount.password || '',
        group: newAccount.group_name || 'Default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;
      
      await dbService.put(accountDoc);
      
        toast({ title: '成功', description: '账号创建成功', type: 'success' });
        setNewAccount({});
        setIsAdding(false);
        loadAccounts();
      
    } catch (error) {
      console.error('创建账号失败:', error);
      toast({ title: '创建失败', description: '创建账号失败', type: 'error' });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = await importExportService.exportToCSV();
      if (csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `gaea_accounts_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast({ title: '导出失败', description: error instanceof Error ? error.message : '未知错误', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: '错误', description: '请选择CSV文件', type: 'error' });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await handleImport(file);
      
      // 使用toast显示导入结果
      if (result.success > 0 && result.failed === 0) {
        toast({ title: '导入成功', description: `成功导入 ${result.success} 个账号`, type: 'success' });
        loadAccounts();
      } else if (result.success > 0 && result.failed > 0) {
        toast({ title: '部分成功', description: `成功: ${result.success} 个，失败: ${result.failed} 个`, type: 'warning' });
        loadAccounts();
      } else if (result.failed > 0) {
        toast({ title: '导入失败', description: `${result.failed} 个账号导入失败`, type: 'error' });
      }
    } catch (error) {
      console.error('导入失败:', error);
      toast({ title: '导入失败', description: error instanceof Error ? error.message : '未知错误', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async (file: File) => {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          const csvData = parseCSV(csvText);
          const result = await importExportService.importFromCSV(csvData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'utf-8');
    });
  };

  const parseCSV = (csvText: string): CSVAccountData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: CSVAccountData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row as CSVAccountData);
    }

    return data;
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      ['Name', 'Browser_ID', 'Token', 'Proxy', 'UID', 'Username', 'Password', 'Group'],
      ['示例账号1', 'browser1', 'token1', 'proxy1', 'uid1', 'user1', 'pass1', 'Default'],
      ['示例账号2', 'browser2', 'token2', 'proxy2', 'uid2', 'user2', 'pass2', 'Default']
    ];

    const csvContent = templateData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'gaea_accounts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleMoveToGroup = async (targetGroup: string) => {
    const selectedIds = Array.from(selectedAccounts || []);
    if (selectedIds.length === 0) {
      toast({ title: '提示', description: '请先选择要移动的账号', type: 'warning' });
      return;
    }

    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      for (const accountId of selectedIds) {
        try {
          const account = await dbService.get(accountId);
          const updatedAccount = {
            ...account,
            group: targetGroup,
            updatedAt: new Date().toISOString()
          };
          await dbService.put(updatedAccount);
        } catch (error) {
          console.error(`更新账号 ${accountId} 失败:`, error);
        }
      }

      toast({ 
        title: '成功', 
        description: `已将 ${selectedIds.length} 个账号移动到 ${targetGroup} 分组`, 
        type: 'success' 
      });
      
        setSelectedAccounts(new Set());
        loadAccounts();
    } catch (error) {
      console.error('移动账号失败:', error);
      toast({ title: '操作失败', description: '移动账号失败', type: 'error' });
    }
  };

  const handleAddGroup = async () => {
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_groups');
      
      const result = await dbService.getAllDocs();
      const existingGroups = (result as any).data || (result as any).rows || [];
      
      const isDuplicate = existingGroups.some((doc: any) => {
        const group = doc.doc || doc;
        return group && group.name === newGroup.name;
      }) || newGroup.name === 'Default';
      
      if (isDuplicate) {
        toast({ title: '创建失败', description: '分组名称已存在，请使用其他名称', type: 'error' });
        return;
      }
      
      const groupDoc = {
        _id: `group_${Date.now()}`,
        name: newGroup.name,
        description: newGroup.description || '',
        color: newGroup.color || '#3B82F6',
        account_count: 0,
        created_at: new Date().toISOString()
      };
      
      await dbService.put(groupDoc as any);
      
        toast({ title: '成功', description: '分组创建成功', type: 'success' });
        setNewGroup({});
        setShowAddGroup(false);
        loadGroups();
      
    } catch (error) {
      console.error('创建分组失败:', error);
      toast({ title: '创建失败', description: '保存分组失败', type: 'error' });
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
  };

  const handleUpdateGroup = async () => {
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_groups');
      
      const result = await dbService.getAllDocs();
      const existingGroups = (result as any).data || (result as any).rows || [];
      
      const isDuplicate = existingGroups.some((doc: any) => {
        const group = doc.doc || doc;
        return group && group.name === editingGroup.name && group._id !== (editingGroup as any)._id;
      }) || editingGroup.name === 'Default';
      
      if (isDuplicate) {
        toast({ title: '更新失败', description: '分组名称已存在，请使用其他名称', type: 'error' });
        return;
      }
      
      const updatedGroup = {
        ...editingGroup,
        updated_at: new Date().toISOString()
      };
      
      await dbService.put(updatedGroup as any);
      
      toast({ title: '成功', description: '分组更新成功', type: 'success' });
      setEditingGroup({});
      loadGroups();
    } catch (error) {
      console.error('更新分组失败:', error);
      toast({ title: '更新失败', description: '保存分组失败', type: 'error' });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (groupId === 'default') {
      toast({ title: '删除失败', description: '默认分组不能删除', type: 'error' });
      return;
    }
    
    const group = groups.find(g => (g as any)._id === groupId);
    const groupName = group?.name || '未知分组';
    
    if (!confirm(`确定要删除分组 "${groupName}" 吗？\n\n注意：删除后该分组下的所有账号将移动到默认分组。`)) {
      return;
    }
    
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_groups');
      
      const groupDoc = await dbService.get(groupId);
      await dbService.remove(groupDoc);
      
      const accountsDbService = getDatabaseService('gaea_accounts');
      const accountsResult = await accountsDbService.getAllDocs();
      
      if ((accountsResult as any).success && (accountsResult as any).data) {
        const accountsToUpdate = (accountsResult as any).data.filter((account: any) => 
          account.doc && (account.doc.group === groupName || account.doc.group_name === groupName)
        );
        
        for (const account of accountsToUpdate) {
          const updatedAccount = {
            ...account.doc,
            group: 'Default',
            group_name: 'Default',
            updatedAt: new Date().toISOString()
          };
          await accountsDbService.put(updatedAccount);
        }
        
        if (accountsToUpdate.length > 0) {
          toast({ 
            title: '账号已移动', 
            description: `${accountsToUpdate.length} 个账号已移动到默认分组`, 
            type: 'success' 
          });
        }
      }
      
      toast({ title: '成功', description: '分组删除成功', type: 'success' });
      loadGroups();
    } catch (error) {
      console.error('删除分组失败:', error);
      toast({ title: '删除失败', description: '删除分组失败', type: 'error' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6 bg-white min-h-screen">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">GAEA</h1>
            <div className="flex items-center space-x-3">
              <DeepTrainingCountdown />
              <DecisionCountdown />
        </div>
                </div>
              </div>
              
        {/* 主要内容 */}
        <div className="max-w-7xl">
          <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="accounts">
                <Users className="w-4 h-4 mr-2" />
                账号管理
              </TabsTrigger>
              <TabsTrigger value="tickets">
                <Ticket className="w-4 h-4 mr-2" />
                Tickets
              </TabsTrigger>
              <TabsTrigger value="decisions">
                <Settings className="w-4 h-4 mr-2" />
                决策
              </TabsTrigger>
              <TabsTrigger value="trainings">
                <Brain className="w-4 h-4 mr-2" />
                训练管理
              </TabsTrigger>
              <TabsTrigger value="mining">
                <BarChart3 className="w-4 h-4 mr-2" />
                挂机挖矿
              </TabsTrigger>
            </TabsList>

            {/* 账号管理标签页 */}
            <TabsContent value="accounts" className="space-y-2">
              <AccountsTab
                accounts={accounts}
                groups={groups}
                loading={loading}
                total={total}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                searchTerm={searchTerm}
                selectedGroup={selectedGroup}
                selectedAccounts={selectedAccounts}
                showPasswords={showPasswords}
                editingRowId={editingRowId}
                editingData={editingData}
                isAdding={isAdding}
                newAccount={newAccount}
                loggingInAccounts={loggingInAccounts}
                sortField={sortField}
                sortDirection={sortDirection}
                isImporting={isImporting}
                isExporting={isExporting}
                showAddGroup={showAddGroup}
                showEditGroups={showEditGroups}
                showMoveDialog={showMoveDialog}
                targetGroup={targetGroup}
                newGroup={newGroup}
                editingGroup={editingGroup}
                onSearch={handleSearch}
                onGroupFilter={handleGroupFilter}
                onSelectAccount={handleSelectAccount}
                onSelectAll={handleSelectAll}
                onTogglePasswordVisibility={togglePasswordVisibility}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onUpdateEditingData={setEditingData}
                onDeleteAccount={handleDeleteAccount}
                onLogin={handleLogin}
                onSort={handleSort}
                onAdd={() => setIsAdding(true)}
                onUpdateNewAccount={setNewAccount}
                onAddAccount={handleAddAccount}
                onCancelAdd={() => {
                  setIsAdding(false);
                  setNewAccount({});
                }}
                onFileSelect={handleFileSelect}
                onExport={handleExport}
                onDownloadTemplate={handleDownloadTemplate}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onMoveToGroup={handleMoveToGroup}
                onShowAddGroup={() => setShowAddGroup(true)}
                onShowEditGroups={() => setShowEditGroups(true)}
                onShowMoveDialog={() => setShowMoveDialog(true)}
                onUpdateNewGroup={setNewGroup}
                onUpdateEditingGroup={setEditingGroup}
                onAddGroup={handleAddGroup}
                onUpdateGroup={handleUpdateGroup}
                onDeleteGroup={handleDeleteGroup}
                onEditGroup={handleEditGroup}
                onCloseAddGroup={() => {
                  setShowAddGroup(false);
                  setNewGroup({});
                }}
                onCloseEditGroups={() => setShowEditGroups(false)}
                onCloseMoveDialog={() => setShowMoveDialog(false)}
                onCloseEditingGroup={() => setEditingGroup({})}
                onSetTargetGroup={setTargetGroup}
                onRefresh={handleRefreshAccounts}
              />
            </TabsContent>

            {/* Tickets 标签页 */}
            <TabsContent value="tickets" className="space-y-4">
              <TicketsTab 
                onRefresh={handleRefreshTickets} 
                onSupplementTickets={handleSupplementTickets}
                onLogin={handleLoginAccount}
                loading={loading}
                toast={toast}
              />
            </TabsContent>

            {/* 决策标签页 */}
            <TabsContent value="decisions" className="space-y-4">
              <DecisionsTab onRefresh={handleRefreshDecisions} loading={loading} />
            </TabsContent>

            {/* 训练管理标签页 */}
            <TabsContent value="trainings" className="space-y-4">
              <TrainingsTab onRefresh={handleRefreshTrainings} loading={loading} />
            </TabsContent>

            {/* 挂机挖矿标签页 */}
            <TabsContent value="mining" className="space-y-4">
              <MiningTab onRefresh={handleRefreshMining} loading={loading} />
            </TabsContent>
          </Tabs>
              </div>
            </div>
      
      {/* 浏览器下载模态框 */}
      <BrowserDownloadModal
        isOpen={showDownloadModal}
        onClose={handleDownloadClose}
        onComplete={handleDownloadComplete}
      />
    </Layout>
  );
}
