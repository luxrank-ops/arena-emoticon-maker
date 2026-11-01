import type { Tone } from '@/lib/types';

/**
 * 톤별 AI 생성 파라미터 (LoRA ID 매핑용)
 * 'use server' 가 아닌 일반 모듈로 유지하여 객체 내보내기 가능.
 *
 * 설계 원칙:
 * - 원본 사진의 신원(얼굴 구조)을 유지하면서 표정만 변화시킴
 * - 캐리커처도 과도한 변형(큰 머리·작은 몸) 대신 '약간의 과장' 수준으로 제한
 * - 모든 톤이 'same person' 전제하에 동작
 */
export const TONE_GENERATION_PARAMS: Record<Tone, { loraId?: string; promptPrefix: string; negativePrompt?: string }> = {
  '2d-cute': {
    loraId: undefined, // 추후 학습 완료 후 할당
    promptPrefix: '2d cute sticker, thick clean outline, kawaii, KakaoTalk emoji style, flat colors, same person',
    negativePrompt: 'photorealistic, 3d, blurry, low resolution, different person, changed face',
  },
  '3d-cartoon': {
    loraId: undefined,
    promptPrefix: '3d cartoon render, soft shading, glossy surface, cute character, Pixar style, same person',
    negativePrompt: 'flat, 2d, line art, noisy, different person, changed face',
  },
  sketch: {
    loraId: undefined,
    promptPrefix: 'pencil sketch, hand-drawn, diary style, rough lines, monochrome accent, same person',
    negativePrompt: 'colorful, smooth, photorealistic, different person, changed face',
  },
  mono: {
    loraId: undefined,
    promptPrefix: 'black and white line art, monochrome, meme style, bold outlines, same person',
    negativePrompt: 'color, gradient, shading, different person, changed face',
  },
  watercolor: {
    loraId: undefined,
    promptPrefix: 'watercolor painting, soft edges, bleeding colors, artistic, gentle, same person',
    negativePrompt: 'sharp lines, vector, flat color, different person, changed face',
  },
  caricature: {
    loraId: undefined,
    promptPrefix: 'same person in photo, realistic sticker emoticon, exact facial identity, rich emotional expressions, clean background',
    negativePrompt: 'caricature, bobble head, distorted face, ugly, grotesque, exaggerated features, different person',
  },
};
