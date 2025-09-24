#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复虚拟环境符号链接问题...');

const venvPath = path.join(__dirname, '../runtime/python-env');
const binPath = path.join(venvPath, 'bin');

// 检查虚拟环境是否存在
if (!fs.existsSync(venvPath)) {
  console.log('❌ 虚拟环境不存在，跳过修复');
  process.exit(0);
}

// 备份原始符号链接
const pythonFiles = ['python', 'python3', 'python3.13'];
const backupDir = path.join(venvPath, 'bin_backup');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

pythonFiles.forEach(file => {
  const filePath = path.join(binPath, file);
  const backupPath = path.join(backupDir, file);
  
  if (fs.existsSync(filePath)) {
    // 检查是否是符号链接
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      console.log(`📦 备份符号链接: ${file}`);
      const target = fs.readlinkSync(filePath);
      fs.writeFileSync(backupPath, target);
      fs.unlinkSync(filePath);
      
      // 创建硬链接或复制文件
      try {
        const absoluteTarget = path.isAbsolute(target) ? target : path.resolve(binPath, target);
        fs.linkSync(absoluteTarget, filePath);
        console.log(`✅ 创建硬链接: ${file} -> ${absoluteTarget}`);
      } catch (error) {
        // 如果硬链接失败，尝试复制文件
        const absoluteTarget = path.isAbsolute(target) ? target : path.resolve(binPath, target);
        fs.copyFileSync(absoluteTarget, filePath);
        console.log(`✅ 复制文件: ${file} -> ${absoluteTarget}`);
      }
    }
  }
});

console.log('🎉 虚拟环境符号链接修复完成');

