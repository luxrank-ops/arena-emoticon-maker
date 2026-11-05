import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { chooseSheet } from '@/lib/packs';

const schema = z.object({ variantKey: z.string().min(1).max(2) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const body = schema.parse(await req.json());
    const sheet = await chooseSheet(user.id, id, body.variantKey);
    return ok({ sheet });
  } catch (e) {
    if ((e as { code?: string }).code === 'REFERENCE_REQUIRED') return fail('REFERENCE_REQUIRED', (e as Error).message, 409);
    return handleError(e);
  }
}
