import { getCurrentUser } from '@/lib/session';
import { detectImageMimeType, IMAGE_ID_PATTERN, loadImage } from '@/lib/images';
import { withDB } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!IMAGE_ID_PATTERN.test(id)) return new Response('not found', { status: 404 });
  const img = await loadImage(id);
  if (!img) return new Response('not found', { status: 404 });
  const access = await withDB((db) => {
    const hidden = db.packs.some((pack) => pack.frames.some((frame) => frame.imageId === id && !!frame.hiddenAt));
    const reported = db.contentReports.some((report) => report.status === 'OPEN' && db.packs.some((pack) => pack.id === report.packId && pack.frames.some((frame) => frame.id === report.frameId && frame.imageId === id)));
    return { hidden, reported };
  });
  if (access.hidden || (img.userId !== user.id && !(user.role === 'admin' && access.reported))) return new Response('not found', { status: 404 });
  return new Response(img.data, {
    headers: {
      'Content-Type': detectImageMimeType(img.data),
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
