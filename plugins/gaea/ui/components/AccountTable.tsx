'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Check,
  X,
  RefreshCw,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Account } from './types';

interface AccountTableProps {
  accounts: Account[];
  loading: boolean;
  selectedAccounts: Set<string>;
  showPasswords: { [key: string]: boolean };
  editingRowId: string | null;
  editingData: Partial<Account>;
  loggingInAccounts: Set<string>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSelectAccount: (accountId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onTogglePasswordVisibility: (accountId: string) => void;
  onStartEdit: (account: Account) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateEditingData: (data: Partial<Account>) => void;
  onDeleteAccount: (accountId: string) => void;
  onLogin: (account: Account) => void;
  onSort: (field: string) => void;
}

export function AccountTable({
  accounts,
  loading,
  selectedAccounts,
  showPasswords,
  editingRowId,
  editingData,
  loggingInAccounts,
  sortField,
  sortDirection,
  onSelectAccount,
  onSelectAll,
  onTogglePasswordVisibility,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateEditingData,
  onDeleteAccount,
  onLogin,
  onSort
}: AccountTableProps) {
  // 优化：使用useMemo缓存账号数量
  const accountsCount = useMemo(() => {
    return accounts.length;
  }, [accounts.length]);

  const hasAccounts = useMemo(() => {
    return accounts.length > 0;
  }, [accounts.length]);

  // 优化：使用useMemo计算全选状态
  const isAllSelected = useMemo(() => {
    return hasAccounts && selectedAccounts.size === accountsCount;
  }, [hasAccounts, selectedAccounts.size, accountsCount]);

  // 优化：使用useMemo优化密码显示逻辑
  const getPasswordDisplay = useCallback((account: Account) => {
    return showPasswords[account.id] ? account.password : '••••••••';
  }, [showPasswords]);

  // 优化：使用useMemo缓存密码显示状态
  const getPasswordVisibility = useCallback((accountId: string) => {
    return showPasswords[accountId] || false;
  }, [showPasswords]);

  // 优化：使用useMemo缓存编辑状态
  const isEditing = useCallback((accountId: string) => {
    return editingRowId === accountId;
  }, [editingRowId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onSelectAll}
                className="rounded"
              />
            </TableHead>
            <TableHead className="w-16">
              <button
                onClick={() => onSort('name')}
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
                onClick={() => onSort('browser_id')}
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
                onClick={() => onSort('token')}
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
                onClick={() => onSort('proxy')}
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
                onClick={() => onSort('uid')}
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
                onClick={() => onSort('username')}
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
                onClick={() => onSort('created_at')}
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
          ) : !hasAccounts ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            <>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedAccounts.has(account.id)}
                      onChange={(e) => onSelectAccount(account.id, e.target.checked)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {isEditing(account.id) ? (
                      <Input
                        value={editingData.name || ''}
                        onChange={(e) => onUpdateEditingData({ ...editingData, name: e.target.value })}
                        className="h-8"
                      />
                    ) : (
                      account.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing(account.id) ? (
                      <Input
                        value={editingData.browser_id || ''}
                        onChange={(e) => onUpdateEditingData({ ...editingData, browser_id: e.target.value })}
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
                    {isEditing(account.id) ? (
                      <Input
                        value={editingData.token || ''}
                        onChange={(e) => onUpdateEditingData({ ...editingData, token: e.target.value })}
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
                    {isEditing(account.id) ? (
                      <Input
                        value={editingData.proxy || ''}
                        onChange={(e) => onUpdateEditingData({ ...editingData, proxy: e.target.value })}
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
                    {isEditing(account.id) ? (
                      <Input
                        value={editingData.uid || ''}
                        onChange={(e) => onUpdateEditingData({ ...editingData, uid: e.target.value })}
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
                    {isEditing(account.id) ? (
                      <Input
                        value={editingData.username || ''}
                        onChange={(e) => onUpdateEditingData({ ...editingData, username: e.target.value })}
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
                    {isEditing(account.id) ? (
                      <Input
                        type="password"
                        value={editingData.password || ''}
                        onChange={(e) => onUpdateEditingData({ ...editingData, password: e.target.value })}
                        className="h-8"
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm max-w-20 truncate" title={getPasswordDisplay(account)}>
                          {getPasswordDisplay(account)}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onTogglePasswordVisibility(account.id)}
                              >
                                {getPasswordVisibility(account.id) ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getPasswordVisibility(account.id) ? '隐藏密码' : '显示密码'}</p>
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
                      {isEditing(account.id) ? (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={onSaveEdit}
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
                                  onClick={onCancelEdit}
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
                                  onClick={() => onStartEdit(account)}
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
                                  onClick={() => onLogin(account)}
                                  disabled={loggingInAccounts.has(account.id) || !account.username || !account.password}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {loggingInAccounts.has(account.id) ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{loggingInAccounts.has(account.id) ? '登录中...' : '登录Gaea'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onDeleteAccount(account.id)}
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
              ))}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
