// ─────────────────────────────────────────────────────────────
// 캘리그라피 레터링 레이아웃 (SVG · 캔버스 공용)
//  · 서버 SVG(renderSticker)와 브라우저 캔버스(drawLayer)가 **같은 계산**을 쓴다.
//  · 글자 폭은 번들 폰트의 실제 advance 값을 표로 옮겨 두어 두 엔진의 줄바꿈·중앙정렬이 같다.
//  · 네모 말풍선 박스 대신, 글자 자체에 두꺼운 흰색 외곽선 + 부드러운 그림자 + 미세한 기울기
//    리듬 + 감정별 포인트 컬러를 준다(카톡 이모티콘 레터링).
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { TextLayerStyle } from '@/lib/studio/layers';

/** 번들 폰트 키 — 각 키는 public/fonts 의 실제 폰트 파일과 1:1로 대응한다. */
export type CaptionFace = 'calli' | 'hand' | 'gothic' | 'bold' | 'serif';

export const CAPTION_FONT_FILES: Record<CaptionFace, string> = {
  calli: '/fonts/EmotiHakCalli.woff2',
  hand: '/fonts/EmotiHakHand.woff2',
  gothic: '',
  bold: '',
  serif: '',
};

/** CSS font-family 이름 (페이지 @font-face 와 SVG 임베드가 같은 이름을 쓴다) */
export const CAPTION_FONT_FAMILIES: Record<CaptionFace, string> = {
  calli: '"EmotiHak Calli", "Nanum Pen Script", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  hand: '"EmotiHak Hand", "Gaegu", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  gothic: '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
  bold: '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
  serif: '"Nanum Myeongjo", Batang, "Apple SD Gothic Neo", serif',
};

/** 글자 폭 표 (em 단위 × 100). 실제 폰트의 hmtx advance 값. */
interface FaceMetrics {
  hangul: number;
  /** ASCII 0x20~0x7E (95자) */
  ascii: number[];
  fallback: number;
}

const SINGLE_DAY_ASCII = [
  27, 40, 40, 64, 46, 67, 59, 40, 40, 40, 40, 44, 28, 44, 28, 52, 46, 32, 43, 44, 49, 45, 44, 48,
  44, 45, 25, 26, 44, 44, 44, 45, 77, 51, 46, 52, 43, 47, 46, 55, 52, 43, 48, 45, 51, 62, 53, 46,
  42, 53, 44, 47, 51, 55, 52, 66, 53, 51, 51, 39, 52, 39, 40, 44, 33, 42, 46, 44, 41, 38, 42, 37,
  48, 34, 38, 45, 31, 61, 44, 39, 38, 37, 41, 36, 43, 46, 43, 59, 43, 41, 46, 40, 32, 40, 58,
];

const GAEGU_ASCII = [
  42, 44, 44, 73, 67, 76, 75, 32, 44, 44, 55, 62, 35, 62, 34, 46, 57, 43, 52, 53, 55, 49, 48, 48,
  54, 51, 35, 35, 45, 62, 45, 54, 76, 54, 57, 55, 57, 49, 50, 62, 63, 38, 39, 54, 45, 71, 61, 57,
  48, 59, 51, 51, 49, 58, 54, 75, 55, 49, 51, 52, 46, 52, 58, 32, 42, 47, 46, 43, 48, 48, 35, 50,
  49, 31, 31, 43, 30, 73, 47, 42, 46, 47, 38, 39, 35, 49, 45, 65, 47, 47, 40, 42, 39, 42, 79,
];

const FACE_METRICS: Record<CaptionFace, FaceMetrics> = {
  calli: { hangul: 80.5, ascii: SINGLE_DAY_ASCII, fallback: 90 },
  hand: { hangul: 82, ascii: GAEGU_ASCII, fallback: 90 },
  gothic: { hangul: 100, ascii: Array.from({ length: 95 }, () => 56), fallback: 100 },
  bold: { hangul: 100, ascii: Array.from({ length: 95 }, () => 60), fallback: 100 },
  serif: { hangul: 100, ascii: Array.from({ length: 95 }, () => 50), fallback: 100 },
};

const HANGUL_LIKE =
  /[\u1100-\u11FF\u2E80-\uA4CF\uA960-\uA97F\uAC00-\uD7FF\uF900-\uFAFF\uFF00-\uFF60\u3000-\u303F\u3130-\u318F]/;
const EMOJI_LIKE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** 글자 폭(px). 두 엔진이 같은 표를 쓰므로 줄바꿈과 중앙정렬이 일치한다. */
export function charAdvance(ch: string, size: number, face: CaptionFace): number {
  const m = FACE_METRICS[face] ?? FACE_METRICS.calli;
  const code = ch.codePointAt(0) ?? 32;
  let em: number;
  if (code >= 0x20 && code <= 0x7e) em = (m.ascii[code - 0x20] ?? 50) / 100;
  else if (HANGUL_LIKE.test(ch)) em = m.hangul / 100;
  else if (EMOJI_LIKE.test(ch)) em = 1;
  else em = m.fallback / 100;
  return em * size;
}

