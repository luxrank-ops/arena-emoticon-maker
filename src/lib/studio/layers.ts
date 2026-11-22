// ─────────────────────────────────────────────────────────────
// 한글 대사·효과음 레이어 (업그레이드 4)
//  · AI 이미지에는 글자를 넣지 않고(또는 넣더라도) 앱이 캔버스 위에 깨끗한 글자를 얹는다.
//  · 글꼴(손글씨/고딕/굵은체/도장) · 말풍선 · 도장 · 이펙트를 위치·문구·스타일까지 편집한다.
//  · 레이어 데이터는 프레임에 저장되고, PNG/GIF/APNG/ZIP 내보내기에 모두 합성된다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import {
  CAPTION_BOLD,
  CAPTION_FONT_FAMILIES,
  CAPTION_OUTLINE,
  captionFaceOf,
  inkFor,
  layoutCaption,
  type CaptionLine,
} from '@/lib/studio/caption';

export type TextLayerStyle = 'calli' | 'hand' | 'gothic' | 'bold' | 'stamp';
export type BubbleStyle = 'none' | 'round' | 'shout' | 'caption' | 'tape';
export type EffectKind = 'none' | 'sweat' | 'heart' | 'sparkle' | 'anger' | 'money' | 'flame';

export interface TextLayer {
  id: string;
  text: string;
  style: TextLayerStyle;
  bubble: BubbleStyle;
  effect: EffectKind;
  /** 캔버스 기준 중심 좌표 (0~1) */
  x: number;
  y: number;
  /** 글자 크기 (캔버스 폭 대비 비율) */
  size: number;
  color: string;
  /** 도(degree) 회전 */
  rotate: number;
}

export const MAX_LAYERS = 4;

export const TEXT_STYLES: {
  id: TextLayerStyle;
  label: string;
  labelEn: string;
  font: string;
  weight: number;
  /** 글자 크기 대비 외곽선 두께 */
  outline: number;
  letterSpacing: number;
}[] = [
  {
    id: 'calli',
    label: '캘리그라피',
    labelEn: 'Calligraphy',
    font: CAPTION_FONT_FAMILIES.calli,
    weight: 400,
    outline: CAPTION_OUTLINE.calli,
    letterSpacing: 0,
  },
  {
    id: 'hand',
    label: '손글씨',
    labelEn: 'Handwriting',
    font: CAPTION_FONT_FAMILIES.hand,
    weight: 700,
    outline: CAPTION_OUTLINE.hand,
    letterSpacing: 0,
  },
  {
    id: 'gothic',
    label: '고딕',
    labelEn: 'Gothic',
    font: '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    weight: 800,
    outline: 0.1,
    letterSpacing: 0,
  },
  {
    id: 'bold',
    label: '굵은체',
    labelEn: 'Heavy',
    font: '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    weight: 900,
    outline: 0.18,
    letterSpacing: -0.01,
  },
  {
    id: 'stamp',
    label: '도장',
    labelEn: 'Stamp',
    font: CAPTION_FONT_FAMILIES.serif,
    weight: 800,
    outline: 0.04,
    letterSpacing: 0.04,
  },
];

export const LAYER_BUBBLES: { id: BubbleStyle; label: string; labelEn: string }[] = [
  { id: 'none', label: '없음', labelEn: 'None' },
  { id: 'round', label: '둥근 말풍선', labelEn: 'Round bubble' },
  { id: 'shout', label: '삐죽 말풍선', labelEn: 'Shout bubble' },
  { id: 'caption', label: '자막 바', labelEn: 'Caption bar' },
  { id: 'tape', label: '테이프', labelEn: 'Tape' },
];

export const LAYER_EFFECTS: { id: EffectKind; label: string; labelEn: string; emoji: string }[] = [
  { id: 'none', label: '없음', labelEn: 'None', emoji: '∅' },
  { id: 'sweat', label: '땀방울', labelEn: 'Sweat', emoji: '💧' },
  { id: 'heart', label: '하트', labelEn: 'Heart', emoji: '❤' },
  { id: 'sparkle', label: '반짝이', labelEn: 'Sparkle', emoji: '✨' },
  { id: 'anger', label: '분노마크', labelEn: 'Anger', emoji: '💢' },
  { id: 'money', label: '돈다발', labelEn: 'Money', emoji: '💸' },
  { id: 'flame', label: '불꽃', labelEn: 'Flame', emoji: '🔥' },
];

const DEFAULT_COLOR = '#191512';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function textStyleById(id: string | undefined) {
  return TEXT_STYLES.find((item) => item.id === id) ?? TEXT_STYLES[0];
}

