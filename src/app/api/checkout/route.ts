import { randomUUID } from 'node:crypto';
import { bypassesRateLimit } from '@/lib/admin-access';
import { validateAuthRequest } from '@/lib/auth-api';
import { z } from 'zod';
import { checkoutSuspended, checkoutSuspendedResponse, paymentProvider, paymentsUnavailable, paymentsUnavailableResponse } from '@/lib/payments';
import { uaIsTWA } from '@/lib/twa';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { SKUS, unlockSkuForPack } from '@/lib/pricing';
import { withPaymentDB } from '@/lib/store';
import type { Order } from '@/lib/types';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({
  sku: z.string().min(3),
  /** 단건 팩 완성권 — 잠금 해제할 팩 */
  packId: z.string().min(3).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'checkout', RATE_LIMITS.checkout);
    if (limited && !bypassesRateLimit(user)) return limited;
    if (paymentsUnavailable()) return paymentsUnavailableResponse();
    if (checkoutSuspended()) return checkoutSuspendedResponse();
    const { sku, packId } = schema.parse(await req.json());
    const item = SKUS[sku];
    if (!item || item.visible === false) return fail('SKU_NOT_FOUND', '존재하지 않는 상품입니다');
    if (item.kind === 'unlock') {
      if (!packId) return fail('PACK_REQUIRED', '잠금 해제할 팩을 확인해 주세요.', 422);
      const pack = await withPaymentDB((db) => db.packs.find((p) => p.id === packId && p.userId === user.id) ?? null);
      if (!pack) return fail('PACK_NOT_FOUND', '팩을 찾을 수 없습니다.', 404);
      if (pack.unlockedAt) return fail('ALREADY_UNLOCKED', '이미 잠금이 해제된 팩입니다.', 409);
      // 팩 구성에 맞는 완성권만 쓸 수 있다 (2인·반려동물 가격 분리).
      const expected = unlockSkuForPack(pack.format, pack.subjectKind);
      if (expected !== item.sku) return fail('SKU_MISMATCH', '이 팩에 맞는 완성권을 선택해 주세요.', 422);
    }
    // 유료 앱(TWA) 사용자: 결제는 이미 구글 플레이에서 완료(유료 다운로드) →
    // 앱 안의 디지털 상품 주문은 정책상 허용되지 않을 뿐 아니라 불필요하다.
    if (uaIsTWA(req.headers.get('user-agent') ?? '') && item.kind !== 'goods') {
      return fail('IAP_POLICY_RESTRICTED', '앱에서는 추가 결제가 필요 없습니다 — 모든 기능이 이미 포함되어 있습니다.', 409);
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
      ...(item.kind === 'unlock' && packId ? { packId } : {}),
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
