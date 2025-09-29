#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 复制插件目录到构建输出目录
 */
function copyPlugins() {
  const sourceDir = path.join(__dirname, '../plugins');
  const targetDir = path.join(__dirname, '../.next/plugins');
  
  console.log('📦 复制插件目录...');
  console.log('源目录:', sourceDir);
  console.log('目标目录:', targetDir);
  
  // 检查源目录是否存在
  if (!fs.existsSync(sourceDir)) {
    console.log('⚠️  插件目录不存在:', sourceDir);
    return;
  }
  
  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('✅ 创建目标目录:', targetDir);
  }
  
  // 复制插件目录
  try {
    copyDirectory(sourceDir, targetDir);
    console.log('✅ 插件目录复制完成');
  } catch (error) {
    console.error('❌ 复制插件目录失败:', error);
    process.exit(1);
  }
}

/**
 * 递归复制目录
 */
function copyDirectory(source, target) {
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// 执行复制
copyPlugins();

