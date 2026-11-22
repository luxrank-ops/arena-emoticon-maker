// ─────────────────────────────────────────────────────────────
// 레터링 배치 계획 (배치 로직 한 벌)
//  · 캔버스(drawLayer)와 SVG(renderTextLayerSvg / renderLine)가 이 계산을 같이 쓴다.
//  · 글자 크기·2줄 접기·감정 컬러·외곽선/그림자 두께·캔버스 밖으로 나가지 않는 위치까지
//    여기서 정하고, 각 렌더러는 그리기만 한다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { TextLayerStyle } from '@/lib/studio/layers';
import {
  CAPTION_BOLD,
  CAPTION_OUTLINE,
  captionFaceOf,
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
  /** 첫 줄 글자 크기(px) */
  size: number;
  face: CaptionFace;
  ink: string;
  /** 위쪽 하이라이트 채움색 (세로 그라데이션) */
  inkLight: string;
  /** 흰 테두리와 글자 사이의 얇은 톤 링 */
  ring: string;
  /** 흰 외곽선 두께(px) */
  outline: number;
  /** 잉크 살찌우기 두께(px) */
  bold: number;
  shadow: { color: string; blur: number; offsetY: number };
  /** 붓 밑줄 포인트 (블록 중심 기준 좌표) */
  underline: { width: number; y: number; thickness: number; curve: number; tilt: number; color: string } | null;
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
  const tones = stamp
    ? { ink: '#C9342B', inkLight: '#E0665C', ring: '#F4C7BD', underline: '#C9342B' }
    : inkTonesFor(emotion, input.color);
  // 붓 밑줄: 손글씨 계열만, 글자가 어느 정도 있을 때만 — 절제된 포인트 데코.
  const hand = face === 'calli' || face === 'brush' || face === 'hand';
  const underlineWidth = Math.min(layout.width * 0.74, canvas * 0.46);
  const underline = hand && layout.width > fontSize * 1.4
    ? {
        width: underlineWidth,
        y: layout.height / 2 + fontSize * 0.16,
        thickness: Math.max(1.4, fontSize * 0.052),
        curve: fontSize * 0.055,
        tilt: -2.2,
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
    ring: tones.ring,
    outline: Math.max(0, fontSize * CAPTION_OUTLINE[face]),
    bold: Math.max(0, fontSize * CAPTION_BOLD[face]),
    shadow: { color: 'rgba(25,21,18,0.32)', blur: fontSize * 0.22, offsetY: fontSize * 0.075 },
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
