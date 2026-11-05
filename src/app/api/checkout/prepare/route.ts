import { z } from 'zod';
import { bypassesRateLimit } from '@/lib/admin-access';
import { validateAuthRequest } from '@/lib/auth-api';
import { fail, handleError, ok } from '@/lib/api';
import { checkoutSuspended, checkoutSuspendedResponse, paymentProvider, paymentsUnavailable, paymentsUnavailableResponse } from '@/lib/payments';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/session';
import { withPaymentDB } from '@/lib/store';

const schema = z.object({ orderId: z.string().min(6).max(64), agreeDigital: z.literal(true) });
export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req); if (forbidden) return forbidden;
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'confirm', RATE_LIMITS.confirm);
    if (limited && !bypassesRateLimit(user)) return limited;
    if (paymentsUnavailable()) return paymentsUnavailableResponse();
    if (checkoutSuspended()) return checkoutSuspendedResponse();
    const { orderId } = schema.parse(await req.json());
    const result = await withPaymentDB((db) => {
      const order = db.orders.find((o) => o.id === orderId && o.userId === user.id);
      if (!order || order.provider !== paymentProvider() || (order.kind !== 'credits' && order.kind !== 'goods')) return 'not_found';
      if (order.status !== 'PENDING' || order.paymentKey) return 'unavailable';
      order.consentAt = new Date().toISOString();
      return 'ok';
    });
    if (result === 'not_found') return fail('ORDER_NOT_FOUND', '주문을 찾을 수 없습니다', 404);
    if (result !== 'ok') return fail('ORDER_UNAVAILABLE', '이미 처리 중인 주문입니다. 결제 내역을 확인해 주세요.', 409);
    return ok({ prepared: true });
  } catch (e) { return handleError(e); }
}
