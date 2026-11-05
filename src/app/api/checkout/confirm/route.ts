import { z } from 'zod';
import { bypassesRateLimit } from '@/lib/admin-access';
import { validateAuthRequest } from '@/lib/auth-api';
import { fail, handleError, ok } from '@/lib/api';
import { paymentProvider, paymentsUnavailable, paymentsUnavailableResponse } from '@/lib/payments';
import { getCurrentUser } from '@/lib/session';
import { logEvent, uid, withPaymentDB } from '@/lib/store';
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
    const provider = paymentProvider();
    // 검증된 주문과 결제키를 먼저 영속 저장한다. 타임아웃 후 같은 키로 안전하게 재시도할 수 있다.
    const reserved = await withPaymentDB((db) => {
      const order = db.orders.find((o) => o.id === body.orderId && o.userId === user.id);
      if (!order || (order.kind !== 'credits' && order.kind !== 'goods') || order.provider !== provider) return { error: 'ORDER_NOT_FOUND' as const };
      if (order.amount !== body.amount) return { error: 'AMOUNT_MISMATCH' as const };
      if (!order.consentAt) return { error: 'CONSENT_REQUIRED' as const };
      if (order.paymentKey && order.paymentKey !== body.paymentKey) return { error: 'KEY_MISMATCH' as const };
      if (order.status === 'PAID') return { paid: true as const, order, balance: db.users.find((u) => u.id === user.id)?.credits ?? 0 };
      if (order.status !== 'PENDING') return { error: 'ORDER_UNAVAILABLE' as const };
      if (!db.users.some((u) => u.id === user.id)) return { error: 'ORDER_NOT_FOUND' as const };
      order.paymentKey = body.paymentKey;
      return { paid: false as const, order };
    });
    if ('error' in reserved) return fail(reserved.error ?? 'ORDER_UNAVAILABLE', '주문 또는 결제 정보를 확인해 주세요.', reserved.error === 'ORDER_NOT_FOUND' ? 404 : 409);
    if (reserved.paid) return ok({ orderId: reserved.order.id, alreadyPaid: true, credits: reserved.balance, kind: reserved.order.kind });

    if (provider === 'toss') {
      let response: Response;
      try {
        response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': reserved.order.id,
          },
          body: JSON.stringify({ paymentKey: body.paymentKey, orderId: reserved.order.id, amount: reserved.order.amount }),
          signal: AbortSignal.timeout(15_000), cache: 'no-store',
        });
      } catch { return fail('PAYMENT_RETRY', '승인 결과를 확인하지 못했어요. 다시 확인하거나 고객센터에 문의해 주세요.', 503); }
      // 승인 응답을 놓쳤거나 멱등 응답이 만료된 경우, 결제키로 기존 승인 상태를 조회해 복구한다.
      if (!response.ok) {
        try {
          response = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(body.paymentKey)}`, {
            headers: { Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}` },
            signal: AbortSignal.timeout(15_000), cache: 'no-store',
          });
        } catch { return fail('PAYMENT_RETRY', '승인 결과를 확인하지 못했어요. 다시 확인하거나 고객센터에 문의해 주세요.', 503); }
      }
      if (!response.ok) return fail('PAYMENT_RETRY', '결제 승인 결과를 확인하지 못했어요. 다시 확인하거나 고객센터에 문의해 주세요.', 503);
      const data = await response.json().catch(() => null) as { paymentKey?: string; orderId?: string; totalAmount?: number; status?: string; method?: string } | null;
      if (!data || data.paymentKey !== body.paymentKey || data.orderId !== body.orderId || data.totalAmount !== body.amount || data.status !== 'DONE' || !['카드', '간편결제'].includes(data.method ?? '')) {
        return fail('PAYMENT_REVIEW', '결제 상태를 자동 확인할 수 없어요. 고객센터에 주문번호를 알려 주세요.', 409);
      }
    } else if (provider !== 'mock' || process.env.NODE_ENV === 'production' || !body.paymentKey.startsWith('mock_')) {
      return paymentsUnavailableResponse();
    }

    // 승인 후 주문 상태, 크레딧 원장과 잔액을 한 번의 CAS 트랜잭션에 반영한다.
    const settled = await withPaymentDB((db) => {
      const order = db.orders.find((o) => o.id === body.orderId && o.userId === user.id);
      const account = db.users.find((u) => u.id === user.id);
      if (!order || !account || order.paymentKey !== body.paymentKey || order.provider !== provider || order.amount !== body.amount) return null;
      if (order.status === 'PAID') return { alreadyPaid: true, balance: account.credits };
      if (order.status !== 'PENDING') return null;
      if (order.kind === 'goods') {
        if (!('goodsStatus' in order) || order.goodsStatus !== 'PENDING_PAYMENT' || !order.productImageId) return null;
        order.status = 'PAID'; order.paidAt = new Date().toISOString(); order.goodsStatus = 'AWAITING_FULFILLMENT';
        logEvent(db, user.id, 'order_paid', { orderId: order.id, amount: order.amount, provider });
        return { alreadyPaid: false, balance: account.credits };
      }
      if (db.credits.some((c) => c.userId === user.id && c.reason === 'PURCHASE' && c.refType === 'order' && c.refId === order.id)) return null;
      account.credits += order.credits;
      const now = new Date().toISOString();
      db.credits.push({ id: uid('cr'), userId: user.id, delta: order.credits, reason: 'PURCHASE', refType: 'order', refId: order.id, balanceAfter: account.credits, createdAt: now });
      order.status = 'PAID'; order.paidAt = now;
      logEvent(db, user.id, 'order_paid', { orderId: order.id, amount: order.amount, provider });
      return { alreadyPaid: false, balance: account.credits };
    });
    if (!settled) return fail('PAYMENT_REVIEW', '결제 확인이 필요합니다. 고객센터에 문의해 주세요.', 409);
    return ok({ orderId: body.orderId, alreadyPaid: settled.alreadyPaid, credits: settled.balance, kind: reserved.order.kind });
  } catch (e) { return handleError(e); }
}
