import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { GOODS, PLANS, won } from '@/lib/pricing';
import { logEvent, uid, withDB } from '@/lib/store';
import type { GoodsOrder } from '@/lib/types';

const schema = z.object({
  goodsSku: z.string().min(3),
  frameId: z.string().min(3),
  frameLabel: z.string().max(40),
  shipping: z.object({
    name: z.string().min(1).max(30),
    phone: z.string().min(8).max(20),
    address: z.string().min(5).max(200),
    memo: z.string().max(100).optional(),
  }),
  agreeNoRefundAfterProduction: z.literal(true),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = schema.parse(await req.json());
    const goods = GOODS.find((g) => g.sku === body.goodsSku);
    if (!goods) return fail('GOODS_NOT_FOUND', '상품을 찾을 수 없습니다');

    const owned = await withDB((db) =>
      db.packs.some((p) => p.userId === user.id && p.frames.some((f) => f.id === body.frameId)),
    );
    if (!owned) return fail('FRAME_NOT_FOUND', '내 팩의 컷만 굿즈로 만들 수 있습니다.', 403);

    const discount = PLANS[user.plan].goodsDiscount;
    const amount = Math.round((goods.price * (100 - discount)) / 100);

    const order: GoodsOrder = {
      id: uid('gds'),
      userId: user.id,
      kind: 'goods',
      sku: goods.sku,
      title: `${goods.name} (${body.frameLabel})`,
      amount,
      credits: 0,
      plan: null,
      status: 'PAID',
      provider: 'mock',
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      frameId: body.frameId,
      frameThumb: body.frameLabel,
      shipping: body.shipping,
      goodsStatus: 'PRODUCING',
    };

    await withDB((db) => {
      db.orders.push(order);
      logEvent(db, user.id, 'order_paid', { orderId: order.id, amount, kind: 'goods', discount });
    });

    return ok({
      order,
      message: `주문이 접수됐어요. ${won(amount)}원 · 제작 후 영업일 2~3일 내 출고`,
    });
  } catch (e) {
    return handleError(e);
  }
}
