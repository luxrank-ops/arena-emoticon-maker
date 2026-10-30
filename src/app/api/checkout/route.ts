import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { SKUS } from '@/lib/pricing';
import { logEvent, uid, withDB } from '@/lib/store';
import type { Order } from '@/lib/types';

const schema = z.object({ sku: z.string().min(3) });

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { sku } = schema.parse(await req.json());
    const item = SKUS[sku];
    if (!item) return fail('SKU_NOT_FOUND', '존재하지 않는 상품입니다');

    const order: Order = {
      id: uid('ord'),
      userId: user.id,
      kind: item.kind,
      sku: item.sku,
      title: item.title,
      amount: item.price, // 금액은 항상 서버가 SKU로 산정 (클라이언트 금액 불신)
      credits: item.credits,
      plan: item.plan,
      status: 'PENDING',
      provider: process.env.PAYMENT_PROVIDER ?? 'mock',
      createdAt: new Date().toISOString(),
    };

    await withDB((db) => {
      db.orders.push(order);
      logEvent(db, user.id, 'order_paid', { stage: 'created', orderId: order.id, amount: order.amount });
    });

    return ok({ order, clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null });
  } catch (e) {
    return handleError(e);
  }
}
