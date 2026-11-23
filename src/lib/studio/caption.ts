// ─────────────────────────────────────────────────────────────
// 레터링 레이아웃 (SVG · 캔버스 공용)
//  · 서버 SVG(renderSticker)와 브라우저 캔버스(drawLayer)가 **같은 계산**을 쓴다.
//  · 글자 폭은 번들 폰트의 실제 advance 값을 표로 옮겨 두어 두 엔진의 줄바꿈·중앙정렬이 같다.
//  · 기본 서체는 둥글고 또렷한 'EmotiHak Round'(주아) — 카톡 채팅방 크기에서도 1초에 읽힌다.
//  · 정갈함 우선: 글자 크기는 한 크기로 통일하고(강조 확대 없음), 글자별 기울기·흔들림은
//    1도 안팎의 미세한 리듬만 남긴다. 네모 말풍선 박스 없이 흰 스티커 외곽선 + 얕은 그림자
//    + 감정별 딥톤 채움으로 마감한다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { TextLayerStyle } from '@/lib/studio/layers';

/** 번들 폰트 키 — 각 키는 public/fonts 의 실제 폰트 파일과 1:1로 대응한다. */
export type CaptionFace = 'calli' | 'brush' | 'hand' | 'gothic' | 'bold' | 'serif';

export const CAPTION_FONT_FILES: Record<CaptionFace, string> = {
  calli: '/fonts/EmotiHakRound.woff2',
  brush: '/fonts/EmotiHakBrush.woff2',
  hand: '/fonts/EmotiHakHand.woff2',
  gothic: '',
  bold: '',
  serif: '',
};

