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
    const { accountIds, operation, data = {} } = body;
    
    const message = await gaeaService.batchOperation(accountIds, operation, data);
    
    return NextResponse.json({ 
      success: true, 
      message 
    });
  } catch (error) {
    console.error('Error in batch operation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}