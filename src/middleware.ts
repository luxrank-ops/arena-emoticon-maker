import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const SID_COOKIE = 'emotime_sid';

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(SID_COOKIE)?.value;
  const sid = existing ?? crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  if (!existing) {
    const cookie = requestHeaders.get('cookie');
    requestHeaders.set('cookie', `${SID_COOKIE}=${sid}${cookie ? `; ${cookie}` : ''}`);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (!existing) {
    res.cookies.set(SID_COOKIE, sid, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
