'use client';

import type { StickerSpec } from '@/lib/types';
import { renderSticker } from '@/lib/art/sticker';
import { KAKAO_RULES, KAKAO_ANIMATED_RULES, validateKakaoFiles, type PackValidation } from '@/lib/packager';
import { applyMask, applyWhiteOutline, computeAlphaMask, outlineSilhouette } from '@/lib/studio/matte';
import { assembleApng } from '@/lib/studio/apng';
import { drawLayers, normalizeLayers, type TextLayer } from '@/lib/studio/layers';
import { captionFontCss, ensureCaptionFonts } from '@/lib/svg-fonts';
import {
  DEFAULT_MOTION,
  motionById,
  motionParticlesAt,
  motionTransformAt,
  type MotionId,
} from '@/lib/studio/motion';

// ─────────────────────────────────────────────────────────────
// 브라우저 내보내기 — PNG / 애니메이션 GIF·APNG / ZIP (서버 왕복 없음)
//  · 정밀 누끼(경계 페더링 + 흰색 번짐 제거) + 흰색 스티커 외곽선
//  · 한글 대사·이펙트 레이어 합성
//  · 카톡 제안 규격(360×360 · 150KB 이하) 자동 압축 패키징
//  · AI 추가 호출 없이 Canvas + gifenc + 자체 APNG 조립기만 쓴다
// ─────────────────────────────────────────────────────────────

const SIZE: number = KAKAO_RULES.size;

export interface ExportOptions {
  size?: number;
  watermark?: boolean;
  /** 흰색 스티커 외곽선 두께 (px, 기본 0 = 끔) */
  outline?: number;
  /** 경계 페더링 정밀 누끼 (기본 true) */
  preciseMatte?: boolean;
  /** 글자 레이어 (없으면 spec.textLayers 사용) */
  layers?: TextLayer[];
}

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

/** AI 컷 이미지(URL)를 로드한다 (same-origin 이라 캔버스가 오염되지 않는다) */
async function loadUrlImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'sync';
  img.src = url;
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
  const label = '이모티학';
  ctx.save();
  ctx.font = `800 ${Math.round(size * 0.032)}px Pretendard, system-ui, sans-serif`;
  const w = ctx.measureText(label).width + size * 0.05;
  const h = size * 0.055;
  ctx.fillStyle = 'rgba(25,21,18,0.72)';
  ctx.beginPath();
  const x = size - w - pad;
  const y = size - h - pad;
  // roundRect 는 Safari 16.4+ / Chrome 99+ 에서만 지원 → 구형 WebView(앱인토스)에서는 직접 그린다
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, h / 2);
  } else {
    const r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = '#FFFDFA';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size - pad - w / 2, size - pad - h / 2 + 1);
  ctx.restore();
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

function layersOf(spec: StickerSpec, opts: ExportOptions): TextLayer[] {
  if (opts.layers) return normalizeLayers(opts.layers);
  return normalizeLayers(spec.textLayers);
}

/**
 * 컷 한 장을 캔버스에 그린다.
 *  · AI 컷 + 투명 배경이면 정밀 누끼(가장자리 페더링 + 흰색 번짐 제거)
 *  · outline > 0 이면 그림 뒤에 흰 실루엣을 깔아 스티커 테두리를 만든다
 *  · 글자·이펙트 레이어는 맨 위에 합성한다
 */
export async function renderFrameCanvas(spec: StickerSpec, opts: ExportOptions = {}): Promise<HTMLCanvasElement> {
  const size = opts.size ?? SIZE;
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const layers = layersOf(spec, opts);
  // 캘리그라피 폰트가 준비된 뒤에 그린다(대체 폰트로 먼저 그리는 것 방지)
  await ensureCaptionFonts();
  ctx.clearRect(0, 0, size, size);
  if (spec.background !== 'transparent') {
    ctx.fillStyle = backgroundFill(spec.background);
    ctx.fillRect(0, 0, size, size);
  }

  // 1) 캐릭터만 별도 캔버스에 그린다 (누끼 대상)
  const figure = canvasOf(size);
  const fctx = figure.getContext('2d', { willReadFrequently: true })!;
  if (spec.imageUrl) {
    const photo = await loadUrlImage(spec.imageUrl);
    fctx.drawImage(photo, 0, 0, size, size);
    if (spec.background === 'transparent' && opts.preciseMatte !== false) {
      const image = fctx.getImageData(0, 0, size, size);
      const mask = computeAlphaMask(image.data, size, size, { feather: Math.max(1, Math.round(size / 180)) });
      applyMask(image.data, mask, { feather: Math.max(1, Math.round(size / 180)) });
      fctx.putImageData(image, 0, 0);
    }
  } else {
    // 글자 레이어가 있으면 그쪽이 대사다 — 절차적 SVG 대사와 겹쳐 찍지 않는다.
    const fontCss = layers.length ? '' : await captionFontCss('calli');
    const svg = renderSticker({ ...spec, imageUrl: undefined, line: layers.length ? '' : spec.line }, { fontCss });
    const img = await loadImage(svg);
    fctx.drawImage(img, 0, 0, size, size);
  }

  // 2) 흰색 외곽선 → 그림 뒤에 깔기
  const outline = Math.max(0, Math.round(opts.outline ?? 0));
  if (outline > 0) {
    const image = fctx.getImageData(0, 0, size, size);
    const silhouette = outlineSilhouette(image.data, size, size, outline);
    const ring = canvasOf(size);
    ring.getContext('2d')!.putImageData(new ImageData(silhouette, size, size), 0, 0);
    ctx.drawImage(ring, 0, 0);
  }
  ctx.drawImage(figure, 0, 0);

  // 3) 글자·이펙트 레이어
  if (layers.length) drawLayers(ctx, layers, size, { emotion: spec.emotion });
  if (opts.watermark) drawWatermark(ctx, size);
  return canvas;
}

