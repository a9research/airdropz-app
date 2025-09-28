import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();
    
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '缺少账号ID' },
        { status: 400 }
      );
    }

    const pythonUrl = `http://localhost:5001/api/mining/start/${accountId}`;
    console.log('🌐 请求Python服务:', pythonUrl);
    
    const response = await fetch(pythonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Python服务响应状态:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Python服务响应错误: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: data.success,
      message: data.message,
      error: data.error
    });
  } catch (error) {
    console.error('开始挖矿失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '开始挖矿失败' 
      },
      { status: 500 }
    );
  }
}
