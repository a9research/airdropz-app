'use client';

import { useState, useEffect } from 'react';
import { browserDownloader } from '@/lib/browser-downloader';

export function useBrowserCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBrowser();
  }, []);

  const checkBrowser = async () => {
    try {
      setIsChecking(true);
      setError(null);
      
      const installed = await browserDownloader.checkBrowserInstalled();
      setIsInstalled(installed);
      
      if (!installed) {
        setShowDownloadModal(true);
      }
    } catch (error) {
      console.error('检查浏览器失败:', error);
      setError(error instanceof Error ? error.message : '检查浏览器失败');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadComplete = () => {
    setIsInstalled(true);
    setShowDownloadModal(false);
  };

  const handleDownloadClose = () => {
    setShowDownloadModal(false);
  };

  return {
    isChecking,
    isInstalled,
    showDownloadModal,
    error,
    checkBrowser,
    handleDownloadComplete,
    handleDownloadClose
  };
}
