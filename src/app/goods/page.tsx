import Link from 'next/link';
import { GoodsShop } from '@/components/commerce/GoodsShop';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { GOODS, PLANS } from '@/lib/pricing';
import { identityOf, specFromIdentity } from '@/lib/packs';

export const dynamic = 'force-dynamic';

export default async function GoodsPage() {
  const user = await getCurrentUser();
  const data = await withDB((db) => {
    const pack = db.packs
      .filter((p) => p.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!pack) return null;
    const identity = identityOf(db, pack);
    if (!identity) return null;
    const now = Date.now();
    return pack.frames
      .filter((f) => f.readyAt <= now)
      .slice(0, 12)
      .map((f) => ({ id: f.id, label: f.label, line: f.line, spec: specFromIdentity(identity, f) }));
  });

  return (
    <div className="wrap py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1.3fr_0.7fr] md:items-end">
        <div>
          <span className="chip !border-ink !bg-mint/30">Sticker to Goods</span>
          <h1 className="h2 mt-3">내 얼굴 스티커, 손에 쥐기</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sub">
            팩에서 컷 하나를 고르면 아크릴·포토카드·머그로 제작됩니다. 재고 없는 POD 위탁 제작이라
            주문한 만큼만 만들어요. 선물용으로도 인기입니다.
          </p>
        </div>
        <div className="card-flat p-4 text-xs">
          <p className="font-black">배송 · 제작</p>
          <p className="mt-1 text-sub">
            제작 1~2일 + 배송 1~2일 · 3만 원 이상 무료배송
            <br />
            현재 플랜 할인: <strong className="text-ink">{PLANS[user.plan].goodsDiscount}%</strong>
          </p>
        </div>
      </div>

      {data && data.length > 0 ? (
        <GoodsShop frames={data} discount={PLANS[user.plan].goodsDiscount} />
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
