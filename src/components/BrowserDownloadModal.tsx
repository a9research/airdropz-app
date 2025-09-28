'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, CheckCircle, X } from 'lucide-react';
import { browserDownloader, BrowserDownloadProgress } from '@/lib/browser-downloader';

interface BrowserDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BrowserDownloadModal({ isOpen, onClose, onComplete }: BrowserDownloadModalProps) {
  const [progress, setProgress] = useState<BrowserDownloadProgress>({
    status: 'checking',
    progress: 0,
    message: '检查浏览器状态...'
  });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startDownload();
    }
  }, [isOpen]);

  const startDownload = async () => {
    try {
      setIsDownloading(true);
      
      // 监听下载进度
      browserDownloader.on('progress', (progressData: BrowserDownloadProgress) => {
        setProgress(progressData);
        
        if (progressData.status === 'completed') {
          setIsDownloading(false);
          setTimeout(() => {
            onComplete();
            onClose();
          }, 1000);
        } else if (progressData.status === 'error') {
          setIsDownloading(false);
        }
      });

      // 开始下载
      await browserDownloader.downloadBrowser();
    } catch (error) {
      console.error('浏览器下载失败:', error);
      setProgress({
        status: 'error',
        progress: 0,
        message: '下载失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
      setIsDownloading(false);
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'checking':
        return <Download className="h-5 w-5 text-blue-500" />;
      case 'downloading':
        return <Download className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'installing':
        return <Download className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Download className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'checking':
        return 'text-blue-600';
      case 'downloading':
        return 'text-blue-600';
      case 'installing':
        return 'text-yellow-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={getStatusColor()}>
              {progress.status === 'checking' && '检查浏览器状态'}
              {progress.status === 'downloading' && '下载浏览器'}
              {progress.status === 'installing' && '安装浏览器'}
              {progress.status === 'completed' && '安装完成'}
              {progress.status === 'error' && '安装失败'}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">进度</span>
              <span className="font-medium">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>

          {/* 状态消息 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{progress.message}</p>
            {progress.error && (
              <p className="text-sm text-red-500 mt-2">{progress.error}</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            {progress.status === 'error' && (
              <Button
                variant="outline"
                onClick={() => {
                  setProgress({
                    status: 'checking',
                    progress: 0,
                    message: '检查浏览器状态...'
                  });
                  startDownload();
                }}
                disabled={isDownloading}
              >
                重试
              </Button>
            )}
            
            {progress.status === 'completed' && (
              <Button onClick={onClose}>
                完成
              </Button>
            )}
            
            {progress.status !== 'completed' && progress.status !== 'error' && (
              <Button variant="outline" onClick={onClose} disabled={isDownloading}>
                取消
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
