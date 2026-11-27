// ─────────────────────────────────────────────────────────────
// 레터링 레이아웃 (SVG · 캔버스 공용)
//  · 서버 SVG(renderSticker)와 브라우저 캔버스(drawLayer)가 **같은 계산**을 쓴다.
//  · 글자 폭은 번들 폰트의 실제 advance 값을 표로 옮겨 두어 두 엔진의 줄바꿈·중앙정렬이 같다.
//  · 서체는 4종 — 동글 손글씨(주아) · 세련된 캘리그라피(독도) · 예능/밈 굵은체(검은고딕) ·
//    단정 감성 명조(고운바탕). 네 폰트 모두 앱에 직접 넣은(SIL OFL) 웹폰트다.
//  · 정갈함 우선: 글자 크기는 한 크기로 통일하고(강조 확대 없음), 글자별 기울기·흔들림은
//    서체에 맞춰 아주 작게만 준다. 네모 말풍선 박스 없이 흰 스티커 외곽선 + 얕은 그림자
//    + 감정별 딥톤 채움으로 마감한다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';

/** 번들 서체 키 — 각 키는 public/fonts 의 실제 폰트 파일과 1:1로 대응한다. */
export type CaptionFace = 'round' | 'brush' | 'meme' | 'myeongjo';

export interface CaptionFaceSpec {
  /** 앱에서 부르는 서체 이름 (기본값) */
  key: CaptionFace;
  /** 번들 폰트 파일 경로 (없으면 시스템 대체 서체로만 그린다) */
  file: string;
  /** CSS font-family 스택 — 페이지 @font-face 와 SVG 임베드가 같은 이름을 쓴다 */
  family: string;
  /** 번들 폰트의 실제 굵기 — SVG 와 캔버스가 **같은 값**을 써야 미리보기와 저장이 같다 */
  weight: number;
  /** 글자 폭 표 (em 단위 × 100). 실제 폰트의 hmtx advance 값. */
  hangul: number;
  ascii: number[];
  fallback: number;
  /**
   * 눈에 보이는 크기 보정 — 폰트마다 em 박스 안에서 글자가 차지하는 높이가 달라
   * (붓글씨는 작게, 명조는 크게 그려진다) 같은 size 에서도 실제 크기가 달라진다.
   * 이 값을 곱해 네 서체의 시각 크기를 맞춘다.
   */
  fit: number;
  /** 상승부·하강부(보정된 글자 크기 대비 em) — 기준선과 블록 높이를 실제 글자에 맞춘다. */
  ascent: number;
  descent: number;
  /** 글자별 기울기 상한(도) — 반듯한 서체는 1도 안쪽만. */
  tilt: number;
  /** 글자별 세로 흔들림(em) — 고딕 계열은 0(반듯하게). */
  wave: number;
  /** 자간(em) — 양수면 넓히고 음수면 좁힌다 */
  tracking: number;
  /** 줄 사이 여백(em) */
  lineGap: number;
  /** 흰 스티커 외곽선 두께(글자 크기 대비) */
  outline: number;
  /** 잉크 살찌우기 두께(글자 크기 대비) — 가는 붓글씨를 이모티콘 크기에서도 또렷하게 */
  bold: number;
  /** 붓 밑줄 포인트 — 손멋글씨에만 */
  underline: boolean;
  /** 세로 그라데이션 위쪽 밝기 (0이면 단색에 가깝다) */
  inkLightMix: number;
}

const JUA_ASCII = [
  30, 30, 44, 84, 63, 77, 77, 35, 34, 35, 57, 54, 28, 47, 20, 48, 61, 41, 58, 55, 63, 58, 62, 60,
  58, 59, 23, 25, 55, 52, 54, 56, 88, 70, 56, 62, 61, 55, 54, 61, 61, 28, 62, 57, 54, 69, 62, 63,
  58, 65, 60, 61, 64, 63, 67, 80, 63, 62, 61, 47, 48, 47, 47, 53, 50, 58, 48, 46, 47, 51, 40, 50,
  47, 21, 42, 42, 22, 62, 49, 56, 49, 49, 49, 45, 51, 49, 53, 67, 52, 55, 49, 47, 36, 49, 63,
];

