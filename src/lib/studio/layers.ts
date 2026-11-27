// ─────────────────────────────────────────────────────────────
// 한글 대사·효과음 레이어 (업그레이드 4)
//  · AI 이미지에는 글자를 넣지 않고(또는 넣더라도) 앱이 캔버스 위에 깨끗한 글자를 얹는다.
//  · 글꼴(손글씨/고딕/굵은체/도장) · 도장 · 이펙트를 위치·문구·스타일까지 편집한다.
//  · 레이어 데이터는 프레임에 저장되고, PNG/GIF/APNG/ZIP 내보내기에 모두 합성된다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import {
  CAPTION_FACES,
  captionFaceSpec,
  type CaptionFace,
  type CaptionLine,
} from '@/lib/studio/caption';
import { planCaption } from '@/lib/studio/caption-plan';
import { drawDecor, planDecor } from '@/lib/studio/decor';

/** 대사 서체 4종 — 저장값은 이 네 값만 쓴다(예전 값은 normalizeTextStyle 이 옮긴다). */
export type TextLayerStyle = 'round' | 'brush' | 'meme' | 'myeongjo';

/**
 * 예전에 저장된 서체 값 → 지금 서체.
 *  · calli(주아 라운드)·hand(개구)는 동글 손글씨로, brush(연성 붓글씨)는 세련된 캘리그라피로,
 *    gothic·bold(시스템 고딕)는 예능·밈 굵은체로, stamp(명조 도장)는 단정 감성 명조로 이어진다.
 *  · 이미 저장된 팩도 다시 열면 새 서체로 자연스럽게 그려진다.
 */
export const LEGACY_TEXT_STYLES: Record<string, TextLayerStyle> = {
  round: 'round',
  brush: 'brush',
  meme: 'meme',
  myeongjo: 'myeongjo',
  calli: 'round',
  hand: 'round',
  gothic: 'meme',
  bold: 'meme',
  stamp: 'myeongjo',
  serif: 'myeongjo',
  elegant: 'brush',
  heavy: 'meme',
};

/** 어떤 입력이든 안전한 서체 id 로 (모르는 값은 기본 = 동글 손글씨) */
export function normalizeTextStyle(id: unknown): TextLayerStyle {
  return LEGACY_TEXT_STYLES[String(id ?? '')] ?? 'round';
}

