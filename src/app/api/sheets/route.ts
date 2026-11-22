import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createSheet, tonesForPlan } from '@/lib/packs';
import { aiAccess, bypassesRateLimit, effectivePlan } from '@/lib/admin-access';
import { TRIAL_MESSAGES, trialToneAllowed } from '@/lib/free-trial';
import { PLANS } from '@/lib/pricing';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { PACK_FORMAT_IDS } from '@/lib/pack-formats';

const schema = z.object({
  faceId: z.string().min(3),
  mode: z.enum(['face', 'full']).default('face'),
  subjectKind: z.enum(['person', 'pet']).default('person'),
  tone: z.enum([
    '2d-cute', '3d-cartoon', 'sketch', 'mono', 'watercolor', 'caricature',
    'doodle', 'office-meme', 'clay-3d', 'pixel-art', 'photo-sticker',
  ]),
  /** 표현 형태(팩 테마) 5종 — 없으면 기존 감정 위주 구성 */
  format: z.enum(PACK_FORMAT_IDS).optional(),
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
    // 무료 체험: 시안 1장만, 실사 스티커(상위 모델)는 제외 — 원가 방어.
    const access = aiAccess(user);
    if (access === 'trial' && !trialToneAllowed(body.tone)) {
      return fail('TRIAL_TONE_LIMITED', TRIAL_MESSAGES.toneBlocked, 403);
    }
    const sheet = await createSheet(
      user.id, body.faceId, body.tone, body.mode, body.subjectKind, body.format,
      access === 'trial' ? 1 : 3,
    );
    return ok({ sheet });
  } catch (e) {
    return handleError(e);
  }
}
