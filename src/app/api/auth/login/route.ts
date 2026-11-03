import { fail, ok } from '@/lib/api';
import { login, loginSchema } from '@/lib/auth';
import { authError, authRateLimit, validateAuthRequest } from '@/lib/auth-api';

export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return fail('INVALID_INPUT', 'JSON 요청이 필요합니다', 415);
    const limited = authRateLimit('login');
    if (limited) return limited;
    const { identifier, password } = loginSchema.parse(await req.json());
    await login(identifier, password);
    return ok({ loggedIn: true });
  } catch (e) { return authError(e); }
}
