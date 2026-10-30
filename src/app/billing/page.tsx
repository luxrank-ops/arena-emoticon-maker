import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { creditHistory } from '@/lib/credits';
import { withDB } from '@/lib/store';
import { PLANS, won } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  SIGNUP_BONUS: '가입 보너스',
  SUBSCRIPTION_GRANT: '구독 크레딧',
  GENERATION: '팩 생성',
  REFUND: '환불',
  PURCHASE: '크레딧 충전',
  ADMIN_GIFT: '운영 지급',
};

export default async function BillingPage() {
  const user = await getCurrentUser();
  const [history, orders, packs] = await Promise.all([
    creditHistory(user.id, 12),
    withDB((db) => db.orders.filter((o) => o.userId === user.id).slice(-8).reverse()),
    withDB((db) => db.packs.filter((p) => p.userId === user.id).slice(-4).reverse()),
  ]);

  return (
    <div className="wrap py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h2">크레딧 · 플랜</h1>
          <p className="mt-1 text-sm text-sub">팩 1개 = 컷 수만큼 차감, 편집은 무료입니다.</p>
        </div>
        <Link href="/pricing" className="btn-primary !px-4 !py-2 text-xs">플랜 변경</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="card p-6">
          <p className="text-xs font-black uppercase tracking-widest text-sub">{PLANS[user.plan].name} 플랜</p>
          <p className="mt-2 text-4xl font-black">
            {user.credits}
            <span className="ml-1 text-sm font-bold text-sub">크레딧</span>
          </p>
          <p className="mt-1 text-xs text-sub">
            {PLANS[user.plan].price === 0 ? '매월 12크레딧 자동 지급' : `${won(PLANS[user.plan].price)}원 /월 · ${PLANS[user.plan].credits}크레딧`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/pricing" className="btn-ghost !py-2 text-xs">크레딧 충전</Link>
            <Link href="/studio/upload" className="btn-dark !py-2 text-xs">팩 만들기</Link>
          </div>
          <div className="mt-5 rounded-xl border border-line bg-cream p-3 text-[11px] leading-relaxed text-sub">
            원장 기준 잔액과 표시 잔액은 항상 일치하도록 설계되었습니다(append-only ledger).
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-black">최근 크레딧 내역</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {history.length === 0 ? (
              <li className="py-6 text-center text-xs text-sub">내역이 없습니다</li>
            ) : (
              history.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-[13px] font-bold">{REASON_LABEL[h.reason] ?? h.reason}</p>
                    <p className="text-[10px] text-sub">{new Date(h.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                  <span className={`text-sm font-black ${h.delta > 0 ? 'text-mint' : 'text-coralink'}`}>
                    {h.delta > 0 ? '+' : ''}
                    {h.delta}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm font-black">결제 내역</p>
          {orders.length === 0 ? (
            <p className="py-6 text-center text-xs text-sub">결제 내역이 없습니다</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-[13px] font-bold">{o.title}</p>
                    <p className="text-[10px] text-sub">
                      {new Date(o.createdAt).toLocaleDateString('ko-KR')} · {o.status}
                    </p>
                  </div>
                  <span className="text-sm font-black">{won(o.amount)}원</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <p className="text-sm font-black">내 팩</p>
          {packs.length === 0 ? (
            <div className="py-6 text-center text-xs text-sub">
              아직 팩이 없습니다.{' '}
              <Link href="/studio/upload" className="text-coralink underline">첫 팩 만들기 →</Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {packs.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <Link href={`/studio/pack/${p.id}`} className="text-[13px] font-bold hover:underline">
                    {p.title}
                  </Link>
                  <span className="text-[11px] text-sub">
                    {p.size}컷 · {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
