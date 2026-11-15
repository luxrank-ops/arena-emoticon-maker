import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { validateAuthRequest } from '@/lib/auth-api';
import { bypassesRateLimit } from '@/lib/admin-access';
import { getCurrentUser } from '@/lib/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { isAllowedPlayProduct, listPlayEntitlements, playVerificationConfigured, verifyAndRecordPlayPurchase } from '@/lib/play-purchases';

export const dynamic = 'force-dynamic';

const schema = z.object({
  productId: z.string().trim().min(1).max(200),
  purchaseToken: z.string().trim().min(1).max(4096),
  kind: z.enum(['INAPP', 'SUBS']).optional(),
});

/**
 * POST /api/play/purchases/verify
 *  · 앱(TWA)에서 Digital Goods API 로 받은 purchaseToken 을 서버가 구글에 검증하고,
 *    acknowledge 후 계정에 자격을 기록한다.
 *  · 로그인 필수 — 자격은 기기·UA 가 아니라 계정에 붙는다(재설치·기기 변경에도 유지).
 *  · 응답은 "이 계정에 자격이 있다"는 서버 판정만 담는다. 클라이언트가 스스로 자격을
 *    만들 수 있는 값은 내려주지 않는다.
 *  · 구글 검증 설정이 없으면 503 (아무 자격도 만들지 않는다).
 */
export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    if (!user.isAuthenticated) return fail('LOGIN_REQUIRED', '구매 자격을 계정에 연결하려면 로그인이 필요합니다.', 401);
    const limited = enforceRateLimit(user.id, 'playVerify', RATE_LIMITS.checkout);
    if (limited && !bypassesRateLimit(user)) return limited;
    if (!playVerificationConfigured()) {
      return fail('PLAY_VERIFICATION_UNAVAILABLE', '구글 플레이 구매 검증이 아직 설정되지 않았습니다. 웹 결제를 이용해 주세요.', 503);
    }
    const body = schema.parse(await req.json());
    // 콘솔에 등록한 상품만 자격을 만들 수 있다 (임의 productId 로 원장을 오염시키지 않는다).
    if (!isAllowedPlayProduct(body.productId)) return fail('PLAY_PRODUCT_UNKNOWN', '이 앱에서 판매하지 않는 상품입니다.', 400);
    const record = await verifyAndRecordPlayPurchase(user.id, body);
    return ok({
      entitlement: {
        productId: record.productId,
        kind: record.kind,
        status: record.status,
        expiresAt: record.expiresAt ?? null,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

/** GET /api/play/purchases/verify — 로그인한 계정의 자격 기록(구매 복원 확인용, 토큰 미노출) */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user.isAuthenticated) return fail('LOGIN_REQUIRED', '로그인이 필요합니다.', 401);
    const items = await listPlayEntitlements(user.id);
    return ok({ configured: playVerificationConfigured(), entitlements: items });
  } catch (e) {
    return handleError(e);
  }
}
