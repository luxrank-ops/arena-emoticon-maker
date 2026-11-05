import { randomUUID } from 'node:crypto';
import { bypassesRateLimit } from '@/lib/admin-access';
import { validateAuthRequest } from '@/lib/auth-api';
import { z } from 'zod';
import { checkoutSuspended, checkoutSuspendedResponse, paymentProvider, paymentsUnavailable, paymentsUnavailableResponse } from '@/lib/payments';
import { uaIsTWA } from '@/lib/twa';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { SKUS } from '@/lib/pricing';
import { withPaymentDB } from '@/lib/store';
import type { Order } from '@/lib/types';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({ sku: z.string().min(3) });

export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'checkout', RATE_LIMITS.checkout);
    if (limited && !bypassesRateLimit(user)) return limited;
    if (paymentsUnavailable()) return paymentsUnavailableResponse();
    if (checkoutSuspended()) return checkoutSuspendedResponse();
    const { sku } = schema.parse(await req.json());
    const item = SKUS[sku];
    if (!item) return fail('SKU_NOT_FOUND', '존재하지 않는 상품입니다');
    if (item.kind !== 'credits') return fail('PRODUCT_UNAVAILABLE', '구독 결제는 준비 중입니다.', 503);
    // 유료 앱(TWA) 사용자: 결제는 이미 구글 플레이에서 완료(유료 다운로드) →
    // 앱 안의 크레딧 주문은 정책상 허용되지 않을 뿐 아니라 불필요하다.
    if (uaIsTWA(req.headers.get('user-agent') ?? '') && item.kind === 'credits') {
      return fail('IAP_POLICY_RESTRICTED', '앱에서는 크레딧 구매가 필요 없습니다 — 모든 기능이 이미 포함되어 있습니다.', 409);
    }

    const order: Order = {
      id: `ord_${randomUUID()}`,
      userId: user.id,
      kind: item.kind,
      sku: item.sku,
      title: item.title,
      amount: item.price, // 금액은 항상 서버가 SKU로 산정 (클라이언트 금액 불신)
      credits: item.credits,
      plan: item.plan,
      status: 'PENDING',
      provider: paymentProvider(),
      createdAt: new Date().toISOString(),
    };

    await withPaymentDB((db) => {
      db.orders.push(order);
    });

    return ok({ order, clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null });
  } catch (e) {
    return handleError(e);
  }
}
