// ─────────────────────────────────────────────────────────────
// 내 사진 바로 누끼 스티커 — 순수 로직 (브라우저/Node 공용)
//  · 업로드한 실사 사진을 Gemini 재생성 없이 **그대로** 스티커로 만든다.
//    배경은 기기 안 누끼(ai-matte → 색상 기반 폴백)와 흰 스티커 외곽선이 맡는다.
//  · 문구·데코·감정은 기존 캘리그라피 레이어(TextLayer)를 그대로 쓰므로
//    화면 미리보기와 내보내기(PNG·카카오 ZIP)가 같은 계산을 공유한다.
//  · 추천 대사는 이미 검증된 드립·밈 7테마 66줄(drip-themes)을 그대로 쓴다.
// ─────────────────────────────────────────────────────────────

import { DEFAULT_PALETTE, DEFAULT_SIGNATURE } from '@/lib/art/sticker';
import type { Emotion, StickerSpec } from '@/lib/types';
import type { MotionId } from '@/lib/studio/motion';
import {
  normalizeLayer,
  type DecorMode,
  type EffectKind,
  type TextLayer,
  type TextLayerStyle,
} from '@/lib/studio/layers';
import { DRIP_THEMES } from '@/data/drip-themes';

/** 카카오 제안 규격과 같은 한 변(px) */
export const CUTOUT_SIZE = 360;
/** 한 번에 올릴 수 있는 사진 수 — 팩처럼 묶어 저장하는 단위 */
export const CUTOUT_MAX_PHOTOS = 12;
/** 흰 스티커 외곽선 기본 두께(px, 360 기준) */
export const CUTOUT_DEFAULT_OUTLINE = 7;
export const CUTOUT_MAX_OUTLINE = 14;
/** 문구 최대 길이(글자) — 레이어 정규화(normalizeLayer)와 같은 상한 */
export const CUTOUT_CAPTION_MAX = 24;
/** 사진을 정사각으로 다듬을 때의 한 변(px) — 360 출력에 충분한 여유 */
export const CUTOUT_PHOTO_SIDE = 800;

/**
 * 마감 방식 — cutout: 배경을 떼고 투명 스티커 / frame: 사진 배경을 살린 둥근 사진 프레임.
 *  · 털이 있는 반려동물은 누끼 경계가 지저분해져서 frame 을 기본으로 쓴다(2026-11-27 사용자 피드백).
 */
export type CutoutBackdrop = 'cutout' | 'frame';

/**
 * 사진 프레임 비율 — 모두 캔버스 크기 대비 비율이라 360·512 어디서든 같은 모양이다.
 *  · border 0.030(360 기준 약 11px 흰 보더) · radius 0.16(프레임 폭 대비) · margin 0.023(그림자 자리)
 *  · public/samples/photo 의 반려동물 샘플도 같은 비율로 만들어 두었다.
 */
export const CUTOUT_PHOTO_FRAME = { border: 0.03, radius: 0.16, margin: 0.023 } as const;

export type CutoutPosition = 'bottom' | 'top';
/** 세로로 긴 사진을 정사각으로 자를 때 어디를 남길지 */
export type CutoutCrop = 'face' | 'center';

export interface CutoutStyle {
  /** 사진 위에 얹는 한 줄 (비우면 사진만) */
  caption: string;
  style: TextLayerStyle;
  effect: EffectKind;
  /** 상황별 복합 데코 — 기본 auto(문구·감정에 맞춰 자동) */
  decor: DecorMode;
  /** 글자 색·데코 모티프를 정하는 감정 */
  emotion: Emotion;
  position: CutoutPosition;
  /** 글자 크기 (캔버스 폭 대비) */
  size: number;
  /** #rrggbb — 기본 잉크면 감정 색을 쓴다 */
  color: string;
  /** 움직임 효과 (정지 컷 또는 8종 모션) */
  motion?: MotionId | 'none';
}

export const DEFAULT_CUTOUT_STYLE: CutoutStyle = {
  caption: '',
  style: 'round',
  effect: 'none',
  decor: 'auto',
  emotion: 'joy',
  position: 'bottom',
  size: 0.15,
  color: '#191512',
  motion: 'none',
};

/** 아래/위 문구 중심 y (캔버스 기준 0~1) — 얼굴을 가리지 않고 두 줄도 잘리지 않는 여백 */
export const CUTOUT_POSITION_Y: Record<CutoutPosition, number> = {
  bottom: 0.86,
  top: 0.15,
};

/** 문구 없이 사진만 쓰는 상태인지 */
export function hasCaption(style: Pick<CutoutStyle, 'caption'>): boolean {
  return style.caption.replace(/\s+/g, ' ').trim().length > 0;
}

/** 문구를 캘리그라피 레이어로 만든다 (문구가 비면 null → 사진만 저장) */
export function cutoutLayer(input: Partial<CutoutStyle> & { id?: string } = {}): TextLayer | null {
  const merged: CutoutStyle = { ...DEFAULT_CUTOUT_STYLE, ...input };
  const caption = merged.caption.replace(/\s+/g, ' ').trim().slice(0, CUTOUT_CAPTION_MAX);
  if (!caption) return null;
  return normalizeLayer(
    {
      id: input.id ?? 'cutout-line',
      text: caption,
      style: merged.style,
      effect: merged.effect,
      decor: merged.decor,
      x: 0.5,
      y: CUTOUT_POSITION_Y[merged.position] ?? CUTOUT_POSITION_Y.bottom,
      size: merged.size,
      color: merged.color,
      // 붓글씨만 살짝 기울여 손맛을 준다 (정갈한 기본 서체는 반듯하게)
      rotate: merged.style === 'brush' ? -2 : 0,
    },
    0,
  );
}