export async function renderPngBlob(spec: StickerSpec, opts: ExportOptions = {}): Promise<Blob> {
  const canvas = await renderFrameCanvas(spec, opts);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
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

// ─────────────────────────────────────────────────────────────
// 움직이는 이모티콘 (모션 템플릿 → GIF / APNG)
// ─────────────────────────────────────────────────────────────

export interface AnimateOptions extends ExportOptions {
  motion?: MotionId;
  /** 프레임 수를 직접 지정 (기본: 모션 템플릿 값) */
  frames?: number;
}

/** 모션 프레임을 캔버스 배열로 만든다 (미리보기와 내보내기가 같은 함수를 쓴다) */
export async function renderMotionFrames(spec: StickerSpec, opts: AnimateOptions = {}): Promise<HTMLCanvasElement[]> {
  const size = opts.size ?? SIZE;
  const motion = motionById(opts.motion ?? DEFAULT_MOTION)?.id ?? DEFAULT_MOTION;
  const total = Math.max(2, opts.frames ?? motionById(motion)?.frames ?? 12);
  const base = await renderFrameCanvas(spec, opts);
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < total; i++) {
    const t = i / total;
    const transform = motionTransformAt(motion, t);
    const canvas = canvasOf(size);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.globalAlpha = transform.alpha;
    ctx.translate(size / 2 + transform.dx * size, size / 2 + transform.dy * size);
    ctx.rotate((transform.rotate * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.drawImage(base, -size / 2, -size / 2, size, size);
    ctx.restore();
    for (const particle of motionParticlesAt(motion, t)) {
      drawParticle(ctx, particle.kind, particle.x * size, particle.y * size, particle.r * size, particle.alpha);
    }
    frames.push(canvas);
  }
  return frames;
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  kind: 'sparkle' | 'heart' | 'sweat' | 'coin' | 'flame',
  cx: number,
  cy: number,
  r: number,
  alpha: number,
) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  if (kind === 'heart') {
    ctx.fillStyle = '#FF5A79';
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.75);
    ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.2, cx - r * 0.5, cy - r * 1.15, cx, cy - r * 0.35);
    ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.15, cx + r * 1.3, cy - r * 0.2, cx, cy + r * 0.75);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#FFD24D';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 0.2, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.2, cy + r * 0.2, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.2, cy + r * 0.2, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 0.2, cx, cy - r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function prepareGifPixels(ctx: CanvasRenderingContext2D, size: number): ImageData {
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
  return image;
}

function transparentPaletteIndex(palette: number[][]): number {
  const index = palette.findIndex((entry) => (entry[3] ?? 255) < 8);
  return index >= 0 ? index : 0;
}

/** 애니메이션 GIF (gifenc). colors 를 낮추면 용량이 줄어든다. */
export async function renderAnimatedGifBlob(
  spec: StickerSpec,
  opts: AnimateOptions & { colors?: number } = {},
): Promise<Blob> {
  const size = opts.size ?? SIZE;
  const frames = await renderMotionFrames(spec, opts);
  const delay = motionById(opts.motion ?? DEFAULT_MOTION)?.delayMs ?? 80;
  const colors = Math.max(16, Math.min(256, opts.colors ?? 128));
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const gif = GIFEncoder();
  for (const canvas of frames) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const image = prepareGifPixels(ctx, size);
    const palette = quantize(image.data, colors, { format: 'rgba4444' });
    const index = applyPalette(image.data, palette, 'rgba4444');
    gif.writeFrame(index, size, size, {
      palette,
      delay,
      transparent: true,
      transparentIndex: transparentPaletteIndex(palette),
      dispose: 2,
    });
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

/** 애니메이션 APNG (자체 조립기, 화질 손실 없음) */
export async function renderAnimatedApngBlob(spec: StickerSpec, opts: AnimateOptions = {}): Promise<Blob> {
  const frames = await renderMotionFrames(spec, opts);
  if (frames.length === 0) throw new Error('APNG: 프레임이 없습니다');
  const delay = motionById(opts.motion ?? DEFAULT_MOTION)?.delayMs ?? 80;
  const pngs: Uint8Array[] = [];
  for (const canvas of frames) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('APNG: 프레임 PNG 를 만들지 못했습니다');
    pngs.push(new Uint8Array(await blob.arrayBuffer()));
  }
  const bytes = assembleApng(pngs, delay, { plays: 0 });
  return new Blob([bytes as unknown as BlobPart], { type: 'image/png' });
}

