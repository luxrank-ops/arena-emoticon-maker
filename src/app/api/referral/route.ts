import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { enforceRateLimit } from '@/lib/ratelimit';
import { claimReferral, ReferralError, referralSummaryFor } from '@/lib/referral';

export const dynamic = 'force-dynamic';

/** GET /api/referral — 내 초대 코드·링크·실적 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const origin = new URL(req.url).origin;
    const summary = await referralSummaryFor(user.id, origin);
    return ok(summary);
  } catch (e) {
    return handleError(e);
  }
}

const schema = z.object({ code: z.string().min(4).max(32) });

/** POST /api/referral — ?ref= 코드 기록 (방문 시 1회, 보상은 첫 체험·가입 때) */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'referral', 10);
    if (limited) return limited;
    const { code } = schema.parse(await req.json());
    const result = await claimReferral(user.id, code);
    return ok(result);
  } catch (e) {
    if (e instanceof ReferralError) return fail(e.code, e.message, e.status);
    return handleError(e);
  }
}
