import { z } from 'zod';
import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createPack } from '@/lib/packs';
import { captureServer } from '@/lib/analytics-server';

const schema = z.object({
  sheetId: z.string().min(3),
  size: z.union([z.literal(12), z.literal(24)]),
  title: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = schema.parse(await req.json());
    const pack = await createPack(user.id, body.sheetId, body.size, body.title);
    void captureServer('pack_created', user.id, { size: pack.size, cost: pack.creditsSpent });
    return ok({ packId: pack.id, size: pack.size, cost: pack.creditsSpent });
  } catch (e) {
    return handleError(e);
  }
}
