import type { Metadata } from 'next';
import Link from 'next/link';
import { WaitlistForm } from '@/components/waitlist/WaitlistForm';
import { waitlistCount } from '@/lib/waitlist';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';
import { pageAlternates } from '@/lib/seo';
import { PhotoStickerRow } from '@/components/samples/PhotoStickerRow';
import { FACE_PHOTO_CUTS } from '@/lib/photo-samples';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = tr(locale, '사전예약 — 이모티학 12월 7일 출시', 'Pre-register — EmotiHak launches Dec 7');
  const description = tr(
    locale,
    '내 얼굴로 만드는 12컷 이모티콘. 사전예약하면 출시일에 가장 먼저 알려드리고 12컷 팩 완성권 1회 무료 쿠폰을 드립니다.',
    'A 12-cut sticker pack from your face. Pre-register for the launch-day notice and a free 12-cut pack unlock.',
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
    alternates: await pageAlternates('/waitlist'),
  };
}

const PERKS_KO = [
  { emoji: '🎁', title: '12컷 팩 완성권 1회 무료', body: '출시 후 7일 안에 쓰면 12컷 팩 하나를 무료로 잠금 해제 (선착순 500명)' },
  { emoji: '⚡', title: '출시 당일 우선 입장', body: '남들보다 먼저 만들고 팀 단톡방에 제일 먼저 뿌리기' },
  { emoji: '💌', title: '친구 초대 보너스', body: '초대한 친구가 첫 팩을 만들면 나에게 3컷 자동 지급 — 출시일부터' },
];

const PERKS_EN = [
  { emoji: '🎁', title: 'One free 12-cut pack', body: 'Unlock one 12-cut pack free within 7 days of launch (first 500)' },
  { emoji: '⚡', title: 'Launch-day priority', body: 'Create before anyone else and drop it in the group chat first' },
  { emoji: '💌', title: 'Invite bonus', body: 'When an invited friend makes their first pack, you get 3 cuts from day one' },
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
          {tr(locale, '사진 한 장으로 3분, 내 얼굴 12컷', 'One photo, 12 stickers, 3 minutes')}
        </h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-sub">
          {tr(
            locale,
            '셀카 1장 올리면 12컷 이모티콘을 3분 만에. 무료 4컷을 먼저 보고, 마음에 드는 팩만 잠금 해제하세요.',
            'Upload one selfie and get a 12-cut pack in 3 minutes. See 4 cuts free first, then unlock only the pack you love.',
          )}
        </p>
        <PhotoStickerRow
          cuts={FACE_PHOTO_CUTS.slice(0, 3)}
          locale={locale}
          columns={3}
          title={tr(locale, '예시 · 내 사진으로 만든 실사 짤', 'Example · real-photo stickers from one photo')}
          note={tr(locale, '앱에서는 내 사진으로 똑같이 만듭니다. 예시 이미지입니다.', 'You make your own from your photo. Sample image.')}
          className="mx-auto mt-6 max-w-md"
        />
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
          {tr(locale, '출시 전에도 무료 4컷 미리보기가 열려 있어요 →', 'The free 4-cut preview is already open →')}{' '}
          <Link href={localizedPath(locale, '/studio/upload')} className="font-bold text-coralink underline">
            {tr(locale, '지금 무료로 4컷 보기', 'Preview 4 cuts free')}
          </Link>
        </p>
      </div>
    </section>
  );
}
