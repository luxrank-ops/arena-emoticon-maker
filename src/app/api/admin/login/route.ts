import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({ passcode: z.string().min(1).max(64) });

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    // 무차별 대입 방지: 세션당 5회/분
    const limited = enforceRateLimit(user.id, 'adminLogin', RATE_LIMITS.adminLogin);
    if (limited) return limited;

    const configured = process.env.ADMIN_PASSCODE;
    // 운영 환경에서 코드 미설정 → fail-closed (기본값으로 열어두지 않는다)
    //  · 입력 검증보다 먼저 검사해, 어떤 입력이 와도 503 으로만 응답한다
    if (!configured && process.env.NODE_ENV === 'production') {
      return fail('ADMIN_DISABLED', '운영자 코드가 설정되지 않아 로그인할 수 없습니다', 503);
    }
    const { passcode } = schema.parse(await req.json());
    const expected = configured ?? 'emotime-demo';
    if (!safeEqual(passcode, expected)) return fail('FORBIDDEN', '운영자 코드가 올바르지 않습니다', 401);

    await withDB((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (u) u.role = 'admin';
    });
    cookies().set('emotime_admin', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600 });
    return ok({ admin: true });
  } catch (e) {
    return handleError(e);
  }
}

/** 길이 차이로 정보가 새지 않는 상수 시간 비교 */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
