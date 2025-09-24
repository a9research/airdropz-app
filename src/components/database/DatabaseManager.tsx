'use client';

/**
 * 改进的数据库管理组件
 * 使用安全的数据库服务
 */

import { useState, useEffect } from 'react';
import { useClientDatabase } from '@/hooks/useClientDatabase';
import { SafeDatabaseService } from '@/lib/database/safe-service';
import { DATABASE_CONFIG } from '@/lib/database/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Database, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react';

interface DatabaseStats {
  name: string;
  doc_count: number;
  update_seq: number;
  size: number;
  status: 'connected' | 'disconnected' | 'error';
}

export default function DatabaseManager() {
  const { isReady, hasError, error } = useClientDatabase();
  const [dbStats, setDbStats] = useState<DatabaseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewData, setViewData] = useState<any[]>([]);
  const [viewDatabaseName, setViewDatabaseName] = useState('');

  // 生成数据库友好标签的函数
  const generateDatabaseLabel = (key: string): string => {
    const labelMap: Record<string, string> = {
      'notifications': '通知数据库',
      'gaea_accounts': 'Gaea 账号数据库',
      'gaea_groups': 'Gaea 分组数据库',
      'gaea_tickets': 'Gaea 票据数据库',
      'gaea_decisions': 'Gaea 决策数据库',
      'gaea_trainings': 'Gaea 训练数据库',
      'gaea_mining': 'Gaea 挖矿数据库',
    };
    
    if (labelMap[key]) {
      return labelMap[key];
    }
    
    // 对于其他数据库，使用智能命名转换
    return key
      .replace(/_/g, ' ')  // 下划线替换为空格
      .replace(/([A-Z])/g, ' $1')  // 驼峰命名转换
      .replace(/^./, str => str.toUpperCase())  // 首字母大写
      + ' 数据库';
  };

  // 自动从配置中生成数据库列表
  const databases = Object.keys(DATABASE_CONFIG).map(key => {
    return {
      name: key,
      label: generateDatabaseLabel(key),
      icon: Database
    };
  });

  // 调试日志：显示自动发现的数据库
  console.log('自动发现的数据库:', databases.map(db => ({ name: db.name, label: db.label })));

  useEffect(() => {
    if (isReady && !hasError) {
      loadDatabaseStats();
    }
  }, [isReady, hasError]);

  const loadDatabaseStats = async () => {
    if (!isReady) return;
    
    setLoading(true);
    try {
      const stats: DatabaseStats[] = [];
      
      for (const db of databases) {
        const safeService = new SafeDatabaseService(db.name);
        const info = await safeService.getInfo();
        
        if (info) {
          stats.push({
            name: db.name,
            doc_count: info.doc_count || 0,
            update_seq: info.update_seq || 0,
            size: info.data_size || 0,
            status: 'connected'
          });
        } else {
          stats.push({
            name: db.name,
            doc_count: 0,
            update_seq: 0,
            size: 0,
            status: 'error'
          });
        }
      }
      
      setDbStats(stats);
    } catch (error) {
      console.error('Failed to load database stats:', error);
      setMessage({ type: 'error', text: '加载数据库统计信息失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleOperation = async (operation: string, dbName?: string) => {
    if (!isReady) return;
    
    setOperationLoading(dbName ? `${operation}-${dbName}` : operation);
    try {
      switch (operation) {
        case 'reconnect':
          await loadDatabaseStats();
          setMessage({ type: 'success', text: '数据库重新连接成功' });
          break;
        case 'view':
          if (dbName) {
            try {
              const safeService = new SafeDatabaseService(dbName);
              const allDocs = await safeService.getAllDocs();
              console.log(`数据库 ${dbName} 查询结果:`, allDocs);
              
              if (allDocs && allDocs.success) {
                console.log(`数据库 ${dbName} 的所有文档:`, allDocs.data);
                setViewData(allDocs.data || []);
                setViewDatabaseName(dbName);
                setShowViewDialog(true);
                setMessage({ type: 'success', text: `已查看数据库 ${dbName}，共 ${allDocs.data?.length || 0} 条记录` });
              } else {
                console.error(`数据库 ${dbName} 查询失败:`, allDocs);
                setMessage({ type: 'error', text: `查看数据库 ${dbName} 失败: 未知错误` });
              }
            } catch (error) {
              console.error(`数据库 ${dbName} 查询异常:`, error);
              setMessage({ type: 'error', text: `查看数据库 ${dbName} 异常: ${error instanceof Error ? error.message : '未知错误'}` });
            }
          }
          break;
        case 'clear':
          if (dbName) {
            const safeService = new SafeDatabaseService(dbName);
            const result = await safeService.clear();
            if (result && result.success) {
              setMessage({ type: 'success', text: `数据库 ${dbName} 清理成功，删除了 ${result.data?.deletedCount || 0} 条记录` });
              await loadDatabaseStats(); // 重新加载统计信息
            } else {
              setMessage({ type: 'error', text: `清理数据库 ${dbName} 失败: 未知错误` });
            }
          }
          break;
        case 'export':
          setMessage({ type: 'info', text: '导出功能开发中...' });
          break;
        case 'import':
          setMessage({ type: 'info', text: '导入功能开发中...' });
          break;
      }
    } catch (error) {
      console.error(`Operation ${operation} failed:`, error);
      setMessage({ type: 'error', text: `操作失败: ${error}` });
    } finally {
      setOperationLoading(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: DatabaseStats['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />已连接</Badge>;
      case 'disconnected':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />未连接</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />错误</Badge>;
      default:
        return <Badge>未知</Badge>;
    }
  };

  if (hasError) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              数据库不可用
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-2">
              数据库功能仅在客户端环境中可用。请确保在浏览器中运行此应用。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">正在初始化数据库...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">数据库管理</h1>
        <p className="text-gray-600">管理本地数据库，包括连接状态、数据统计和操作功能</p>
      </div>

      {/* 操作按钮 */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          onClick={() => handleOperation('reconnect')}
          disabled={operationLoading === 'reconnect'}
          variant="outline"
        >
          {operationLoading === 'reconnect' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          重新连接
        </Button>
        <Button
          onClick={() => handleOperation('export')}
          disabled={operationLoading === 'export'}
          variant="outline"
        >
          {operationLoading === 'export' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          导出数据
        </Button>
        <Button
          onClick={() => handleOperation('import')}
          disabled={operationLoading === 'import'}
          variant="outline"
        >
          {operationLoading === 'import' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          导入数据
        </Button>
      </div>

      {/* 消息显示 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* 数据库列表 */}
      <div className="grid gap-6 md:grid-cols-2">
        {databases.map((db) => {
          const stats = dbStats.find(s => s.name === db.name);
          const Icon = db.icon;
          
          return (
            <Card key={db.name} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{db.label}</CardTitle>
                      <CardDescription className="text-sm text-gray-500">
                        数据库: {db.name}
                      </CardDescription>
                    </div>
                  </div>
                  {stats && getStatusBadge(stats.status)}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : stats ? (
                  <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">文档数量:</span>
                            <span className="ml-2 font-medium">{stats.doc_count}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">数据大小:</span>
                            <span className="ml-2 font-medium">{formatBytes(stats.size)}</span>
                          </div>
                        </div>
                    
                        <div className="pt-3 border-t space-y-2">
                          <Button
                            onClick={() => handleOperation('view', db.name)}
                            disabled={operationLoading === `view-${db.name}`}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            {operationLoading === `view-${db.name}` ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4 mr-2" />
                            )}
                            查看数据
                          </Button>
                          <Button
                            onClick={() => handleOperation('clear', db.name)}
                            disabled={operationLoading === `clear-${db.name}`}
                            variant="destructive"
                            size="sm"
                            className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          >
                            {operationLoading === `clear-${db.name}` ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            清除数据
                          </Button>
                        </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    无法获取数据库信息
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 查看数据弹窗 */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent 
          className="w-[80vw] max-h-[90vh] overflow-hidden !max-w-none"
          style={{
            width: '80vw',
            maxWidth: 'none',
            margin: '0 auto'
          }}
        >
          <DialogHeader>
            <DialogTitle>数据库内容 - {viewDatabaseName}</DialogTitle>
            <DialogDescription>
              共 {viewData.length} 条记录
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[75vh]">
            {viewData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>数据库为空</p>
              </div>
            ) : (
              <div className="space-y-4">
                {viewData.map((doc, index) => (
                  <Card key={doc.id || index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-semibold text-sm text-gray-700">文档 #{index + 1}</span>
                        <span className="font-mono text-xs text-gray-500">ID: {doc.id}</span>
                      </div>
                      
                      {/* 优先显示完整文档内容 */}
                      {doc.doc ? (
                        <div className="space-y-2">
                          <div className="mb-3">
                            <span className="font-semibold text-sm text-blue-600">完整文档内容:</span>
                          </div>
                          <pre className="bg-blue-50 p-3 rounded text-xs overflow-auto whitespace-pre-wrap break-words border border-blue-200">
                            {JSON.stringify(doc.doc, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="mb-3">
                            <span className="font-semibold text-sm text-gray-600">文档元数据:</span>
                          </div>
                          {Object.entries(doc).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-1 gap-2">
                              <div className="flex items-start justify-between">
                                <span className="font-medium text-sm text-gray-600 min-w-0 flex-shrink-0 mr-2">
                                  {key}:
                                </span>
                                <div className="min-w-0 flex-1">
                                  {typeof value === 'object' && value !== null ? (
                                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto whitespace-pre-wrap break-words">
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : (
                                    <span className="font-mono text-sm break-words">
                                      {String(value)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
