import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PLAY_HEADER, uaIsTWA } from '@/lib/twa';

export const SID_COOKIE = 'emotime_sid';

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(SID_COOKIE)?.value;
  const sid = existing ?? crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  if (!existing) {
    const cookie = requestHeaders.get('cookie');
    requestHeaders.set('cookie', `${SID_COOKIE}=${sid}${cookie ? `; ${cookie}` : ''}`);
  }
  // 구글 플레이 유료 앱(TWA) 감지 → 정규화 헤더. 세션 해석(getCurrentUser)이
  // 이 헤더를 보고 사용자에 play 플래그(모든 기능 무제한)를 부여한다.
  // (UA 위조 여부는 docs/PLAY-STORE.md "안전성" 섹션 참조)
  if (uaIsTWA(req.headers.get('user-agent') ?? '')) {
    requestHeaders.set(PLAY_HEADER, '1');
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
