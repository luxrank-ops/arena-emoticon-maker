import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { purgeExpiredFaces, purgeStats } from '@/lib/purge';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { logEvent, withDB } from '@/lib/store';

const schema = z.object({
  dryRun: z.boolean().optional(),
  /** 예약 시각과 무관하게 전부 파기 (운영 점검용) */
  force: z.boolean().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user.role !== 'admin') return ok({ locked: true });
    return ok({ stats: await purgeStats() });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user.role !== 'admin') return fail('FORBIDDEN', '운영자만 실행할 수 있습니다', 403);

    const limited = enforceRateLimit(user.id, 'adminPurge', RATE_LIMITS.adminPurge);
    if (limited) return limited;

    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await purgeExpiredFaces(Date.now(), { dryRun: body.dryRun, force: body.force });
    await withDB((db) =>
      logEvent(db, user.id, 'face_purged', {
        purged: result.purged,
        dryRun: Boolean(body.dryRun),
        force: Boolean(body.force),
        by: 'admin',
      }),
    );
    return ok({ result, stats: await purgeStats() });
  } catch (e) {
    return handleError(e);
  }
}
