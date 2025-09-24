'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import { ImportResult, CSVAccountData } from '../../shared/types/import-export';

interface CSVImportExportProps {
  onImport: (csvData: CSVAccountData[]) => Promise<ImportResult>;
  onExport: () => Promise<string>;
  loading?: boolean;
}

export default function CSVImportExport({ 
  onImport, 
  onExport, 
  loading = false 
}: CSVImportExportProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('请选择CSV文件');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await handleImport(file);
      setImportResult(result);
    } catch (error) {
      console.error('导入失败:', error);
      setImportResult({
        success: 0,
        failed: 0,
        errors: ['导入失败: ' + (error instanceof Error ? error.message : '未知错误')],
        accounts: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = await onExport();
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
      alert('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsExporting(false);
    }
  };

  const parseCSV = (csvText: string): CSVAccountData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('CSV标题行:', headers);
    const data: CSVAccountData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      console.log(`第${i}行数据:`, row);
      data.push(row as CSVAccountData);
    }

    console.log(`解析完成，共${data.length}条数据`);
    return data;
  };

  const handleImport = async (file: File) => {
    return new Promise<ImportResult>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          const csvData = parseCSV(csvText);
          const result = await onImport(csvData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'utf-8');
    });
  };

  return (
    <div className="space-y-4">
      {/* 导入导出操作 */}
      <Card>
        <CardHeader>
          <CardTitle>CSV 导入导出</CardTitle>
          <CardDescription>
            支持导入和导出账号数据，CSV格式包含：Name, Browser_ID, Token, Proxy, UID, Username, Password, Group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isImporting}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? '导入中...' : '导入CSV'}</span>
              </Button>
            </div>
            
            <Button
              onClick={handleExport}
              disabled={loading || isExporting}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '导出中...' : '导出CSV'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 导入结果 */}
      {importResult && (
        <Card>
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

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>错误详情</span>
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {importResult.accounts.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>成功导入的账号</span>
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-green-700 space-y-1">
                      {importResult.accounts.map((account, index) => (
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
    </div>
  );
}
