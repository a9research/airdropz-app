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
  // 只在生产环境使用静态导出
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // 只在生产环境使用自定义输出目录
  ...(process.env.NODE_ENV === 'production' && { distDir: 'out' }),
  // 排除 references 目录，避免构建时扫描参考文件
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/references/**', '**/doc/**'],
    };
    return config;
  },
  /* config options here */
};

export default nextConfig;
