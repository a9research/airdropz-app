import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST() {
  try {
    console.log('🚀 开始下载Playwright浏览器...');
    
    // 使用 npx playwright install 下载浏览器
    const installProcess = spawn('npx', ['playwright', 'install', 'chromium'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    return new Promise<NextResponse>((resolve) => {
      let output = '';
      let errorOutput = '';

      installProcess.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        console.log('Playwright安装输出:', message);

        // 发送进度信息
        let progressData: {
          status: 'downloading' | 'installing';
          progress: number;
          message: string;
          timestamp: string;
        } = {
          status: 'downloading',
          progress: 50,
          message: '正在下载浏览器文件...',
          timestamp: new Date().toISOString()
        };

        if (message.includes('Downloading')) {
          progressData.status = 'downloading';
          progressData.progress = 30;
          progressData.message = '正在下载浏览器文件...';
        } else if (message.includes('Installing')) {
          progressData.status = 'installing';
          progressData.progress = 70;
          progressData.message = '正在安装浏览器...';
        }

        // 这里应该通过流式响应发送进度，但Next.js API路由不支持流式响应
        // 所以我们返回一个简单的成功响应
      });

      installProcess.stderr.on('data', (data) => {
        const message = data.toString();
        errorOutput += message;
        console.error('Playwright安装错误:', message);
      });

      installProcess.on('close', async (code) => {
        if (code === 0) {
          console.log('✅ Playwright浏览器安装完成');
          
          // 验证安装
          try {
            const { chromium } = await import('playwright');
            const browser = await chromium.launch({ 
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            await browser.close();
            
            resolve(NextResponse.json({
              success: true,
              message: '浏览器安装完成'
            }));
          } catch (error) {
            resolve(NextResponse.json({
              success: false,
              message: '浏览器安装后验证失败',
              error: error instanceof Error ? error.message : '未知错误'
            }, { status: 500 }));
          }
        } else {
          console.error('❌ Playwright安装失败，退出码:', code);
          resolve(NextResponse.json({
            success: false,
            message: '浏览器安装失败',
            error: errorOutput || `安装进程退出码: ${code}`
          }, { status: 500 }));
        }
      });

      installProcess.on('error', (error) => {
        console.error('❌ 启动安装进程失败:', error);
        resolve(NextResponse.json({
          success: false,
          message: '启动安装进程失败',
          error: error.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error('❌ 浏览器下载失败:', error);
    return NextResponse.json({
      success: false,
      message: '浏览器下载失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
