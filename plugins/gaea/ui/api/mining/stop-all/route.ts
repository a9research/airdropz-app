import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch('http://localhost:5001/api/mining/stop-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Python服务响应错误: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: data.success,
      message: data.message,
      count: data.count,
      error: data.error
    });
  } catch (error) {
    console.error('停止所有挖矿失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '停止所有挖矿失败' 
      },
      { status: 500 }
    );
  }
}
