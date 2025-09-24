#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 修复 Sharp 依赖问题
 * 在 ARM64 Mac 上，electron-builder 会尝试访问不存在的 x64 版本的 sharp 目录
 * 这个脚本会在每次 npm install 后自动创建缺失的目录
 */

const sharpX64Dir = path.join(__dirname, '..', 'node_modules', '@img', 'sharp-darwin-x64');

console.log('🔧 修复 Sharp 依赖问题...');

try {
  // 检查目录是否存在
  if (!fs.existsSync(sharpX64Dir)) {
    // 创建目录
    fs.mkdirSync(sharpX64Dir, { recursive: true });
    console.log('✅ 已创建缺失的 sharp-darwin-x64 目录');
  } else {
    console.log('✅ sharp-darwin-x64 目录已存在');
  }
} catch (error) {
  console.error('❌ 修复 Sharp 依赖时出错:', error.message);
  process.exit(1);
}

console.log('🎉 Sharp 依赖修复完成');

