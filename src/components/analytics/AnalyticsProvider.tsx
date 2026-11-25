'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, pageview, track } from '@/lib/analytics';

// 랜딩 목적별 이벤트 — 광고·콘텐츠가 어느 화면으로 들어오는지 GA4 에서 바로 나눠 본다.
const PATH_EVENTS: Record<string, string> = {
  '/pricing': 'pricing_view',
  '/studio/photo': 'studio_photo_view',
  '/studio/upload': 'studio_upload_view',
  '/checkout': 'checkout_view',
};

// App Router 에서는 라우트 변경 시 자동 페이지뷰가 없다 → 라우트가 바뀔 때 직접 보낸다.
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // 첫 화면은 GA4 'Google 태그' 가 로드하면서 page_view 를 스스로 보낸다(실서버 요청 로그로 확인).
  // 같은 화면에 page_view 를 또 보내면 조회수가 2배가 되므로 첫 로드만 GA 전송을 건너뛴다.
  const loadedOnce = useRef(false);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    // Bearer share tokens must never be sent as analytics page URLs.
    if (/^(\/en)?\/share\//.test(pathname)) return;
    const isFirst = !loadedOnce.current;
    loadedOnce.current = true;
    pageview(pathname, { ga: !isFirst });
    const base = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
    const event = PATH_EVENTS[base];
    if (event) track(event, { path: base });
  }, [pathname]);

  return <>{children}</>;
}
