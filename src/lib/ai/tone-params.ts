import type { Tone } from '@/lib/types';

/**
 * 톤별 AI 생성 파라미터 (LoRA ID 매핑용)
 * 'use server' 가 아닌 일반 모듈로 유지하여 객체 내보내기 가능.
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
