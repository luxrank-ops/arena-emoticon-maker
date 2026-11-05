import { z } from 'zod';
import { authError, validateAuthRequest } from '@/lib/auth-api';
import { createContentReport } from '@/lib/content-reports';
import { ok } from '@/lib/api';
import { enforceRateLimit } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const schema = z.object({
  packId: z.string().min(3).max(100),
  frameId: z.string().min(3).max(100),
  reason: z.enum(['SEXUAL', 'HATE_HARASSMENT', 'VIOLENCE', 'MINOR_SAFETY', 'PRIVACY', 'DECEPTIVE', 'OTHER']),
  details: z.string().trim().max(500).optional(),
});

/** AI 결과를 앱을 떠나지 않고 신고한다. 사진·이미지 바이트는 전송하지 않는다. */
export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'content-report-minute', 5) ?? enforceRateLimit(user.id, 'content-report-day', 20, 86400_000);
    if (limited) return limited;
    const input = schema.parse(await req.json());
    const result = await createContentReport(user.id, input);
    return ok(result, { status: result.deduplicated ? 200 : 201 });
  } catch (error) {
    return authError(error);
  }
}
