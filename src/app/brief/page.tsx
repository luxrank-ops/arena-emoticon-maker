import Link from 'next/link';
import { Sticker } from '@/components/Sticker';
import { planBrief } from '@/lib/recommend/engine';
import { specFor } from '@/lib/spec';
import { getCurrentUser } from '@/lib/session';
import { PLANS } from '@/lib/pricing';
import { withDB } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function BriefPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const recent = await withDB((db) =>
    db.packs.filter((p) => p.userId === user.id).flatMap((p) => p.frames.map((f) => f.templateId)),
  );
  const plan = planBrief(now, recent);
  const seeds = [...`${now.getFullYear()}${now.getMonth()}${now.getDate()}`].reduce(
    (s, c) => s + c.charCodeAt(0),
    0,
  );

  const items = await Promise.all(
    plan.items.map(async (it, i) => ({
      ...it,
      spec: await specFor(user.id, {
        emotion: it.emotion,
        line: it.line,
        intensity: 76,
        background: 'cream',
        seed: seeds + i * 31,
        templateId: it.templateId,
      }),
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
            요일·시간대·최근 사용 기록으로 오늘 대화에 쓸 8컷을 미리 골랐습니다. 새로 생성하지 않고
            <strong className="text-ink"> 뱅크에서 재조합</strong>해서 매일 아침 원가 0원으로 도착합니다.
          </p>
        </div>
        <div className="card-flat px-4 py-3 text-right text-xs">
          <p className="font-black">{now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
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
              <Sticker spec={it.spec} />
            </div>
            <div className="border-t-2 border-line px-3 py-2">
              <p className="text-[13px] font-black">{it.label}</p>
              <p className="truncate text-[11px] text-sub">“{it.line}”</p>
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
            이미 보유한 표정 뱅크를 재조합하므로 컷당 원가 0원. 구독 유지의 핵심 장치입니다.
          </p>
        </div>
        <div className="card-flat p-4">
          <p className="text-xs font-black">내 얼굴로?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            팩을 만들면 같은 브리핑이 내 얼굴 컷으로 바뀝니다.{' '}
            <Link href="/studio/upload" className="text-coralink underline">만들기 →</Link>
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
