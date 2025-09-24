'use client';

import Layout from '@/components/layout/Layout';
import { BarChart3, Globe, Database, Settings } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    {
      title: '总抓取次数',
      value: '1,234',
      icon: BarChart3,
      color: 'bg-blue-500',
    },
    {
      title: '活跃代理',
      value: '12',
      icon: Globe,
      color: 'bg-green-500',
    },
    {
      title: '数据记录',
      value: '5,678',
      icon: Database,
      color: 'bg-purple-500',
    },
    {
      title: '系统状态',
      value: '正常',
      icon: Settings,
      color: 'bg-orange-500',
    },
  ];

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">控制台</h1>
          <p className="text-gray-600 mt-2">欢迎使用 AirdropzAlpha 系统</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 快速操作 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center">
                <Globe className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">代理浏览器</h3>
                  <p className="text-sm text-gray-600">打开代理浏览器进行网页操作</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">数据管理</h3>
                  <p className="text-sm text-gray-600">查看和管理本地数据库</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">系统设置</h3>
                  <p className="text-sm text-gray-600">配置系统参数和选项</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
