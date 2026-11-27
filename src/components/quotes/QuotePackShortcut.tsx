'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

/** 같은 URL을 다시 눌러도 선택·스크롤·키보드 포커스를 확실히 이동한다. */
export function QuotePackShortcut({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      onNavigate={(event) => {
        const target = document.getElementById('quote-studio');
        if (!target) return; // JS가 없거나 대상이 없으면 일반 링크 이동을 유지한다.
        event.preventDefault();
        if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
          window.history.pushState(null, '', href);
        }
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'start' });
      }}
      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-black text-primary-dark transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      {children}
    </Link>
  );
}
