import { z } from 'zod';
import { aiAccess, bypassesRateLimit, isUnlimited } from '@/lib/admin-access';
import { TRIAL_MESSAGES } from '@/lib/free-trial';
import { comicExpressionById } from '@/lib/comic-expressions';
import { presetById } from '@/data/emoticon-presets-150';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createPack } from '@/lib/packs';
import { captureServer } from '@/lib/analytics-server';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({
  sheetId: z.string().min(3),
  size: z.union([z.literal(12), z.literal(16), z.literal(24), z.literal(32)]),
  title: z.string().max(40).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  comicExpressionIds: z.array(z.string().refine((id) => !!comicExpressionById(id))).max(24).optional(),
  /** 표정·포즈 프리셋 150종 (id 1~150, 컷 수만큼 중복 없이) */
  presetIds: z.array(z.number().int().min(1).max(150).refine((id) => !!presetById(id), '알 수 없는 프리셋입니다')).max(32).optional(),
  format: z.enum(['situation', 'parody', 'duo', 'typo', 'combo']).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'packs', RATE_LIMITS.packs);
    if (limited && !bypassesRateLimit(user)) return limited;
    // 무료 체험은 시안 1장 + 컷 2장 맛보기까지만 — 12컷 팩 대량 생성은 막는다.
    if (aiAccess(user) === 'trial') return fail('TRIAL_ONLY', TRIAL_MESSAGES.packBlocked, 403);
    const body = schema.parse(await req.json());
    if (body.comicExpressionIds && (body.comicExpressionIds.length !== body.size || new Set(body.comicExpressionIds).size !== body.size)) return fail('INVALID_COMIC_SELECTION', '코믹 표정을 컷 수만큼 중복 없이 선택해 주세요.', 422);
    if (body.presetIds && (body.presetIds.length !== body.size || new Set(body.presetIds).size !== body.size)) return fail('INVALID_PRESET_SELECTION', '프리셋을 컷 수만큼 중복 없이 선택해 주세요.', 422);
    if (body.presetIds && body.comicExpressionIds) return fail('INVALID_PRESET_SELECTION', '코믹 표정과 프리셋은 함께 고를 수 없습니다.', 422);
    const pack = await createPack(user.id, body.sheetId, body.size, body.title, isUnlimited(user), body.comicExpressionIds, body.locale, body.format, body.presetIds);
    void captureServer('pack_created', user.id, { size: pack.size, cost: pack.creditsSpent });
    return ok({ packId: pack.id, size: pack.size, cost: pack.creditsSpent });
  } catch (e) {
    if ((e as { code?: string }).code === 'REFERENCE_REQUIRED') return fail('REFERENCE_REQUIRED', (e as Error).message, 409);
    if ((e as { code?: string }).code === 'INVALID_SIZE') return fail('INVALID_SIZE', (e as Error).message, 422);
    if ((e as { code?: string }).code === 'INVALID_FORMAT') return fail('INVALID_FORMAT', (e as Error).message, 422);
    if ((e as { code?: string }).code === 'INVALID_PRESET_SELECTION') return fail('INVALID_PRESET_SELECTION', (e as Error).message, 422);
    return handleError(e);
  }
}
