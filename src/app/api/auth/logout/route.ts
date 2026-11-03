import { handleError, ok } from '@/lib/api';
import { logout } from '@/lib/auth';
import { validateAuthRequest } from '@/lib/auth-api';

export async function POST(req: Request) {
  const forbidden = validateAuthRequest(req);
  if (forbidden) return forbidden;
  try { await logout(); return ok({ loggedOut: true }); }
  catch (e) { return handleError(e); }
}
