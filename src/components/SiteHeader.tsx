import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { PLANS } from '@/lib/pricing';

const NAV = [
  { href: '/studio/upload', label: '만들기' },
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
            <span className="text-[10px] font-black uppercase tracking-wide text-coralink">{plan.name}</span>
            <span className="h-3 w-px bg-line" />
            <span>⚡ {user.credits}</span>
          </Link>
          <Link href="/studio/upload" className="btn-primary !px-4 !py-2 text-xs sm:text-sm">
            무료로 만들기
          </Link>
        </div>
      </div>
    </header>
  );
}
