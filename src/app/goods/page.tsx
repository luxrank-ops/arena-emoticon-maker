import Link from 'next/link';
import { GoodsShop } from '@/components/commerce/GoodsShop';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { GOODS, GOODS_BUNDLE_DISCOUNT } from '@/lib/pricing';
import { identityOf, packExportState, specFromIdentity } from '@/lib/packs';
import { pageMetadata } from '@/lib/seo';
import { getLocale } from '@/lib/i18n/server';
import { tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = await getLocale();
  return pageMetadata({
    path: '/goods',
    title: tr(locale, '내 이모티콘 굿즈 주문 | 이모티학', 'Order goods from your stickers | EmotiHak'),
    description: tr(
      locale,
      '만든 이모티콘 컷으로 스티커·머그·폰케이스를 주문하세요. 팩 보유 시 20% 할인.',
      'Turn your sticker cuts into stickers, mugs and phone cases. 20% off when you own the pack.',
    ),
  });
}

export default async function GoodsPage({ searchParams }: { searchParams: Promise<{ pack?: string; frames?: string; bundle?: string }> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const requested = await withDB((db) => {
    const pack = params.pack
      ? db.packs.find((p) => p.id === params.pack && p.userId === user.id) ?? null
      : db.packs.filter((p) => p.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
    if (!pack) return null;
    const identity = identityOf(db, pack);
    if (!identity) return null;
    // 서버 컴포넌트(요청마다 실행) 안에서의 현재 시각 — 렌더 중 호출이 정상이다.
    // eslint-disable-next-line react-hooks/purity -- 서버 컴포넌트 렌더, 클라이언트 하이드레이션 대상 아님
    const now = Date.now();
    const ready = pack.frames.filter((f) => (pack.renderer === 'ai' ? !!f.imageId : f.readyAt <= now));
    const wanted = (params.frames ?? '').split(',').filter(Boolean);
    const picked = wanted.length ? ready.filter((f) => wanted.includes(f.id)) : ready;
    return {
      packId: pack.id,
      unlocked: packExportState(pack, user).unlocked,
      frames: (picked.length ? picked : ready).slice(0, 12).map((f) => ({ id: f.id, label: f.label, line: f.line, spec: specFromIdentity(identity, f) })),
    };
  });
  const data = requested?.frames ?? null;
  // 팩 잠금 해제 화면에서 이어진 번들(3컷)만 20% 할인 — 팩 소유·잠금 해제가 확인된 경우에만.
  const bundle = params.bundle === '1' && !!requested?.unlocked;
  const discount = bundle ? GOODS_BUNDLE_DISCOUNT : 0;
  const selected = (params.frames ?? '').split(',').filter(Boolean).slice(0, 3);

  return (
    <div className="wrap py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1.3fr_0.7fr] md:items-end">
        <div>
          <span className="chip !border-ink !bg-mint/30">Sticker to Goods</span>
          <h1 className="h2 mt-3">내 얼굴 스티커, 손에 쥐기</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sub">
            방금 만든 최애 3컷으로 아크릴 키링 · 방수 스티커를 만들 수 있어요. 컷 하나를 골라 주문하면 결제 후 운영자가 제작과 배송을 확인합니다.
          </p>
          {bundle ? (
            <p className="mt-2 inline-flex rounded-full border border-coral/40 bg-coral/10 px-3 py-1 text-[11px] font-black text-coralink">
              내 팩 3컷 번들 · {GOODS_BUNDLE_DISCOUNT}% 할인 적용
            </p>
          ) : null}
        </div>
        <div className="card-flat p-4 text-xs">
          <p className="font-black">배송 · 제작</p>
          <p className="mt-1 text-sub">
            제작·배송 일정은 주문 확인 후 안내
            <br />
            팩 번들 할인: <strong className="text-ink">{discount}%</strong>
          </p>
        </div>
      </div>

      {data && data.length > 0 ? (
        <GoodsShop frames={data} discount={discount} initialFrameIds={selected.length ? selected : undefined} />
      ) : (
        <div className="card grid min-h-[280px] place-items-center p-8 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-cream text-2xl shadow-card">
              🖼️
            </div>
            <p className="text-sm font-black">먼저 내 얼굴 팩을 만들어 주세요</p>
            <p className="mt-1 text-xs text-sub">팩의 컷을 골라야 굿즈로 제작할 수 있습니다.</p>
            <Link href="/studio/upload" className="btn-primary mt-4 !px-5 !py-2 text-xs">
              팩 만들기 →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GOODS.map((g) => (
          <div key={g.sku} className="card-flat p-4">
            <div className={`grid h-20 place-items-center rounded-xl bg-gradient-to-br ${g.colors} text-3xl`}>
              {g.emoji}
            </div>
            <p className="mt-2 text-sm font-black">{g.name}</p>
            <p className="text-[11px] text-sub">{g.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
