import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { validateAuthRequest } from '@/lib/auth-api';
import { paymentProvider, paymentsUnavailable } from '@/lib/payments';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { GOODS, PLANS } from '@/lib/pricing';
import { withPaymentDB } from '@/lib/store';
import { hasFirestore } from '@/lib/firestore';
import { loadImage, newImageId, saveImage } from '@/lib/images';
import type { GoodsOrder } from '@/lib/types';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

function goodsFulfillmentReady(): boolean { return false; }

const schema = z.object({
  goodsSku: z.string().min(3), frameId: z.string().min(3),
  shipping: z.object({ name: z.string().trim().min(1).max(30), phone: z.string().trim().min(8).max(20), address: z.string().trim().min(5).max(200), memo: z.string().trim().max(100).optional() }),
  agreeNoRefundAfterProduction: z.literal(true),
});

export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req); if (forbidden) return forbidden;
    const user = await getCurrentUser();
    if (!user.isAuthenticated) return fail('LOGIN_REQUIRED', '굿즈 주문을 위해 로그인해 주세요.', 401);
    const limited = enforceRateLimit(user.id, 'goods', RATE_LIMITS.goods);
    if (limited && user.role !== 'admin') return limited;
    // 판매 운영·관리자 이행 도구와 결제 회귀 검증이 완료되기 전까지 절대 열지 않는다.
    if (!goodsFulfillmentReady() || paymentsUnavailable()) return fail('GOODS_UNAVAILABLE', '굿즈 주문은 아직 준비 중입니다.', 503);
    // 프로덕션에서 이미지가 인스턴스 임시 디스크에만 저장되는 설정은 금지한다.
    if (process.env.NODE_ENV === 'production' && !hasFirestore()) return fail('GOODS_UNAVAILABLE', '굿즈 이미지 저장소가 준비되지 않았습니다.', 503);
    const body = schema.parse(await req.json());
    const goods = GOODS.find((g) => g.sku === body.goodsSku);
    if (!goods) return fail('GOODS_NOT_FOUND', '상품을 찾을 수 없습니다', 404);
    const source = await withPaymentDB((db) => {
      const pack = db.packs.find((p) => p.userId === user.id && p.frames.some((f) => f.id === body.frameId));
      const frame = pack?.frames.find((f) => f.id === body.frameId);
      const account = db.users.find((u) => u.id === user.id);
      return frame?.imageId && account ? { imageId: frame.imageId, label: frame.label, line: frame.line, discount: PLANS[account.plan].goodsDiscount } : null;
    });
    if (!source) return fail('FRAME_NOT_FOUND', '완성된 내 컷을 선택해 주세요.', 404);
    const image = await loadImage(source.imageId);
    if (!image || image.userId !== user.id) return fail('FRAME_NOT_FOUND', '컷 이미지를 찾을 수 없습니다.', 404);
    // 팩 삭제나 다시 그리기와 관계없이 주문 당시 이미지를 보관한다.
    const productImageId = newImageId();
    await saveImage(productImageId, user.id, image.data);
    const order: GoodsOrder = {
      id: `ord_${randomUUID()}`, userId: user.id, kind: 'goods', sku: goods.sku,
      title: `${goods.name} (${source.label})`, amount: Math.round(goods.price * (100 - source.discount) / 100),
      credits: 0, plan: null, status: 'PENDING', provider: paymentProvider(), createdAt: new Date().toISOString(),
      frameId: body.frameId, frameThumb: `${source.label} “${source.line}”`, productImageId,
      shipping: body.shipping, goodsStatus: 'PENDING_PAYMENT',
    };
    await withPaymentDB((db) => { db.orders.push(order); });
    // 결제 승인 전에는 주문 완료나 제작 시작으로 표시하지 않는다.
    return ok({ orderId: order.id });
  } catch (e) { return handleError(e); }
}
