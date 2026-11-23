import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { creditsLabel, planLabel } from '@/lib/admin-access';
import { LogoutButton } from '@/components/LogoutButton';
import { LanguageLink } from '@/components/i18n/LanguageLink';
import { SiteNav } from '@/components/SiteNav';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export async function SiteHeader() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const planName = planLabel(user);
  const rawCredits = creditsLabel(user);
  const credits = user.role === 'admin' ? '∞' : locale === 'en' && rawCredits === '무제한' ? 'Unlimited' : locale === 'en' && rawCredits === '차감 없음' ? 'No deduction' : rawCredits;
  const lp = (href: string) => localizedPath(locale, href);

  return (
    <header className="sticky top-0 z-40 border-b border-cyber bg-cyber text-white shadow-soft">
      {/* Fixed rows and tracks keep every action visible without irregular wrapping. */}
      <div className="wrap grid grid-cols-1 items-center gap-2 py-2 min-[360px]:gap-1.5 lg:min-h-16 lg:grid-cols-[minmax(190px,1fr)_minmax(560px,1.6fr)] lg:gap-4 lg:py-0">
        <Link href={lp('/')} className="flex min-w-max items-center gap-2 whitespace-nowrap">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/25 bg-primary text-base text-white min-[360px]:h-9 min-[360px]:w-9 min-[360px]:text-lg">🙂</span>
          <span className="whitespace-nowrap text-base font-bold tracking-[-0.025em] min-[360px]:text-lg">{tr(locale, '이모티학', 'EmotiHak')}</span>
        </Link>

        {/* 모바일에서는 하단 고정 바가 주요 위치를 맡으므로 상단은 언어·크레딧·로그인만 남긴다. */}
        <div className="grid grid-cols-[0.7fr_1.15fr_1.15fr] gap-2 lg:grid-cols-[0.72fr_1.2fr_1.3fr_1fr]">
          <LanguageLink locale={locale} />
          <Link
            href={lp(locale === 'en' ? '/studio/packs' : '/billing')}
            className="chip h-10 min-w-0 w-full justify-center whitespace-nowrap !px-2 hover:border-primary"
            title={user.role === 'admin' ? tr(locale, '관리자 · 크레딧 무제한', 'Admin · Unlimited credits') : tr(locale, '크레딧 · 플랜', 'Credits · Plan')}
            aria-label={user.role === 'admin' ? tr(locale, '관리자 · 크레딧 무제한', 'Admin · Unlimited credits') : tr(locale, '크레딧 · 플랜', 'Credits · Plan')}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary-dark">{planName}</span>
            <span className="h-3 w-px shrink-0 bg-line" />
            {user.role === 'admin' ? (
              <span className="grid h-7 min-w-8 place-items-center rounded-full bg-gradient-to-r from-primary to-[#B36CFF] px-2 text-lg font-bold leading-none text-white shadow-sm" aria-hidden="true">∞</span>
            ) : (
              <span className="whitespace-nowrap text-[10px] sm:text-xs">⚡ {credits}</span>
            )}
          </Link>
          {user.isAuthenticated ? (
            <div className="flex h-10 min-w-0 items-center justify-center gap-1 rounded-full border border-line bg-paper px-1 text-ink sm:gap-2 sm:px-2">
              <span className="w-7 truncate whitespace-nowrap text-center text-[10px] font-semibold sm:w-20 sm:text-xs" title={user.name}>{user.name}</span>
              <LogoutButton locale={locale} />
            </div>
          ) : (
            <Link href={lp('/login')} className="btn-primary h-10 min-w-0 w-full whitespace-nowrap !px-2 !py-0 text-xs shadow-none">{tr(locale, '로그인', 'Sign in')}</Link>
          )}
          {/* 만들기 CTA는 데스크톱에만 — 모바일은 하단 고정 바의 '만들기'가 맡아 상단을 비운다.
              (.btn-primary 안에 display:inline-flex 가 있어 hidden 유틸리티가 먹지 않도록 바깥 span으로 감싼다.) */}
          <span className="hidden lg:block">
            <Link href={lp('/studio')} className="btn-primary h-10 min-w-0 w-full whitespace-nowrap !px-2 !py-0 text-xs shadow-none">{tr(locale, '만들기', 'Create')}</Link>
          </span>
        </div>
      </div>

      {/* 모바일 상단의 가로 스크롤 탭 줄은 없앴다 — 보조 메뉴는 하단 '전체메뉴(≡)' 시트가 맡는다.
          데스크톱(lg 이상)에서는 기존 전체 메뉴를 한 줄로 그대로 유지한다. */}
      <nav aria-label={tr(locale, '주요 메뉴', 'Main navigation')} className="hidden border-t border-white/10 lg:block">
        <div className="wrap flex gap-1 py-2">
          <SiteNav locale={locale} />
        </div>
      </nav>
    </header>
  );
}
