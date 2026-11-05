import { cookies } from 'next/headers';
import { z } from 'zod';
import { deleteAccountPermanently } from '@/lib/account-deletion';
import { fail, ok } from '@/lib/api';
import { verifyAccountPassword } from '@/lib/auth';
import { authError, validateAuthRequest } from '@/lib/auth-api';
import { enforceRateLimit } from '@/lib/ratelimit';
import { AUTH_COOKIE, getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const schema = z.object({
  password: z.string().min(1).max(128),
  confirmation: z.literal('영구 삭제', { errorMap: () => ({ message: '확인 문구를 정확히 입력해 주세요' }) }),
});

/** 인증·비밀번호 재확인 후 계정과 연관 데이터를 영구 삭제한다. */
export async function DELETE(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    if (!user.isAuthenticated || user.role === 'admin') return fail('LOGIN_REQUIRED', '회원 계정으로 로그인한 뒤 삭제할 수 있습니다', 401);
    const limited = enforceRateLimit(user.id, 'account-delete', 5, 60 * 60_000);
    if (limited) return limited;
    const body = schema.parse(await req.json());
    await verifyAccountPassword(user.id, body.password);
    const result = await deleteAccountPermanently(user.id);
    (await cookies()).set(AUTH_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    return ok({ deleted: true, ...result });
  } catch (error) {
    return authError(error);
  }
}
