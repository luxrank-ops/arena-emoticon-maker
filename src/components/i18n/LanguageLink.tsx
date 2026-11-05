'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localizedPath, withoutLocalePrefix, type Locale } from '@/lib/i18n/locale';

export function LanguageLink({ locale }: { locale: Locale }) {
  const pathname = usePathname() || (locale === 'en' ? '/en' : '/');
  const target: Locale = locale === 'en' ? 'ko' : 'en';
  const href = target === 'en' ? localizedPath('en', withoutLocalePrefix(pathname)) : withoutLocalePrefix(pathname);
  return (
    <Link href={href} hrefLang={target} className="inline-flex h-10 min-w-0 w-full items-center justify-center whitespace-nowrap rounded-full border-2 border-line bg-white px-2.5 text-xs font-extrabold text-sub transition hover:border-coral hover:text-coralink" aria-label={target === 'en' ? 'Switch to English' : '한국어로 전환'}>
      {target === 'en' ? 'EN' : '한국어'}
    </Link>
  );
}
