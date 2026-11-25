import sharp from 'sharp';
import { detectImageMimeType, loadImage } from '@/lib/images';
import { getSharedResult } from '@/lib/sharing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// 공유 OG 카드 1200×630 (카톡 미리보기 최적 규격)
//  · 좌: 공유된 컷 원본(정사각형, 투명 유지) · 우: 브랜드 패널
//  · 이미지 안 한글 텍스트 금지 — 서버 폰트(librsvg+fontconfig)에 한글이 없어
//    깨질 수 있다. 한글 카피는 OG title/description 메타가 담당한다 (카톡이 함께 표시).
//  · sharp 실패 시 원본으로 폴백 (미리보기 자체는 살린다).
// ─────────────────────────────────────────────────────────────

const W = 1200;
const H = 630;
const ART = 630; // 좌측 아트워크 영역 (정사각형)

function brandPanelSvg(label: string): string {
  const safe = label.replace(/[<>&"]/g, '').slice(0, 24);
  return `<svg width="570" height="630" viewBox="0 0 570 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6E29F5"/>
      <stop offset="1" stop-color="#521FCC"/>
    </linearGradient>
  </defs>
  <rect width="570" height="630" fill="url(#g)"/>
  <circle cx="470" cy="90" r="120" fill="#ffffff" opacity="0.10"/>
  <circle cx="90" cy="560" r="150" fill="#ffffff" opacity="0.08"/>
  <circle cx="470" cy="540" r="34" fill="#ffffff" opacity="0.16"/>
  <text x="60" y="220" font-family="sans-serif" font-size="30" font-weight="bold" fill="#ffffff" opacity="0.85" letter-spacing="6">EMOTIHAK</text>
  <text x="60" y="300" font-family="sans-serif" font-size="64" font-weight="bold" fill="#ffffff">My face,</text>
  <text x="60" y="368" font-family="sans-serif" font-size="64" font-weight="bold" fill="#ffffff">my sticker.</text>
  <text x="60" y="440" font-family="sans-serif" font-size="26" fill="#ffffff" opacity="0.85">${safe}</text>
  <rect x="60" y="490" width="300" height="64" rx="32" fill="#ffffff"/>
  <text x="210" y="532" font-family="sans-serif" font-size="26" font-weight="bold" fill="#521FCC" text-anchor="middle">Make mine free</text>
</svg>`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedResult(token);
  const imageId = shared?.frame.imageId;
  if (!shared || !imageId) return new Response('not found', { status: 404 });
  const image = await loadImage(imageId);
  if (!image || image.userId !== shared.pack.userId) return new Response('not found', { status: 404 });

  try {
    const art = await sharp(Buffer.from(image.data))
      .resize(ART - 80, ART - 80, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const artMeta = await sharp(art).metadata();
    const artW = artMeta.width ?? 550;
    const artH = artMeta.height ?? 550;
    // ASCII 만 패널에 사용 (한글·이모지는 tofu 위험) — 라벨에서 ASCII 만 추출
    const ascii = (shared.frame.label || '').replace(/[^\x20-\x7E]/g, '').trim() || 'STICKER';
    const panel = Buffer.from(brandPanelSvg(ascii));
    const png = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 250, g: 248, b: 255, alpha: 1 } },
    })
      .composite([
        { input: art, left: Math.max(0, Math.floor((ART - artW) / 2)), top: Math.max(0, Math.floor((H - artH) / 2)) },
        { input: panel, left: ART, top: 0 },
      ])
      .png()
      .toBuffer();
    return new Response(new Uint8Array(png), { headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    } });
  } catch {
    // 합성 실패해도 미리보기는 살린다 — 원본 반환
    return new Response(new Uint8Array(image.data), { headers: {
      'Content-Type': detectImageMimeType(image.data),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    } });
  }
}
