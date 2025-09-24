'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Database,
  Globe,
  TestTube,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '控制台',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'test',
    label: '测试项目',
    icon: TestTube,
    children: [
      {
        id: 'test-function',
        label: '测试功能',
        icon: TestTube,
        href: '/',
      },
      {
        id: 'proxy-browser',
        label: '代理浏览器',
        icon: Globe,
        href: '/browser/proxy',
      },
    ],
  },
  {
    id: 'airdrop',
    label: '空投项目',
    icon: Users,
    children: [
      {
        id: 'gaea',
        label: 'GAEA',
        icon: Users,
        href: '/plugin/gaea',
      },
    ],
  },
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
    children: [
      {
        id: 'database',
        label: '本地数据库管理',
        icon: Database,
        href: '/settings/database',
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // 根据当前路径自动展开包含激活子菜单的父菜单
  useEffect(() => {
    const getActiveParentIds = (items: MenuItem[]): string[] => {
      const activeParents: string[] = [];
      
      items.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.href === pathname);
          if (hasActiveChild) {
            activeParents.push(item.id);
          }
        }
      });
      
      return activeParents;
    };

    const activeParentIds = getActiveParentIds(menuItems);
    setExpandedItems(activeParentIds);
  }, [pathname]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      // 如果当前项已展开，则收起
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      
      // 如果当前项未展开，则展开它并收起其他项
      return [itemId];
    });
  };

  const isItemActive = (item: MenuItem): boolean => {
    if (item.href) {
      return pathname === item.href;
    }
    if (item.children) {
      return item.children.some(child => child.href === pathname);
    }
    return false;
  };

  const isParentActive = (item: MenuItem): boolean => {
    if (item.children) {
      return item.children.some(child => child.href === pathname);
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isActive = isItemActive(item);
    const isParentActiveItem = isParentActive(item);
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap',
              level > 0 && 'ml-4',
              isActive 
                ? 'bg-blue-100 text-blue-700' 
                : isParentActiveItem
                ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-500'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
            {hasChildren && (
              <div className="flex items-center">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            )}
          </Link>
        ) : (
          <div
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap',
              level > 0 && 'ml-4',
              isActive 
                ? 'bg-blue-100 text-blue-700' 
                : isParentActiveItem
                ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-500'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.id);
              }
            }}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
            {hasChildren && (
              <div className="flex items-center">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            )}
          </div>
        )}

        {hasChildren && (
          <div 
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="mt-1 space-y-1">
              {item.children!.map(child => (
                <Link
                  key={child.id}
                  href={child.href!}
                  onClick={() => {
                    // 点击子菜单项时，确保父菜单保持展开
                    if (!expandedItems.includes(item.id)) {
                      setExpandedItems(prev => [...prev, item.id]);
                    }
                  }}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-4 whitespace-nowrap',
                    pathname === child.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <child.icon className="w-4 h-4" />
                  <span>{child.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-64 min-w-64 max-w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:top-0 lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: '256px', minWidth: '256px', maxWidth: '256px' }}
      >

        {/* 菜单项 */}
        <nav className="flex-1 px-4 pt-4 pb-4 space-y-2 overflow-y-auto">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* 侧边栏底部 */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p>版本 1.0.0</p>
            <p>© 2024 AirdropzAlpha</p>
          </div>
        </div>
      </div>
    </>
  );
}
