import Link from 'next/link';
import { QuoteShop } from '@/components/quotes/QuoteShop';
import { isUnlimited, watermarkFor } from '@/lib/admin-access';
import { QUOTE_PACKS, quotePackView } from '@/lib/quote-packs';
import { quotePurchaseIds } from '@/lib/quote-purchases';
import { getCurrentUser } from '@/lib/session';
import { pageMetadata } from '@/lib/seo';
import { PhotoStickerRow } from '@/components/samples/PhotoStickerRow';
import { FACE_PHOTO_CUTS } from '@/lib/photo-samples';
import { getLocale } from '@/lib/i18n/server';
import { tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return pageMetadata({
    path: '/quotes',
    title: '영화·드라마 감성 대사 스튜디오 — 이모티학',
    description: '상황·감정에 맞는 대사 팩을 골라 내 얼굴로 바로 이모티콘을 만드세요. 무료 4컷 미리보기.',
  });
}

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ pack?: string; theme?: string }> }) {
  const [{ pack, theme }, user, locale] = await Promise.all([searchParams, getCurrentUser(), getLocale()]);
  const ownedIds = await quotePurchaseIds(user.id);
  const unlimited = isUnlimited(user);
  const packs = QUOTE_PACKS.map((pack) => quotePackView(pack, unlimited || pack.priceCredits === 0 || ownedIds.includes(pack.id)));

  return (
    <main className="wrap pb-16 pt-8 sm:pt-10">
      <div className="mb-6 grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-3xl">
          <p className="eyebrow">ORIGINAL QUOTE STUDIO</p>
          <h1 className="mt-1 break-keep text-3xl font-black tracking-tight sm:text-4xl">영화·드라마 감성<br className="sm:hidden" /> 대사 스튜디오</h1>
          <p className="mt-3 text-sm leading-relaxed text-sub">유명 작품의 문장을 그대로 가져오지 않고, 장르의 설렘과 여운만 담은 오리지널 대사예요. 마음에 드는 한 줄을 고르고 표정을 바꿔 나만의 이모티콘으로 표현해 보세요.</p>
          <Link href="/quotes?pack=drip-twist" className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-black text-primary-dark">😏 NEW · 킹받는 반전·드립 7테마 66컷 →</Link>
        </div>
        <div className="grid gap-2 sm:justify-items-end">
          <Link href="/studio/upload" className="btn-dark w-full sm:w-auto">✨ AI로도 만들기</Link>
          <Link href="/studio/photo" className="btn-ghost w-full sm:w-auto">📸 내 사진 바로 누끼</Link>
        </div>
      </div>
      <PhotoStickerRow
        cuts={FACE_PHOTO_CUTS}
        locale={locale}
        title={tr(locale, '예시 · 한 줄 + 내 사진 = 실사 짤', 'Example · one line + your photo')}
        note={tr(locale, '대사를 고르면 앱이 내 사진에 그대로 얹어 실사 스티커로 만들어요. 예시 이미지입니다.', 'Pick a line and the app puts it on your photo. Sample image.')}
        className="mb-6 rounded-2xl border border-line/80 bg-cream/60 p-3"
      />
      <div className="mb-6 grid grid-cols-2 gap-2 text-[11px] font-bold text-sub sm:grid-cols-4"><span className="chip justify-center !bg-white">① 테마 팩 선택</span><span className="chip justify-center !bg-white">② 대사 선택</span><span className="chip justify-center !bg-white">③ 감정·배경 변경</span><span className="chip justify-center !bg-white">④ PNG·ZIP 저장</span></div>
      <QuoteShop initialPacks={packs} initialOwnedIds={ownedIds} initialCredits={user.credits} unlimited={unlimited} watermark={watermarkFor(user)} isAuthenticated={user.isAuthenticated} initialPackId={pack} initialGroupId={theme} />
    </main>
  );
}
