'use client';

import type { StickerSpec } from '@/lib/types';
import { renderSticker } from '@/lib/art/sticker';

// ─────────────────────────────────────────────────────────────
// 브라우저 내보내기 — PNG / GIF / ZIP (서버 왕복 없음)
// ─────────────────────────────────────────────────────────────

const SIZE = 720;

function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function loadImage(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'sync';
  img.src = svgUrl(svg);
  await img.decode();
  return img;
}

function canvasOf(size = SIZE) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function drawWatermark(ctx: CanvasRenderingContext2D, size: number) {
  const pad = size * 0.035;
  const label = '이모티미';
  ctx.save();
  ctx.font = `800 ${Math.round(size * 0.032)}px Pretendard, system-ui, sans-serif`;
  const w = ctx.measureText(label).width + size * 0.05;
  const h = size * 0.055;
  ctx.fillStyle = 'rgba(25,21,18,0.72)';
  ctx.beginPath();
  ctx.roundRect(size - w - pad, size - h - pad, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#FFFDFA';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size - pad - w / 2, size - pad - h / 2 + 1);
  ctx.restore();
}

export async function renderPngBlob(
  spec: StickerSpec,
  opts: { size?: number; watermark?: boolean } = {},
): Promise<Blob> {
  const size = opts.size ?? SIZE;
  const img = await loadImage(renderSticker(spec));
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  if (spec.background !== 'transparent') {
    ctx.fillStyle = backgroundFill(spec.background);
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(img, 0, 0, size, size);
  if (opts.watermark) drawWatermark(ctx, size);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

function backgroundFill(key: StickerSpec['background']) {
  const map: Record<string, string> = {
    cream: '#FFF3DF',
    mint: '#DFF7EE',
    sky: '#E3F2FE',
    pink: '#FFE6E9',
    lemon: '#FFF6CC',
    dark: '#26221E',
    transparent: 'rgba(0,0,0,0)',
  };
  return map[key] ?? '#FFF3DF';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** 애니메이션 GIF — 생성 API 없이 SVG를 프레임마다 변형해 만든다 */
export async function renderGifBlob(spec: StickerSpec, opts: { frames?: number; size?: number } = {}) {
  const frames = opts.frames ?? 12;
  const size = opts.size ?? 360;
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const base = await loadImage(renderSticker({ ...spec, line: spec.line }));
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const gif = GIFEncoder();

  for (let i = 0; i < frames; i++) {
    const t = (i / frames) * Math.PI * 2;
    const lift = Math.sin(t) * size * 0.022;
    const squish = 1 + Math.sin(t) * 0.02;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2 + lift);
    ctx.scale(squish, 2 - squish);
    ctx.translate(-size / 2, -size / 2);
    ctx.drawImage(base, 0, 0, size, size);
    ctx.restore();
    const { data } = ctx.getImageData(0, 0, size, size);
    const palette = quantize(data, 128, { format: 'rgba4444' });
    const index = applyPalette(data, palette, 'rgba4444');
    gif.writeFrame(index, size, size, { palette, delay: 80, transparent: true });
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

export async function exportPackZip(
  items: { spec: StickerSpec; filename: string }[],
  opts: { watermark?: boolean } = {},
) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const it of items) {
    const blob = await renderPngBlob(it.spec, { watermark: opts.watermark });
    zip.file(`${it.filename}.png`, blob);
  }
  zip.file(
    'README.txt',
    [
      '이모티미(EmotiMe) 팩 내보내기',
      '',
      '· 파일: 360px 규격은 카카오 이모티콘 스튜디오 제안 기준(360×360, 2MB 이하)에 맞춰 제작되었습니다.',
      '· AI 생성 결과물이며, 본인 사용 목적으로 제공됩니다.',
      '· 상업적 사용은 Studio 플랜 라이선스가 필요합니다.',
    ].join('\n'),
  );
  return await zip.generateAsync({ type: 'blob' });
}
