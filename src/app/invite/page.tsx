import type { Metadata } from 'next';
import { InvitePanel } from '@/components/referral/InvitePanel';
import { referralSummaryFor } from '@/lib/referral';
import { getCurrentUser } from '@/lib/session';
import { getLocale } from '@/lib/i18n/server';
import { tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = tr(locale, '친구 초대 — 이모티학', 'Invite friends — EmotiHak');
  const description = tr(
    locale,
    '친구가 내 링크로 처음 미리보기 팩을 만들면 나에게 3컷 자동 지급. 하루 최대 5명.',
    'When a friend makes their first preview pack with my link, I get 3 cuts. Up to 5 friends a day.',
  );
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: '/invite',
      images: [{ url: '/og/emotihak-og.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/emotihak-og.png'] },
  };
}

export default async function InvitePage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const summary = await referralSummaryFor(user.id);
  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <div className="card p-6 sm:p-8">
        <span className="chip !border-primary/20 !bg-primary/10 !text-primary-dark">
          {tr(locale, '친구 초대 보너스', 'Invite bonus')}
        </span>
        <h1 className="mt-4 break-keep text-2xl font-black leading-tight sm:text-3xl">
          {tr(locale, '친구가 만들면 나에게 3컷', 'Friends create, I get 3 cuts')}
        </h1>
        <p className="mt-2 break-keep text-sm leading-relaxed text-sub">
          {tr(
            locale,
            '내 초대 링크로 들어온 친구가 처음 미리보기 팩을 완성하면 보너스가 자동 지급됩니다.',
            'When a friend from my link finishes their first preview pack, the bonus lands automatically.',
          )}
        </p>
        <div className="mt-6">
          <InvitePanel locale={locale} summary={summary} />
        </div>
      </div>
    </section>
  );
}
