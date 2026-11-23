'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localizedPath, withoutLocalePrefix, type Locale } from '@/lib/i18n/locale';
import { headerNav, isNavActive, navLabel } from '@/lib/nav';

/**
 * 상단 탭 — 데스크톱(lg 이상) 전용 전체 메뉴.
 *  · 모바일의 상단 가로 스크롤 탭 줄은 없애고, 보조 메뉴는 하단 '전체메뉴(≡)' 시트가 맡는다.
 *  · 활성 표시는 하단 바와 같은 판정(isNavActive)을 써서 두 곳의 현재 위치가 어긋나지 않는다.
 */
export function SiteNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || (locale === 'en' ? '/en' : '/');
  const path = withoutLocalePrefix(pathname);
  const items = headerNav(locale);

  return (
    <>
      {items.map((item) => {
        const active = isNavActive(item.key, path);
        return (
          <Link
            key={item.key}
            href={localizedPath(locale, item.href)}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex min-h-10 min-w-[104px] flex-1 basis-0 items-center justify-center whitespace-nowrap rounded-xl px-2 text-center text-xs font-semibold transition sm:text-sm',
              active
                ? 'bg-white/15 font-bold text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white focus-visible:bg-white/10',
            ].join(' ')}
          >
            {navLabel(item, locale)}
          </Link>
        );
      })}
    </>
  );
}
