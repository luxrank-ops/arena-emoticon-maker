'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, pageview } from '@/lib/analytics';

// App Router 에서는 라우트 변경 시 자동 페이지뷰가 없다 → 여기서 직접 보낸다.
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    // Bearer share tokens must never be sent as analytics page URLs.
    if (pathname && !/^(\/en)?\/share\//.test(pathname)) pageview(pathname);
  }, [pathname]);

  return <>{children}</>;
}