/** 서체 id → 번들 폰트 face (1:1) */
export function captionFaceOf(style: TextLayerStyle | string | undefined): CaptionFace {
  return normalizeTextStyle(style);
}
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
  /** 선택 카드에 그 서체로 크게 보여 줄 짧은 예시 */
  sample: string;
  /** 한 줄 설명 — 고를 때 판단 기준 */
  hint: string;
  hintEn: string;
  font: string;
  weight: number;
  /** 글자 크기 대비 외곽선 두께 */
  outline: number;
  letterSpacing: number;
}[] = [
  {
    id: 'round',
    label: '동글 손글씨',
    labelEn: 'Round hand',
    sample: '실화야?',
    hint: '도톰하고 둥근 손글씨 · 기본값',
    hintEn: 'Thick round handwriting · default',
    font: CAPTION_FACES.round.family,
    weight: CAPTION_FACES.round.weight,
    outline: CAPTION_FACES.round.outline,
    letterSpacing: CAPTION_FACES.round.tracking,
  },
  {
    id: 'brush',
    label: '세련된 캘리그라피',
    labelEn: 'Calligraphy',
    sample: '고마워요',
    hint: '획의 강약이 살아 있는 붓 손멋글씨',
    hintEn: 'Refined brush lettering',
    font: CAPTION_FACES.brush.family,
    weight: CAPTION_FACES.brush.weight,
    outline: CAPTION_FACES.brush.outline,
    letterSpacing: CAPTION_FACES.brush.tracking,
  },
  {
    id: 'meme',
    label: '예능·밈 굵은체',
    labelEn: 'Meme heavy',
    sample: '도망가!',
    hint: '자막체 · 굵은 흰 외곽선으로 또렷하게',
    hintEn: 'Heavy caption type with a bold outline',
    font: CAPTION_FACES.meme.family,
    weight: CAPTION_FACES.meme.weight,
    outline: CAPTION_FACES.meme.outline,
    letterSpacing: CAPTION_FACES.meme.tracking,
  },
  {
    id: 'myeongjo',
    label: '단정 감성 명조',
    labelEn: 'Calm serif',
    sample: '잘 자요',
    hint: '차분한 인사·감정 컷용 명조',
    hintEn: 'Quiet serif for greetings',
    font: CAPTION_FACES.myeongjo.family,
    weight: CAPTION_FACES.myeongjo.weight,
    outline: CAPTION_FACES.myeongjo.outline,
    letterSpacing: CAPTION_FACES.myeongjo.tracking,
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
  const style = normalizeTextStyle(id);
  return TEXT_STYLES.find((item) => item.id === style) ?? TEXT_STYLES[0];
}

export function effectById(id: string | undefined) {
  return LAYER_EFFECTS.find((item) => item.id === id) ?? LAYER_EFFECTS[0];
}

/** 알 수 없는 입력도 안전한 레이어로 정규화한다 (서버 저장값·구버전 데이터 대비) */
export function normalizeLayer(input: Partial<TextLayer> | null | undefined, index = 0): TextLayer {
  const style = normalizeTextStyle(input?.style);
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
    rotate: clamp(Number.isFinite(input?.rotate) ? Number(input!.rotate) : 0, -5, 5),
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
    style: 'round',
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
  const spec = captionFaceSpec(plan.face);
  const fontStyle = { weight: spec.weight, font: spec.family };
  // 서체 보정(fit)이 끝난 실제 글자 크기 — SVG 렌더러와 같은 값이다.
  const fontSize = Math.max(8, plan.size);

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
  ctx.font = `${fontStyle.weight} ${fontSize}px ${fontStyle.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // 도장(stamp) 스타일도 글자만 찍는다 — 예전에 글자 둘레에 그리던 빨간 이중 원은
  //  미리보기(SVG)와 결과가 달라 얼굴/몸통을 가려서 제거했다.

  const top = -plan.height / 2;
  const left = -plan.width / 2;

  // 1) 그림자 — 가장 바깥 테두리에만 얹어 스티커가 살짝 떠 보이게 한다.
  if (plan.outline > 0) {
    ctx.save();
    ctx.shadowColor = plan.shadow.color;
    ctx.shadowBlur = plan.shadow.blur;
    ctx.shadowOffsetY = plan.shadow.offsetY;
    ctx.strokeStyle = '#FFFDFA';
    ctx.lineWidth = plan.outline * 1.15;
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, fontStyle);
    ctx.restore();
  }

  // 2) 흰 스티커 외곽선 — 한 겹만. 예전의 이중 테두리·톤 링은 작은 크기에서 글자를 뭉개서 걷어냈다.
  if (plan.outline > 0) {
    ctx.strokeStyle = '#FFFDFA';
    ctx.lineWidth = plan.outline * 1.15;
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, fontStyle);
  }

  // 3) 잉크 외곽선(얇은 서체만 살 찌우기) → 세로 그라데이션 채우기
  if (plan.bold > 0) {
    ctx.strokeStyle = plan.ink;
    ctx.lineWidth = plan.bold;
    for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'stroke', plan.width, fontStyle);
  }
  const fillGradient = ctx.createLinearGradient(0, top, 0, top + plan.height);
  fillGradient.addColorStop(0, plan.inkLight);
  fillGradient.addColorStop(0.55, plan.ink);
  fillGradient.addColorStop(1, plan.ink);
  ctx.fillStyle = fillGradient;
  for (const line of plan.lines) drawGlyphs(ctx, line, left, top, 'fill', plan.width, fontStyle);

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
  return normalizeLayer({ id: `layer-${Date.now()}-${index}`, text, style: 'round', bubble: 'none', x: 0.5, y: 0.84, size: 0.18, rotate: 0 }, index);
}
