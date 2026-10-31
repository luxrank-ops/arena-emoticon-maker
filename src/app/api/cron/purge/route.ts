import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { purgeExpiredFaces } from '@/lib/purge';

export const dynamic = 'force-dynamic';

/**
 * 얼굴 파기 크론 (vercel.json: 매일 18:00 UTC = 03:00 KST)
 *  · Vercel Hobby 플랜은 크론 1일 1회 제한이라 '매시' 스케줄은 배포 자체가 거부된다.
 *    24시간 이내 파기 보장은 요청 중 5분 1회 기회적 스윕(FACE_PURGE_SWEEP_MS)이 담당하고,
 *    이 크론은 트래픽이 없는 기간의 안전망이다. Pro 플랜이면 매시('0 * * * *')로 올릴 것.
 *  · CRON_SECRET 이 설정되어 있으면 Authorization: Bearer 검증 필수
 *  · 운영에서 CRON_SECRET 이 없으면 실행을 거부한다 (fail-closed)
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

  const result = await purgeExpiredFaces();
  return NextResponse.json({ ok: true, job: 'face-purge', ...result });
}
