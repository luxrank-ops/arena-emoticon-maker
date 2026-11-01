import { z } from 'zod';
import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { composeFrame } from '@/lib/packs';

const schema = z.object({
  line: z.string().max(34).optional(),
  prop: z.enum(['none', 'coffee', 'laptop', 'phone', 'tissue', 'cake', 'crown', 'heart', 'sweat']).optional(),
  background: z.enum(['transparent', 'cream', 'mint', 'sky', 'pink', 'lemon', 'dark']).optional(),
  intensity: z.number().min(0).max(100).optional(),
  emotion: z
    .enum(['joy','laugh','love','sad','angry','sulk','tired','surprised','smug','cry','king','blank'])
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const patch = schema.parse(await req.json());
    const frame = await composeFrame(user.id, params.id, patch);
    return ok({ frame });
  } catch (e) {
    return handleError(e);
  }
}
