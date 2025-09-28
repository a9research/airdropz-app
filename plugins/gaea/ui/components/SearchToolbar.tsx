'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';

interface SearchToolbarProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  isAdding: boolean;
  onAdd: () => void;
}

export function SearchToolbar({
  searchTerm,
  onSearch,
  isAdding,
  onAdd
}: SearchToolbarProps) {
  return (
    <div className="flex items-center space-x-2">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" style={{ left: '0.5rem' }} />
        <Input
          placeholder="搜索账号..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-12 w-64"
          style={{ paddingLeft: '2rem' }}
        />
      </div>

      {/* 添加按钮 */}
      <Button
        onClick={onAdd}
        disabled={isAdding}
        size="sm"
        className="flex items-center space-x-1"
      >
        <Plus className="w-4 h-4" />
        <span>添加</span>
      </Button>
    </div>
  );
}
