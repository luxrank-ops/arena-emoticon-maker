import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { ADMIN_NICKNAME, login } from '@/lib/auth';
import { authError, authRateLimit, validateAuthRequest } from '@/lib/auth-api';

/** 기존 운영 콘솔도 같은 계정·서버 인증 세션을 사용한다. */
export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return fail('INVALID_INPUT', 'JSON 요청이 필요합니다', 415);
    const limited = await authRateLimit('login');
    if (limited) return limited;
    const { passcode } = z.object({ passcode: z.string().min(1).max(128) }).parse(await req.json());
    await login(ADMIN_NICKNAME, passcode);
    return ok({ admin: true });
  } catch (e) { return authError(e); }
}
