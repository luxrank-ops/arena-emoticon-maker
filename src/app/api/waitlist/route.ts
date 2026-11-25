import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { enforceRateLimit } from '@/lib/ratelimit';
import { joinWaitlist, waitlistCount, WaitlistError } from '@/lib/waitlist';
import { getLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().min(3).max(320),
  utm: z.object({
    source: z.string().max(80).optional(),
    medium: z.string().max(80).optional(),
    campaign: z.string().max(80).optional(),
    content: z.string().max(80).optional(),
  }).optional(),
  refCode: z.string().max(32).optional(),
});

/** GET /api/waitlist — 누적 사전예약 수 (카운터 표시용, 개인정보 없음) */
export async function GET() {
  try {
    return ok({ total: await waitlistCount() });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/waitlist — 사전예약 등록 (비로그인 가능, 중복은 조용히 성공) */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'waitlist', 3);
    if (limited) return limited;
    const body = schema.parse(await req.json());
    const locale = await getLocale();
    const result = await joinWaitlist({
      email: body.email,
      userId: user.isAuthenticated ? user.id : undefined,
      locale,
      utm: body.utm,
      refCode: body.refCode,
    });
    return ok(result);
  } catch (e) {
    if (e instanceof WaitlistError) return fail(e.code, e.message, e.status);
    return handleError(e);
  }
}
