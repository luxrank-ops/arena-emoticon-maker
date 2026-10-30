import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const view = await getPackView(user.id, params.id);
    return ok(view);
  } catch (e) {
    return handleError(e);
  }
}