export async function renderAnimatedBlob(
  spec: StickerSpec,
  opts: AnimateOptions & { format?: 'gif' | 'apng' } = {},
): Promise<Blob> {
  return opts.format === 'apng'
    ? renderAnimatedApngBlob(spec, opts)
    : renderAnimatedGifBlob(spec, opts);
}

/** 기존 호출 호환: 기본 GIF 바운스 */
export async function renderGifBlob(spec: StickerSpec, opts: { frames?: number; size?: number; motion?: MotionId } = {}) {
  return renderAnimatedGifBlob(spec, { frames: opts.frames, size: opts.size ?? 360, motion: opts.motion ?? 'bounce' });
}

// ─────────────────────────────────────────────────────────────
// 150KB 자동 압축 (색 수를 단계적으로 낮춰 규격에 맞춘다)
// ─────────────────────────────────────────────────────────────

export interface CompressResult {
  blob: Blob;
  bytes: number;
  ok: boolean;
  /** 실제로 적용한 색 단계 (높을수록 원본에 가깝다) */
  levels: number;
  attempts: number;
}

function posterize(ctx: CanvasRenderingContext2D, size: number, levels: number, alphaLevels = 12) {
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  const step = 255 / Math.max(1, levels - 1);
  const alphaStep = 255 / Math.max(1, alphaLevels - 1);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
    data[i + 3] = Math.round(data[i + 3] / alphaStep) * alphaStep;
  }
  ctx.putImageData(image, 0, 0);
}

/** PNG 를 maxBytes 이하로 자동 압축한다. 색 단계를 낮춰가며 가장 좋은 결과를 쓴다. */
export async function compressPngUnderLimit(
  blob: Blob,
  maxBytes: number = KAKAO_RULES.maxBytes,
  opts: { size?: number } = {},
): Promise<CompressResult & { smallest: boolean }> {
  if (blob.size <= maxBytes) {
    return { blob, bytes: blob.size, ok: true, levels: 256, attempts: 0, smallest: true };
  }
  const bitmap = await createImageBitmap(blob);
  const size = opts.size ?? Math.max(bitmap.width, bitmap.height);
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close?.();

  const original = new ImageData(ctx.getImageData(0, 0, size, size).data, size, size);
  let best: Blob = blob;
  let bestLevels = 256;
  let attempts = 0;
  for (const levels of [64, 32, 24, 16, 12, 8, 6, 4]) {
    attempts++;
    ctx.putImageData(original, 0, 0);
    posterize(ctx, size, levels, levels >= 24 ? 16 : 8);
    const candidate = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!candidate) continue;
    if (candidate.size < best.size) {
      best = candidate;
      bestLevels = levels;
    }
    if (candidate.size <= maxBytes) {
      return { blob: candidate, bytes: candidate.size, ok: true, levels, attempts, smallest: false };
    }
  }
  return { blob: best, bytes: best.size, ok: best.size <= maxBytes, levels: bestLevels, attempts, smallest: false };
}

// ─────────────────────────────────────────────────────────────
// ZIP 내보내기
// ─────────────────────────────────────────────────────────────

export async function exportPackZip(
  items: { spec: StickerSpec; filename: string }[],
  opts: ExportOptions = {},
) {
  const size = opts.size ?? SIZE;
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const it of items) {
    const blob = await renderPngBlob(it.spec, { ...opts, size });
    zip.file(`${it.filename}.png`, blob);
  }
  zip.file(
    'README.txt',
    [
      '이모티학(EmotiHak) 팩 내보내기',
      '',
      `· 파일: ${size}×${size}px 투명 PNG · 총 ${items.length}컷`,
      '· 카카오 이모티콘 스튜디오 제안 규격은 32종 · 360×360 · 개당 150KB입니다 (앱의 규격 패키저가 자동 검증·압축).',
      '· AI 생성 결과물이며, 본인 사용 목적으로 제공됩니다.',
      '· 상업적 사용은 Studio 플랜 라이선스가 필요합니다.',
    ].join('\n'),
  );
  return await zip.generateAsync({ type: 'blob' });
}

