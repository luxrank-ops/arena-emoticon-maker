import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SharedLandingActions } from '@/components/sharing/SharedLandingActions';
import { getLocale } from '@/lib/i18n/server';
import { tr } from '@/lib/i18n/locale';
import { getSharedResult } from '@/lib/sharing';

export const dynamic = 'force-dynamic';
const CREATE_HREF = '/studio/upload?utm_source=kakaotalk&utm_medium=share&utm_campaign=emoticon_share';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedResult(token);
  if (!shared) return { title: '공유 결과를 찾을 수 없습니다', robots: { index: false, follow: false } };
  const title = `이모티학 ${shared.frame.label} 이모티콘 도착! 🎉`;
  const description = '사진 속 내 표정으로 만든 나만의 이모티콘과 대사 문구를 확인해 보세요.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', images: [{ url: `/api/share/${token}/image`, width: 360, height: 360, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [`/api/share/${token}/image`] },
  };
}

export default async function SharedResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [shared, locale] = await Promise.all([getSharedResult(token), getLocale()]);
  if (!shared) notFound();
  const title = `이모티학 ${shared.frame.label} 이모티콘 도착! 🎉`;
  const expiry = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(shared.share.expiresAt));
  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <div className="card overflow-hidden p-5 text-center sm:p-8">
        <span className="chip !border-primary/20 !bg-primary/10 !text-primary-dark">{tr(locale, '공유된 결과', 'Shared result')}</span>
        <h1 className="mt-4 break-keep text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-sub">{tr(locale, '친구가 완성한 이모티콘 한 컷을 공유했어요. 로그인하지 않아도 결과를 볼 수 있습니다.', 'A friend shared one finished sticker. You can view this result without signing in.')}</p>
        <div className="mx-auto mt-6 aspect-square w-full max-w-[360px] overflow-hidden rounded-3xl border border-line bg-cream shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/share/${token}/image`} alt={`${shared.frame.label} ${tr(locale, '공유 이모티콘', 'shared sticker')}`} className="h-full w-full object-contain" />
        </div>
        <div className="mt-4 rounded-2xl bg-cream px-4 py-3">
          <p className="text-xs font-bold text-sub">{shared.frame.label}</p>
          <p className="mt-1 break-keep text-lg font-black">{shared.frame.line || shared.frame.label}</p>
        </div>
        <SharedLandingActions locale={locale} createHref={CREATE_HREF} />
        <p className="mt-5 text-[11px] leading-relaxed text-sub">{tr(locale, `이 읽기 전용 링크는 ${expiry}까지 유효하며, 소유자가 해제하거나 콘텐츠를 삭제하면 더 이상 열리지 않습니다.`, `This read-only link expires on ${expiry} and stops working if the owner revokes it or deletes the content.`)}</p>
      </div>
    </section>
  );
}
