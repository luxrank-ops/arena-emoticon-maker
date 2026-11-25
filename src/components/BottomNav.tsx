'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Images, Menu, MessageCircle, Sparkles, X } from 'lucide-react';
import { localizedPath, withoutLocalePrefix, type Locale } from '@/lib/i18n/locale';
import { MENU_SHEET, bottomNav, isNavActive, navLabel } from '@/lib/nav';

const ICONS = {
  home: Home,
  create: Sparkles,
  packs: Images,
  reply: MessageCircle,
  menu: Menu,
} as const;

/**
 * 모바일 하단 고정 내비게이션 바.
 *  · 홈·만들기·내 팩·톡 답장 4곳 + 전체메뉴(≡) 1곳, 모두 한 번의 탭으로 닿는다.
 *  · 전체메뉴(≡)는 시트를 열어 앱의 모든 기능을 한 줄 설명과 함께 보여 준다 —
 *    "뭐가 어디에 있는지 모르겠다"는 문제를 상단 가로 스크롤 탭 대신 이 시트가 맡는다.
 *  · 현재 위치는 상단 탭과 같은 판정(isNavActive)으로 표시한다.
 *  · 홈 화면 바로 아래 본문이 가려지지 않도록 layout 이 본문에 같은 높이의 여백을 준다.
 */
export function BottomNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || (locale === 'en' ? '/en' : '/');
  const path = withoutLocalePrefix(pathname);
  const items = bottomNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = (ko: string, en: string) => (locale === 'en' ? en : ko);

  // 화면을 옮기면 시트는 닫는다.
  useEffect(() => {
    // 라우트(pathname)가 바뀌면 시트를 닫는 동기화 — 렌더 파생으로 옮기면 스크롤 잠금 해제 시점이 어긋난다.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 경로 변경에 맞춘 UI 상태 동기화
    setMenuOpen(false);
  }, [pathname]);

  // 시트가 열려 있는 동안은 Esc 로 닫고, 뒤 화면이 따라 스크롤되지 않게 한다.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <>
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t('전체메뉴 닫기', 'Close menu')}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-cyber/45 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('전체메뉴', 'All menus')}
            className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[1.75rem] border-t border-white/70 bg-paper/95 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-24px_60px_-28px_rgba(53,25,120,0.55)] backdrop-blur-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-[1.75rem] border-b border-line/70 bg-paper/90 px-4 py-3 backdrop-blur-xl">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-base font-extrabold leading-tight tracking-[-0.02em]">
                  <span aria-hidden="true" className="h-4 w-1 rounded-full brand-gradient" />
                  {t('전체메뉴', 'All menus')}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-sub">{t('하고 싶은 일을 고르면 바로 이동해요', 'Pick what you want to do')}</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={t('닫기', 'Close')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-cream text-ink transition active:scale-95"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <ul className="grid grid-cols-1 gap-2 px-3 pb-2 pt-3 min-[360px]:grid-cols-2">
              {MENU_SHEET.map((entry) => {
                const active = isNavActive(entry.key, path) && path === entry.href;
                return (
                  <li key={entry.href} className="min-w-0">
                    <Link
                      href={localizedPath(locale, entry.href)}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex h-full items-start gap-2.5 rounded-[1.15rem] border p-3 transition active:scale-[0.99] ${
                        active ? 'border-primary/40 bg-primary/[0.06]' : 'border-line/80 bg-white hover:border-primary/30 hover:bg-primary/[0.03]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[0.85rem] bg-gradient-to-br from-primary/[0.12] to-hot/[0.12] text-lg"
                      >
                        {entry.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block break-keep text-[13px] font-black leading-tight">{locale === 'en' ? entry.en : entry.ko}</span>
                        <span className="mt-0.5 block break-keep text-[11px] leading-snug text-sub">{locale === 'en' ? entry.descEn : entry.descKo}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        aria-label={locale === 'en' ? 'Main sections' : '주요 화면 바로가기'}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-white/90 shadow-[0_-14px_34px_-24px_rgba(53,25,120,0.45)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((item) => {
            const Icon = ICONS[item.key as keyof typeof ICONS] ?? Home;
            const active = isNavActive(item.key, path);
            const label = navLabel(item, locale);
            const inner = (
              <>
                <span
                  className={`grid h-6 w-11 place-items-center rounded-full transition ${
                    active ? 'brand-gradient text-white shadow-[0_6px_14px_-8px_rgba(110,41,245,0.9)]' : ''
                  }`}
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                </span>
                <span className={`w-full truncate text-center text-[11px] leading-none ${active ? 'font-extrabold' : 'font-semibold'}`}>
                  {item.key === 'menu' ? `${label}` : label}
                </span>
              </>
            );
            const className = `flex h-[3.375rem] flex-col items-center justify-center gap-1 px-1 transition active:bg-cream ${
              active ? 'text-primary-dark' : 'text-sub'
            }`;

            // 전체메뉴는 화면 이동이 아니라 시트를 연다.
            if (item.key === 'menu') {
              return (
                <li key={item.key} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-haspopup="dialog"
                    aria-expanded={menuOpen}
                    className={`${className} w-full`}
                  >
                    {inner}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.key} className="min-w-0">
                <Link
                  href={localizedPath(locale, item.href)}
                  aria-current={active ? 'page' : undefined}
                  className={className}
                >
                  {inner}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
