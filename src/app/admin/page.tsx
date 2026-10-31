import { AdminLogin } from './AdminLogin';
import { PurgePanel } from './PurgePanel';
import { Stat } from '@/components/ui';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { won } from '@/lib/pricing';
import { purgeStats } from '@/lib/purge';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (user.role !== 'admin') {
    return (
      <div className="wrap py-16">
        <div className="mx-auto mb-8 max-w-sm text-center">
          <h1 className="h2">운영 콘솔</h1>
          <p className="mt-2 text-sm text-sub">KPI · 모더레이션 · 결제 상태를 확인합니다.</p>
        </div>
        <AdminLogin
          demoHint={process.env.NODE_ENV !== 'production' || !!process.env.ADMIN_PASSCODE}
          disabled={process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSCODE}
        />
      </div>
    );
  }

  const m = await withDB((db) => {
    const paid = db.orders.filter((o) => o.status === 'PAID');
    const revenue = paid.reduce((s, o) => s + o.amount, 0);
    const frames = db.packs.reduce((s, p) => s + p.frames.length, 0);
    const creditsIssued = db.credits.filter((c) => c.delta > 0).reduce((s, c) => s + c.delta, 0);
    const creditsSpent = Math.abs(db.credits.filter((c) => c.delta < 0).reduce((s, c) => s + c.delta, 0));
    const plans = { FREE: 0, PLUS: 0, STUDIO: 0 };
    for (const u of db.users) plans[u.plan]++;
    return {
      users: db.users.length,
      plans,
      packs: db.packs.length,
      frames,
      revenue,
      subscription: paid.filter((o) => o.kind === 'subscription').reduce((s, o) => s + o.amount, 0),
      goods: paid.filter((o) => o.kind === 'goods').reduce((s, o) => s + o.amount, 0),
      creditsIssued,
      creditsSpent,
      errors: db.events.filter((e) => e.type === 'error').length,
      recent: db.orders.slice(-6).reverse(),
      topFrames: db.packs
        .flatMap((p) => p.frames)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5),
    };
  });

  const purge = await purgeStats();
  const aiCost = m.frames * 54;
  const margin = m.revenue > 0 ? Math.round(((m.revenue - aiCost) / m.revenue) * 100) : 0;

  return (
    <div className="wrap py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip !border-ink !bg-ink !text-cream">Admin</span>
          <h1 className="h2 mt-2">운영 콘솔</h1>
          <p className="mt-1 text-sm text-sub">결제·원가·모더레이션 현황. 실제 데이터입니다.</p>
        </div>
        <span className="chip !bg-cream">원가 가정: 컷당 54원</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="매출 (누적)" value={`${won(m.revenue)}원`} hint={`구독 ${won(m.subscription)}원 · 굿즈 ${won(m.goods)}원`} />
        <Stat label="사용자" value={`${m.users}명`} hint={`Free ${m.plans.FREE} · Plus ${m.plans.PLUS} · Studio ${m.plans.STUDIO}`} />
        <Stat label="생성 컷" value={`${m.frames}컷`} hint={`팩 ${m.packs}개 · AI 원가 ${won(aiCost)}원`} />
        <Stat label="총마진 (추정)" value={`${margin}%`} hint={`크레딧 발행 ${m.creditsIssued} / 사용 ${m.creditsSpent}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <p className="text-sm font-black">최근 주문</p>
          {m.recent.length === 0 ? (
            <p className="py-6 text-center text-xs text-sub">주문이 없습니다</p>
          ) : (
            <table className="mt-3 w-full text-left text-[12px]">
              <thead className="text-[10px] uppercase tracking-wide text-sub">
                <tr>
                  <th className="pb-2">상품</th>
                  <th className="pb-2">상태</th>
                  <th className="pb-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {m.recent.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 font-bold">{o.title}</td>
                    <td className="py-2 text-sub">{o.status}</td>
                    <td className="py-2 text-right font-black">{won(o.amount)}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm font-black">모더레이션 · 안전장치</p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-sub">
              <li>· 셀피 라이브니스 / 타인 사진 신고 차단: <strong className="text-ink">설계 반영</strong></li>
              <li>· 유명인·정치인 유사도 필터: <strong className="text-ink">Step 3</strong></li>
              <li>· AI 생성 표시(메타데이터·라벨): <strong className="text-ink">적용</strong></li>
              <li>· 얼굴 파생 정보 24h 파기: <strong className="text-ink">자동 실행</strong> (크론 + 기회적 스윕)</li>
              <li>· 오류 이벤트: {m.errors}건</li>
            </ul>
          </div>

          <PurgePanel stats={purge} />

          <div className="card p-5">
            <p className="text-sm font-black">가장 많이 쓰인 컷</p>
            {m.topFrames.every((f) => f.usageCount === 0) ? (
              <p className="mt-2 text-[11px] text-sub">아직 사용 로그가 없습니다. Chat-to-Sticker 사용 시 누적됩니다.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-[12px]">
                {m.topFrames.map((f) => (
                  <li key={f.id} className="flex justify-between">
                    <span className="font-bold">{f.label} “{f.line}”</span>
                    <span className="text-sub">{f.usageCount}회</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 rounded-lg border border-line bg-cream px-2 py-1.5 text-[10px] leading-relaxed text-sub">
              이 로그가 추천 엔진의 학습 신호가 됩니다 (사용→추천→사용 루프).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
