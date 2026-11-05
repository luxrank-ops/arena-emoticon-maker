import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { creditsLabel, planLabel } from '@/lib/admin-access';
import { LogoutButton } from '@/components/LogoutButton';
import { LanguageLink } from '@/components/i18n/LanguageLink';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export async function SiteHeader() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const planName = planLabel(user);
  const rawCredits = creditsLabel(user);
  const credits = locale === 'en' && rawCredits === '무제한' ? 'Unlimited' : locale === 'en' && rawCredits === '차감 없음' ? 'No deduction' : rawCredits;
  const lp = (href: string) => localizedPath(locale, href);
  const nav = locale === 'en'
    ? [
        { href: '/studio/upload', label: 'Create' },
        { href: '/studio/packs', label: 'My packs' },
        { href: '/support', label: 'Help' },
      ]
    : [
        { href: '/studio/upload', label: '만들기' },
        { href: '/studio/packs', label: '내 팩' },
        { href: '/reply', label: '톡 답장' },
        { href: '/quotes', label: '대사' },
        { href: '/brief', label: '오늘의 브리핑' },
        { href: '/goods', label: '굿즈' },
        { href: '/pricing', label: '요금제' },
      ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink/90 bg-cream/90 backdrop-blur">
      <div className="wrap flex h-16 items-center gap-2 sm:gap-3">
        <Link href={lp('/')} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-lemon text-lg shadow-card">🙂</span>
          <span className="whitespace-nowrap text-base font-black tracking-[-0.04em] min-[380px]:text-lg">{tr(locale, '이모티학', 'EmotiHak')}</span>
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-sub md:inline">beta</span>
        </Link>

        <nav aria-label={tr(locale, '주요 메뉴', 'Main navigation')} className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
          {nav.map((item) => (
            <Link key={item.href} href={lp(item.href)} className="shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold text-ink/80 transition hover:bg-paper hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageLink locale={locale} />
          <div className="hidden shrink-0 sm:block">
            <Link href={lp(locale === 'en' ? '/studio/packs' : '/billing')} className="chip whitespace-nowrap hover:border-ink" title={tr(locale, '크레딧 · 플랜', 'Credits · Plan')}>
              <span className="text-[10px] font-black uppercase tracking-wide text-coralink">{planName}</span>
              <span className="h-3 w-px bg-line" />
              <span>⚡ {credits}</span>
            </Link>
          </div>
          {user.isAuthenticated ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden max-w-[100px] truncate text-xs font-bold lg:block" title={user.name}>{user.name}</span>
              <LogoutButton locale={locale} />
            </div>
          ) : (
            <Link href={lp('/login')} className="btn-primary shrink-0 whitespace-nowrap !px-3 !py-2 text-xs sm:text-sm">{tr(locale, '로그인', 'Sign in')}</Link>
          )}
          <div className="hidden shrink-0 lg:block">
            <Link href={lp('/studio/upload')} className="btn-primary whitespace-nowrap !px-4 !py-2 text-xs">{tr(locale, '만들기', 'Create')}</Link>
          </div>
        </div>
      </div>
      <nav aria-label={tr(locale, '모바일 주요 메뉴', 'Mobile navigation')} className="border-t border-line xl:hidden">
        <div className="wrap flex gap-1 overflow-x-auto whitespace-nowrap py-1">
          {nav.map((item) => <Link key={item.href} href={lp(item.href)} className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-xs font-bold text-ink hover:bg-paper focus-visible:bg-paper">{item.label}</Link>)}
        </div>
      </nav>
    </header>
  );
}
