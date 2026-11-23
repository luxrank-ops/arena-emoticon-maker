'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localizedPath, withoutLocalePrefix, type Locale } from '@/lib/i18n/locale';

/**
 * 언어 전환 — 헤더 우측의 작은 토글 칩.
 *  · 현재 언어의 반대 언어만 짧게 보여 준다(EN / KO).
 *  · 예전의 큰 흰 알약 대신 28px 높이의 미니 칩으로 줄여 한 줄에 여유를 만든다.
 */
export function LanguageLink({ locale }: { locale: Locale }) {
  const pathname = usePathname() || (locale === 'en' ? '/en' : '/');
  const target: Locale = locale === 'en' ? 'ko' : 'en';
  const href = target === 'en' ? localizedPath('en', withoutLocalePrefix(pathname)) : withoutLocalePrefix(pathname);
  return (
    <Link
      href={href}
      hrefLang={target}
      className="inline-flex h-7 min-w-[32px] items-center justify-center rounded-full border border-line bg-white/80 px-2 text-[10px] font-black uppercase tracking-[0.08em] text-sub transition hover:border-primary/40 hover:bg-white hover:text-primary-dark"
      aria-label={target === 'en' ? 'Switch to English' : '한국어로 전환'}
    >
      {target === 'en' ? 'EN' : 'KO'}
    </Link>
  );
}
