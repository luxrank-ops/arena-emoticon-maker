import { z } from 'zod';
import { comicExpressionById } from '@/lib/comic-expressions';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createPack } from '@/lib/packs';
import { captureServer } from '@/lib/analytics-server';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({
  sheetId: z.string().min(3),
  size: z.union([z.literal(12), z.literal(16), z.literal(24)]),
  title: z.string().max(40).optional(),
  comicExpressionIds: z.array(z.string().refine((id) => !!comicExpressionById(id))).max(24).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'packs', RATE_LIMITS.packs);
    if (limited && user.role !== 'admin') return limited;
    const body = schema.parse(await req.json());
    if (body.comicExpressionIds && (body.comicExpressionIds.length !== body.size || new Set(body.comicExpressionIds).size !== body.size)) return fail('INVALID_COMIC_SELECTION', '코믹 표정을 컷 수만큼 중복 없이 선택해 주세요.', 422);
    const pack = await createPack(user.id, body.sheetId, body.size, body.title, user.role === 'admin', body.comicExpressionIds);
    void captureServer('pack_created', user.id, { size: pack.size, cost: pack.creditsSpent });
    return ok({ packId: pack.id, size: pack.size, cost: pack.creditsSpent });
  } catch (e) {
    if ((e as { code?: string }).code === 'REFERENCE_REQUIRED') return fail('REFERENCE_REQUIRED', (e as Error).message, 409);
    if ((e as { code?: string }).code === 'INVALID_SIZE') return fail('INVALID_SIZE', (e as Error).message, 422);
    return handleError(e);
  }
}
