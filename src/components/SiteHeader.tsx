import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { PLANS } from '@/lib/pricing';
import { LogoutButton } from '@/components/LogoutButton';

const NAV = [
  { href: '/studio/upload', label: '만들기' },
  { href: '/studio/packs', label: '내 팩' },
  { href: '/reply', label: '톡 답장' },
  { href: '/brief', label: '오늘의 브리핑' },
  { href: '/goods', label: '굿즈' },
  { href: '/pricing', label: '요금제' },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const plan = PLANS[user.plan];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink/90 bg-cream/90 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-lemon text-lg shadow-card">
            🙂
          </span>
          <span className="text-lg font-black tracking-[-0.04em]">이모티미</span>
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-sub sm:inline">
            beta
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-2 text-sm font-bold text-ink/80 transition hover:bg-paper hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="chip hover:border-ink"
            title="크레딧 · 플랜"
          >
            <span className="text-[10px] font-black uppercase tracking-wide text-coralink">{user.role === 'admin' ? '관리자' : plan.name}</span>
            <span className="h-3 w-px bg-line" />
            <span>⚡ {user.role === 'admin' ? '무제한' : user.credits}</span>
          </Link>
          {user.isAuthenticated ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="max-w-[80px] truncate text-xs font-bold" title={user.name}>{user.name}</span>
              <LogoutButton />
            </div>
          ) : (
            <Link href="/login" className="btn-primary !px-3 !py-2 text-xs sm:text-sm">로그인</Link>
          )}
          <Link href="/studio/upload" className="btn-primary hidden !px-4 !py-2 text-xs lg:inline-flex">만들기</Link>
        </div>
      </div>
      <nav aria-label="모바일 주요 메뉴" className="border-t border-line md:hidden">
        <div className="wrap flex gap-1 overflow-x-auto whitespace-nowrap py-1">
          {[
            { href: '/studio/upload', label: '만들기' },
            { href: '/studio/packs', label: '내 팩' },
            { href: '/reply', label: '답장 추천' },
            { href: '/pricing', label: '요금제' },
            { href: '/support', label: '도움말' },
          ].map((item) => <Link key={item.href} href={item.href} className="inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-xs font-bold text-ink hover:bg-paper focus-visible:bg-paper">{item.label}</Link>)}
        </div>
      </nav>
    </header>
  );
}
