// ─────────────────────────────────────────────────────────────
// 레터링 배치 계획 (배치 로직 한 벌)
//  · 캔버스(drawLayer)와 SVG(renderTextLayerSvg / renderLine)가 이 계산을 같이 쓴다.
//  · 글자 크기·2줄 접기·감정 컬러·외곽선/그림자 두께·캔버스 밖으로 나가지 않는 위치까지
//    여기서 정하고, 각 렌더러는 그리기만 한다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { BubbleStyle, TextLayerStyle } from '@/lib/studio/layers';
import {
  CAPTION_BOLD,
  CAPTION_OUTLINE,
  captionFaceOf,
  inkFor,
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
  bubble?: BubbleStyle;
}

export interface CaptionPlan {
  /** 블록 중심 (캔버스 px) */
  x: number;
  y: number;
  rotate: number;
  width: number;
  height: number;
  lines: CaptionLine[];
  /** 첫 줄 글자 크기(px) */
  size: number;
  face: CaptionFace;
  ink: string;
  /** 흰 외곽선 두께(px) */
  outline: number;
  /** 잉크 살찌우기 두께(px) */
  bold: number;
  shadow: { color: string; blur: number; offsetY: number };
  inBubble: boolean;
}

const DEFAULT_INK = '#191512';

export function planCaption(input: CaptionPlanInput, canvas: number, emotion?: Emotion): CaptionPlan {
  const face = captionFaceOf(input.style);
  const fontSize = Math.max(8, input.size * canvas);
  const layout = layoutCaption(input.text, {
    size: fontSize,
    maxWidth: canvas * 0.86,
    face,
    seed: hash(input.text),
  });
  const rotate = Number.isFinite(input.rotate) ? Number(input.rotate) : 0;
  const rad = Math.abs(rotate) * (Math.PI / 180);
  const halfW = (layout.width / 2) * Math.cos(rad) + (layout.height / 2) * Math.sin(rad);
  const halfH = (layout.height / 2) * Math.cos(rad) + (layout.width / 2) * Math.sin(rad);
  const pad = canvas * 0.015;
  const x = Math.min(Math.max(input.x * canvas, halfW + pad), canvas - halfW - pad);
  const y = Math.min(Math.max(input.y * canvas, halfH + pad), canvas - halfH - pad);
  const stamp = input.style === 'stamp';
  const ink = stamp ? '#C9342B' : inkFor(emotion, input.color);
  return {
    x,
    y,
    rotate,
    width: layout.width,
    height: layout.height,
    lines: layout.lines,
    size: layout.size,
    face,
    ink,
    outline: Math.max(0, fontSize * CAPTION_OUTLINE[face]),
    bold: Math.max(0, fontSize * CAPTION_BOLD[face]),
    shadow: { color: 'rgba(25,21,18,0.30)', blur: fontSize * 0.2, offsetY: fontSize * 0.06 },
    inBubble: (input.bubble ?? 'none') !== 'none',
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
