import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { applyCredits } from '@/lib/credits';
import { logEvent, withDB } from '@/lib/store';
import type { Order } from '@/lib/types';

const schema = z.object({
  orderId: z.string().min(3),
  // 토스페이먼츠 승인 정보 (mock 결제에서는 생략)
  paymentKey: z.string().optional(),
  amount: z.number().optional(),
  agreeDigital: z.literal(true), // 청약철회 제한 고지 동의 (필수)
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = schema.parse(await req.json());

    const order = await withDB((db) => db.orders.find((o) => o.id === body.orderId && o.userId === user.id) ?? null);
    if (!order) return fail('ORDER_NOT_FOUND', '주문을 찾을 수 없습니다');
    if (order.status === 'PAID') return ok({ order, alreadyPaid: true, credits: user.credits });

    // 금액 위변조 검증
    if (body.amount !== undefined && body.amount !== order.amount) {
      return fail('AMOUNT_MISMATCH', '결제 금액이 주문 금액과 일치하지 않습니다', 409);
    }

    // 토스페이먼츠 라이브 승인 (키가 있을 때만)
    const provider = process.env.PAYMENT_PROVIDER ?? 'mock';
    let providerRef = `mock_${Date.now().toString(36)}`;
    if (provider === 'toss' && process.env.TOSS_SECRET_KEY && body.paymentKey) {
      const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey: body.paymentKey, orderId: order.id, amount: order.amount }),
      });
      if (!res.ok) return fail('PAYMENT_FAILED', '결제 승인에 실패했습니다', 402);
      const data = (await res.json()) as { paymentKey?: string };
      providerRef = data.paymentKey ?? providerRef;
    }

    await applyCredits({
      userId: user.id,
      delta: order.credits,
      reason: order.kind === 'subscription' ? 'SUBSCRIPTION_GRANT' : 'PURCHASE',
      refType: 'order',
      refId: order.id,
    });

    const paid: Order = {
      ...order,
      status: 'PAID',
      paidAt: new Date().toISOString(),
      provider: providerRef,
    };

    await withDB((db) => {
      const idx = db.orders.findIndex((o) => o.id === order.id);
      if (idx >= 0) db.orders[idx] = paid;
      const u = db.users.find((x) => x.id === user.id);
      if (u && order.plan) {
        u.plan = order.plan;
        u.lastGrantAt = new Date().toISOString();
      }
      const paidRec = db.orders.find((o) => o.id === order.id) as (typeof db.orders)[number] & { consentAt?: string };
      if (paidRec) paidRec.consentAt = new Date().toISOString();
      logEvent(db, user.id, 'order_paid', { orderId: order.id, amount: order.amount, provider });
    });

    return ok({ order: paid, credits: await balanceOf(user.id), granted: order.credits });
  } catch (e) {
    return handleError(e);
  }
}

async function balanceOf(userId: string) {
  return withDB((db) => db.users.find((u) => u.id === userId)?.credits ?? 0);
}
