// ─────────────────────────────────────────────────────────────
// 한글 대사·효과음 레이어 (업그레이드 4)
//  · AI 이미지에는 글자를 넣지 않고(또는 넣더라도) 앱이 캔버스 위에 깨끗한 글자를 얹는다.
//  · 글꼴(손글씨/고딕/굵은체/도장) · 도장 · 이펙트를 위치·문구·스타일까지 편집한다.
//  · 레이어 데이터는 프레임에 저장되고, PNG/GIF/APNG/ZIP 내보내기에 모두 합성된다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import { CAPTION_FONT_FAMILIES, CAPTION_OUTLINE, type CaptionLine } from '@/lib/studio/caption';
import { planCaption } from '@/lib/studio/caption-plan';
import { drawDecor, planDecor } from '@/lib/studio/decor';

export type TextLayerStyle = 'calli' | 'brush' | 'hand' | 'gothic' | 'bold' | 'stamp';
export type BubbleStyle = 'none' | 'round' | 'shout' | 'caption' | 'tape';
export type EffectKind =
  | 'none'
  // 기본 6종
  | 'sweat'
  | 'heart'
  | 'sparkle'
  | 'anger'
  | 'money'
  | 'flame'
  // 문양 확대분 — 데코 엔진의 상황 모티프를 직접 고른다
  | 'star'
  | 'crown'
  | 'flower'
  | 'party'
  | 'zzz'
  | 'question';
/** 상황별 복합 데코 — 문구·감정·이펙트에 맞춰 자동('auto') 또는 끔('off') */
export type DecorMode = 'auto' | 'off';

