import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { deletePack, getPackView } from '@/lib/packs';
import { deleteImage } from '@/lib/images';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const view = await getPackView(user.id, id, user);
    return ok(view);
  } catch (e) {
    return handleError(e);
  }
}

/**
 * DELETE /api/packs/<id>
 * 팩과 컷 이미지를 영구 삭제한다. 이 팩 전용 캐릭터 시트도 함께 지운다. 크레딧은 환불하지 않는다.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const { imageIds } = await deletePack(user.id, id);
    const results = await Promise.allSettled(imageIds.map((id) => deleteImage(id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    return ok({ deleted: true, imageCount: imageIds.length, failedImages: failed });
  } catch (e) {
    return handleError(e);
  }
}
