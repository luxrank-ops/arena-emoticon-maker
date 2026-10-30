import { NextRequest, NextResponse } from 'next/server';
import { processMonthlyRollover } from '@/lib/billing/rollover';

// 이 엔드포인트는 매월 1일 00:00 KST에 실행되도록 크론잡 설정 필요
// 예: Vercel Cron Jobs, GitHub Actions, 또는 외부 스케줄러

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 보안: 크론 시크릿 검증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] 월간 크레딧 이월 처리 시작');
    
    const result = await processMonthlyRollover();
    
    console.log('[Cron] 월간 크레딧 이월 처리 완료:', result);
    
    return NextResponse.json({
      success: true,
      message: '월간 크레딧 이월 처리 완료',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] 월간 크레딧 이월 처리 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '이월 처리 중 오류 발생',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

// POST도 지원 (일부 스케줄러가 POST 사용)
export async function POST(request: NextRequest) {
  return GET(request);
}