import { z } from 'zod';
import { bypassesRateLimit } from '@/lib/admin-access';
import { validateAuthRequest } from '@/lib/auth-api';
import { CheckoutError, confirmCheckout } from '@/lib/checkout';
import { fail, handleError, ok } from '@/lib/api';
import { paymentsUnavailable, paymentsUnavailableResponse } from '@/lib/payments';
import { getCurrentUser } from '@/lib/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({ orderId: z.string().min(6).max(64), paymentKey: z.string().min(1).max(200), amount: z.number().int().positive() });
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req); if (forbidden) return forbidden;
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'confirm', RATE_LIMITS.confirm);
    if (limited && !bypassesRateLimit(user)) return limited;
    if (paymentsUnavailable()) return paymentsUnavailableResponse();
    const body = schema.parse(await req.json());
    const result = await confirmCheckout(user.id, body);
    return ok(result);
  } catch (error) {
    if (error instanceof CheckoutError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}
