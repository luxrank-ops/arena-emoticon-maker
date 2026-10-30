import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const generation = await prisma.generation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        imageUrl: true,
        thumbnailUrl: true,
        revisedPrompt: true,
        error: true,
        generationTime: true,
        creditsUsed: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!generation) {
      return NextResponse.json({ error: '생성 기록을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    if (generation.userId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 진행률 계산 (PENDING: 0%, PROCESSING: 50%, COMPLETED: 100%)
    let progress = 0;
    if (generation.status === 'PROCESSING') progress = 50;
    else if (generation.status === 'COMPLETED') progress = 100;

    return NextResponse.json({
      ...generation,
      progress,
    });
  } catch (error) {
    console.error('상태 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}