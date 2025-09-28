import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 检查Playwright浏览器是否已安装
    const { chromium } = await import('playwright');
    
    try {
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      await browser.close();
      
      return NextResponse.json({
        success: true,
        installed: true,
        message: '浏览器已安装'
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        installed: false,
        message: '浏览器未安装',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      installed: false,
      message: '检查浏览器状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
