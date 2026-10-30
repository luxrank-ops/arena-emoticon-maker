import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createSheet, tonesForPlan } from '@/lib/packs';
import { PLANS } from '@/lib/pricing';

const schema = z.object({
  faceId: z.string().min(3),
  tone: z.enum(['2d-cute', '3d-cartoon', 'sketch', 'mono', 'watercolor', 'caricature']),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = schema.parse(await req.json());
    if (!tonesForPlan(user.plan).includes(body.tone)) {
      return fail('PLAN_LIMIT', `${PLANS[user.plan].name} 플랜은 스타일 ${PLANS[user.plan].styles}종까지 사용할 수 있습니다`, 402);
    }
    const sheet = await createSheet(user.id, body.faceId, body.tone);
    return ok({ sheet });
  } catch (e) {
    return handleError(e);
  }
}
