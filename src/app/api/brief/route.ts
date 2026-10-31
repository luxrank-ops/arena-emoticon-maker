import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { planBrief } from '@/lib/recommend/engine';
import { TEMPLATES_BY_ID } from '@/lib/recommend/templates';
import { specFor } from '@/lib/spec';
import { PLANS } from '@/lib/pricing';
import { logEvent, uid, withDB } from '@/lib/store';
import { kstDateKey } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const date = kstDateKey();

    const existing = await withDB((db) =>
      db.briefs.find((b) => b.userId === user.id && b.date === date) ?? null,
    );

    let brief = existing;
    if (!brief) {
      const recent = await withDB((db) =>
        db.packs.filter((p) => p.userId === user.id).flatMap((p) => p.frames.map((f) => f.templateId)),
      );
      const plan = planBrief(new Date(), recent);
      brief = {
        id: uid('brief'),
        userId: user.id,
        date,
        headline: plan.headline,
        items: plan.items.map((it, i) => ({
          frameId: `brief_${date}_${i}`,
          templateId: it.templateId,
          label: it.label,
          reason: it.reason,
        })),
        createdAt: new Date().toISOString(),
        openedAt: null,
      };
      const created = brief;
      await withDB((db) => {
        db.briefs.push(created);
        logEvent(db, user.id, 'brief_opened', { date });
      });
    }

    const seeds = [...date].reduce((s, c) => s + c.charCodeAt(0), 0);
    // 저장된 브리핑의 각 항목은 '그 템플릿'으로 복원한다.
    // (planBrief 를 다시 돌리면 셔플 때문에 같은 템플릿이 2번 나오거나 다른 컷이 섞인다)
    const items = await Promise.all(
      (brief as NonNullable<typeof brief>).items.map(async (it, i) => {
        const t = TEMPLATES_BY_ID[it.templateId];
        const line = t?.line ?? it.label;
        const emotion = t?.emotion ?? 'joy';
        const spec = await specFor(user.id, {
          emotion,
          line,
          intensity: 74,
          background: 'cream',
          seed: seeds + i * 31,
          templateId: it.templateId,
        });
        return { ...it, line, emotion, spec };
      }),
    );

    return ok({
      brief,
      items,
      headline: brief!.headline,
      plan: PLANS[user.plan].name,
      locked: user.plan === 'FREE',
    });
  } catch (e) {
    return handleError(e);
  }
}
