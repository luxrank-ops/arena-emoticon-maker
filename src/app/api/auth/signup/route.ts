import { fail, ok } from '@/lib/api';
import { signup, signupSchema } from '@/lib/auth';
import { authError, authRateLimit, validateAuthRequest } from '@/lib/auth-api';

export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return fail('INVALID_INPUT', 'JSON 요청이 필요합니다', 415);
    const limited = authRateLimit('signup');
    if (limited) return limited;
    const input = signupSchema.parse(await req.json());
    await signup(input);
    return ok({ registered: true });
  } catch (e) { return authError(e); }
}
