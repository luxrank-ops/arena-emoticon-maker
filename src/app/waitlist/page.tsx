import type { Metadata } from 'next';
import Link from 'next/link';
import { WaitlistForm } from '@/components/waitlist/WaitlistForm';
import { waitlistCount } from '@/lib/waitlist';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = tr(locale, '사전예약 — 이모티학 12월 7일 출시', 'Pre-register — EmotiHak launches Dec 7');
  const description = tr(
    locale,
    '내 얼굴로 만드는 3초 이모티콘. 사전예약하면 출시일에 가장 먼저 알려드리고 24컷 1팩 무료 쿠폰을 드립니다.',
    'Stickers from your face in 3 seconds. Pre-register for launch-day notice and a free 24-cut pack coupon.',
  );
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: '/waitlist',
      images: [{ url: '/og/emotihak-og.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/emotihak-og.png'] },
  };
}

const PERKS_KO = [
  { emoji: '🎁', title: '24컷 1팩 무료', body: '출시 후 7일 안에 쓰면 내 얼굴 24컷 팩이 공짜 (선착순 500명)' },
  { emoji: '⚡', title: '출시 당일 우선 입장', body: '남들보다 먼저 만들고 팀 단톡방에 제일 먼저 뿌리기' },
  { emoji: '💌', title: '친구 초대 보너스', body: '초대한 친구가 만들면 나도 3컷, 친구도 혜택 — 출시일부터' },
];

const PERKS_EN = [
  { emoji: '🎁', title: 'Free 24-cut pack', body: 'Make a 24-cut pack of your face free within 7 days of launch (first 500)' },
  { emoji: '⚡', title: 'Launch-day priority', body: 'Create before anyone else and drop it in the group chat first' },
  { emoji: '💌', title: 'Invite bonus', body: 'When an invited friend creates, you both earn bonus cuts from day one' },
];

export default async function WaitlistPage() {
  const locale = await getLocale();
  const total = await waitlistCount();
  const perks = locale === 'en' ? PERKS_EN : PERKS_KO;
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="card p-6 text-center sm:p-10">
        <span className="chip !border-primary/20 !bg-primary/10 !text-primary-dark">
          {tr(locale, '12월 7일 출시 · 사전예약 중', 'Launching Dec 7 · Pre-register now')}
        </span>
        <h1 className="mt-4 break-keep text-3xl font-black leading-tight sm:text-4xl">
          {tr(locale, '내 얼굴로 만드는 3초 이모티콘', 'Stickers from your face in 3 seconds')}
        </h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-sub">
          {tr(
            locale,
            '셀카 1장 올리면 24컷 이모티콘이 3분 만에. 사전예약하고 출시일에 가장 먼저 받아보세요.',
            'Upload one selfie and get a 24-cut sticker pack in 3 minutes. Pre-register and be first on launch day.',
          )}
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <WaitlistForm locale={locale} initialTotal={total} />
        </div>
        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          {perks.map((perk) => (
            <div key={perk.title} className="rounded-2xl bg-cream px-4 py-4">
              <p className="text-xl">{perk.emoji}</p>
              <p className="mt-1 text-[13px] font-black">{perk.title}</p>
              <p className="mt-1 break-keep text-xs leading-relaxed text-sub">{perk.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-sub">
          {tr(locale, '출시 전에도 1컷 맛보기가 열려 있어요 →', 'A 1-cut taster is open before launch →')}{' '}
          <Link href={localizedPath(locale, '/studio/upload')} className="font-bold text-coralink underline">
            {tr(locale, '무료로 1컷 만들기', 'Try one free cut')}
          </Link>
        </p>
      </div>
    </section>
  );
}
