import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 在构建时完全跳过 ESLint 检查
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在构建时忽略 TypeScript 错误
    ignoreBuildErrors: false,
  },
  // 注释掉静态导出，因为我们需要动态 API 路由
  // ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // 只在生产环境使用自定义输出目录
  ...(process.env.NODE_ENV === 'production' && { distDir: 'out' }),
  // 排除 references 目录，避免构建时扫描参考文件
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 在服务端构建时排除 PouchDB 相关模块
      config.externals = config.externals || [];
      config.externals.push({
        'pouchdb': 'commonjs pouchdb',
        'pouchdb-find': 'commonjs pouchdb-find',
        'pouchdb-adapter-idb': 'commonjs pouchdb-adapter-idb',
      });
    }
    
    // 添加对Playwright和Crawlee的支持
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'fs': false,
      'path': false,
      'os': false,
    };
    
    // 确保Playwright和Crawlee模块能够正确解析
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/references/**', '**/doc/**'],
    };
    return config;
  },
  // 添加 generateBuildId 来避免构建问题
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  /* config options here */
};

export default nextConfig;
