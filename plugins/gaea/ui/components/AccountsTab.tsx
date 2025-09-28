'use client';

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
import { AccountTable } from './AccountTable';
import { AccountForm } from './AccountForm';
import { SearchToolbar } from './SearchToolbar';
import { GroupManagement } from './GroupManagement';
import { ImportExport } from './ImportExport';
import { DataTablePagination } from './DataTablePagination';
import { Account, Group, ImportResult } from './types';

interface AccountsTabProps {
  // 数据状态
  accounts: Account[];
  groups: Group[];
  loading: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  
  // 搜索和过滤
  searchTerm: string;
  selectedGroup: string;
  
  // 选择状态
  selectedAccounts: Set<string>;
  showPasswords: { [key: string]: boolean };
  
  // 编辑状态
  editingRowId: string | null;
  editingData: Partial<Account>;
  isAdding: boolean;
  newAccount: Partial<Account>;
  
  // 登录状态
  loggingInAccounts: Set<string>;
  
  // 排序状态
  sortField: string;
  sortDirection: 'asc' | 'desc';
  
  // 导入导出状态
  isImporting: boolean;
  isExporting: boolean;
  
  // 分组管理状态
  showAddGroup: boolean;
  showEditGroups: boolean;
  showMoveDialog: boolean;
  targetGroup: string;
  newGroup: Partial<Group>;
  editingGroup: Partial<Group>;
  
  // 事件处理函数
  onSearch: (value: string) => void;
  onGroupFilter: (groupName: string) => void;
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
  onAdd: () => void;
  onUpdateNewAccount: (account: Partial<Account>) => void;
  onAddAccount: () => void;
  onCancelAdd: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onMoveToGroup: (targetGroup: string) => void;
  onShowAddGroup: () => void;
  onShowEditGroups: () => void;
  onShowMoveDialog: () => void;
  onUpdateNewGroup: (group: Partial<Group>) => void;
  onUpdateEditingGroup: (group: Partial<Group>) => void;
  onAddGroup: () => void;
  onUpdateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onEditGroup: (group: Group) => void;
  onCloseAddGroup: () => void;
  onCloseEditGroups: () => void;
  onCloseMoveDialog: () => void;
  onCloseEditingGroup: () => void;
  onSetTargetGroup: (group: string) => void;
  onRefresh?: () => void;
}

export function AccountsTab({
  accounts,
  groups,
  loading,
  total,
  currentPage,
  totalPages,
  pageSize,
  searchTerm,
  selectedGroup,
  selectedAccounts,
  showPasswords,
  editingRowId,
  editingData,
  isAdding,
  newAccount,
  loggingInAccounts,
  sortField,
  sortDirection,
  isImporting,
  isExporting,
  showAddGroup,
  showEditGroups,
  showMoveDialog,
  targetGroup,
  newGroup,
  editingGroup,
  onSearch,
  onGroupFilter,
  onSelectAccount,
  onSelectAll,
  onTogglePasswordVisibility,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateEditingData,
  onDeleteAccount,
  onLogin,
  onSort,
  onAdd,
  onUpdateNewAccount,
  onAddAccount,
  onCancelAdd,
  onFileSelect,
  onExport,
  onDownloadTemplate,
  onPageChange,
  onPageSizeChange,
  onMoveToGroup,
  onShowAddGroup,
  onShowEditGroups,
  onShowMoveDialog,
  onUpdateNewGroup,
  onUpdateEditingGroup,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onEditGroup,
  onCloseAddGroup,
  onCloseEditGroups,
  onCloseMoveDialog,
  onCloseEditingGroup,
  onSetTargetGroup,
  onRefresh
}: AccountsTabProps) {
  // 计算全选状态
  const isAllSelected = selectedAccounts.size === accounts.length && accounts.length > 0;
  const hasAccounts = accounts.length > 0;

  // 密码显示逻辑
  const getPasswordDisplay = (account: Account) => {
    return showPasswords[account.id] ? account.password : '••••••••';
  };

  const getPasswordVisibility = (accountId: string) => {
    return showPasswords[accountId] || false;
  };

  const isEditing = (accountId: string) => {
    return editingRowId === accountId;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };
  return (
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
            {onRefresh && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRefresh}
                      disabled={loading}
                      className="flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>刷新</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>刷新列表数据</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <SearchToolbar
              searchTerm={searchTerm}
              onSearch={onSearch}
              isAdding={isAdding}
              onAdd={onAdd}
            />
            
            <GroupManagement
              groups={groups}
              selectedGroup={selectedGroup}
              selectedCount={selectedAccounts.size}
              hasSelectedAccounts={selectedAccounts.size > 0}
              showAddGroup={showAddGroup}
              showEditGroups={showEditGroups}
              showMoveDialog={showMoveDialog}
              targetGroup={targetGroup}
              newGroup={newGroup}
              editingGroup={editingGroup}
              onGroupFilter={onGroupFilter}
              onShowAddGroup={onShowAddGroup}
              onShowEditGroups={onShowEditGroups}
              onShowMoveDialog={onShowMoveDialog}
              onUpdateNewGroup={onUpdateNewGroup}
              onUpdateEditingGroup={onUpdateEditingGroup}
              onAddGroup={onAddGroup}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
              onEditGroup={onEditGroup}
              onMoveToGroup={onMoveToGroup}
              onCloseAddGroup={onCloseAddGroup}
              onCloseEditGroups={onCloseEditGroups}
              onCloseMoveDialog={onCloseMoveDialog}
              onCloseEditingGroup={onCloseEditingGroup}
              onSetTargetGroup={onSetTargetGroup}
            />

            <ImportExport
              loading={loading}
              isImporting={isImporting}
              isExporting={isExporting}
              importResult={null}
              onFileSelect={onFileSelect}
              onExport={onExport}
              onDownloadTemplate={onDownloadTemplate}
            />
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
                  {/* 添加新账号行 */}
                  <AccountForm
                    isAdding={isAdding}
                    newAccount={newAccount}
                    onUpdateNewAccount={onUpdateNewAccount}
                    onAddAccount={onAddAccount}
                    onCancelAdd={onCancelAdd}
                  />
                  
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

        <DataTablePagination
          totalItems={total}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}
