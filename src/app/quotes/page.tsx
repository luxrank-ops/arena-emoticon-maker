import Link from 'next/link';
import { QuoteShop } from '@/components/quotes/QuoteShop';
import { isUnlimited, watermarkFor } from '@/lib/admin-access';
import { QUOTE_PACKS, quotePackView } from '@/lib/quote-packs';
import { quotePurchaseIds } from '@/lib/quote-purchases';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: '영화·드라마 감성 대사 스튜디오 — 이모티학' };

export default async function QuotesPage() {
  const user = await getCurrentUser();
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
        </div>
        <Link href="/studio/upload" className="btn-dark w-full sm:w-auto">✨ AI로도 만들기</Link>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2 text-[11px] font-bold text-sub sm:grid-cols-4"><span className="chip justify-center !bg-white">① 테마 팩 선택</span><span className="chip justify-center !bg-white">② 대사 선택</span><span className="chip justify-center !bg-white">③ 감정·배경 변경</span><span className="chip justify-center !bg-white">④ PNG·ZIP 저장</span></div>
      <QuoteShop initialPacks={packs} initialOwnedIds={ownedIds} initialCredits={user.credits} unlimited={unlimited} watermark={watermarkFor(user)} isAuthenticated={user.isAuthenticated} />
    </main>
  );
}
