import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createSheet, tonesForPlan } from '@/lib/packs';
import { bypassesRateLimit, effectivePlan } from '@/lib/admin-access';
import { PLANS } from '@/lib/pricing';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({
  faceId: z.string().min(3),
  mode: z.enum(['face', 'full']).default('face'),
  subjectKind: z.enum(['person', 'pet']).default('person'),
  tone: z.enum([
    '2d-cute', '3d-cartoon', 'sketch', 'mono', 'watercolor', 'caricature',
    'doodle', 'office-meme', 'clay-3d', 'pixel-art', 'photo-sticker',
  ]),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'sheets', RATE_LIMITS.sheets);
    if (limited && !bypassesRateLimit(user)) return limited;
    const body = schema.parse(await req.json());
    const plan = effectivePlan(user);
    if (!tonesForPlan(plan).includes(body.tone)) {
      return fail('PLAN_LIMIT', `${PLANS[plan].name} 플랜은 스타일 ${PLANS[plan].styles}종까지 사용할 수 있습니다`, 402);
    }
    const sheet = await createSheet(user.id, body.faceId, body.tone, body.mode, body.subjectKind);
    return ok({ sheet });
  } catch (e) {
    return handleError(e);
  }
}
