import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { authError, validateAuthRequest } from '@/lib/auth-api';
import { reviewContentReport } from '@/lib/content-reports';
import { processImageDeletionJobs } from '@/lib/deletion';
import { enforceRateLimit } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const schema = z.object({
  reportId: z.string().min(3).max(100),
  action: z.enum(['review', 'dismiss', 'hide']),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const user = await getCurrentUser();
    if (user.role !== 'admin') return fail('FORBIDDEN', '운영자만 신고를 검토할 수 있습니다', 403);
    const limited = enforceRateLimit(user.id, 'content-report-review', 30);
    if (limited) return limited;
    const input = schema.parse(await req.json());
    const result = await reviewContentReport(user.id, input);
    const imageDeletion = input.action === 'hide' ? await processImageDeletionJobs() : null;
    return ok({ ...result, imageDeletion });
  } catch (error) {
    return authError(error);
  }
}