export function captionFaceOf(style: TextLayerStyle | undefined): CaptionFace {
  switch (style) {
    case 'calli':
      return 'calli';
    case 'hand':
      return 'hand';
    case 'gothic':
      return 'gothic';
    case 'bold':
      return 'bold';
    case 'stamp':
      return 'serif';
    default:
      return 'calli';
  }
}

/** 감정별 포인트 컬러 — 흰 외곽선 위에서 읽히는 진한 톤. */
export const EMOTION_INK: Record<Emotion, string> = {
  joy: '#F2564B',
  laugh: '#F5761A',
  love: '#F0407A',
  sad: '#3D7BD9',
  cry: '#2E63B8',
  angry: '#E03123',
  king: '#C81E17',
  sulk: '#6B5B8E',
  tired: '#4C5A78',
  surprised: '#E09607',
  smug: '#1F7A5A',
  blank: '#2B3240',
};

/** 저장된 레이어 색이 기본 잉크(#191512)면 감정 컬러를, 사용자가 고른 색이면 그 색을 쓴다. */
export const LEGACY_INK = '#191512';

export function inkFor(emotion: Emotion | undefined, color?: string): string {
  const custom = String(color ?? '').trim();
  if (custom && custom.toLowerCase() !== LEGACY_INK && /^#[0-9a-fA-F]{6}$/.test(custom)) return custom;
  return EMOTION_INK[(emotion ?? 'blank') as Emotion] ?? EMOTION_INK.blank;
}

export interface CaptionGlyph {
  ch: string;
  /** 줄 시작(0)부터 글자 상자의 중심까지 거리(px) */
  x: number;
  advance: number;
  /** 글자별 기울기(도) */
  angle: number;
  /** 글자별 세로 흔들림(px, +는 아래) */
  dy: number;
}

export interface CaptionLine {
  glyphs: CaptionGlyph[];
  width: number;
  size: number;
  /** 블록 상단(0)부터 이 줄의 기준선까지(px) */
  baseline: number;
}

export interface CaptionLayout {
  lines: CaptionLine[];
  width: number;
  height: number;
  /** 첫 줄 글자 크기(px) */
  size: number;
  lineHeight: number;
}

function hashText(text: string, seed: number): number {
  let h = 2166136261 ^ (seed | 0);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 결정적 난수 (0~1) */
function noise(seed: number, index: number): number {
  let x = (seed + Math.imul(index + 1, 2654435761)) >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  return x / 4294967296;
}

function measureLine(text: string, size: number, face: CaptionFace): number {
  let w = 0;
  for (const ch of text) w += charAdvance(ch, size, face);
  return w;
}

function wrapAt(text: string, size: number, face: CaptionFace, maxWidth: number, maxLines: number): string[] | null {
  const segments = text.split(' ').filter((s) => s.length > 0);
  const lines: string[] = [];
  let current = '';
  const push = () => {
    if (current) lines.push(current);
    current = '';
  };
  for (const segment of segments) {
    const candidate = current ? `${current} ${segment}` : segment;
    if (measureLine(candidate, size, face) <= maxWidth) {
      current = candidate;
      continue;
    }
    // 단어 단위로 넘치면 지금 줄을 접는다.
    if (current) {
      push();
      if (measureLine(segment, size, face) <= maxWidth) {
        current = segment;
        continue;
      }
    }
    // 단어 하나가 한 줄을 넘으면 글자 단위로 쪼갠다.
    for (const ch of segment) {
      const next = current + ch;
      if (current && measureLine(next, size, face) > maxWidth) {
        push();
        current = ch;
      } else {
        current = next;
      }
      if (lines.length >= maxLines) return null;
    }
  }
  push();
  if (lines.length > maxLines) return null;
  return lines.length ? lines : [''];
}

/**
 * 캘리그라피 레이아웃.
 *  · 2줄까지 접고, 짧은 마지막 줄은 살짝 키워 강조한다.
 *  · 글자마다 -tilt~+tilt 도의 기울기와 미세한 세로 흔들림을 준다(손글씨 리듬).
 */
export function layoutCaption(
  text: string,
  opts: {
    size: number;
    maxWidth: number;
    face?: CaptionFace;
    seed?: number;
    tilt?: number;
    maxLines?: number;
  },
): CaptionLayout {
  const face = opts.face ?? 'calli';
  const maxLines = Math.max(1, Math.min(2, opts.maxLines ?? 2));
  const tilt = Math.max(0, Math.min(8, opts.tilt ?? 3.4));
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 34);
  const seed = hashText(clean, opts.seed ?? 7);

  let size = Math.max(8, opts.size);
  let raw: string[] = [clean];
  for (let guard = 0; guard < 12; guard += 1) {
    const wrapped = wrapAt(clean || ' ', size, face, opts.maxWidth, maxLines);
    if (wrapped) {
      raw = wrapped;
      break;
    }
    size = Math.floor(size * 0.92);
    if (size <= 10) {
      raw = [clean];
      break;
    }
  }

  // 긴 한 줄이 폭을 꽉 채우면 답답하다 → 띄어쓰기 지점에서 두 줄로 나눠 숨을 준다.
  if (maxLines >= 2 && raw.length === 1) {
    const bare = [...clean.replace(/ /g, '')].length;
    if (bare >= 7 && clean.includes(' ')) {
      const words = clean.split(' ');
      let best = -1;
      let bestGap = Number.POSITIVE_INFINITY;
      let left = '';
      for (let i = 0; i < words.length - 1; i += 1) {
        left = left ? `${left} ${words[i]}` : words[i];
        const right = words.slice(i + 1).join(' ');
        const gap = Math.abs(measureLine(left, size, face) - measureLine(right, size, face));
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      }
      if (best >= 0) {
        const first = words.slice(0, best + 1).join(' ');
        const second = words.slice(best + 1).join(' ');
        if (
          measureLine(first, size, face) <= opts.maxWidth &&
          measureLine(second, size, face) <= opts.maxWidth
        ) {
          raw = [first, second];
        }
      }
    }
  }

  // 손글씨 리듬: 2줄이면 첫 줄을 살짝 작게, 마무리 단어가 짧으면 살짝 키워 강조한다.
  const sizes = raw.map(() => size);
  if (raw.length === 2) {
    const lastChars = [...raw[1].replace(/ /g, '')].length;
    sizes[0] = size * 0.92;
    sizes[1] = lastChars > 0 && lastChars <= 3 ? size * 1.06 : size;
  }
  // 한 줄이 넘치면 그 줄만 줄인다(다른 줄 크기는 유지).
  sizes.forEach((lineSize, index) => {
    const lineWidth = measureLine(raw[index], lineSize, face);
    if (lineWidth > opts.maxWidth) {
      sizes[index] = Math.max(10, Math.floor((lineSize * opts.maxWidth) / lineWidth));
    }
  });

  const lineGap = size * 0.16;
  const lines: CaptionLine[] = [];
  let top = 0;
  raw.forEach((lineText, lineIndex) => {
    const lineSize = sizes[lineIndex];
    const glyphs: CaptionGlyph[] = [];
    let cursor = 0;
    let glyphIndex = 0;
    for (const ch of lineText) {
      const advance = charAdvance(ch, lineSize, face);
      const isSpace = ch === ' ';
      const jitter = isSpace ? 0 : (noise(seed, lineIndex * 64 + glyphIndex) - 0.5) * 2 * tilt;
      const wave = isSpace ? 0 : (noise(seed + 977, lineIndex * 64 + glyphIndex) - 0.5) * 2 * lineSize * 0.014;
      glyphs.push({
        ch,
        x: cursor + advance / 2,
        advance,
        angle: Number(jitter.toFixed(2)),
        dy: Number(wave.toFixed(2)),
      });
      cursor += advance;
      glyphIndex += 1;
    }
    const lineHeight = lineSize * 1.04;
    // 기준선: 글자 상자 상단 + 상승부(≈0.95em) — 손글씨 폰트의 시각 중심에 맞춘다.
    const baseline = top + lineSize * 0.95;
    lines.push({ glyphs, width: cursor, size: lineSize, baseline });
    top += lineHeight + lineGap;
  });

  const width = Math.max(0, ...lines.map((line) => line.width));
  // 아래로 내려오는 획(디센더)까지 포함해 잘리지 않게 잡는다 (붓글씨 서체는 아래로 길게 뻗는다).
  const height = Math.max(...lines.map((line) => line.baseline + line.size * 0.4));
  return { lines, width, height, size, lineHeight: size * 1.04 };
}

/** 흰 외곽선 두께 (글자 크기 대비) */
export const CAPTION_OUTLINE: Record<CaptionFace, number> = {
  calli: 0.18,
  hand: 0.18,
  gothic: 0.16,
  bold: 0.2,
  serif: 0.08,
};

/**
 * 글자 살을 찌우는 잉크 외곽선 두께 (글자 크기 대비).
 * 붓글씨 서체는 획이 가늘어 360px 이모티콘에서 힘이 빠진다 → 같은 색으로 한 번 더 발라
 * 카톡 이모티콘 특유의 두툼한 레터링을 만든다.
 */
export const CAPTION_BOLD: Record<CaptionFace, number> = {
  calli: 0.1,
  hand: 0.06,
  gothic: 0,
  bold: 0,
  serif: 0,
};
