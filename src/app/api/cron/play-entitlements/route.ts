import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { revalidatePlayEntitlements } from '@/lib/play-purchases';

export const dynamic = 'force-dynamic';

/**
 * 플레이 구매 재검증 크론 — 환불·취소된 구매의 유료 자격을 회수한다.
 *  · CRON_SECRET 이 있으면 Authorization: Bearer 검증 필수, 운영에서 없으면 거부(fail-closed).
 *  · 구글 검증 설정(서비스 계정)이 없으면 아무것도 바꾸지 않고 configured:false 로 응답한다.
 *  · 스케줄은 배포 환경에서 등록한다(예: 매일 1회). 등록 전에도 수동 호출은 동작한다.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== secret) return fail('UNAUTHORIZED', '크론 인증에 실패했습니다', 401);
  } else if (process.env.NODE_ENV === 'production') {
    return fail('FORBIDDEN', 'CRON_SECRET 이 설정되지 않아 크론 실행을 거부했습니다', 403);
  }

  const result = await revalidatePlayEntitlements();
  return NextResponse.json({ ok: true, job: 'play-entitlements', ...result });
}
