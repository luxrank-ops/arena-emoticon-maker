import { z } from 'zod';
import { cookies } from 'next/headers';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';

const schema = z.object({ passcode: z.string().min(1).max(64) });

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { passcode } = schema.parse(await req.json());
    const expected = process.env.ADMIN_PASSCODE ?? 'emotime-demo';
    if (passcode !== expected) return fail('FORBIDDEN', '운영자 코드가 올바르지 않습니다', 401);

    await withDB((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (u) u.role = 'admin';
    });
    cookies().set('emotime_admin', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600 });
    return ok({ admin: true });
  } catch (e) {
    return handleError(e);
  }
}