// ─────────────────────────────────────────────────────────────
// 카톡 제안 규격 패키저 (360×360 · 150KB 이하 자동 압축 · 흰 외곽선 · 글자 레이어)
// ─────────────────────────────────────────────────────────────
export interface KakaoPackResult {
  blob: Blob;
  validation: PackValidation;
  files: { name: string; bytes: number }[];
  /** 자동 압축으로 150KB 를 맞춘 파일 수 */
  compressed: number;
}

export interface KakaoPackOptions extends ExportOptions {
  /** 움직이는 이모티콘으로 패키징 */
  motion?: MotionId | 'none';
  /** 애니메이션 형식 (기본 APNG) */
  animationFormat?: 'apng' | 'gif';
  maxBytes?: number;
}

export async function exportKakaoPackZip(
  items: { spec: StickerSpec; filename: string }[],
  opts: KakaoPackOptions = {},
): Promise<KakaoPackResult> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('kakao') ?? zip;
  const animated = !!opts.motion && opts.motion !== 'none';
  const rules = animated ? KAKAO_ANIMATED_RULES : KAKAO_RULES;
  const maxBytes = opts.maxBytes ?? rules.maxBytes;
  const rendered: { name: string; bytes: number; width: number; height: number }[] = [];
  let compressed = 0;

  for (const [i, it] of items.entries()) {
    const spec: StickerSpec = { ...it.spec, background: 'transparent' };
    const name = `${String(i + 1).padStart(2, '0')}.${animated ? (opts.animationFormat ?? 'apng') : 'png'}`;
    let blob: Blob;
    if (animated) {
      blob = await renderAnimatedBlob(spec, { ...opts, size: rules.size, motion: opts.motion as MotionId });
      if (blob.size > maxBytes) {
        // GIF 는 색 수를 낮춰 다시 만든다
        if ((opts.animationFormat ?? 'apng') === 'gif') {
          for (const colors of [64, 32, 16]) {
            blob = await renderAnimatedGifBlob(spec, { ...opts, size: rules.size, motion: opts.motion as MotionId, colors });
            if (blob.size <= maxBytes) break;
          }
        }
      }
    } else {
      const png = await renderPngBlob(spec, { ...opts, size: rules.size });
      const result = await compressPngUnderLimit(png, maxBytes, { size: rules.size });
      if (result.attempts > 0) compressed++;
      blob = result.blob;
    }
    folder.file(name, blob);
    rendered.push({ name, bytes: blob.size, width: rules.size, height: rules.size });
  }

  const validation = validateKakaoFiles(rendered, { maxBytes, animated });

  folder.file(
    'validation.json',
    JSON.stringify(
      {
        rules,
        animated,
        maxBytes,
        generatedAt: new Date().toISOString(),
        ok: validation.ok,
        summary: validation.summary,
        checks: validation.checks,
        files: rendered,
      },
      null,
      2,
    ),
  );
  folder.file(
    'README.txt',
    [
      '이모티학(EmotiHak) · 카카오 이모티콘 스튜디오 제안 규격 패키지',
      '',
      `· 구성: ${items.length}종 · ${rules.size}×${rules.size}px · 투명 ${animated ? (opts.animationFormat ?? 'APNG') : 'PNG'}`,
      `· 파일 크기 한도: 개당 ${(maxBytes / 1024).toFixed(0)}KB (validation.json 참고)`,
      `· 자동 압축 적용: ${compressed}개 파일`,
      `· 검증 결과: ${validation.ok ? '통과' : '미충족 — ' + validation.summary}`,
      '· AI 생성 결과물이며 본인 사용 목적입니다. 상업적 사용은 Studio 플랜 라이선스가 필요합니다.',
      '· 카카오 스튜디오 제출은 직접 진행해야 하며, 앱은 규격 검증과 ZIP 묶음까지만 돕습니다.',
    ].join('\n'),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, validation, files: rendered.map(({ name, bytes }) => ({ name, bytes })), compressed };
}

// ─────────────────────────────────────────────────────────────
// 콤보(2단 합체) 미리보기 — 두 컷을 위아래로 이어 붙인다
// ─────────────────────────────────────────────────────────────
export async function renderComboPreview(
  top: StickerSpec,
  bottom: StickerSpec,
  opts: ExportOptions = {},
): Promise<Blob> {
  const size = opts.size ?? SIZE;
  const canvas = canvasOf(size);
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size * 2);
  const upper = await renderFrameCanvas(top, { ...opts, size });
  const lower = await renderFrameCanvas(bottom, { ...opts, size });
  ctx.drawImage(upper, 0, 0);
  ctx.drawImage(lower, 0, size);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}
