import { z } from 'zod';
import { bypassesRateLimit, isUnlimited } from '@/lib/admin-access';
import { fail, handleError, ok } from '@/lib/api';
import { validateAuthRequest } from '@/lib/auth-api';
import { quotePackView } from '@/lib/quote-packs';
import { purchaseQuotePack, QuotePurchaseError } from '@/lib/quote-purchases';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/session';

const schema = z.object({ packId: z.string().min(3).max(80) });

export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'quotePacks', RATE_LIMITS.quotePacks);
    if (limited && !bypassesRateLimit(user)) return limited;
    const { packId } = schema.parse(await req.json());
    const result = await purchaseQuotePack(user.id, packId, isUnlimited(user));
    return ok({
      pack: quotePackView(result.pack, true),
      balance: result.balance,
      alreadyOwned: result.alreadyOwned,
    });
  } catch (error) {
    if (error instanceof QuotePurchaseError) {
      const status = error.code === 'PACK_NOT_FOUND' ? 404 : error.code === 'INSUFFICIENT_CREDITS' ? 409 : 400;
      return fail(error.code, error.message, status);
    }
    return handleError(error);
  }
}
