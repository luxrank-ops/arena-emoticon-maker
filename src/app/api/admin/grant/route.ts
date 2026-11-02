import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { applyCredits } from '@/lib/credits';
import { uid } from '@/lib/store';

export const dynamic = 'force-dynamic';

const schema = z.object({ amount: z.number().int().min(1).max(100) });

/**
 * POST /api/admin/grant
 * 운영자 본인 계정에만 크레딧을 지급한다 (테스트·운영 지급 용도).
 * 관리자 로그인(운영자 코드)을 마친 세션에서만 동작한다. 다른 사용자에게는 지급할 수 없다.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user.role !== 'admin') return fail('FORBIDDEN', '운영자 로그인이 필요합니다', 403);
    const { amount } = schema.parse(await req.json());
    const { balance } = await applyCredits({
      userId: user.id,
      delta: amount,
      reason: 'ADMIN_GIFT',
      refType: 'admin_grant',
      refId: uid('grant'),
    });
    return ok({ granted: amount, balance });
  } catch (e) {
    return handleError(e);
  }
}
