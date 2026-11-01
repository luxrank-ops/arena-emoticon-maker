import { z } from 'zod';
import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { chooseSheet } from '@/lib/packs';

const schema = z.object({ variantKey: z.string().min(1).max(2) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = schema.parse(await req.json());
    const sheet = await chooseSheet(user.id, params.id, body.variantKey);
    return ok({ sheet });
  } catch (e) {
    return handleError(e);
  }
}
