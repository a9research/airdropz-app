'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Search, Loader2 } from 'lucide-react';
import { useToastSonner } from '@/hooks/use-toast-sonner';

interface SupplementTicketsDialogProps {
  children: React.ReactNode;
  accounts: Array<{
    id: string;
    name: string;
    uid: string;
    tickets_count: number;
  }>;
}

export function SupplementTicketsDialog({ children, accounts }: SupplementTicketsDialogProps) {
  const [open, setOpen] = useState(false);
  const [ticketThreshold, setTicketThreshold] = useState<number>(0);
  const [filteredAccounts, setFilteredAccounts] = useState<Array<{
    id: string;
    name: string;
    uid: string;
    tickets_count: number;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToastSonner();

  // 查询小于等于指定数量的账号
  const handleSearch = () => {
    setIsSearching(true);
    
    // 模拟查询延迟
    setTimeout(() => {
      const filtered = accounts.filter(account => 
        (account.tickets_count || 0) <= ticketThreshold
      );
      setFilteredAccounts(filtered);
      setIsSearching(false);
    }, 500);
  };

  // 复制所有UID到剪贴板
  const handleCopyUIDs = async () => {
    try {
      const uids = filteredAccounts.map(account => account.uid).join('\n');
      await navigator.clipboard.writeText(uids);
      toast({
        title: '复制成功',
        description: `已复制 ${filteredAccounts.length} 个UID到剪贴板`,
        type: 'success'
      });
    } catch (error) {
      console.error('复制失败:', error);
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板，请手动复制',
        type: 'error'
      });
    }
  };

  // 重置状态
  const handleOpenChange = (newOpen: boolean) => {
    console.log('🔧 SupplementTicketsDialog open change:', newOpen);
    setOpen(newOpen);
    if (!newOpen) {
      setFilteredAccounts([]);
      setTicketThreshold(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>补充Ticket查询</DialogTitle>
          <DialogDescription>
            查询tickets数量小于等于指定数量的账号，用于补充ticket
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 查询条件 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">查询条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="threshold">Ticket数量阈值</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    value={ticketThreshold}
                    onChange={(e) => setTicketThreshold(Number(e.target.value))}
                    placeholder="输入ticket数量阈值"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="mt-6"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      查询中...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      查询
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 查询结果 */}
          {filteredAccounts.length > 0 && (
            <Card className="flex-1 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  查询结果 ({filteredAccounts.length} 个账号)
                </CardTitle>
                <Button onClick={handleCopyUIDs} size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  复制所有UID
                </Button>
              </CardHeader>
              <CardContent className="overflow-auto max-h-96">
                <div className="space-y-2">
                  {filteredAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="font-medium">{account.name}</div>
                          <div className="text-sm text-gray-500">{account.uid}</div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {account.tickets_count || 0} 张Ticket
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 无结果提示 */}
          {filteredAccounts.length === 0 && ticketThreshold > 0 && !isSearching && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">没有找到符合条件的账号</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