const DOKDO_ASCII = [
  28, 37, 42, 67, 59, 68, 68, 32, 43, 43, 40, 56, 22, 52, 22, 55, 59, 39, 52, 52, 58, 52, 52, 50,
  55, 54, 31, 31, 43, 56, 43, 46, 68, 58, 54, 56, 54, 54, 53, 60, 60, 34, 46, 54, 48, 76, 63, 60,
  52, 62, 58, 52, 48, 60, 56, 76, 51, 50, 56, 45, 55, 45, 40, 68, 50, 49, 49, 48, 52, 44, 40, 46,
  50, 35, 38, 51, 30, 64, 48, 46, 46, 45, 40, 42, 43, 45, 43, 63, 50, 46, 44, 47, 40, 47, 63,
];

const BLACK_HAN_ASCII = [
  30, 31, 37, 75, 55, 86, 80, 26, 42, 42, 52, 48, 27, 48, 27, 51, 60, 60, 60, 60, 60, 60, 60, 60,
  60, 60, 31, 31, 44, 48, 44, 42, 82, 73, 71, 60, 77, 64, 56, 72, 78, 36, 44, 71, 55, 97, 79, 76,
  71, 76, 74, 69, 60, 73, 72, 98, 71, 67, 71, 43, 51, 43, 49, 48, 50, 68, 71, 55, 71, 68, 43, 64,
  71, 36, 36, 67, 37, 102, 71, 71, 71, 71, 45, 63, 44, 71, 62, 96, 65, 62, 64, 46, 39, 46, 60,
];

const GOWUN_ASCII = [
  31, 31, 38, 66, 60, 87, 87, 23, 42, 42, 51, 65, 30, 45, 30, 50, 60, 50, 56, 56, 56, 56, 56, 56,
  56, 56, 32, 32, 65, 65, 65, 54, 90, 71, 60, 71, 72, 57, 54, 76, 75, 32, 34, 66, 57, 86, 72, 81,
  59, 81, 64, 54, 64, 72, 70, 96, 66, 65, 60, 42, 50, 42, 50, 65, 60, 50, 58, 48, 56, 50, 36, 51,
  57, 28, 28, 54, 28, 86, 58, 55, 57, 56, 40, 43, 37, 56, 54, 78, 50, 54, 42, 42, 40, 42, 65,
];

/**
 * 네 가지 서체.
 *  ① round    동글 손글씨 (기본값) — 도톰하고 둥근 손글씨. 실사 사진 옆에서도 한눈에 읽힌다.
 *  ② brush    세련된 캘리그라피 — 획의 강약이 살아 있는 붓 손멋글씨.
 *  ③ meme     예능·밈 굵은체 — 자막체. 흰 외곽선이 두꺼워 어떤 사진 위에서도 또렷하다.
 *  ④ myeongjo 단정 감성 명조 — 차분한 인사·감정 컷용.
 */
