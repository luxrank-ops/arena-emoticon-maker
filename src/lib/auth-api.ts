import { ZodError } from 'zod';
import { fail, handleError } from '@/lib/api';
import { AuthError } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { sessionIdFromCookies } from '@/lib/session';

/** 인스턴스당 전체 제한도 적용해 쿠키 교체만으로 시도 횟수를 늘리지 못하게 한다. */
export function authRateLimit(bucket: 'login' | 'signup') {
  return enforceRateLimit('all', `auth-${bucket}-global`, bucket === 'login' ? 10 : 20, 60_000)
    ?? enforceRateLimit(sessionIdFromCookies(), `auth-${bucket}`, 5, 60_000);
}

/** 브라우저의 다른 출처에서 인증 상태를 바꾸는 요청을 막는다. */
export function validateAuthRequest(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin) {
    try {
      if (!host || new URL(origin).host !== host) return fail('FORBIDDEN', '허용되지 않은 요청입니다', 403);
    } catch { return fail('FORBIDDEN', '허용되지 않은 요청입니다', 403); }
  }
  return null;
}

export function authError(error: unknown) {
  if (error instanceof AuthError) return fail(error.code, error.message, error.status);
  if (error instanceof ZodError) return fail('INVALID_INPUT', error.issues[0]?.message ?? '입력값을 확인해 주세요', 422);
  return handleError(error);
}
