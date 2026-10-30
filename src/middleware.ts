import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 관리자 페이지 접근 제어
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // 크리에이터 페이지 접근 제어
    if (path.startsWith('/creator') && !['CREATOR', 'ADMIN'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // 공개 페이지는 항상 허용
        if (['/', '/auth/signin', '/auth/signup', '/auth/error', '/pricing', '/gallery'].includes(path)) {
          return true;
        }

        // 대시보드 및 API는 인증 필요
        if (path.startsWith('/dashboard') || path.startsWith('/api/')) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/creator/:path*',
    '/api/generate',
    '/api/user/:path*',
  ],
};