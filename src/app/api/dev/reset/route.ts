import { fail, ok } from '@/lib/api';
import { resetDB } from '@/lib/store';

export async function POST() {
  if (process.env.NODE_ENV === 'production') return fail('FORBIDDEN', '운영 환경에서는 사용할 수 없습니다', 403);
  await resetDB();
  return ok({ reset: true });
}
