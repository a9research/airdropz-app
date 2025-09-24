import { NextRequest, NextResponse } from 'next/server';
import { pluginResourceManager } from '@/lib/plugin/pluginResourceManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await pluginResourceManager.init();
    const gaeaService = pluginResourceManager.getPluginService('gaea', 'gaeaService');
    
    if (!gaeaService) {
      return NextResponse.json(
        { success: false, error: 'Gaea service not found' },
        { status: 500 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const group = searchParams.get('group') || 'all';
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = searchParams.get('sort_order') || 'asc';

    const result = await gaeaService.getAccounts({
      page,
      limit,
      search,
      group,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting accounts:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await pluginResourceManager.init();
    const gaeaService = pluginResourceManager.getPluginService('gaea', 'gaeaService');
    
    if (!gaeaService) {
      return NextResponse.json(
        { success: false, error: 'Gaea service not found' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const result = await gaeaService.createAccount(body);
    
    return NextResponse.json({ 
      success: true, 
      data: result,
      message: '账号创建成功' 
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}