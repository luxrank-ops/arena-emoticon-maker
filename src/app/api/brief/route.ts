import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { planBrief } from '@/lib/recommend/engine';
import { specFor } from '@/lib/spec';
import { PLANS } from '@/lib/pricing';
import { logEvent, uid, withDB } from '@/lib/store';

export const dynamic = 'force-dynamic';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const date = todayKey();

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
    const items = await Promise.all(
      (brief as NonNullable<typeof brief>).items.map(async (it, i) => {
        const plan = planBrief(new Date());
        const source = plan.items.find((p) => p.templateId === it.templateId) ?? plan.items[i];
        const spec = await specFor(user.id, {
          emotion: source.emotion,
          line: source.line,
          intensity: 74,
          background: 'cream',
          seed: seeds + i * 31,
          templateId: it.templateId,
        });
        return { ...it, line: source.line, emotion: source.emotion, spec };
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
