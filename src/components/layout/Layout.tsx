'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 - 固定 */}
      <Header onMenuToggle={toggleSidebar} />
      
      {/* 主体区域 - 剩余高度 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧菜单 - 固定 */}
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        
        {/* 主内容区域 - 可滚动 */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
