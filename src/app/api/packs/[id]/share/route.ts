import { z } from 'zod';
import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { createPackShare, revokePackShares } from '@/lib/sharing';
import { enforceRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
const schema = z.object({ frameId: z.string().min(1).max(120) });
const revokeSchema = z.object({ frameId: z.string().min(1).max(120).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'share-create', 20);
    if (limited) return limited;
    const { id } = await params;
    const { frameId } = schema.parse(await req.json());
    const share = await createPackShare(user.id, id, frameId);
    return ok({ share: {
      path: `/share/${share.token}`,
      imagePath: `/api/share/${share.token}/image`,
      title: `이모티학 ${share.label} 이모티콘 도착! 🎉`,
      description: '사진 속 내 표정으로 만든 나만의 이모티콘과 대사 문구를 확인해 보세요.',
      expiresAt: share.expiresAt,
    } });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const { frameId } = revokeSchema.parse(await req.json().catch(() => ({})));
    return ok(await revokePackShares(user.id, id, frameId));
  } catch (e) { return handleError(e); }
}
