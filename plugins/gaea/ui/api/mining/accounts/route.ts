import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('http://localhost:5001/api/mining/accounts', {
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
    console.error('获取挖矿账号失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取挖矿账号失败' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch('http://localhost:5001/api/mining/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

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
    console.error('添加挖矿账号失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '添加挖矿账号失败' 
      },
      { status: 500 }
    );
  }
}
