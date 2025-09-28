import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 调用Python服务的API
    const response = await fetch('http://localhost:5001/api/mining/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Python服务响应错误: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('获取挖矿状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取挖矿状态失败' 
      },
      { status: 500 }
    );
  }
}
