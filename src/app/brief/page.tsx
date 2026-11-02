import Link from 'next/link';
import { planBrief } from '@/lib/recommend/engine';
import { findAiCut } from '@/lib/ai-cuts';
import { getCurrentUser } from '@/lib/session';
import { PLANS } from '@/lib/pricing';
import { withDB } from '@/lib/store';
import { formatKstMonthDayWeekday, kstDateKey } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function BriefPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const recent = await withDB((db) =>
    db.packs.filter((p) => p.userId === user.id).flatMap((p) => p.frames.map((f) => f.templateId)),
  );
  const plan = planBrief(now, recent);
  void kstDateKey(now);

  // 브리핑 각 항목에 맞는 내 AI 컷을 붙인다 (새로 그리지 않음)
  const items = await withDB((db) =>
    plan.items.map((it) => ({
      ...it,
      cut: findAiCut(db, user.id, { templateId: it.templateId, emotion: it.emotion }),
    })),
  );

  const locked = user.plan === 'FREE';

  return (
    <div className="wrap py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip !border-ink !bg-lemon !text-ink">Daily Face Brief</span>
          <h1 className="h2 mt-3">{plan.headline}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sub">
            요일·시간대·최근 사용 기록으로 오늘 대화에 쓸 컷을 골랐습니다. 내가 만든 AI 컷을 재사용하므로
            <strong className="text-ink"> 추가 생성 없이</strong> 매일 아침 원가 0원으로 도착합니다.
          </p>
        </div>
        <div className="card-flat px-4 py-3 text-right text-xs">
          <p className="font-black">{formatKstMonthDayWeekday(now)}</p>
          <p className="mt-0.5 text-sub">07:30 자동 도착 · {PLANS[user.plan].name} 플랜</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it, i) => (
          <div key={it.templateId + i} className="card overflow-hidden p-0">
            <div className="relative bg-cream p-2">
              <span className="absolute left-2 top-2 z-10 rounded-full border border-ink bg-paper px-1.5 py-0.5 text-[10px] font-black">
                {i + 1}
              </span>
              {it.cut ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.cut.imageUrl} alt={it.label} className="aspect-square w-full object-contain" />
              ) : (
                <div className="grid aspect-square place-items-center rounded-xl bg-paper p-3 text-center text-[11px] font-bold text-sub">
                  이 감정의 컷이 아직 없어요
                  <br />
                  팩을 만들면 나와요
                </div>
              )}
            </div>
            <div className="border-t-2 border-line px-3 py-2">
              <p className="text-[13px] font-black">{it.label}</p>
              <p className="truncate text-[11px] text-sub">“{it.cut?.line ?? it.line}”</p>
              <p className="mt-1 text-[10px] leading-tight text-sub">{it.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card-flat p-4">
          <p className="text-xs font-black">왜 추천했나</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            만능 컷 25%를 강제 포함하고, 같은 감정이 반복되지 않도록 상한을 걸었습니다.
          </p>
        </div>
        <div className="card-flat p-4">
          <p className="text-xs font-black">원가는?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            이미 만든 AI 컷을 재사용하므로 추가 생성 비용이 없습니다. 구독 유지의 핵심 장치입니다.
          </p>
        </div>
        <div className="card-flat p-4">
          <p className="text-xs font-black">컷이 비어 있나요?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            팩에 없는 감정은 비어 보입니다.{' '}
            <Link href="/studio/upload" className="text-coralink underline">팩 만들기 →</Link>
          </p>
        </div>
      </div>

      {locked ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-ink px-5 py-4 text-cream">
          <p className="text-sm font-bold">
            Free 플랜은 오늘의 브리핑 미리보기만 제공됩니다. Plus는 매일 8컷 + 푸시 알림.
          </p>
          <Link href="/pricing" className="btn-primary !px-4 !py-2 text-xs">
            Plus 살펴보기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
