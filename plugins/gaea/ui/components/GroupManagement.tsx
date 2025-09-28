'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Group } from './types';

interface GroupManagementProps {
  groups: Group[];
  selectedGroup: string;
  selectedCount: number;
  hasSelectedAccounts: boolean;
  showAddGroup: boolean;
  showEditGroups: boolean;
  showMoveDialog: boolean;
  targetGroup: string;
  newGroup: Partial<Group>;
  editingGroup: Partial<Group>;
  onGroupFilter: (groupName: string) => void;
  onShowAddGroup: () => void;
  onShowEditGroups: () => void;
  onShowMoveDialog: () => void;
  onUpdateNewGroup: (group: Partial<Group>) => void;
  onUpdateEditingGroup: (group: Partial<Group>) => void;
  onAddGroup: () => void;
  onUpdateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onEditGroup: (group: Group) => void;
  onMoveToGroup: (targetGroup: string) => void;
  onCloseAddGroup: () => void;
  onCloseEditGroups: () => void;
  onCloseMoveDialog: () => void;
  onCloseEditingGroup: () => void;
  onSetTargetGroup: (group: string) => void;
}

export function GroupManagement({
  groups,
  selectedGroup,
  selectedCount,
  hasSelectedAccounts,
  showAddGroup,
  showEditGroups,
  showMoveDialog,
  targetGroup,
  newGroup,
  editingGroup,
  onGroupFilter,
  onShowAddGroup,
  onShowEditGroups,
  onShowMoveDialog,
  onUpdateNewGroup,
  onUpdateEditingGroup,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onEditGroup,
  onMoveToGroup,
  onCloseAddGroup,
  onCloseEditGroups,
  onCloseMoveDialog,
  onCloseEditingGroup,
  onSetTargetGroup
}: GroupManagementProps) {
  return (
    <>
      {/* 分组选择下拉框 */}
      <div className="flex items-center space-x-2">
        <Select value={selectedGroup} onValueChange={onGroupFilter}>
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
                  onClick={onShowMoveDialog}
                  disabled={!hasSelectedAccounts}
                  size="sm"
                  variant="outline"
                  className="p-2"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{!hasSelectedAccounts ? '请先选择要移动的账号' : '移动选中账号到其他分组'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 添加分组对话框 */}
      <Dialog open={showAddGroup} onOpenChange={onCloseAddGroup}>
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
                onChange={(e) => onUpdateNewGroup({ ...newGroup, name: e.target.value })}
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
                onChange={(e) => onUpdateNewGroup({ ...newGroup, description: e.target.value })}
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
                  onChange={(e) => onUpdateNewGroup({ ...newGroup, color: e.target.value })}
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
              onClick={onCloseAddGroup}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={onAddGroup}
              disabled={!newGroup.name?.trim()}
            >
              创建分组
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移动分组对话框 */}
      <Dialog open={showMoveDialog} onOpenChange={onCloseMoveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>移动账号到分组</DialogTitle>
            <DialogDescription>
              将选中的 {selectedCount} 个账号移动到目标分组
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="target-group" className="text-right">
                目标分组
              </label>
              <Select value={targetGroup} onValueChange={onSetTargetGroup}>
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
              onClick={onCloseMoveDialog}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (targetGroup) {
                  onMoveToGroup(targetGroup);
                  onCloseMoveDialog();
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
      <Dialog open={showEditGroups} onOpenChange={onCloseEditGroups}>
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
                onClick={onShowAddGroup}
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
                            onClick={() => onEditGroup(group)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeleteGroup((group as any)._id)}
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
              onClick={onCloseEditGroups}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑单个分组对话框 */}
      <Dialog open={!!(editingGroup as any)._id} onOpenChange={onCloseEditingGroup}>
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
                onChange={(e) => onUpdateEditingGroup({ ...editingGroup, name: e.target.value })}
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
                onChange={(e) => onUpdateEditingGroup({ ...editingGroup, description: e.target.value })}
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
                  onChange={(e) => onUpdateEditingGroup({ ...editingGroup, color: e.target.value })}
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
              onClick={onCloseEditingGroup}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={onUpdateGroup}
              disabled={!editingGroup.name?.trim()}
            >
              更新分组
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
