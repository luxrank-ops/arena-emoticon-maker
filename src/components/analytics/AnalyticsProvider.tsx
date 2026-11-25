'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, pageview, track } from '@/lib/analytics';

// 랜딩 목적별 이벤트 — 광고·콘텐츠가 어느 화면으로 들어오는지 GA4 에서 바로 나눠 본다.
const PATH_EVENTS: Record<string, string> = {
  '/pricing': 'pricing_view',
  '/studio/photo': 'studio_photo_view',
  '/studio/upload': 'studio_upload_view',
  '/checkout': 'checkout_view',
};

// App Router 에서는 라우트 변경 시 자동 페이지뷰가 없다 → 여기서 직접 보낸다.
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    // Bearer share tokens must never be sent as analytics page URLs.
    if (/^(\/en)?\/share\//.test(pathname)) return;
    pageview(pathname);
    const base = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
    const event = PATH_EVENTS[base];
    if (event) track(event, { path: base });
  }, [pathname]);

  return <>{children}</>;
}
