import { z } from 'zod';
import { aiAccess, bypassesRateLimit, isUnlimited } from '@/lib/admin-access';
import { TRIAL_MESSAGES, consumeTrialPreviewPack, trialIpHash } from '@/lib/free-trial';
import { comicExpressionById } from '@/lib/comic-expressions';
import { presetById } from '@/data/emoticon-presets-150';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createPack } from '@/lib/packs';
import { captureServer } from '@/lib/analytics-server';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { PACK_FORMAT_IDS } from '@/lib/pack-formats';
import { isCurationPackageId } from '@/data/curation-packages';
import { rewardReferralForInvitee } from '@/lib/referral';

const schema = z.object({
  sheetId: z.string().min(3),
  size: z.union([z.literal(12), z.literal(16), z.literal(24), z.literal(32)]),
  title: z.string().max(40).optional(),
  locale: z.enum(['ko', 'en']).optional(),
  comicExpressionIds: z.array(z.string().refine((id) => !!comicExpressionById(id))).max(24).optional(),
  /** 표정·포즈 프리셋 150종 (id 1~150, 컷 수만큼 중복 없이) */
  presetIds: z.array(z.number().int().min(1).max(150).refine((id) => !!presetById(id), '알 수 없는 프리셋입니다')).max(32).optional(),
  format: z.enum(PACK_FORMAT_IDS).optional(),
  curationPackageId: z.string().refine(isCurationPackageId, '알 수 없는 큐레이션 패키지입니다.').optional(),
  /** 무료 12컷 워터마크 미리보기 팩 (체험 사용자 전용) */
  preview: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'packs', RATE_LIMITS.packs);
    if (limited && !bypassesRateLimit(user)) return limited;
    const body = schema.parse(await req.json());
    const access = aiAccess(user);
    const preview = body.preview === true;
    if (preview) {
      // 무료 미리보기 팩 — 사용자·IP 하루 1팩, 12컷 전체를 워터마크로.
      if (access !== 'trial') return fail('PREVIEW_ONLY', '무료 미리보기는 무료 체험 사용자에게만 제공됩니다.', 403);
      if (body.size !== 12) return fail('INVALID_SIZE', '무료 미리보기는 12컷으로만 만들 수 있어요.', 422);
      await consumeTrialPreviewPack({ userId: user.id, ipHash: trialIpHash(req) });
    } else if (access === 'trial') {
      // 체험 사용자는 미리보기 팩 외의 12/24/32컷 대량 생성을 할 수 없다 (원가 방어).
      return fail('TRIAL_ONLY', TRIAL_MESSAGES.packBlocked, 403);
    }
    if (body.comicExpressionIds && (body.comicExpressionIds.length !== body.size || new Set(body.comicExpressionIds).size !== body.size)) return fail('INVALID_COMIC_SELECTION', '코믹 표정을 컷 수만큼 중복 없이 선택해 주세요.', 422);
    if (body.presetIds && (body.presetIds.length !== body.size || new Set(body.presetIds).size !== body.size)) return fail('INVALID_PRESET_SELECTION', '프리셋을 컷 수만큼 중복 없이 선택해 주세요.', 422);
    if (body.presetIds && body.comicExpressionIds) return fail('INVALID_PRESET_SELECTION', '코믹 표정과 프리셋은 함께 고를 수 없습니다.', 422);
    if (body.curationPackageId && (body.presetIds || body.comicExpressionIds || body.format)) return fail('INVALID_PRESET_SELECTION', '큐레이션 패키지는 다른 팩 구성과 함께 사용할 수 없습니다.', 422);
    const pack = await createPack(user.id, body.sheetId, body.size, body.title, isUnlimited(user), body.comicExpressionIds, body.locale, body.format, body.presetIds, { preview, curationPackageId: body.curationPackageId });
    void captureServer('pack_created', user.id, { size: pack.size, cost: pack.creditsSpent });
    // 초대받은 사람이 실제로 첫 미리보기 팩을 만들었을 때 초대한 사람에게 3컷을 지급한다.
    if (preview) void rewardReferralForInvitee(user.id).catch(() => undefined);
    return ok({ packId: pack.id, size: pack.size, cost: pack.creditsSpent });
  } catch (e) {
    if ((e as { code?: string }).code === 'REFERENCE_REQUIRED') return fail('REFERENCE_REQUIRED', (e as Error).message, 409);
    if ((e as { code?: string }).code === 'INVALID_SIZE') return fail('INVALID_SIZE', (e as Error).message, 422);
    if ((e as { code?: string }).code === 'INVALID_FORMAT') return fail('INVALID_FORMAT', (e as Error).message, 422);
    if ((e as { code?: string }).code === 'PET_PHOTO_REQUIRED') return fail('PET_PHOTO_REQUIRED', (e as Error).message, 422);
    if ((e as { code?: string }).code === 'TRIAL_LIMIT') return fail('TRIAL_LIMIT', (e as Error).message, 429);
    if ((e as { code?: string }).code === 'INVALID_PRESET_SELECTION') return fail('INVALID_PRESET_SELECTION', (e as Error).message, 422);
    if ((e as { code?: string }).code === 'INVALID_CURATION_PACKAGE') return fail('INVALID_CURATION_PACKAGE', (e as Error).message, 422);
    return handleError(e);
  }
}
