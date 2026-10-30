import OpenAI from 'openai';

// 빌드 타임에는 클라이언트 생성 지연 (API 키 없을 수 있음)
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface DalleGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface DalleGenerationResult {
  imageUrl: string;
  revisedPrompt: string;
  seed?: number;
}

/**
 * DALL·E 3로 이미지 생성
 */
export async function generateImageWithDalle(
  options: DalleGenerationOptions
): Promise<DalleGenerationResult> {
  const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid', n = 1 } = options;

  try {
    const client = getOpenAIClient();
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      quality,
      style,
      n,
      response_format: 'url',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('이미지 생성 실패: 응답 데이터가 비어있음');
    }

    const imageData = response.data[0];
    if (!imageData?.url) {
      throw new Error('이미지 생성 실패: URL이 반환되지 않음');
    }

    return {
      imageUrl: imageData.url,
      revisedPrompt: imageData.revised_prompt || prompt,
      seed: undefined, // DALL·E 3는 seed를 제공하지 않음
    };
  } catch (error) {
    console.error('DALL·E 3 생성 오류:', error);
    if (error instanceof OpenAI.APIError) {
      throw new Error(`DALL·E 3 오류: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 프롬프트 최적화 (이모티콘 특화)
 */
export function buildEmoticonPrompt(data: {
  characterName: string;
  characterConcept: string;
  emotion: string;
  dialogue?: string;
  style: string;
  artStylePrompt: string;
}): string {
  const { characterName, characterConcept, emotion, dialogue, style, artStylePrompt } = data;

  const emotionDescriptions: Record<string, string> = {
    joy: 'bright smile, thumbs up, cheerful expression, sparkling eyes',
    excitement: 'burning with passion, fighting pose, energetic, dynamic motion lines',
    sadness: 'teary eyes,震惊表情, crying, downcast, sorrowful',
    approval: 'thumbs up, best gesture, confident nod, approving smile',
    love: 'heart eyes, blowing kiss, winking, surrounded by hearts',
    anger: 'angry expression, steam from ears, frowning, clenched fists',
    surprise: 'wide eyes, open mouth, amazed, star eyes, wow expression',
    sleepy: 'yawning, half-closed eyes, sleepy, tired, zzz bubbles',
  };

  const emotionPrompt = emotionDescriptions[emotion] || emotionDescriptions.joy;

  const basePrompt = [
    `A consistent character: ${characterName}`,
    `Concept: ${characterConcept}`,
    `Emotion/Expression: ${emotionPrompt}`,
    dialogue ? `Speech bubble: "${dialogue}"` : '',
    `Art style: ${artStylePrompt}`,
    'Unified character design across all poses',
    'Clean white background, transparent background preferred',
    'High quality emoji/sticker set render',
    'Commercial license ready, professional illustration',
  ].filter(Boolean).join(', ');

  return basePrompt;
}

/**
 * 스타일별 아트 프롬프트 매핑
 */
export const STYLE_ART_PROMPTS: Record<string, string> = {
  '3d-disney-pixar': '3D Disney/Pixar style, soft squishy texture, subsurface scattering, soft studio lighting, Octane render, 8k, masterpiece',
  '2d-cute': '2D vector art, flat design, clean line art, pastel colors, cute proportions, cel shading, white background',
  'pixel-art': 'Pixel art, 64x64, retro game style, limited palette, crisp pixels, transparent background',
  'sketch': 'Pencil sketch, hand-drawn feel, natural lines, paper texture, analog sensibility, soft shading',
  'watercolor': 'Watercolor illustration, wet-on-wet effects, transparent layers, soft gradients, artistic sensibility, white space',
  'minimal': 'Minimal line art, single color lines, negative space beauty, simple forms, essence only, vector style',
};