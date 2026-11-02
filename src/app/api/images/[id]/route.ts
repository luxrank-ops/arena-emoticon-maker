import { getCurrentUser } from '@/lib/session';
import { IMAGE_ID_PATTERN, loadImage } from '@/lib/images';

export const runtime = 'nodejs';

/**
 * GET /api/images/<id>
 * 생성된 컷 이미지를 내려준다. 만든 사람 본인만 볼 수 있다.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!IMAGE_ID_PATTERN.test(params.id)) return new Response('not found', { status: 404 });
  const img = await loadImage(params.id);
  if (!img || img.userId !== user.id) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