export function bubbleById(id: string | undefined) {
  return LAYER_BUBBLES.find((item) => item.id === id) ?? LAYER_BUBBLES[0];
}

export function effectById(id: string | undefined) {
  return LAYER_EFFECTS.find((item) => item.id === id) ?? LAYER_EFFECTS[0];
}

/** 알 수 없는 입력도 안전한 레이어로 정규화한다 (서버 저장값·구버전 데이터 대비) */
export function normalizeLayer(input: Partial<TextLayer> | null | undefined, index = 0): TextLayer {
  const style = textStyleById(input?.style).id;
  const bubble = bubbleById(input?.bubble).id;
  const effect = effectById(input?.effect).id;
  const text = String(input?.text ?? '').slice(0, 24);
  return {
    id: String(input?.id ?? `layer-${index}`).slice(0, 40),
    text,
    style,
    bubble,
    effect,
    x: clamp(Number.isFinite(input?.x) ? Number(input!.x) : 0.5, 0.08, 0.92),
    y: clamp(Number.isFinite(input?.y) ? Number(input!.y) : 0.86, 0.08, 0.94),
    size: clamp(Number.isFinite(input?.size) ? Number(input!.size) : 0.13, 0.05, 0.34),
    color: /^#[0-9a-fA-F]{6}$/.test(String(input?.color ?? '')) ? String(input!.color) : DEFAULT_COLOR,
    rotate: clamp(Number.isFinite(input?.rotate) ? Number(input!.rotate) : 0, -35, 35),
  };
}

export function normalizeLayers(input: unknown, max = MAX_LAYERS): TextLayer[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === 'object')
    .slice(0, max)
    .map((item, index) => normalizeLayer(item as Partial<TextLayer>, index))
    .filter((layer) => layer.text.trim().length > 0);
}

