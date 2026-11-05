import { detectImageMimeType, loadImage } from '@/lib/images';
import { getSharedResult } from '@/lib/sharing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedResult(token);
  const imageId = shared?.frame.imageId;
  if (!shared || !imageId) return new Response('not found', { status: 404 });
  const image = await loadImage(imageId);
  if (!image || image.userId !== shared.pack.userId) return new Response('not found', { status: 404 });
  return new Response(image.data, { headers: {
    'Content-Type': detectImageMimeType(image.data),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  } });
}