/** CSS font-family 이름 (페이지 @font-face 와 SVG 임베드가 같은 이름을 쓴다) */
export const CAPTION_FONT_FAMILIES: Record<CaptionFace, string> = {
  calli: '"EmotiHak Round", "Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  brush: '"EmotiHak Brush", "Yeon Sung", "EmotiHak Hand", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
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

const JUA_ASCII = [
  30, 30, 44, 84, 63, 77, 77, 35, 34, 35, 57, 55, 28, 47, 20, 48, 61, 41, 58, 55, 63, 58, 62, 60,
  58, 59, 23, 25, 55, 52, 54, 56, 88, 70, 56, 62, 61, 55, 54, 61, 61, 28, 62, 57, 54, 69, 62, 63,
  58, 65, 60, 61, 64, 63, 67, 80, 63, 62, 61, 47, 48, 47, 47, 53, 50, 57, 48, 46, 47, 51, 40, 50,
  47, 21, 42, 42, 22, 62, 49, 56, 49, 49, 49, 45, 51, 49, 53, 67, 52, 55, 49, 47, 36, 49, 63,
];

const SINGLE_DAY_ASCII = [
  27, 40, 40, 64, 46, 67, 59, 40, 40, 40, 40, 44, 28, 44, 28, 52, 46, 32, 43, 44, 49, 45, 44, 48,
  44, 45, 25, 26, 44, 44, 44, 45, 77, 51, 46, 52, 43, 47, 46, 55, 52, 43, 48, 45, 51, 62, 53, 46,
  42, 53, 44, 47, 51, 55, 52, 66, 53, 51, 51, 39, 52, 39, 40, 44, 33, 42, 46, 44, 41, 38, 42, 37,
  48, 34, 38, 45, 31, 61, 44, 39, 38, 37, 41, 36, 43, 46, 43, 59, 43, 41, 46, 40, 32, 40, 58,
];

const BAGEL_ASCII = [
  18, 43, 45, 81, 64, 79, 72, 27, 44, 44, 50, 66, 30, 52, 30, 42, 62, 47, 62, 60, 69, 61, 59, 60,
  64, 59, 36, 36, 63, 54, 63, 52, 85, 71, 64, 66, 66, 61, 59, 71, 67, 28, 58, 64, 60, 83, 69, 71,
  63, 71, 64, 64, 68, 66, 70, 93, 68, 70, 62, 40, 42, 40, 45, 54, 40, 55, 57, 52, 58, 53, 44, 55,
  55, 24, 26, 60, 24, 80, 55, 56, 59, 57, 48, 54, 52, 55, 54, 82, 56, 55, 53, 51, 29, 51, 62,
];

const YEONSUNG_ASCII = [
  30, 31, 39, 66, 56, 74, 62, 23, 29, 24, 46, 60, 24, 42, 25, 33, 56, 37, 49, 48, 50, 45, 49, 44,
  45, 46, 28, 28, 49, 60, 50, 50, 80, 51, 54, 54, 59, 47, 46, 64, 54, 36, 44, 51, 49, 66, 61, 66,
  50, 71, 56, 49, 48, 60, 52, 76, 57, 50, 48, 32, 33, 33, 49, 50, 24, 51, 53, 44, 50, 44, 39, 47,
  51, 22, 26, 47, 25, 68, 46, 48, 53, 50, 35, 41, 35, 51, 42, 63, 45, 46, 42, 39, 22, 39, 56,
];

const GAEGU_ASCII = [
  42, 44, 44, 73, 67, 76, 75, 32, 44, 44, 55, 62, 35, 62, 34, 46, 57, 43, 52, 53, 55, 49, 48, 48,
  54, 51, 35, 35, 45, 62, 45, 54, 76, 54, 57, 55, 57, 49, 50, 62, 63, 38, 39, 54, 45, 71, 61, 57,
  48, 59, 51, 51, 49, 58, 54, 75, 55, 49, 51, 52, 46, 52, 58, 32, 42, 47, 46, 43, 48, 48, 35, 50,
  49, 31, 31, 43, 30, 73, 47, 42, 46, 47, 38, 39, 35, 49, 45, 65, 47, 47, 40, 42, 39, 42, 79,
];

const FACE_METRICS: Record<CaptionFace, FaceMetrics> = {
  calli: { hangul: 83, ascii: JUA_ASCII, fallback: 90 },
  brush: { hangul: 67.2, ascii: YEONSUNG_ASCII, fallback: 84 },
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
    case 'brush':
      return 'brush';
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

/**
 * 감정별 포인트 컬러 — 흰 외곽선 위에서 읽히는 **깊이 있는 딥톤**.
 * 원색 대신 명도를 낮추고 채도를 살짝 눌러 실제 판매용 이모티콘 레터링처럼 보이게 한다.
 */
export const EMOTION_INK: Record<Emotion, string> = {
  joy: '#D8443C',
  laugh: '#D2680F',
  love: '#D42F66',
  sad: '#2F63B4',
  cry: '#24509A',
  angry: '#BE2A1E',
  king: '#9E1418',
  sulk: '#5A4C7E',
  tired: '#3F4E6B',
  surprised: '#BC7A05',
  smug: '#166B4E',
  blank: '#232A36',
};

/** 글자 그라데이션의 위쪽(빛 받는) 톤 — 잉크에서 밝기만 올린 값. */
export const EMOTION_INK_LIGHT: Record<Emotion, string> = {
  joy: '#F08A6C',
  laugh: '#F0A24A',
  love: '#F27A9C',
  sad: '#5E93D9',
  cry: '#4E7EC2',
  angry: '#DE6A4E',
  king: '#D0413C',
  sulk: '#8A7BB0',
  tired: '#71809E',
  surprised: '#E9AE3C',
  smug: '#3F9A76',
  blank: '#4C5766',
};

/** #rrggbb 두 색을 섞는다(t=0 → a, t=1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
    const n = m ? parseInt(m[1], 16) : 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const k = Math.max(0, Math.min(1, t));
  const to = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${to(r1, r2)}${to(g1, g2)}${to(b1, b2)}`;
}

/** 저장된 레이어 색이 기본 잉크(#191512)면 감정 컬러를, 사용자가 고른 색이면 그 색을 쓴다. */
export const LEGACY_INK = '#191512';

function customInk(color?: string): string | null {
  const custom = String(color ?? '').trim();
  if (custom && custom.toLowerCase() !== LEGACY_INK && /^#[0-9a-fA-F]{6}$/.test(custom)) return custom;
  return null;
}

export function inkFor(emotion: Emotion | undefined, color?: string): string {
  return customInk(color) ?? EMOTION_INK[(emotion ?? 'blank') as Emotion] ?? EMOTION_INK.blank;
}

/**
 * 레터링 색 세트 — 캔버스와 SVG 가 같은 값을 쓴다.
 *  · ink: 아래쪽(진한) 채움   · inkLight: 위쪽 하이라이트 채움   · underline: 붓 밑줄 색
 */
export function inkTonesFor(emotion: Emotion | undefined, color?: string) {
  const custom = customInk(color);
  const key = (emotion ?? 'blank') as Emotion;
  const ink = custom ?? EMOTION_INK[key] ?? EMOTION_INK.blank;
  const inkLight = custom ? mixHex(custom, '#FFFFFF', 0.34) : EMOTION_INK_LIGHT[key] ?? EMOTION_INK_LIGHT.blank;
  return {
    ink,
    inkLight,
    underline: mixHex(ink, '#FFFFFF', 0.12),
  };
}

export interface CaptionGlyph {
  ch: string;
  /** 이 글자만의 크기(px). 없으면 줄 크기를 쓴다 — 강조 단어에서만 다르다. */
  size?: number;
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

/** 서체별 상승부·하강부(em) — 기준선과 블록 높이를 실제 글자에 맞춘다. */
export const CAPTION_ASCENT: Record<CaptionFace, number> = {
  calli: 0.8,
  brush: 0.63,
  hand: 0.85,
  gothic: 0.86,
  bold: 0.86,
  serif: 0.85,
};

export const CAPTION_DESCENT: Record<CaptionFace, number> = {
  calli: 0.1,
  brush: 0.25,
  hand: 0.12,
  gothic: 0.16,
  bold: 0.16,
  serif: 0.2,
};

/** 글자별 기울기 상한(도) — 정갈한 기본 서체는 1도 안쪽, 붓글씨만 조금 더 준다. */
export const CAPTION_TILT: Record<CaptionFace, number> = {
  calli: 0.9,
  brush: 2,
  hand: 1.4,
  gothic: 0,
  bold: 0,
  serif: 0.8,
};

/** 글자별 세로 흔들림(em) — 고딕 계열은 0(반듯하게). */
export const CAPTION_WAVE: Record<CaptionFace, number> = {
  calli: 0.004,
  brush: 0.01,
  hand: 0.006,
  gothic: 0,
  bold: 0,
  serif: 0.002,
};

/** 자간(em) — 둥근 서체는 살짝 숨을 주고, 고딕 계열은 조금 조인다. */
export const CAPTION_TRACKING: Record<CaptionFace, number> = {
  calli: 0.004,
  brush: 0.006,
  hand: 0.004,
  gothic: -0.006,
  bold: -0.01,
  serif: 0.02,
};

/**
 * 레터링 레이아웃.
 *  · 2줄까지 접고, 모든 줄은 같은 크기로 그린다(정갈함 우선).
 *  · 글자마다 ±tilt 도의 기울기와 미세한 세로 흔들림을 준다(손글씨 리듬).
 */
export function layoutCaption(
  text: string,
  opts: {
    size: number;
    maxWidth: number;
    face?: CaptionFace;
    seed?: number;
    tilt?: number;
    /** 글자 사이 자간(em) — 양수면 넓히고 음수면 좁힌다 */
    tracking?: number;
    maxLines?: number;
  },
): CaptionLayout {
  const face = opts.face ?? 'calli';
  const maxLines = Math.max(1, Math.min(2, opts.maxLines ?? 2));
  const tilt = Math.max(0, Math.min(8, opts.tilt ?? CAPTION_TILT[face]));
  const waveEm = CAPTION_WAVE[face];
  const trackingEm = opts.tracking ?? CAPTION_TRACKING[face];
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

  // 정갈함 우선 — 모든 줄은 같은 크기로 그린다(줄마다 크기를 바꾸면 들쭉날쭉해 보인다).
  const sizes = raw.map(() => size);
  // 한 줄이 넘치면 그 줄만 줄인다(다른 줄 크기는 유지).
  sizes.forEach((lineSize, index) => {
    const lineWidth = measureLine(raw[index], lineSize, face);
    if (lineWidth > opts.maxWidth) {
      sizes[index] = Math.max(10, Math.floor((lineSize * opts.maxWidth) / lineWidth));
    }
  });

  // 행간 — 서체의 실제 상승부·하강부에 맞춰 두 줄이 붙지도 벌어지지도 않게.
  const lineGap = size * (face === 'brush' ? 0.2 : 0.14);
  const lines: CaptionLine[] = [];
  let top = 0;
  raw.forEach((lineText, lineIndex) => {
    const lineSize = sizes[lineIndex];
    const glyphs: CaptionGlyph[] = [];
    let cursor = 0;
    let glyphIndex = 0;
    for (const ch of lineText) {
      const isSpace = ch === ' ';
      const advance = charAdvance(ch, lineSize, face);
      const tracking = isSpace ? 0 : trackingEm * lineSize;
      // 미세한 리듬 — 1도 안팎의 기울기와 종이 위에 놓인 듯한 아주 작은 흔들림만.
      const jitter = isSpace ? 0 : (noise(seed, lineIndex * 64 + glyphIndex) - 0.5) * 2 * tilt;
      const waveY =
        isSpace || waveEm === 0 ? 0 : (noise(seed + 977, lineIndex * 64 + glyphIndex) - 0.5) * 2 * lineSize * waveEm;
      glyphs.push({
        ch,
        x: cursor + advance / 2,
        advance,
        angle: Number(jitter.toFixed(2)),
        dy: Number(waveY.toFixed(2)),
      });
      cursor += advance + tracking;
      glyphIndex += 1;
    }
    // 기준선: 블록 상단 + 서체의 상승부(주아 0.80em) — 글자 시각 중심이 블록 중심에 온다.
    const baseline = top + lineSize * CAPTION_ASCENT[face];
    lines.push({ glyphs, width: cursor, size: lineSize, baseline });
    top += lineSize + lineGap;
  });

  const width = Math.max(0, ...lines.map((line) => line.width));
  // 아래로 내려오는 획(디센더)까지만 포함 — 빈 여백이 붙어 블록이 아래로 치우치지 않게.
  const height = Math.max(...lines.map((line) => line.baseline + line.size * CAPTION_DESCENT[face]));
  return { lines, width, height, size, lineHeight: size * 1.04 };
}

/** 흰 외곽선 두께 (글자 크기 대비) */
export const CAPTION_OUTLINE: Record<CaptionFace, number> = {
  calli: 0.13,
  brush: 0.2,
  hand: 0.17,
  gothic: 0.15,
  bold: 0.18,
  serif: 0.06,
};

/**
 * 글자 살을 찌우는 잉크 외곽선 두께 (글자 크기 대비).
 * 붓글씨 서체는 획이 가늘어 360px 이모티콘에서 힘이 빠진다 → 같은 색으로 한 번 더 발라
 * 카톡 이모티콘 특유의 두툼한 레터링을 만든다.
 */
export const CAPTION_BOLD: Record<CaptionFace, number> = {
  calli: 0,
  brush: 0.06,
  hand: 0.04,
  gothic: 0,
  bold: 0,
  serif: 0,
};