/** 대사 한 줄을 기본 레이어로 (텍스트를 앱에서 합성하는 팩의 기본값) */
export function layerFromLine(line: string, overrides: Partial<TextLayer> = {}): TextLayer | null {
  const text = line.trim();
  if (!text) return null;
  return normalizeLayer({
    id: `line-${Math.abs(hash(text)) % 100000}`,
    text,
    style: 'calli',
    bubble: 'none',
    effect: 'none',
    x: 0.5,
    y: 0.84,
    size: text.length > 9 ? 0.145 : text.length > 6 ? 0.165 : text.length > 3 ? 0.18 : 0.19,
    color: DEFAULT_COLOR,
    rotate: -3,
    ...overrides,
  });
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/**
 * 레이어 한 장을 캔버스에 그린다 (size = 캔버스 한 변 px).
 *  · 글자 하나씩 살짝 기울이고 흔들어 손글씨 리듬을 낸다 — SVG 렌더러와 같은 계산(caption.ts).
 *  · 그림자 → 두꺼운 흰색 외곽선 → 컬러 채우기 순서로 쌓아 스티커처럼 보이게 한다.
 */
export function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  size: number,
  opts: { emotion?: Emotion } = {},
) {
  const style = textStyleById(layer.style);
  const face = captionFaceOf(style.id);
  const fontSize = Math.max(8, layer.size * size);
  const centerX = layer.x * size;
  const centerY = layer.y * size;

  const layout = layoutCaption(layer.text, {
    size: fontSize,
    maxWidth: size * 0.86,
    face,
    seed: hash(layer.text),
  });
  const blockWidth = layout.width;
  const blockHeight = layout.height;
  const padding = fontSize * 0.42;

  // 블록이 캔버스 밖으로 잘리지 않게 중심을 clamp 한다(2줄·큰 글자·회전 대응).
  const rot = Math.abs(layer.rotate) * (Math.PI / 180);
  const halfW = (blockWidth / 2) * Math.cos(rot) + (blockHeight / 2) * Math.sin(rot);
  const halfH = (blockHeight / 2) * Math.cos(rot) + (blockWidth / 2) * Math.sin(rot);
  const pad = size * 0.015;
  const drawX = Math.min(Math.max(centerX, halfW + pad), size - halfW - pad);
  const drawY = Math.min(Math.max(centerY, halfH + pad), size - halfH - pad);

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate((layer.rotate * Math.PI) / 180);
  ctx.font = `${style.weight} ${fontSize}px ${style.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  if (layer.bubble !== 'none') {
    drawBubble(ctx, layer.bubble, blockWidth + padding * 2, blockHeight + padding * 2, size, layer.color);
  }
  if (layer.style === 'stamp') {
    const radius = Math.max(blockWidth, blockHeight) * 0.78 + padding * 0.6;
    ctx.strokeStyle = '#C9342B';
    ctx.lineWidth = Math.max(2, fontSize * 0.09);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, fontSize * 0.03);
    ctx.stroke();
  }

  const fill = layer.style === 'stamp' ? '#C9342B' : inkFor(opts.emotion, layer.color);
  const inBubble = layer.bubble !== 'none';
  const outlineWidth = Math.max(0, fontSize * (style.id === 'calli' || style.id === 'hand' ? CAPTION_OUTLINE[face] : style.outline));
  const boldWidth = Math.max(0, fontSize * CAPTION_BOLD[face]);
  const top = -blockHeight / 2;
  const left = -blockWidth / 2;

  // 1) 그림자 — 외곽선 패스에만 얹어 스티커가 살짝 떠 보이게 한다.
  if (!inBubble && outlineWidth > 0) {
    ctx.save();
    ctx.shadowColor = 'rgba(25,21,18,0.30)';
    ctx.shadowBlur = fontSize * 0.2;
    ctx.shadowOffsetY = fontSize * 0.06;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = outlineWidth;
    for (const line of layout.lines) drawGlyphs(ctx, line, left, top, 'stroke', blockWidth);
    ctx.restore();
  }

  // 2) 흰색 외곽선 (그림자 없이 한 번 더 → 지저분한 이중 테두리 방지)
  if (outlineWidth > 0) {
    ctx.strokeStyle = inBubble ? 'rgba(255,255,255,0.92)' : '#FFFFFF';
    ctx.lineWidth = outlineWidth;
    for (const line of layout.lines) drawGlyphs(ctx, line, left, top, 'stroke', blockWidth);
  }

  // 3) 잉크 외곽선(글자 살 찌우기) → 채우기
  if (boldWidth > 0) {
    ctx.strokeStyle = fill;
    ctx.lineWidth = boldWidth;
    for (const line of layout.lines) drawGlyphs(ctx, line, left, top, 'stroke', blockWidth);
  }
  ctx.fillStyle = fill;
  for (const line of layout.lines) drawGlyphs(ctx, line, left, top, 'fill', blockWidth);
  ctx.restore();

  if (layer.effect !== 'none') {
    drawEffect(ctx, layer.effect, centerX, centerY, Math.max(blockWidth, blockHeight) / 2 + fontSize * 0.5, size);
  }
}

function drawGlyphs(
  ctx: CanvasRenderingContext2D,
  line: CaptionLine,
  left: number,
  top: number,
  mode: 'stroke' | 'fill',
  blockWidth = line.width,
) {
  // 줄마다 가운데 정렬 (블록 폭 기준)
  const offset = (blockWidth - line.width) / 2;
  for (const glyph of line.glyphs) {
    if (glyph.ch === ' ') continue;
    ctx.save();
    ctx.translate(left + offset + glyph.x, top + line.baseline + glyph.dy);
    if (glyph.angle) ctx.rotate((glyph.angle * Math.PI) / 180);
    if (mode === 'stroke') ctx.strokeText(glyph.ch, 0, 0);
    else ctx.fillText(glyph.ch, 0, 0);
    ctx.restore();
  }
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  kind: Exclude<BubbleStyle, 'none'>,
  width: number,
  height: number,
  size: number,
  ink: string,
) {
  const w = width / 2;
  const h = height / 2;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = ink === '#FFFFFF' ? '#191512' : 'rgba(25,21,18,0.85)';
  ctx.lineWidth = Math.max(2, size * 0.008);
  if (kind === 'round') {
    roundedRect(ctx, -w, -h, width, height, Math.min(w, h) * 0.55);
    ctx.fill();
    ctx.stroke();
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, h * 0.9);
    ctx.lineTo(-w * 0.05, h + h * 0.38);
    ctx.lineTo(w * 0.16, h * 0.92);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'shout') {
    const spikes = 14;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (Math.PI * i) / spikes;
      const radius = i % 2 === 0 ? 1 : 0.82;
      const x = Math.cos(angle) * w * radius * 1.12;
      const y = Math.sin(angle) * h * radius * 1.16;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'caption') {
    // 자막 바 (예능·뉴스 자막 스타일)
    ctx.fillStyle = '#191512';
    ctx.fillRect(-w * 1.05, -h, width * 1.05, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, size * 0.004);
    ctx.strokeRect(-w * 1.05, -h, width * 1.05, height);
  } else if (kind === 'tape') {
    ctx.fillStyle = 'rgba(255,242,199,0.94)';
    ctx.beginPath();
    ctx.moveTo(-w * 1.08, -h * 0.9);
    ctx.lineTo(w * 1.04, -h);
    ctx.lineTo(w * 1.08, h * 0.92);
    ctx.lineTo(-w * 1.04, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,21,18,0.16)';
    ctx.stroke();
  }
  ctx.restore();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof (ctx as CanvasRenderingContext2D).roundRect === 'function') {
    (ctx as CanvasRenderingContext2D).roundRect(x, y, width, height, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

const EFFECT_COLOR: Record<Exclude<EffectKind, 'none'>, string> = {
  sweat: '#7CC6F2',
  heart: '#FF5A79',
  sparkle: '#FFD24D',
  anger: '#D7362B',
  money: '#3FA46A',
  flame: '#FF7A1A',
};

/** 이펙트 도형 — 땀방울·하트·반짝이·분노마크·돈다발·불꽃 */
export function drawEffect(
  ctx: CanvasRenderingContext2D,
  kind: EffectKind,
  centerX: number,
  centerY: number,
  radius: number,
  size: number,
) {
  if (kind === 'none') return;
  const color = EFFECT_COLOR[kind];
  const r = Math.max(6, Math.min(size * 0.11, radius * 0.62));
  ctx.save();
  ctx.strokeStyle = 'rgba(25,21,18,0.75)';
  ctx.lineWidth = Math.max(1.5, size * 0.005);
  ctx.fillStyle = color;
  if (kind === 'sweat') {
    ctx.beginPath();
    ctx.moveTo(centerX + radius * 0.9, centerY - radius * 0.55);
    ctx.bezierCurveTo(
      centerX + radius * 0.9 + r * 0.9, centerY - radius * 0.4,
      centerX + radius * 0.9 + r * 0.6, centerY - radius * 0.2,
      centerX + radius * 0.9, centerY - radius * 0.12,
    );
    ctx.bezierCurveTo(
      centerX + radius * 0.9 - r * 0.6, centerY - radius * 0.2,
      centerX + radius * 0.9 - r * 0.7, centerY - radius * 0.45,
      centerX + radius * 0.9, centerY - radius * 0.55,
    );
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'heart') {
    drawHeart(ctx, centerX + radius * 0.86, centerY - radius * 0.5, r * 0.9);
  } else if (kind === 'sparkle') {
    for (const [dx, dy, scale] of [[0.85, -0.62, 1], [1.0, -0.1, 0.7], [0.66, 0.34, 0.6]] as const) {
      drawSparkle(ctx, centerX + radius * dx, centerY + radius * dy, r * scale);
    }
  } else if (kind === 'anger') {
    const cx = centerX + radius * 0.86;
    const cy = centerY - radius * 0.55;
    ctx.lineWidth = Math.max(3, size * 0.012);
    ctx.strokeStyle = color;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * 0.25, cy + Math.sin(angle) * r * 0.25);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.stroke();
    }
  } else if (kind === 'money') {
    for (const [dx, dy, angle] of [[0.8, -0.5, -0.3], [0.98, -0.05, 0.4], [0.72, 0.42, -0.15]] as const) {
      ctx.save();
      ctx.translate(centerX + radius * dx, centerY + radius * dy);
      ctx.rotate(angle);
      ctx.fillStyle = '#DCEFCB';
      ctx.beginPath();
      ctx.rect(-r * 0.75, -r * 0.4, r * 1.5, r * 0.8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2E7D4F';
      ctx.font = `800 ${Math.round(r * 0.7)}px "Pretendard Variable", Pretendard, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₩', 0, r * 0.04);
      ctx.restore();
    }
  } else if (kind === 'flame') {
    for (const [dx, dy, scale] of [[0.82, -0.52, 1], [0.99, 0.02, 0.72]] as const) {
      const cx = centerX + radius * dx;
      const cy = centerY + radius * dy;
      const s = r * scale;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.2, cx + s * 0.6, cy + s * 0.8, cx, cy + s * 0.8);
      ctx.bezierCurveTo(cx - s * 0.6, cy + s * 0.8, cx - s * 0.9, cy - s * 0.2, cx, cy - s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFD24D';
      ctx.beginPath();
      ctx.ellipse(cx, cy + s * 0.28, s * 0.24, s * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.75);
  ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.2, cx - r * 0.5, cy - r * 1.15, cx, cy - r * 0.35);
  ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.15, cx + r * 1.3, cy - r * 0.2, cx, cy + r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawLayers(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  size: number,
  opts: { emotion?: Emotion } = {},
) {
  for (const layer of layers) drawLayer(ctx, layer, size, opts);
}

/** 편집 UI용 기본 레이어 (새 레이어 추가) */
export function newLayer(index: number, text = '안녕!'): TextLayer {
  return normalizeLayer({ id: `layer-${Date.now()}-${index}`, text, style: 'calli', bubble: 'none', x: 0.5, y: 0.84, size: 0.18, rotate: -2 }, index);
}
