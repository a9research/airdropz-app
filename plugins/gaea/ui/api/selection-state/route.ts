import { NextRequest, NextResponse } from 'next/server';
import { pluginResourceManager } from '@/lib/plugin/pluginResourceManager';

export const dynamic = 'force-dynamic';

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
    const { accountIds, selected, sessionId = 'default' } = body;
    
    await gaeaService.setSelectionState(accountIds, selected, sessionId);
    
    return NextResponse.json({ 
      success: true, 
      message: `已${selected ? '选择' : '取消选择'} ${accountIds.length} 个账号` 
    });
  } catch (error) {
    console.error('Error setting selection state:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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
    const sessionId = searchParams.get('sessionId') || 'default';
    
    const selectedIds = await gaeaService.getSelectionState(sessionId);
    
    return NextResponse.json({ 
      success: true, 
      data: selectedIds 
    });
  } catch (error) {
    console.error('Error getting selection state:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const sessionId = searchParams.get('sessionId') || 'default';
    
    await gaeaService.clearSelectionState(sessionId);
    
    return NextResponse.json({ 
      success: true, 
      message: '选择状态已清除' 
    });
  } catch (error) {
    console.error('Error clearing selection state:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}