export interface TextLayer {
  id: string;
  text: string;
  style: TextLayerStyle;
  /** 레거시 필드 — 말풍선 박스는 그리지 않는다(화면·내보내기 모두 글자만). 저장 호환용. */
  bubble: BubbleStyle;
  effect: EffectKind;
  /** 글자 옆에 붙는 상황별 복합 데코 (기본 auto — 저장값이 없어도 켜진다) */
  decor?: DecorMode;
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
    id: 'brush',
    label: '붓글씨',
    labelEn: 'Brush',
    font: CAPTION_FONT_FAMILIES.brush,
    weight: 400,
    outline: CAPTION_OUTLINE.brush,
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

export const LAYER_EFFECTS: { id: EffectKind; label: string; labelEn: string; emoji: string }[] = [
  { id: 'none', label: '없음', labelEn: 'None', emoji: '∅' },
  { id: 'sweat', label: '땀방울', labelEn: 'Sweat', emoji: '💧' },
  { id: 'heart', label: '하트', labelEn: 'Heart', emoji: '❤' },
  { id: 'sparkle', label: '반짝이', labelEn: 'Sparkle', emoji: '✨' },
  { id: 'anger', label: '분노마크', labelEn: 'Anger', emoji: '💢' },
  { id: 'money', label: '돈다발', labelEn: 'Money', emoji: '💸' },
  { id: 'flame', label: '불꽃', labelEn: 'Flame', emoji: '🔥' },
  { id: 'star', label: '별·응원', labelEn: 'Star', emoji: '⭐' },
  { id: 'crown', label: '왕관·칭찬', labelEn: 'Crown', emoji: '👑' },
  { id: 'flower', label: '꽃·고마움', labelEn: 'Flower', emoji: '🌸' },
  { id: 'party', label: '축하', labelEn: 'Party', emoji: '🎉' },
  { id: 'zzz', label: '졸림', labelEn: 'Sleep', emoji: '💤' },
  { id: 'question', label: '궁금', labelEn: 'Question', emoji: '❓' },
];

const DEFAULT_COLOR = '#191512';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function textStyleById(id: string | undefined) {
  return TEXT_STYLES.find((item) => item.id === id) ?? TEXT_STYLES[0];
}

export function effectById(id: string | undefined) {
  return LAYER_EFFECTS.find((item) => item.id === id) ?? LAYER_EFFECTS[0];
}

/** 알 수 없는 입력도 안전한 레이어로 정규화한다 (서버 저장값·구버전 데이터 대비) */
export function normalizeLayer(input: Partial<TextLayer> | null | undefined, index = 0): TextLayer {
  const style = textStyleById(input?.style).id;
  // 말풍선 박스는 더 이상 그리지 않는다 — 화면(SVG)과 내보내기(Canvas) 모두 캘리그라피 글자만.
  //  · 예전에 저장된 레이어(bubble: 'round' 등)도 다운로드에 박스가 찍히지 않도록 'none' 으로 통일한다.
  const bubble: BubbleStyle = 'none';
  const effect = effectById(input?.effect).id;
  const decor: DecorMode = input?.decor === 'off' ? 'off' : 'auto';
  const text = String(input?.text ?? '').slice(0, 24);
  return {
    id: String(input?.id ?? `layer-${index}`).slice(0, 40),
    text,
    style,
    bubble,
    effect,
    decor,
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
  opts: { emotion?: Emotion; stage?: boolean } = {},
) {
  const style = textStyleById(layer.style);
  const plan = planCaption(
    {
      text: layer.text,
      style: layer.style,
      color: layer.color,
      x: layer.x,
      y: layer.y,
      size: layer.size,
      rotate: layer.rotate,
    },
    size,
    opts.emotion,
  );
  const fontSize = Math.max(8, layer.size * size);
  const padding = fontSize * 0.42;

  // 상황별 복합 데코 — 머리 위·볼 옆·글자 모서리에 캔버스 절대 좌표로 그린다.
  //  (글자보다 먼저 그려 글자의 흰 외곽선이 데코 위를 깔끔하게 정리한다)
  const decor = planDecor({
    text: layer.text,
    emotion: opts.emotion,
    effect: layer.effect,
    width: plan.width,
    height: plan.height,
    fontSize: plan.size,
    x: plan.x,
    y: plan.y,
    rotate: plan.rotate,
    canvas: size,
    enabled: layer.decor !== 'off',
    stage: opts.stage,
  });
  if (decor.length) drawDecor(ctx, decor);

  ctx.save();
  ctx.translate(plan.x, plan.y);
  ctx.rotate((plan.rotate * Math.PI) / 180);
  ctx.font = `${style.weight} ${fontSize}px ${style.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  if (layer.style === 'stamp') {
    const radius = Math.max(plan.width, plan.height) * 0.78 + padding * 0.6;
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

  const top = -plan.height / 2;
  const left = -plan.width / 2;

  // 1) 그림자 — 가장 바깥 테두리에만 얹어 스티커가 살짝 떠 보이게 한다.
  if (plan.outline > 0) {
    ctx.save();
    ctx.shadowColor = plan.shadow.color;
    ctx.shadowBlur = plan.shadow.blur;
    ctx.shadowOffsetY = plan.shadow.offsetY;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = plan.outline * 1.24;
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, style);
    ctx.restore();
  }

  // 2) 두툼한 화이트/크림 스티커 테두리 (지저분한 이중 테두리 방지용으로 한 번 더)
  if (plan.outline > 0) {
    ctx.strokeStyle = '#FFFDFA';
    ctx.lineWidth = plan.outline * 1.24;
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, style);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = plan.outline;
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, style);
  }

  // 3) 얇은 톤 링 — 흰 테두리 안쪽에 은은한 컬러 테를 둘러 고급스럽게 마감한다.
  if (plan.outline > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = plan.ring;
    ctx.lineWidth = Math.max(1, plan.outline * 0.42);
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, style);
    ctx.restore();
  }

  // 4) 잉크 외곽선(글자 살 찌우기) → 세로 그라데이션 채우기
  if (plan.bold > 0) {
    ctx.strokeStyle = plan.ink;
    ctx.lineWidth = plan.bold;
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, style);
  }
  const fillGradient = ctx.createLinearGradient(0, top, 0, top + plan.height);
  fillGradient.addColorStop(0, plan.inkLight);
  fillGradient.addColorStop(0.5, plan.ink);
  fillGradient.addColorStop(1, plan.ink);
  ctx.fillStyle = fillGradient;
  for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'fill', plan.width, style);

  // 5) 붓 밑줄 포인트 — 좌우로 옅어지는 한 획
  if (plan.underline) {
    const u = plan.underline;
    const half = u.width / 2;
    const brush = ctx.createLinearGradient(-half, 0, half, 0);
    brush.addColorStop(0, 'rgba(255,255,255,0)');
    brush.addColorStop(0.18, u.color);
    brush.addColorStop(0.82, u.color);
    brush.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = brush;
    ctx.lineCap = 'round';
    ctx.lineWidth = u.thickness;
    ctx.beginPath();
    ctx.moveTo(-half, u.y);
    ctx.quadraticCurveTo(0, u.y + u.curve, half, u.y - u.curve * 0.6);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawGlyphs(
  ctx: CanvasRenderingContext2D,
  line: CaptionLine,
  left: number,
  top: number,
  mode: 'stroke' | 'fill',
  blockWidth: number,
  style: { weight: number; font: string },
) {
  // 줄마다 가운데 정렬 (블록 폭 기준)
  const offset = (blockWidth - line.width) / 2;
  for (const glyph of line.glyphs) {
    if (glyph.ch === ' ') continue;
    ctx.save();
    ctx.translate(left + offset + glyph.x, top + line.baseline + glyph.dy);
    if (glyph.angle) ctx.rotate((glyph.angle * Math.PI) / 180);
    const glyphSize = glyph.size ?? line.size;
    if (glyphSize !== line.size) {
      // 강조 단어만 크기를 키운다 — 기준선은 그대로 두어 리듬만 달라진다.
      ctx.font = `${style.weight} ${glyphSize}px ${style.font}`;
    }
    if (mode === 'stroke') ctx.strokeText(glyph.ch, 0, 0);
    else ctx.fillText(glyph.ch, 0, 0);
    if (glyphSize !== line.size) ctx.font = `${style.weight} ${line.size}px ${style.font}`;
    ctx.restore();
  }
}



const EFFECT_COLOR: Record<Exclude<EffectKind, 'none'>, string> = {
  sweat: '#7CC6F2',
  heart: '#FF5A79',
  sparkle: '#FFD24D',
  anger: '#D7362B',
  money: '#3FA46A',
  flame: '#FF7A1A',
  star: '#E9A013',
  crown: '#D9A31B',
  flower: '#E2567E',
  party: '#D2553C',
  zzz: '#5B6B8C',
  question: '#4453B2',
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
  // 머리 위·볼 옆(장면) 데코는 첫 레이어만 맡는다 — 레이어마다 머리 위에
  // 같은 데코를 겹쳐 놓으면 캐릭터가 가려진다.
  layers.forEach((layer, index) => drawLayer(ctx, layer, size, { ...opts, stage: index === 0 }));
}

/** 편집 UI용 기본 레이어 (새 레이어 추가) */
export function newLayer(index: number, text = '안녕!'): TextLayer {
  return normalizeLayer({ id: `layer-${Date.now()}-${index}`, text, style: 'calli', bubble: 'none', x: 0.5, y: 0.84, size: 0.18, rotate: -2 }, index);
}
