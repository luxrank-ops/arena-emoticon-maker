'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, Home, Images, MessageCircle, Sparkles } from 'lucide-react';
import { localizedPath, withoutLocalePrefix, type Locale } from '@/lib/i18n/locale';
import { bottomNav, isNavActive, navLabel } from '@/lib/nav';

const ICONS = {
  home: Home,
  create: Sparkles,
  packs: Images,
  reply: MessageCircle,
  quotes: Clapperboard,
} as const;

/**
 * 모바일 하단 고정 내비게이션 바.
 *  · 홈·만들기·내 팩·톡 답장·대사 5곳으로 한 번의 탭에 이동한다.
 *  · 현재 위치는 상단 탭과 같은 판정(isNavActive)으로 표시한다.
 *  · 홈 화면 바로 아래 본문이 가려지지 않도록 layout 이 본문에 같은 높이의 여백을 준다.
 */
export function BottomNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || (locale === 'en' ? '/en' : '/');
  const path = withoutLocalePrefix(pathname);
  const items = bottomNav();

  return (
    <nav
      aria-label={locale === 'en' ? 'Main sections' : '주요 화면 바로가기'}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 shadow-[0_-10px_28px_-22px_rgba(26,35,126,0.55)] backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const Icon = ICONS[item.key as keyof typeof ICONS] ?? Home;
          const active = isNavActive(item.key, path);
          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={localizedPath(locale, item.href)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-[3.375rem] flex-col items-center justify-center gap-0.5 px-1 transition active:bg-cream ${
                  active ? 'text-primary-dark' : 'text-sub'
                }`}
              >
                <span className={`grid h-6 w-11 place-items-center rounded-full transition ${active ? 'bg-primary/10' : ''}`}>
                  <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                </span>
                <span className={`w-full truncate text-center text-[11px] leading-none ${active ? 'font-extrabold' : 'font-semibold'}`}>
                  {navLabel(item, locale)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