export const CAPTION_FACES: Record<CaptionFace, CaptionFaceSpec> = {
  round: {
    key: 'round',
    file: '/fonts/EmotiHakRound.woff2',
    family: '"EmotiHak Round", "Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    weight: 400,
    hangul: 81,
    ascii: JUA_ASCII,
    fallback: 90,
    fit: 1,
    ascent: 0.81,
    descent: 0.07,
    tilt: 0.7,
    wave: 0.003,
    tracking: 0.002,
    lineGap: 0.12,
    outline: 0.11,
    bold: 0,
    underline: false,
    inkLightMix: 0.34,
  },
  brush: {
    key: 'brush',
    file: '/fonts/EmotiHakCalli.woff2',
    family: '"EmotiHak Calli", "Dokdo", "EmotiHak Round", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    weight: 400,
    hangul: 69,
    ascii: DOKDO_ASCII,
    fallback: 90,
    // 독도체는 em 박스 안에서 글자가 작게 그려진다 — 붓글씨 특유의 여백을 살리되 크기는 맞춘다.
    fit: 1.26,
    ascent: 0.66,
    descent: 0.32,
    tilt: 1.2,
    wave: 0.004,
    tracking: 0.012,
    lineGap: 0.18,
    // 붓글씨는 획이 가늘어 360px 에서 흰 외곽선에 먹히기 쉽다 — 외곽선은 얇게, 잉크 살은 두껍게.
    outline: 0.105,
    bold: 0.075,
    // 밑줄은 두지 않는다 — 360px 에서 마지막 획과 겹쳐 지저분해 보였다(여백으로 강약을 살린다).
    underline: false,
    // 얇은 붓획은 위쪽 하이라이트가 밝으면 360px 에서 바래 보인다 — 단색에 가깝게.
    inkLightMix: 0.2,
  },
  meme: {
    key: 'meme',
    file: '/fonts/EmotiHakMeme.woff2',
    family: '"EmotiHak Meme", "Black Han Sans", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    weight: 400,
    hangul: 84,
    ascii: BLACK_HAN_ASCII,
    fallback: 100,
    fit: 1,
    ascent: 0.79,
    descent: 0.04,
    tilt: 0,
    wave: 0,
    tracking: -0.004,
    lineGap: 0.1,
    outline: 0.13,
    bold: 0,
    underline: false,
    inkLightMix: 0.14,
  },
  myeongjo: {
    key: 'myeongjo',
    file: '/fonts/EmotiHakMyeongjo.woff2',
    family: '"EmotiHak Myeongjo", "Gowun Batang", "Nanum Myeongjo", Batang, "Apple SD Gothic Neo", serif',
    weight: 700,
    hangul: 91,
    ascii: GOWUN_ASCII,
    fallback: 100,
    // 고운바탕은 em 박스에 꽉 차게 그려져 그대로 쓰면 다른 서체보다 커 보인다.
    fit: 0.94,
    ascent: 0.87,
    descent: 0.13,
    tilt: 0.3,
    wave: 0.001,
    tracking: 0.012,
    lineGap: 0.14,
    outline: 0.11,
    bold: 0.022,
    underline: false,
    inkLightMix: 0.22,
  },
};

export const CAPTION_FACE_KEYS = Object.keys(CAPTION_FACES) as CaptionFace[];

/** 번들 폰트 파일 (없으면 시스템 대체 서체로만 그린다) */
export const CAPTION_FONT_FILES: Record<CaptionFace, string> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].file]),
) as Record<CaptionFace, string>;

/** CSS font-family 스택 — 페이지 @font-face 와 SVG 임베드가 같은 이름을 쓴다 */
export const CAPTION_FONT_FAMILIES: Record<CaptionFace, string> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].family]),
) as Record<CaptionFace, string>;

/** 서체별 상승부·하강부(em) — 기준선과 블록 높이를 실제 글자에 맞춘다. */
export const CAPTION_ASCENT: Record<CaptionFace, number> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].ascent]),
) as Record<CaptionFace, number>;

export const CAPTION_DESCENT: Record<CaptionFace, number> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].descent]),
) as Record<CaptionFace, number>;

/** 글자별 기울기 상한(도) — 정갈한 서체는 1도 안쪽, 붓글씨만 조금 더 준다. */
export const CAPTION_TILT: Record<CaptionFace, number> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].tilt]),
) as Record<CaptionFace, number>;

/** 글자별 세로 흔들림(em) — 고딕 계열은 0(반듯하게). */
export const CAPTION_WAVE: Record<CaptionFace, number> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].wave]),
) as Record<CaptionFace, number>;

/** 자간(em) */
export const CAPTION_TRACKING: Record<CaptionFace, number> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].tracking]),
) as Record<CaptionFace, number>;

/** 흰 외곽선 두께 (글자 크기 대비) */
export const CAPTION_OUTLINE: Record<CaptionFace, number> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].outline]),
) as Record<CaptionFace, number>;

/** 글자 살을 찌우는 잉크 외곽선 두께 (글자 크기 대비) */
export const CAPTION_BOLD: Record<CaptionFace, number> = Object.fromEntries(
  CAPTION_FACE_KEYS.map((face) => [face, CAPTION_FACES[face].bold]),
) as Record<CaptionFace, number>;

