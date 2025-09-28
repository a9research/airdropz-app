import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accountId, accountName, token, ticket, detail } = await request.json();

    if (!accountId || !accountName || !token || !ticket || !detail) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 调用决策接口
    const response = await fetch('https://api.aigaea.net/api/choice/complete', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US',
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'Referer': 'https://app.aigaea.net/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body: JSON.stringify({
        chain_id: 8453,
        ticket: ticket,
        detail: detail
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      // 存储决策结果到数据库
      const db = (global as any).pouchdb;
      if (db) {
        const decisionRecord = {
          _id: `gaea_decision_${accountId}_${Date.now()}`,
          accountId: accountId,
          accountName: accountName,
          ticket: ticket,
          detail: detail,
          result: result,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        await db.put(decisionRecord);
      }
      
      return NextResponse.json({
        success: true,
        data: result,
        message: '决策提交成功'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.msg || '决策提交失败',
        data: result
      }, { status: response.status });
    }
  } catch (error) {
    console.error('决策提交错误:', error);
    return NextResponse.json(
      { success: false, error: '决策提交失败' },
      { status: 500 }
    );
  }
}
