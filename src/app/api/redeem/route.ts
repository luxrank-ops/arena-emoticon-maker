import { z } from 'zod';
import { bypassesRateLimit } from '@/lib/admin-access';
import { validateAuthRequest } from '@/lib/auth-api';
import { fail, handleError, ok } from '@/lib/api';
import { redeemCatalog, RedeemError, redeemCode } from '@/lib/redeem';
import { enforceRateLimit } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  code: z.string().min(8).max(80),
  /** unlock SKU 교환 시 대상 팩 */
  packId: z.string().min(3).max(80).optional(),
});

/**
 * POST /api/redeem — 교환권 코드 사용
 *  · 결제창 없이 상품을 인도한다 (PG 계약 전 무료 판매 경로).
 *  · 코드 원문은 응답·로그에 남기지 않는다. 시도 제한은 서버(redeem.ts)가 판정한다.
 */
export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'redeem', 10);
    if (limited && !bypassesRateLimit(user)) return limited;
    const body = schema.parse(await req.json());
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip');
    const result = await redeemCode({ userId: user.id, rawCode: body.code, packId: body.packId, ip });
    return ok(result);
  } catch (error) {
    if (error instanceof RedeemError) {
      const res = fail(error.code, error.message, error.status);
      if (error.retryAfterSec) res.headers.set('Retry-After', String(error.retryAfterSec));
      return res;
    }
    return handleError(error);
  }
}

/** GET /api/redeem — 지금 교환할 수 있는 상품 목록 (화면 안내용) */
export async function GET() {
  return ok({ skus: redeemCatalog() });
}
