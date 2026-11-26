import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { validateAuthRequest } from '@/lib/auth-api';
import { getCurrentUser } from '@/lib/session';
import { withPaymentDB } from '@/lib/store';

export const dynamic = 'force-dynamic';

const schema = z.object({ orderId: z.string().min(6).max(96) });

/**
 * 주문 생성 직후 상태 조회 — 결제 페이지가 주문을 아직 못 볼 때(저장소 반영 지연) 폴링한다.
 *  · KV eventual consistency 로 방금 만든 주문이 잠깐 비어 보이는 경우를 404 대신 기다리게 한다.
 *  · 내 주문만 조회하며(status 외 정보 없음) 결제 상태를 바꾸지 않는다.
 */
export async function GET(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const parsed = schema.safeParse({ orderId: new URL(req.url).searchParams.get('orderId') ?? '' });
    if (!parsed.success) return fail('ORDER_ID_REQUIRED', '주문번호를 확인해 주세요.', 422);

    const user = await getCurrentUser();
    const order = await withPaymentDB(
      (db) => db.orders.find((o) => o.id === parsed.data.orderId && o.userId === user.id) ?? null,
    );
    return ok({ found: Boolean(order), status: order?.status ?? null, kind: order?.kind ?? null });
  } catch (e) {
    return handleError(e);
  }
}
