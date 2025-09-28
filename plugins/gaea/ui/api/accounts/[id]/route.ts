import { NextRequest, NextResponse } from 'next/server';
import { pluginResourceManager } from '@/lib/plugin/pluginResourceManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('🚀 开始处理账号信息API请求...');
    await pluginResourceManager.init();
    console.log('✅ pluginResourceManager初始化完成');
    
    const gaeaService = pluginResourceManager.getPluginService('gaea', 'gaeaService');
    console.log('🔍 获取gaeaService:', !!gaeaService);
    
    if (!gaeaService) {
      console.log('❌ Gaea service not found');
      return NextResponse.json(
        { success: false, error: 'Gaea service not found' },
        { status: 500 }
      );
    }
    
    const { id } = await context.params;
    console.log('🔍 查找账号ID:', id);
    
    // 直接通过ID获取账号，而不是通过搜索
    console.log('🔍 开始调用getAccountById方法...');
    const account = await gaeaService.getAccountById(id);
    console.log('🔍 getAccountById返回结果:', account);
    
    if (!account) {
      console.log('❌ 账号不存在:', id);
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 });
    }
    
    console.log('✅ 找到账号:', { id: account._id, username: account.username, hasPassword: !!account.password });
    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('❌ Error getting account:', error);
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