/**
 * 내보내기용 스티커 명세.
 *  · 배경은 항상 투명 — 사진 자체가 스티커가 된다(색 배경을 원하면 ZIP 대신 PNG 로 배경을 얹지 않는다).
 *  · imageUrl 은 기기 안에서 만든 data URL 이라 서버·CDN 요청이 없다.
 */
export function cutoutSpec(input: {
  photo: string;
  style?: Partial<CutoutStyle>;
  /** 같은 사진이라도 컷마다 레이어 id·시드를 달리해 캐시가 섞이지 않게 한다 */
  seed?: number;
}): StickerSpec {
  const merged: CutoutStyle = { ...DEFAULT_CUTOUT_STYLE, ...input.style };
  const layer = cutoutLayer({ ...merged, id: `cutout-${input.seed ?? 0}` });
  const spec: StickerSpec = {
    imageUrl: input.photo,
    seed: input.seed ?? 360,
    tone: 'photo-sticker',
    palette: DEFAULT_PALETTE,
    signature: DEFAULT_SIGNATURE,
    emotion: merged.emotion,
    intensity: 74,
    prop: 'none',
    background: 'transparent',
    line: '',
    linePosition: merged.position,
  };
  return layer ? { ...spec, textLayers: [layer] } : spec;
}

/** 문자열 → 결정적 시드 (같은 컷은 항상 같은 레이어 id·시드) */
export function cutoutSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 100000) + 41;
}

/** 01.png · 02.png … 카카오 ZIP 안의 파일명과 같은 2자리 순번 */
export function cutoutOrder(index: number): string {
  return String(Math.max(0, Math.floor(index)) + 1).padStart(2, '0');
}

/** 개별 내려받기 파일명 */
export function cutoutFileName(index: number, ext: 'png' | 'gif' = 'png'): string {
  return `emotihak-cutout-${cutoutOrder(index)}.${ext}`;
}

/** 팩(ZIP) 내려받기 파일명 */
export const CUTOUT_ZIP_NAME = 'emotihak-cutout-kakao.zip';

// ── 숏폼 동영상 / 연속 컷 누끼 관련 상수 및 헬퍼 ──────────────────
export const CUTOUT_VIDEO_MAX_DURATION = 3.0; // 최대 추출 시간(초)
export const CUTOUT_VIDEO_DEFAULT_FRAMES = 12; // 카톡 움티에 이상적인 12프레임
export const CUTOUT_VIDEO_DEFAULT_DELAY_MS = 90; // ~11fps 루프

/** 동영상 길이와 프레임 수에 따른 균등 샘플링 타임스탬프 계산(초) */
export function calculateVideoSampleTimestamps(duration: number, frameCount = CUTOUT_VIDEO_DEFAULT_FRAMES): number[] {
  const safeDur = Math.max(0.1, Math.min(duration, CUTOUT_VIDEO_MAX_DURATION));
  const count = Math.max(2, Math.min(frameCount, 16));
  return Array.from({ length: count }, (_, i) => (i / count) * safeDur);
}

/** 동영상 길이와 프레임 수에 따른 적정 프레임 간격(ms) 계산 (60~140ms 안전 범위) */
export function calculateVideoDelayMs(duration: number, frameCount = CUTOUT_VIDEO_DEFAULT_FRAMES): number {
  const safeDur = Math.max(0.1, Math.min(duration, CUTOUT_VIDEO_MAX_DURATION));
  const count = Math.max(2, Math.min(frameCount, 16));
  const ms = Math.round((safeDur * 1000) / count);
  return Math.max(60, Math.min(ms, 140));
}

export interface CutoutSuggestionLine {
  id: string;
  label: string;
  line: string;
  emotion: Emotion;
}

export interface CutoutSuggestionTheme {
  id: string;
  emoji: string;
  title: string;
  lines: CutoutSuggestionLine[];
}

/** 원클릭으로 채우는 추천 대사 — 검증된 드립·밈 7테마 66줄을 그대로 안내한다 */
export const CUTOUT_SUGGESTIONS: CutoutSuggestionTheme[] = DRIP_THEMES.map((theme) => ({
  id: theme.id,
  emoji: theme.emoji,
  title: theme.title,
  lines: theme.lines.map((line) => ({
    id: line.id,
    label: line.label,
    line: line.line,
    emotion: line.emotion,
  })),
}));

export const CUTOUT_SUGGESTION_COUNT = CUTOUT_SUGGESTIONS.reduce(
  (total, theme) => total + theme.lines.length,
  0,
);

/** 문구 없이 바로 쓸 수 있는 기본 한 줄 (처음 올린 컷에 추천) */
export function cutoutStarterLine(index = 0): CutoutSuggestionLine | null {
  const lines = CUTOUT_SUGGESTIONS.flatMap((theme) => theme.lines);
  if (lines.length === 0) return null;
  return lines[Math.abs(index) % lines.length] ?? null;
}
