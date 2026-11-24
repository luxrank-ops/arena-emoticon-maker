import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { enforceRateLimit } from '@/lib/ratelimit';
import { RedeemError, redeemHistoryFor, redeemStatusFor } from '@/lib/redeem';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ code: z.string().min(8).max(80) });

/** POST /api/redeem/status — 사용 전 코드 상태 확인 (오탈자·만료·이미 사용) */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'redeem-status', 20);
    if (limited) return limited;
    const { code } = schema.parse(await req.json());
    const view = await redeemStatusFor(user.id, code);
    return ok(view);
  } catch (error) {
    if (error instanceof RedeemError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}

/** GET /api/redeem/status — 내가 교환한 이력 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const history = await redeemHistoryFor(user.id);
    return ok({ history });
  } catch (error) {
    return handleError(error);
  }
}
