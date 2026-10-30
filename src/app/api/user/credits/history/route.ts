import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // 'payment', 'generation', 'refund', 'subscription', 'bonus', 'adjustment'
    const skip = (page - 1) * limit;

    const userId = (session.user as any).id;

    // 크레딧 변동 내역을 통합 조회
    const [payments, generations, adjustments] = await Promise.all([
      // 결제 내역 (크레딧 충전)
      prisma.payment.findMany({
        where: {
          userId,
          status: 'SUCCEEDED',
          ...(type === 'payment' ? {} : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'payment' ? limit : 50,
        select: {
          id: true,
          amount: true,
          currency: true,
          creditsGranted: true,
          description: true,
          metadata: true,
          createdAt: true,
          status: true,
        },
      }),
      // 생성 내역 (크레딧 사용)
      prisma.generation.findMany({
        where: {
          userId,
          ...(type === 'generation' ? {} : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'generation' ? limit : 50,
        select: {
          id: true,
          creditsUsed: true,
          status: true,
          emotion: true,
          style: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      // 수동 조정 내역 (관리자 지급, 보너스 등) - 메타데이터로 구분
      prisma.payment.findMany({
        where: {
          userId,
          OR: [
            { description: { contains: '보너스' } },
            { description: { contains: '관리자' } },
            { description: { contains: '환불' } },
            { description: { contains: '롤오버' } },
            { description: { contains: '이월' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'adjustment' ? limit : 50,
        select: {
          id: true,
          amount: true,
          currency: true,
          creditsGranted: true,
          description: true,
          metadata: true,
          createdAt: true,
          status: true,
        },
      }),
    ]);

    // 통합 히스토리 구성
    const history = [
      ...payments.map((p: any) => ({
        id: p.id,
        type: 'payment' as const,
        credits: p.creditsGranted,
        amount: p.amount,
        currency: p.currency,
        description: p.description,
        metadata: p.metadata,
        status: p.status,
        createdAt: p.createdAt,
      })),
      ...generations.map((g: any) => ({
        id: g.id,
        type: 'generation' as const,
        credits: -g.creditsUsed,
        amount: 0,
        currency: 'krw',
        description: `이모티콘 생성 (${g.emotion}, ${g.style})`,
        metadata: { status: g.status },
        status: g.status,
        createdAt: g.createdAt,
        completedAt: g.completedAt,
      })),
      ...adjustments.map((a: any) => ({
        id: a.id,
        type: 'adjustment' as const,
        credits: a.creditsGranted,
        amount: a.amount,
        currency: a.currency,
        description: a.description,
        metadata: a.metadata,
        status: a.status,
        createdAt: a.createdAt,
      })),
    ];

    // 날짜순 정렬
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 페이지네이션 적용
    const paginatedHistory = history.slice(skip, skip + limit);

    // 요약 통계
    const totalCreditsEarned = history
      .filter(h => h.credits > 0)
      .reduce((sum, h) => sum + h.credits, 0);
    
    const totalCreditsUsed = history
      .filter(h => h.credits < 0)
      .reduce((sum, h) => sum + Math.abs(h.credits), 0);

    const totalPayments = history.filter(h => h.type === 'payment').length;
    const totalGenerations = history.filter(h => h.type === 'generation').length;

    return NextResponse.json({
      history: paginatedHistory,
      pagination: {
        page,
        limit,
        total: history.length,
        totalPages: Math.ceil(history.length / limit),
      },
      summary: {
        totalCreditsEarned,
        totalCreditsUsed,
        netCredits: totalCreditsEarned - totalCreditsUsed,
        totalPayments,
        totalGenerations,
      },
    });
  } catch (error) {
    console.error('크레딧 내역 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}