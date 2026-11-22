'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localizedPath, withoutLocalePrefix, type Locale } from '@/lib/i18n/locale';
import { headerNav, isNavActive, navLabel } from '@/lib/nav';

/**
 * 상단 탭. 모바일에서는 하단 고정 바가 맡는 주요 위치(홈·만들기·내 팩·톡 답장·대사)를
 * 숨기고 나머지(브리핑·굿즈·요금제 등)만 남겨 같은 목적지가 두 번 보이지 않게 한다.
 * 데스크톱에서는 전체 목록을 그대로 보여 준다.
 * 활성 표시는 하단 바와 같은 판정(isNavActive)을 써서 두 곳의 현재 위치가 어긋나지 않는다.
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
              item.primary ? 'hidden lg:flex' : 'flex',
              'min-h-10 min-w-[104px] flex-1 basis-0 items-center justify-center whitespace-nowrap rounded-xl px-2 text-center text-xs font-semibold transition sm:text-sm',
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
