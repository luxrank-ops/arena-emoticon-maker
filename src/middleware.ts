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
  // TWA 환경 신호를 정규화 헤더로 전달한다. UA는 구매 증명이 아니며,
  // 세션 해석은 크레딧 무차감 플래그만 부여하고 속도·AI 공정 이용 제한은 유지한다.
  // 실제 유료 앱 권한 검증은 Play 라이선스 확인이 별도로 필요하다.
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
