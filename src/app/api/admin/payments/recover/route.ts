import { z } from 'zod';
import { validateAuthRequest } from '@/lib/auth-api';
import { CheckoutError, recoverCheckout } from '@/lib/checkout';
import { fail, handleError, ok } from '@/lib/api';
import { paymentsUnavailable, paymentsUnavailableResponse } from '@/lib/payments';
import { getCurrentUser } from '@/lib/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { withPaymentDB } from '@/lib/store';

const schema = z.object({ orderId: z.string().min(6).max(64) });
export const runtime = 'nodejs';

/** 운영자가 토스 거래와 주문 소유자를 대조한 뒤 승인된 주문만 복구한다. */
export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req); if (forbidden) return forbidden;
    const admin = await getCurrentUser();
    if (admin.role !== 'admin') return fail('FORBIDDEN', '관리자 권한이 필요합니다', 403);
    const limited = enforceRateLimit(admin.id, 'confirm', RATE_LIMITS.confirm);
    if (limited) return limited;
    if (paymentsUnavailable()) return paymentsUnavailableResponse();
    const { orderId } = schema.parse(await req.json());
    const owner = await withPaymentDB((db) => db.orders.find((order) => order.id === orderId)?.userId ?? null);
    if (!owner) return fail('ORDER_NOT_FOUND', '주문을 찾을 수 없습니다', 404);
    const result = await recoverCheckout(owner, orderId);
    return ok(result);
  } catch (error) {
    if (error instanceof CheckoutError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}
