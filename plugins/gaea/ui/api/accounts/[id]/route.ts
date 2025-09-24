import { NextRequest, NextResponse } from 'next/server';
import { pluginResourceManager } from '@/lib/plugin/pluginResourceManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await pluginResourceManager.init();
    const gaeaService = pluginResourceManager.getPluginService('gaea', 'gaeaService');
    
    if (!gaeaService) {
      return NextResponse.json(
        { success: false, error: 'Gaea service not found' },
        { status: 500 }
      );
    }
    
    const { id } = await context.params;
    const accounts = await gaeaService.getAccounts({ limit: 1, search: id });
    const account = accounts.accounts.find((acc: any) => acc._id === id);
    
    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('Error getting account:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await pluginResourceManager.init();
    const gaeaService = pluginResourceManager.getPluginService('gaea', 'gaeaService');
    
    if (!gaeaService) {
      return NextResponse.json(
        { success: false, error: 'Gaea service not found' },
        { status: 500 }
      );
    }
    
    const { id } = await context.params;
    const body = await request.json();
    const result = await gaeaService.updateAccount(id, body);
    
    return NextResponse.json({ 
      success: true, 
      data: result,
      message: '账号更新成功' 
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await pluginResourceManager.init();
    const gaeaService = pluginResourceManager.getPluginService('gaea', 'gaeaService');
    
    if (!gaeaService) {
      return NextResponse.json(
        { success: false, error: 'Gaea service not found' },
        { status: 500 }
      );
    }
    
    const { id } = await context.params;
    await gaeaService.deleteAccount(id);
    
    return NextResponse.json({ 
      success: true, 
      message: '账号删除成功' 
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}