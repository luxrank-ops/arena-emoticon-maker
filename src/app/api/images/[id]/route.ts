import { getCurrentUser } from '@/lib/session';
import { IMAGE_ID_PATTERN, loadImage } from '@/lib/images';

export const runtime = 'nodejs';

function detectMimeType(data: Uint8Array): string {
  if (data.length >= 4) {
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'image/png';
    if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) return 'image/webp';
    if (data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg';
  }
  // DEMO_MODE 의 절차적 렌더러는 SVG 를 저장한다. nosniff 헤더에서도 표시되도록 명시한다.
  const prefix = new TextDecoder('utf-8').decode(data.subarray(0, Math.min(data.length, 256))).trimStart();
  if (/^<svg[\s>]/i.test(prefix)) return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!IMAGE_ID_PATTERN.test(id)) return new Response('not found', { status: 404 });
  const img = await loadImage(id);
  if (!img || img.userId !== user.id) return new Response('not found', { status: 404 });
  return new Response(img.data, {
    headers: {
      'Content-Type': detectMimeType(img.data),
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
