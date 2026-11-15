import Link from 'next/link';
import { planBrief } from '@/lib/recommend/engine';
import { findAiCut } from '@/lib/ai-cuts';
import { getCurrentUser } from '@/lib/session';
import { isAdmin, planLabel } from '@/lib/admin-access';
import { withDB } from '@/lib/store';
import { dailyQuotePicks } from '@/lib/quote-packs';
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
  const hasCuts = items.some((it) => !!it.cut);
  // 컷이 하나도 없을 때는 빈 카드 8개 대신 지금 바로 쓸 수 있는 대사를 보여준다.
  const quotes = hasCuts ? [] : dailyQuotePicks(now, 4);

  const locked = !isAdmin(user) && user.plan === 'FREE';

  return (
    <div className="wrap py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip !border-ink !bg-lemon !text-ink">Daily Face Brief</span>
          <h1 className="h2 mt-3">{hasCuts ? plan.headline : '오늘 쓸 대사 4개'}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sub">
            {hasCuts
              ? '요일·시간대·최근 사용 기록으로 오늘 대화에 쓸 컷을 골랐어요. 이미 만든 컷을 다시 쓰니까 새로 만들 필요가 없습니다.'
              : '아직 만든 컷이 없어서, 오늘 대화에 바로 쓸 수 있는 대사를 골랐어요. 마음에 드는 한 줄을 골라 표정만 바꾸면 됩니다.'}
          </p>
        </div>
        <div className="card-flat px-4 py-3 text-right text-xs">
          <p className="font-black">{formatKstMonthDayWeekday(now)}</p>
          <p className="mt-0.5 text-sub">{planLabel(user)} 플랜 · 매일 새로 골라요</p>
        </div>
      </div>

      {hasCuts ? (
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quotes.map((pick) => (
            <Link
              key={pick.line.id}
              href="/quotes"
              className="card group flex flex-col justify-between gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-sub">
                  {pick.packEmoji} {pick.packTitle} · {pick.line.label}
                </p>
                <p className="mt-2 text-lg font-black leading-snug">“{pick.line.line}”</p>
              </div>
              <span className="text-xs font-black text-coralink group-hover:underline">이 대사로 만들기 →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card-flat p-4">
          <p className="text-xs font-black">컷이 비어 있나요?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            팩에 없는 감정은 비어 보입니다. 대사 스튜디오에서 지금 바로 새 팩을 만들 수 있어요.{' '}
            <Link href="/quotes" className="text-coralink underline">대사 스튜디오로 가기 →</Link>
          </p>
        </div>
        <div className="card-flat p-4">
          <p className="text-xs font-black">브리핑은 어떻게 골라지나요?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            요일·시간대와 최근에 쓴 컷을 보고, 자주 쓰는 표현과 겹치지 않게 고릅니다. 알림 발송은 준비 중이고, 지금은 접속해서 보는 화면으로 제공됩니다.
          </p>
        </div>
      </div>

      {locked ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-ink px-5 py-4 text-cream">
          <p className="text-sm font-bold">
            Free 플랜은 오늘의 브리핑 미리보기만 제공됩니다. Plus는 하루 8컷 브리핑 전체를 볼 수 있어요.
          </p>
          <Link href="/pricing" className="btn-primary !px-4 !py-2 text-xs">
            Plus 살펴보기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