const HANGUL_LIKE =
  /[\u1100-\u11FF\u2E80-\uA4CF\uA960-\uA97F\uAC00-\uD7FF\uF900-\uFAFF\uFF00-\uFF60\u3000-\u303F\u3130-\u318F]/;
const EMOJI_LIKE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** 글자 폭(px). 두 엔진이 같은 표를 쓰므로 줄바꿈과 중앙정렬이 일치한다. */
export function charAdvance(ch: string, size: number, face: CaptionFace): number {
  const m = CAPTION_FACES[face] ?? CAPTION_FACES.round;
  const code = ch.codePointAt(0) ?? 32;
  let em: number;
  if (code >= 0x20 && code <= 0x7e) em = (m.ascii[code - 0x20] ?? 50) / 100;
  else if (HANGUL_LIKE.test(ch)) em = m.hangul / 100;
  else if (EMOJI_LIKE.test(ch)) em = 1;
  else em = m.fallback / 100;
  return em * size;
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
export function inkTonesFor(emotion: Emotion | undefined, color?: string, face: CaptionFace = 'round') {
  const custom = customInk(color);
  const key = (emotion ?? 'blank') as Emotion;
  const ink = custom ?? EMOTION_INK[key] ?? EMOTION_INK.blank;
  const mix = CAPTION_FACES[face]?.inkLightMix ?? 0.34;
  const inkLight = mixHex(ink, '#FFFFFF', mix);
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
  /** 첫 줄 글자 크기(px, 서체 보정이 적용된 값) */
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
 * 레터링 레이아웃.
 *  · 2줄까지 접고, 모든 줄은 같은 크기로 그린다(정갈함 우선).
 *  · 글자마다 ±tilt 도의 기울기와 미세한 세로 흔들림을 준다(손글씨 리듬).
 *  · 서체마다 em 박스 안의 실제 크기가 달라 fit 을 곱해 눈에 보이는 크기를 맞춘다.
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
    /** 블록 높이 상한(px) — 2줄이 캔버스를 넘지 않게 글자 크기를 한 번 더 줄인다 */
    maxHeight?: number;
  },
): CaptionLayout {
  const face = opts.face ?? 'round';
  const spec = CAPTION_FACES[face] ?? CAPTION_FACES.round;
  const maxLines = Math.max(1, Math.min(2, opts.maxLines ?? 2));
  const tilt = Math.max(0, Math.min(8, opts.tilt ?? spec.tilt));
  const waveEm = spec.wave;
  const trackingEm = opts.tracking ?? spec.tracking;
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 34);
  const seed = hashText(clean, opts.seed ?? 7);

  let size = Math.max(8, opts.size * spec.fit);
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
  const lineGap = size * spec.lineGap;
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
    // 기준선: 블록 상단 + 서체의 상승부 — 글자 시각 중심이 블록 중심에 온다.
    const baseline = top + lineSize * spec.ascent;
    lines.push({ glyphs, width: cursor, size: lineSize, baseline });
    top += lineSize + lineGap;
  });

  const width = Math.max(0, ...lines.map((line) => line.width));
  // 아래로 내려오는 획(디센더)까지만 포함 — 빈 여백이 붙어 블록이 아래로 치우치지 않게.
  const height = Math.max(...lines.map((line) => line.baseline + line.size * spec.descent));
  // 세로 상한: 두 줄이 캔버스를 넘어 잘리지 않게 글자 크기를 한 단계 더 줄여 다시 앉힌다.
  const maxHeight = opts.maxHeight ?? Number.POSITIVE_INFINITY;
  if (height > maxHeight && size > 12) {
    return layoutCaption(text, { ...opts, size: Math.max(8, (size / spec.fit) * 0.92) });
  }
  return { lines, width, height, size, lineHeight: size * 1.04 };
}

/** 글자 레터링 공통 상수 — 서체 스펙에서 바로 꺼내 쓴다. */
export function captionFaceSpec(face: CaptionFace | undefined): CaptionFaceSpec {
  return CAPTION_FACES[face ?? 'round'] ?? CAPTION_FACES.round;
}
