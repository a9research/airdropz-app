/**
 * 简化的插件 API 路由处理器
 * 直接处理 Gaea 插件的 API 请求
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleGaeaRequest(request, context, 'GET');
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleGaeaRequest(request, context, 'POST');
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleGaeaRequest(request, context, 'PUT');
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleGaeaRequest(request, context, 'DELETE');
}

async function handleGaeaRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string
) {
  try {
    const { path: pathSegments } = await context.params;
    
    if (pathSegments.length < 2 || pathSegments[0] !== 'gaea') {
      return NextResponse.json(
        { success: false, error: 'Invalid plugin API path' },
        { status: 400 }
      );
    }

    const [, ...apiPath] = pathSegments;
    const [endpoint] = apiPath;
    
    switch (endpoint) {
      case 'groups':
        if (method === 'GET') {
          // 返回默认分组
          const groups = [
            { _id: 'default', name: 'Default', description: '默认分组', color: '#3B82F6', account_count: 0, createdAt: new Date().toISOString() }
          ];
          return NextResponse.json({ success: true, data: groups });
        } else if (method === 'POST') {
          const body = await request.json();
          const newGroup = {
            _id: `group_${Date.now()}`,
            name: body.name || '新分组',
            description: body.description || '',
            color: body.color || '#3B82F6',
            account_count: 0,
            createdAt: new Date().toISOString()
          };
          return NextResponse.json({ 
            success: true, 
            data: newGroup,
            message: '分组创建成功' 
          });
        }
        break;
        
          case 'accounts':
            if (method === 'GET') {
              const { searchParams } = new URL(request.url);
              const page = parseInt(searchParams.get('page') || '1');
              const limit = parseInt(searchParams.get('limit') || '50');
              const search = searchParams.get('search') || '';
              const group_filter = searchParams.get('group_filter') || '';

              try {
                // 暂时返回空数据，因为PouchDB在服务器端无法工作
                // 实际的数据操作将在客户端进行
                return NextResponse.json({
                  success: true,
                  data: {
                    accounts: [],
                    total: 0,
                    page,
                    limit,
                    total_pages: 0
                  }
                });
              } catch (error) {
                console.error('Failed to get accounts:', error);
                return NextResponse.json({
                  success: false,
                  error: '获取账号数据失败'
                }, { status: 500 });
              }
            } else if (method === 'POST') {
              const body = await request.json();
              const newAccount = {
                _id: `account_${Date.now()}`,
                name: body.name || '新账号',
                username: body.username || '',
                password: body.password || '',
                uid: body.uid || '',
                browserId: body.browserId || '',
                token: body.token || '',
                proxy: body.proxy || '',
                group: body.group || 'Default',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              try {
                // POST请求也返回成功，实际的数据操作在客户端进行
                return NextResponse.json({
                  success: true,
                  data: { id: `account_${Date.now()}` },
                  message: '账号创建成功'
                });
              } catch (error) {
                console.error('Failed to save account:', error);
                return NextResponse.json({
                  success: false,
                  error: '保存账号失败'
                }, { status: 500 });
              }
            }
            break;
        
      case 'selection-state':
        if (method === 'GET') {
          const result = {
            selectedAccountIds: [],
            sessionId: 'default',
            updatedAt: new Date().toISOString()
          };
          return NextResponse.json({ success: true, data: result });
        } else if (method === 'POST') {
          const body = await request.json();
          const result = {
            selectedAccountIds: body.accountIds || [],
            sessionId: body.sessionId || 'default',
            updatedAt: new Date().toISOString()
          };
          return NextResponse.json({ success: true, data: result });
        }
        break;
        
      case 'batch-operation':
        if (method === 'POST') {
          const body = await request.json();
          const result = {
            success: true,
            processed: body.accountIds?.length || 0,
            operation: body.operation || 'unknown'
          };
          return NextResponse.json({ success: true, data: result });
        }
        break;
    }
    
    return NextResponse.json(
      { success: false, error: `Endpoint ${endpoint} not found` },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Gaea API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
