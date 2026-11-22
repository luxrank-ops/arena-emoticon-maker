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
      <div className="wrap grid grid-cols-1 items-center gap-2 py-3 min-[360px]:gap-1 min-[360px]:py-2 lg:min-h-16 lg:grid-cols-[minmax(190px,1fr)_minmax(560px,1.6fr)] lg:gap-4 lg:py-0">
        <Link href={lp('/')} className="flex min-w-max items-center gap-2 whitespace-nowrap">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/25 bg-primary text-lg text-white">🙂</span>
          <span className="whitespace-nowrap text-base font-bold tracking-[-0.025em] min-[360px]:text-lg">{tr(locale, '이모티학', 'EmotiHak')}</span>
        </Link>

        <div className={`grid grid-cols-2 gap-2 ${locale === 'ko' ? 'min-[360px]:grid-cols-[0.72fr_1.2fr_1.3fr_1fr]' : ''} sm:grid-cols-[0.72fr_1.2fr_1.3fr_1fr]`}>
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
          <Link href={lp('/studio/upload')} className="btn-primary h-10 min-w-0 w-full whitespace-nowrap !px-2 !py-0 text-xs shadow-none">{tr(locale, '만들기', 'Create')}</Link>
        </div>
      </div>

      {/* Equal-width items share desktop space; on mobile the primary destinations move to the bottom bar. */}
      <nav aria-label={tr(locale, '주요 메뉴', 'Main navigation')} className="border-t border-white/10">
        <div className="wrap flex gap-1 overflow-x-auto py-2">
          <SiteNav locale={locale} />
        </div>
      </nav>
    </header>
  );
}
