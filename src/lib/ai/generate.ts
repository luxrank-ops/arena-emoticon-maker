'use server';

import type { FaceSignature, Palette, Tone, Emotion } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// AI 이미지 생성 PoC (Proof of Concept)
// 유료화 품질 달성을 위해 절차적 SVG 렌더러를 AI 생성으로 교체하는 단계.
// 현재는 구조 정의만 포함. 실제 공급자(Replicate / Fal / Gemini)는
// 이후 비용·속도·품질 비교 후 결정할 예정.
// ─────────────────────────────────────────────────────────────

export interface GenerateRequest {
  faceId: string;
  palette: Palette;
  signature: FaceSignature;
  tone: Tone;
  emotion: Emotion;
  line?: string;
  intensity?: number;
}

export interface GenerateResult {
  imageUrl: string;
  thumbnailUrl: string;
  provider: string;
  model: string;
  latencyMs: number;
  costUsd?: number;
}

/**
 * PoC: 사용자 얼굴 + 톤 + 감정으로 이모티콘 이미지 생성.
 *
 * 구현 시 고려 사항:
 * - ControlNet: 사용자 얼굴 랜드마크를 조건부로 주입해 정체성 보존
 * - LoRA: 톤별 스타일 모델 (2D 귀여움, 3D 카툰, 캐리커처 등)
 * - 임베딩: 사용자별 얼굴 임베딩 (FaceNet/ArcFace) 저장·재사용
 * - 캐싱: 동일한 (faceId, tone, emotion) 조합은 재사용
 */
export async function generateEmoticon(req: GenerateRequest): Promise<GenerateResult> {
  const start = Date.now();

  // TODO: 실제 공급자 API 호출로 대체
  // 예: Replicate - stability-ai/sdxl 또는 google/gemini-2.5-flash-image
  // 예: Fal - fal-ai/flux/realism 또는 커스텀 LoRA 엔드포인트
  //
  // 요청 페이로드 예시:
  // {
  //   prompt: `${req.tone} 스타일 이모티콘, ${req.emotion} 표정, 한국인 얼굴`,
  //   image: 사용자 셀피 URL (ControlNet 조건),
  //   controlnet: 'face_landmarker',
  //   lora: 톤별 LoRA ID,
  //   width: 2048,
  //   height: 2048,
  // }

  // PoC 단계에서는 플레이스홀더 반환 (실제 이미지 미생성)
  return {
    imageUrl: '',
    thumbnailUrl: '',
    provider: 'placeholder',
    model: 'placeholder',
    latencyMs: Date.now() - start,
    costUsd: 0,
  };
}

/**
 * 톤별 추천 생성 파라미터 (향후 LoRA ID 매핑에 사용)
 */
export const TONE_GENERATION_PARAMS: Record<Tone, { loraId?: string; promptPrefix: string; negativePrompt?: string }> = {
  '2d-cute': {
    loraId: undefined, // 추후 학습 완료 후 할당
    promptPrefix: '2d cute sticker, thick outline, kawaii, kakao emoji style',
    negativePrompt: 'photorealistic, 3d, blurry, low resolution',
  },
  '3d-cartoon': {
    loraId: undefined,
    promptPrefix: '3d cartoon render, soft shading, glossy, cute character',
    negativePrompt: 'flat, 2d, line art, noisy',
  },
  sketch: {
    loraId: undefined,
    promptPrefix: 'pencil sketch, hand-drawn, diary style, rough lines',
    negativePrompt: 'colorful, smooth, photorealistic',
  },
  mono: {
    loraId: undefined,
    promptPrefix: 'black and white line art, monochrome, meme style',
    negativePrompt: 'color, gradient, shading',
  },
  watercolor: {
    loraId: undefined,
    promptPrefix: 'watercolor painting, soft edges, bleeding colors, artistic',
    negativePrompt: 'sharp lines, vector, flat color',
  },
  caricature: {
    loraId: undefined,
    promptPrefix: 'caricature, exaggerated features, funny, comedy style',
    negativePrompt: 'realistic portrait, subtle features',
  },
};
