'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload,
  Download,
  FileDown,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImportResult } from './types';

interface ImportExportProps {
  loading: boolean;
  isImporting: boolean;
  isExporting: boolean;
  importResult: ImportResult | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
}

export function ImportExport({
  loading,
  isImporting,
  isExporting,
  importResult,
  onFileSelect,
  onExport,
  onDownloadTemplate
}: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* 导入导出按钮 */}
      <div className="flex items-center space-x-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileSelect}
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
                onClick={onDownloadTemplate}
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
                onClick={onExport}
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
    </>
  );
}
