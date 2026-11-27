// ─────────────────────────────────────────────────────────────
// 레터링 배치 계획 (배치 로직 한 벌)
//  · 캔버스(drawLayer)와 SVG(renderTextLayerSvg / renderLine)가 이 계산을 같이 쓴다.
//  · 글자 크기·2줄 접기·감정 컬러·외곽선/그림자 두께·캔버스 밖으로 나가지 않는 위치까지
//    여기서 정하고, 각 렌더러는 그리기만 한다.
//  · 서체별 보정값(fit·자간·외곽선)은 caption.ts 의 CAPTION_FACES 한 곳에서 온다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import { captionFaceOf, type TextLayerStyle } from '@/lib/studio/layers';
import {
  captionFaceSpec,
  inkTonesFor,
  layoutCaption,
  type CaptionFace,
  type CaptionLine,
} from '@/lib/studio/caption';

export interface CaptionPlanInput {
  text: string;
  style?: TextLayerStyle;
  color?: string;
  x: number;
  y: number;
  size: number;
  rotate?: number;
}

export interface CaptionPlan {
  /** 블록 중심 (캔버스 px) */
  x: number;
  y: number;
  rotate: number;
  width: number;
  height: number;
  lines: CaptionLine[];
  /** 첫 줄 글자 크기(px, 서체 보정이 적용된 값) */
  size: number;
  face: CaptionFace;
  ink: string;
  /** 위쪽 하이라이트 채움색 (세로 그라데이션) */
  inkLight: string;
  /** 흰 외곽선 두께(px) */
  outline: number;
  /** 잉크 살찌우기 두께(px) */
  bold: number;
  shadow: { color: string; blur: number; offsetY: number };
  /** 붓 밑줄 포인트 (블록 중심 기준 좌표) */
  underline: { width: number; y: number; thickness: number; curve: number; tread: number; color: string } | null;
}

const DEFAULT_INK = '#191512';

/** 붓글씨 계열 윤슬 밑줄 — 글자 아래에 살짝 지나가는 한 획 */
const UNDERLINE_TREAD = 0.031;

export function planCaption(input: CaptionPlanInput, canvas: number, emotion?: Emotion): CaptionPlan {
  const face = captionFaceOf(input.style);
  const spec = captionFaceSpec(face);
  const fontSize = Math.max(8, input.size * canvas);
  const layout = layoutCaption(input.text, {
    size: fontSize,
    maxWidth: canvas * 0.86,
    // 두 줄이 캔버스를 넘어 잘리지 않게 — 블록은 캔버스 절반을 넘지 않는다.
    maxHeight: canvas * 0.52,
    face,
    seed: hash(input.text),
    tracking: spec.tracking,
  });
  const rotate = Number.isFinite(input.rotate) ? Number(input.rotate) : 0;
  const rad = Math.abs(rotate) * (Math.PI / 180);
  // 붓 밑줄: 손멋글씨 **한 줄**일 때만, 글자가 어느 정도 있을 때만 —
  //  · 두 줄에 밑줄을 그으면 마지막 줄 디센더와 겹치고 아래로 넘친다.
  const underlineWidth = Math.min(layout.width * 0.72, canvas * 0.44);
  // 밑줄이 차지하는 아래 여백 — 위치 보정에도 포함해야 잘리지 않는다.
  const underlineRoom = spec.underline && layout.lines.length === 1 ? layout.size * 0.3 : 0;
  const halfW = (layout.width / 2) * Math.cos(rad) + ((layout.height + underlineRoom) / 2) * Math.sin(rad);
  const halfH = ((layout.height + underlineRoom) / 2) * Math.cos(rad) + (layout.width / 2) * Math.sin(rad);
  const pad = canvas * 0.015;
  const x = Math.min(Math.max(input.x * canvas, halfW + pad), canvas - halfW - pad);
  const y = Math.min(Math.max(input.y * canvas, halfH + pad), canvas - halfH - pad);
  const tones = inkTonesFor(emotion, input.color, face);
  const underline = spec.underline && layout.lines.length === 1 && layout.width > layout.size * 1.3
    ? {
        width: underlineWidth,
        y: layout.height / 2 + layout.size * 0.2,
        thickness: Math.max(1.4, layout.size * 0.04),
        curve: layout.size * 0.05,
        tread: layout.size * UNDERLINE_TREAD,
        color: tones.underline,
      }
    : null;
  return {
    x,
    y,
    rotate,
    width: layout.width,
    height: layout.height,
    lines: layout.lines,
    size: layout.size,
    face,
    ink: tones.ink,
    inkLight: tones.inkLight,
    // 외곽선·살찌우기는 **서체 보정이 끝난 실제 글자 크기**로 계산한다 — 360px 이모티콘에서
    // 외곽선이 글자를 먹어 버리지 않도록 서체별 비율을 따로 둔다.
    outline: Math.max(0, layout.size * spec.outline),
    bold: Math.max(0, layout.size * spec.bold),
    shadow: { color: 'rgba(25,21,18,0.2)', blur: layout.size * 0.14, offsetY: layout.size * 0.045 },
    underline,
  };
}

/** 글자 정렬용 해시 (레이어마다 같은 흔들림을 유지) */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export { DEFAULT_INK };
