import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification } from '@/lib/notifications/in-app';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');

    const result = await getUserNotifications((session.user as any).id, {
      page,
      limit,
      unreadOnly,
      type: type as any,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('알림 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notificationId } = body;

    if (action === 'read' && notificationId) {
      await markAsRead(notificationId, (session.user as any).id);
      return NextResponse.json({ success: true });
    }

    if (action === 'readAll') {
      const count = await markAllAsRead((session.user as any).id);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  } catch (error) {
    console.error('알림 업데이트 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: '알림 ID가 필요합니다.' }, { status: 400 });
    }

    await deleteNotification(notificationId, (session.user as any).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}