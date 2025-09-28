'use client';

import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Account } from './types';

interface AccountFormProps {
  isAdding: boolean;
  newAccount: Partial<Account>;
  onUpdateNewAccount: (account: Partial<Account>) => void;
  onAddAccount: () => void;
  onCancelAdd: () => void;
}

export function AccountForm({
  isAdding,
  newAccount,
  onUpdateNewAccount,
  onAddAccount,
  onCancelAdd
}: AccountFormProps) {
  if (!isAdding) return null;

  return (
    <TableRow className="bg-blue-50">
      <TableCell>
        <input
          type="checkbox"
          disabled
          className="rounded"
        />
      </TableCell>
      <TableCell className="font-medium">
        <Input
          value={newAccount.name || ''}
          onChange={(e) => onUpdateNewAccount({ ...newAccount, name: e.target.value })}
          placeholder="账号名称"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={newAccount.browser_id || ''}
          onChange={(e) => onUpdateNewAccount({ ...newAccount, browser_id: e.target.value })}
          placeholder="浏览器ID"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={newAccount.token || ''}
          onChange={(e) => onUpdateNewAccount({ ...newAccount, token: e.target.value })}
          placeholder="Token"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={newAccount.proxy || ''}
          onChange={(e) => onUpdateNewAccount({ ...newAccount, proxy: e.target.value })}
          placeholder="代理"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={newAccount.uid || ''}
          onChange={(e) => onUpdateNewAccount({ ...newAccount, uid: e.target.value })}
          placeholder="UID"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={newAccount.username || ''}
          onChange={(e) => onUpdateNewAccount({ ...newAccount, username: e.target.value })}
          placeholder="用户名"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="password"
          value={newAccount.password || ''}
          onChange={(e) => onUpdateNewAccount({ ...newAccount, password: e.target.value })}
          placeholder="密码"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddAccount}
            disabled={!newAccount.name || !newAccount.username}
            className="text-green-600 hover:text-green-700"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelAdd}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
