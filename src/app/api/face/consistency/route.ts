import { createHash, randomBytes } from 'node:crypto';
import { bypassesRateLimit } from '@/lib/admin-access';
import { withDB } from '@/lib/store';
import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { enforceRateLimit } from '@/lib/ratelimit';
import { ConsistencyError, prepareWithFallback } from '@/lib/ai/consistency';
import { consumePlayGeneration } from '@/lib/play-usage';

export const runtime = 'nodejs';
export const maxDuration = 60;
const schema = z.object({
  photo: z.string().max(4_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, '사진 형식을 확인해 주세요'),
  consent: z.literal(true),
  subjectKind: z.enum(['person', 'pet']).default('person'),
});
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'consistency-prepare', 10);
    if (limited && !bypassesRateLimit(user)) return limited;
    const { photo, subjectKind } = schema.parse(await req.json());
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(photo)!;
    const playUsage = await consumePlayGeneration(user);
    const { guidance, method } = await prepareWithFallback({ mimeType: match[1], base64: match[2] }, subjectKind);
    const now = Date.now();
    const token = randomBytes(32).toString('hex');
    const hash = (s: string) => createHash('sha256').update(s).digest('hex');
    await withDB((db) => {
      db.consistencyPreparations = db.consistencyPreparations.filter((item) => item.expiresAt > now);
      db.consistencyPreparations.push({ tokenHash: hash(token), userId: user.id, photoHash: hash(photo), subjectKind, features: guidance.features, expiresAt: now + 60 * 60_000 });
    });
    return ok({ prepared: { token, createdAt: now, method }, playUsage });
  } catch (e) {
    if (e instanceof ConsistencyError) return fail(e.code, e.message, e.code === 'PHOTO_NEEDS_REVIEW' ? 422 : 503);
    return handleError(e);
  }
}
