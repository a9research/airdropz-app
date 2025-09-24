'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Check,
  X,
  Plus,
  RefreshCw,
  Upload,
  Download,
  Users,
  FolderPlus,
  Settings,
  CheckSquare,
  Square,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ticket,
  Brain,
  BarChart3,
  FileDown,
  ArrowRight,
  Folder,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToastSonner } from '@/hooks/use-toast-sonner';
import { ImportExportService } from '../../frontend/services/importExportService';
import { CSVAccountData } from '../../shared/types/import-export';

interface Account {
  id: string;
  name: string;
  browser_id: string;
  token: string;
  proxy: string;
  uid: string;
  username: string;
  password: string;
  group_name: string;
  created_at: string;
  updated_at: string;
  group_color: string;
  group_description: string;
}

interface Group {
  name: string;
  description: string;
  color: string;
  created_at: string;
  account_count: number;
}

interface AccountTableData {
  accounts: Account[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function GaeaPluginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToastSonner();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };
  
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
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      loadSelectionState();
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
      let accounts = result.rows.map((row: any) => {
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
      
      if (data && data.length > 0) {
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

  const loadSelectionState = async () => {
    try {
      const response = await fetch('/api/plugin/gaea/selection-state');
      const data = await response.json();
      if (data.success) {
        // data.data 是一个对象，包含 selectedAccountIds 数组
        const selectedIds = data.data.selectedAccountIds || [];
        setSelectedAccounts(new Set(selectedIds));
      }
    } catch (error) {
      console.error('加载选择状态失败:', error);
    }
  };

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

  const handleMoveToGroup = async (targetGroup: string) => {
    const selectedIds = Array.from(selectedAccounts);
    if (selectedIds.length === 0) {
      toast({ title: '提示', description: '请先选择要移动的账号', type: 'warning' });
      return;
    }

    try {
      // 直接使用客户端数据库更新账号分组
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
      
      // 清空选择并重新加载数据
      setSelectedAccounts(new Set());
      loadAccounts();
    } catch (error) {
      console.error('移动账号失败:', error);
      toast({ title: '操作失败', description: '移动账号失败', type: 'error' });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const handleSelectAccount = async (accountId: string, selected: boolean) => {
    try {
      const response = await fetch('/api/plugin/gaea/selection-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_ids: [accountId],
          selected: selected
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedAccounts(prev => {
          const newSet = new Set(prev);
          if (selected) {
            newSet.add(accountId);
          } else {
            newSet.delete(accountId);
          }
          return newSet;
        });
      }
    } catch (error) {
      toast({ title: '操作失败', description: '网络错误', type: 'error' });
    }
  };

  // 导入导出处理函数

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = await importExportService.exportToCSV();
      if (csvContent) {
        // 创建下载链接
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
      setImportResult(result);
      
      if (result.success > 0) {
        toast({ title: '导入成功', description: `成功导入 ${result.success} 个账号`, type: 'success' });
        // 重新加载数据
        loadAccounts();
      }
      
      if (result.failed > 0) {
        toast({ title: '部分失败', description: `${result.failed} 个账号导入失败`, type: 'warning' });
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

  const handleSelectAll = async () => {
    if (!accounts || accounts.length === 0) return;
    
    const allSelected = selectedAccounts.size === accounts.length;
    const accountIds = accounts.map(acc => acc.id);
    
    try {
      const response = await fetch('/api/plugin/gaea/selection-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_ids: accountIds,
          selected: !allSelected
        })
      });
      
      const data = await response.json();
      if (data.success) {
        if (allSelected) {
          setSelectedAccounts(new Set());
        } else {
          setSelectedAccounts(new Set(accountIds));
        }
      }
    } catch (error) {
      toast({ title: '操作失败', description: '网络错误', type: 'error' });
    }
  };

  const handleAddAccount = async () => {
    try {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        toast({ title: '失败', description: '服务器端环境无法操作数据库', type: 'error' });
        return;
      }

      // 动态导入数据库服务
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 创建新账号文档
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
      } as any; // 使用any类型避免_rev字段要求
      
      // 保存到数据库
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

  const handleUpdateAccount = async (account: Account) => {
    try {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        toast({ title: '失败', description: '服务器端环境无法操作数据库', type: 'error' });
        return;
      }

      // 动态导入数据库服务
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取现有文档
      const existingDoc = await dbService.get(account.id.toString());
      
      // 更新文档
      const updatedDoc = {
        ...existingDoc,
        name: account.name,
        browserId: account.browser_id,
        token: account.token,
        proxy: account.proxy,
        uid: account.uid,
        username: account.username,
        password: account.password,
        group: account.group_name,
        updatedAt: new Date().toISOString()
      };
      
      // 保存到数据库
      await dbService.put(updatedDoc);
      
      toast({ title: '成功', description: '账号更新成功', type: 'success' });
      setEditingAccount(null);
      loadAccounts();
      
    } catch (error) {
      console.error('更新账号失败:', error);
      toast({ title: '更新失败', description: '更新账号失败', type: 'error' });
    }
  };

  // 内联编辑处理函数
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
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        toast({ title: '失败', description: '服务器端环境无法操作数据库', type: 'error' });
        return;
      }

      // 动态导入数据库服务
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取现有文档
      const existingDoc = await dbService.get(editingRowId);
      
      // 更新文档
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
      
      // 保存到数据库
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
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        toast({ title: '失败', description: '服务器端环境无法操作数据库', type: 'error' });
        return;
      }

      // 动态导入数据库服务
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_accounts');
      
      // 获取现有文档
      const existingDoc = await dbService.get(accountId.toString());
      
      // 删除文档
      await dbService.remove(existingDoc);
      
      toast({ title: '成功', description: '账号删除成功', type: 'success' });
      loadAccounts();
      
    } catch (error) {
      console.error('删除账号失败:', error);
      toast({ title: '删除失败', description: '删除账号失败', type: 'error' });
    }
  };

  const handleBatchOperation = async (operation: string, groupName?: string) => {
    const selectedIds = Array.from(selectedAccounts);
    if (selectedIds.length === 0) {
      toast({ title: '提示', description: '请先选择账号', type: 'info' });
      return;
    }

    try {
      const response = await fetch('/api/plugin/gaea/batch-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_ids: selectedIds,
          operation: operation,
          kwargs: groupName ? { group_name: groupName } : {}
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: '成功', description: data.message, type: 'success' });
        setSelectedAccounts(new Set());
        loadAccounts();
      } else {
        toast({ title: '操作失败', description: data.error, type: 'error' });
      }
    } catch (error) {
      toast({ title: '操作失败', description: '网络错误', type: 'error' });
    }
  };

  const handleAddGroup = async () => {
    try {
      // 检查分组名称是否重复
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_groups');
      
      // 获取现有分组
      const result = await dbService.getAllDocs();
      const existingGroups = (result as any).data || (result as any).rows || [];
      
      // 检查名称是否重复（包括默认分组）
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
      loadGroups(); // 重新加载分组列表
      
      // 如果编辑分组弹窗是打开的，保持打开状态
      if (showEditGroups) {
        // 编辑分组弹窗保持打开，分组列表会自动刷新
      }
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
      
      // 检查名称是否重复（排除当前编辑的分组）
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
    
    // 添加确认对话框
    const group = groups.find(g => (g as any)._id === groupId);
    const groupName = group?.name || '未知分组';
    
    if (!confirm(`确定要删除分组 "${groupName}" 吗？\n\n注意：删除后该分组下的所有账号将移动到默认分组。`)) {
      return;
    }
    
    try {
      const { getDatabaseService } = await import('@/lib/database');
      const dbService = getDatabaseService('gaea_groups');
      
      // 获取分组文档以获取_rev
      const groupDoc = await dbService.get(groupId);
      await dbService.remove(groupDoc);
      
      // 将该分组下的账号移动到默认分组
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
          <h1 className="text-3xl font-bold text-gray-900">GAEA</h1>
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
            {/* 账号表格 */}
            <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>账号列表</CardTitle>
                <CardDescription className="mt-3" style={{ marginTop: '0.5rem' }}>
                  共 {total} 个账号，第 {currentPage} 页，共 {totalPages} 页
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" style={{ left: '0.5rem' }} />
                  <Input
                    placeholder="搜索账号..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-12 w-64"
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>

                {/* 分组选择下拉框 */}
                <div className="flex items-center space-x-2">
                  <Select value={selectedGroup} onValueChange={handleGroupFilter}>
                    <SelectTrigger className="w-32 bg-white">
                      <SelectValue placeholder="选择分组" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">全部分组</SelectItem>
                      <SelectItem value="Default">未分组账号</SelectItem>
                      {groups.filter(group => group.name !== 'Default').map(group => (
                        <SelectItem key={group.name} value={group.name}>
                          {group.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="add-group" className="text-blue-600 font-medium">
                        <div className="flex items-center space-x-2">
                          <Plus className="w-4 h-4" />
                          <span>添加分组</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="edit-groups" className="text-green-600 font-medium">
                        <div className="flex items-center space-x-2">
                          <Edit className="w-4 h-4" />
                          <span>编辑分组</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 移动图标 */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          <Button
                            onClick={() => {
                              if (selectedAccounts.size > 0) {
                                setShowMoveDialog(true);
                              } else {
                                toast({ title: '提示', description: '请先选择要移动的账号', type: 'warning' });
                              }
                            }}
                            disabled={selectedAccounts.size === 0}
                            size="sm"
                            variant="outline"
                            className="p-2"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{selectedAccounts.size === 0 ? '请先选择要移动的账号' : '移动选中账号到其他分组'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* 导入导出按钮 */}
                <div className="flex items-center space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading || isImporting}
                          size="sm"
                          variant="outline"
                          className="p-2"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isImporting ? '导入中...' : '导入CSV'}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleDownloadTemplate}
                          size="sm"
                          variant="outline"
                          className="p-2"
                        >
                          <FileDown className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>下载模板</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleExport}
                          disabled={loading || isExporting}
                          size="sm"
                          variant="outline"
                          className="p-2"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isExporting ? '导出中...' : '导出CSV'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* 添加按钮 */}
                <Button
                  onClick={() => setIsAdding(true)}
                  disabled={isAdding}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加</span>
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
                        checked={selectedAccounts.size === (accounts?.length || 0) && (accounts?.length || 0) > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead className="w-16">
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
                    <TableHead className="w-32">
                      <button
                        onClick={() => handleSort('browser_id')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>浏览器ID</span>
                        {sortField === 'browser_id' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-32">
                      <button
                        onClick={() => handleSort('token')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>Token</span>
                        {sortField === 'token' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-32">
                      <button
                        onClick={() => handleSort('proxy')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>代理</span>
                        {sortField === 'proxy' ? (
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
                        onClick={() => handleSort('username')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>用户名</span>
                        {sortField === 'username' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-20">密码</TableHead>
                    <TableHead className="w-28">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>创建时间</span>
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
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                          加载中...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
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
                          {editingRowId === account.id ? (
                            <Input
                              value={editingData.name || ''}
                              onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            account.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === account.id ? (
                            <Input
                              value={editingData.browser_id || ''}
                              onChange={(e) => setEditingData({ ...editingData, browser_id: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <div 
                              className="max-w-28 truncate" 
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '112px'
                              }}
                              title={account.browser_id}
                            >
                              {account.browser_id}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === account.id ? (
                            <Input
                              value={editingData.token || ''}
                              onChange={(e) => setEditingData({ ...editingData, token: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <div 
                              className="max-w-28 truncate" 
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '112px'
                              }}
                              title={account.token}
                            >
                              {account.token}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === account.id ? (
                            <Input
                              value={editingData.proxy || ''}
                              onChange={(e) => setEditingData({ ...editingData, proxy: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            account.proxy ? (
                              <div 
                                className="max-w-28 truncate" 
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '112px'
                                }}
                                title={account.proxy}
                              >
                                {account.proxy}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === account.id ? (
                            <Input
                              value={editingData.uid || ''}
                              onChange={(e) => setEditingData({ ...editingData, uid: e.target.value })}
                              className="h-8"
                            />
                          ) : (
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
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === account.id ? (
                            <Input
                              value={editingData.username || ''}
                              onChange={(e) => setEditingData({ ...editingData, username: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <div 
                              className="max-w-28 truncate" 
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '112px'
                              }}
                              title={account.username}
                            >
                              {account.username}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRowId === account.id ? (
                            <Input
                              type="password"
                              value={editingData.password || ''}
                              onChange={(e) => setEditingData({ ...editingData, password: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm max-w-20 truncate" title={showPasswords[account.id] ? account.password : '••••••••'}>
                                {showPasswords[account.id] ? account.password : '••••••••'}
                              </span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => togglePasswordVisibility(account.id)}
                                    >
                                      {showPasswords[account.id] ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{showPasswords[account.id] ? '隐藏密码' : '显示密码'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(account.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {editingRowId === account.id ? (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleSaveEdit}
                                        className="text-green-600 hover:text-green-700"
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>保存修改</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelEdit}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>取消编辑</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            ) : (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleStartEdit(account)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>编辑账号</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteAccount(account.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>删除账号</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">每页显示</span>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-700">条</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-gray-700">
                  第 {currentPage} 页，共 {totalPages} 页
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* 导入结果显示 */}
            {importResult && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>导入结果</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 font-medium">
                          成功: {importResult.success}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-600 font-medium">
                          失败: {importResult.failed}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <span className="text-blue-600 font-medium">
                          总计: {importResult.success + importResult.failed}
                        </span>
                      </div>
                    </div>

                    {importResult.errors && importResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2 flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>错误详情</span>
                        </h4>
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
                          <ul className="text-sm text-red-700 space-y-1">
                            {importResult.errors.map((error: string, index: number) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {importResult.accounts && importResult.accounts.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-600 mb-2 flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>成功导入的账号</span>
                        </h4>
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 max-h-40 overflow-y-auto">
                          <ul className="text-sm text-green-700 space-y-1">
                            {importResult.accounts.map((account: any, index: number) => (
                              <li key={index}>
                                • {account.name} ({account.username}) - {account.uid}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tickets 标签页 */}
          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tickets 管理</CardTitle>
                <CardDescription>管理账号的 Tickets 信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Tickets 功能开发中...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 决策标签页 */}
          <TabsContent value="decisions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>决策管理</CardTitle>
                <CardDescription>管理账号的决策信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>决策功能开发中...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 训练管理标签页 */}
          <TabsContent value="trainings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>训练管理</CardTitle>
                <CardDescription>管理账号的训练任务</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>训练管理功能开发中...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 挂机挖矿标签页 */}
          <TabsContent value="mining" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>挂机挖矿</CardTitle>
                <CardDescription>管理挂机挖矿任务</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>挂机挖矿功能开发中...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* 添加分组对话框 */}
      <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>添加新分组</DialogTitle>
            <DialogDescription>
              创建一个新的账号分组来组织您的账号。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="group-name" className="text-right">
                分组名称
              </label>
              <Input
                id="group-name"
                value={newGroup.name || ''}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="col-span-3"
                placeholder="输入分组名称"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="group-description" className="text-right">
                描述
              </label>
              <Input
                id="group-description"
                value={newGroup.description || ''}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                className="col-span-3"
                placeholder="输入分组描述（可选）"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="group-color" className="text-right">
                颜色
              </label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  type="color"
                  id="group-color"
                  value={newGroup.color || '#3B82F6'}
                  onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                  className="w-8 h-8 rounded border"
                />
                <span className="text-sm text-gray-500">
                  {newGroup.color || '#3B82F6'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddGroup(false);
                setNewGroup({});
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleAddGroup}
              disabled={!newGroup.name?.trim()}
            >
              创建分组
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移动分组对话框 */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>移动账号到分组</DialogTitle>
            <DialogDescription>
              将选中的 {selectedAccounts.size} 个账号移动到目标分组
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="target-group" className="text-right">
                目标分组
              </label>
              <Select value={targetGroup} onValueChange={setTargetGroup}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择目标分组" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={(group as any)._id} value={group.name}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: group.color || '#3B82F6' }}
                        />
                        <span>{group.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMoveDialog(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (targetGroup) {
                  handleMoveToGroup(targetGroup);
                  setShowMoveDialog(false);
                  setTargetGroup('');
                } else {
                  toast({ title: '提示', description: '请选择目标分组', type: 'warning' });
                }
              }}
              disabled={!targetGroup}
            >
              移动账号
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑分组对话框 */}
      <Dialog open={showEditGroups} onOpenChange={setShowEditGroups}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>编辑分组</DialogTitle>
                <DialogDescription>
                  管理所有分组，可以修改、删除分组
                </DialogDescription>
              </div>
              <Button
                type="button"
                onClick={() => setShowAddGroup(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>添加新分组</span>
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <div className="space-y-4">
              {groups.map((group) => (
                <Card key={(group as any)._id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: group.color || '#3B82F6' }}
                      />
                      <div>
                        <h3 className="font-medium">{group.name}</h3>
                        <p className="text-sm text-gray-500">{group.description || '无描述'}</p>
                        <p className="text-xs text-gray-400">
                          账号数量: {group.account_count || 0} | 
                          创建时间: {new Date(group.created_at || '').toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(group as any)._id !== 'default' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteGroup((group as any)._id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            删除
                          </Button>
                        </>
                      )}
                      {(group as any)._id === 'default' && (
                        <span className="text-sm text-gray-500">默认分组</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditGroups(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑单个分组对话框 */}
      <Dialog open={!!(editingGroup as any)._id} onOpenChange={() => setEditingGroup({})}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑分组</DialogTitle>
            <DialogDescription>
              修改分组信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-group-name" className="text-right">
                分组名称
              </label>
              <Input
                id="edit-group-name"
                value={editingGroup.name || ''}
                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                className="col-span-3"
                placeholder="输入分组名称"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-group-description" className="text-right">
                描述
              </label>
              <Input
                id="edit-group-description"
                value={editingGroup.description || ''}
                onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                className="col-span-3"
                placeholder="输入分组描述（可选）"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-group-color" className="text-right">
                颜色
              </label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  type="color"
                  id="edit-group-color"
                  value={editingGroup.color || '#3B82F6'}
                  onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                  className="w-8 h-8 rounded border"
                />
                <span className="text-sm text-gray-500">
                  {editingGroup.color || '#3B82F6'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingGroup({})}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleUpdateGroup}
              disabled={!editingGroup.name?.trim()}
            >
              更新分组
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
