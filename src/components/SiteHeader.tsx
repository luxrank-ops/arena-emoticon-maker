import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { creditsLabel, planLabel } from '@/lib/admin-access';
import { BrandMark } from '@/components/BrandMark';
import { LogoutButton } from '@/components/LogoutButton';
import { LanguageLink } from '@/components/i18n/LanguageLink';
import { SiteNav } from '@/components/SiteNav';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

/**
 * 상단 헤더 — 2026 스튜디오 리뉴얼.
 *  · 1단 슬림 유리 바: 브랜드 마크 + 워드마크, 우측은 작은 칩(언어·크레딧·계정)만.
 *  · 예전의 짙은 남색 2단 + 흰 알약 3개(EN / 관리자|∞ / 이름·로그아웃)를 없애
 *    390px 모바일에서도 한 줄에 여유 있게 들어간다.
 *  · 데스크톱의 전체 메뉴 한 줄(PR #109 구조)은 그대로 두되 밝은 세그먼트 바로 다듬는다.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const planName = planLabel(user);
  const rawCredits = creditsLabel(user);
  const credits = user.role === 'admin' ? '∞' : locale === 'en' && rawCredits === '무제한' ? 'Unlimited' : locale === 'en' && rawCredits === '차감 없음' ? 'No deduction' : rawCredits;
  const lp = (href: string) => localizedPath(locale, href);
  const isAdmin = user.role === 'admin';
  const initial = (user.name || tr(locale, '나', 'Me')).trim().slice(0, 1);

  return (
    <header className="sticky top-0 z-40">
      <div className="header-surface header-hairline relative border-b border-white/60">
        <div className="wrap flex h-14 items-center justify-between gap-2 sm:h-16 lg:h-[4.25rem]">
          {/* 브랜드 */}
          <Link href={lp('/')} className="group flex min-w-0 items-center gap-2 sm:gap-2.5">
            <BrandMark
              idSuffix="header"
              className="h-8 w-8 shrink-0 drop-shadow-[0_6px_14px_rgba(110,41,245,0.35)] transition duration-300 group-hover:-rotate-6 group-hover:scale-105 sm:h-9 sm:w-9"
            />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-[17.5px] font-extrabold leading-none tracking-[-0.04em] text-ink sm:text-[19px]">
                {tr(locale, '이모티학', 'EmotiHak')}
              </span>
              <span className="mt-1 hidden whitespace-nowrap text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-primary/70 min-[380px]:block">
                {tr(locale, 'AI 스티커 스튜디오', 'AI sticker studio')}
              </span>
            </span>
          </Link>

          {/* 우측 액션 — 컴팩트 칩 3개 + (데스크톱) 만들기 */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageLink locale={locale} />

            <Link
              href={lp(locale === 'en' ? '/studio/packs' : '/billing')}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.06] px-2 text-[10px] font-extrabold leading-none text-primary-dark transition hover:border-primary/35 hover:bg-primary/10"
              title={isAdmin ? tr(locale, '관리자 · 크레딧 무제한', 'Admin · Unlimited credits') : tr(locale, '크레딧 · 플랜', 'Credits · Plan')}
              aria-label={isAdmin ? tr(locale, '관리자 · 크레딧 무제한', 'Admin · Unlimited credits') : tr(locale, '크레딧 · 플랜', 'Credits · Plan')}
            >
              <span className="hidden uppercase tracking-[0.06em] opacity-80 min-[360px]:inline">{planName}</span>
              <span aria-hidden="true" className="hidden h-2.5 w-px bg-primary/20 min-[360px]:block" />
              {isAdmin ? (
                <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-gradient-to-br from-primary via-[#A855F7] to-hot text-[11px] font-bold leading-none text-white shadow-sm">
                  ∞
                </span>
              ) : (
                <span className="whitespace-nowrap tabular-nums">⚡ {credits}</span>
              )}
            </Link>

            {user.isAuthenticated ? (
              <div className="flex h-7 items-center gap-1 rounded-full border border-line bg-white/80 pl-0.5 pr-0.5 sm:gap-1.5 sm:pl-1">
                <span
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#FF4D8D] text-[10.5px] font-black leading-none text-white"
                  aria-hidden="true"
                >
                  {initial}
                </span>
                <span className="hidden max-w-[74px] truncate text-[11px] font-bold leading-none text-ink/80 sm:block" title={user.name}>
                  {user.name}
                </span>
                <LogoutButton locale={locale} />
              </div>
            ) : (
              <Link href={lp('/login')} className="btn-primary h-7 !px-3 !py-0 text-[11px] font-bold shadow-none">
                {tr(locale, '로그인', 'Sign in')}
              </Link>
            )}

            {/* 만들기 CTA는 데스크톱에만 — 모바일은 하단 고정 바의 '만들기'가 맡는다. */}
            <span className="hidden lg:block">
              <Link href={lp('/studio')} className="btn-primary h-9 !gap-1.5 !px-4 !py-0 text-[13px]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {tr(locale, '만들기', 'Create')}
              </Link>
            </span>
          </div>
        </div>
      </div>

      {/* 데스크톱 전체 메뉴 — 알약형 세그먼트 바 */}
      <nav
        aria-label={tr(locale, '주요 메뉴', 'Main navigation')}
        className="hidden border-b border-line/70 bg-white/55 backdrop-blur-md lg:block"
      >
        <div className="wrap flex items-center gap-1 py-1.5">
          <SiteNav locale={locale} />
        </div>
      </nav>
    </header>
  );
}
