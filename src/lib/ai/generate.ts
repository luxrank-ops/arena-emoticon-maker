'use server';

import type { FaceSignature, Palette, Tone, Emotion } from '@/lib/types';
import { TONE_GENERATION_PARAMS } from '@/lib/ai/tone-params';

// ─────────────────────────────────────────────────────────────
// AI 이미지 생성 파이프라인
// 유료화 품질 달성을 위해 절차적 SVG 렌더러를 AI 생성으로 교체.
// 공급자(Replicate / Fal / Gemini)는 환경 변수 PROVIDER 로 선택.
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

const PROVIDER = (process.env.AI_IMAGE_PROVIDER || 'placeholder').toLowerCase();

// ─────────────────────────────────────────────────────────────
// 공급자별 클라이언트 (실제 연동 시 교체)
// ─────────────────────────────────────────────────────────────

async function generatePlaceholder(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  return {
    imageUrl: '',
    thumbnailUrl: '',
    provider: 'placeholder',
    model: 'placeholder',
    latencyMs: Date.now() - start,
    costUsd: 0,
  };
}

async function generateReplicate(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error('REPLICATE_API_TOKEN 이 설정되지 않았습니다');

  const params = TONE_GENERATION_PARAMS[req.tone];
  const prompt = `${params.promptPrefix}, ${req.emotion} 표정, 한국인 얼굴, ${req.line ?? ''}`.trim();

  // Replicate ControlNet + LoRA 패턴 (예시)
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: process.env.REPLICATE_MODEL_VERSION, // ControlNet + LoRA 모델 버전
      input: {
        prompt,
        negative_prompt: params.negativePrompt,
        image: `https://emotime.example.com/faces/${req.faceId}.jpg`, // 사용자 셀피 URL (ControlNet 조건)
        controlnet_conditioning_scale: 0.8,
        width: 1024,
        height: 1024,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        lora_scale: 0.8,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate API 오류 (${res.status}): ${text}`);
  }

  const json = await res.json();
  const imageUrl = json.output?.[0] ?? '';

  return {
    imageUrl,
    thumbnailUrl: imageUrl, // 썸네일은 별도 리사이즈 엔드포인트 필요
    provider: 'replicate',
    model: process.env.REPLICATE_MODEL_VERSION ?? 'replicate',
    latencyMs: Date.now() - start,
    costUsd: 0.0035, // Replicate SDXL 추정 비용 (변동 가능)
  };
}

async function generateFal(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error('FAL_KEY 가 설정되지 않았습니다');

  const params = TONE_GENERATION_PARAMS[req.tone];
  const prompt = `${params.promptPrefix}, ${req.emotion} 표정, 한국인 얼굴, ${req.line ?? ''}`.trim();

  // Fal.ai LoRA 엔드포인트 패턴 (예시)
  const res = await fetch('https://fal.run/fal-ai/flux-lora', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
        negative_prompt: params.negativePrompt,
        image_url: `https://emotime.example.com/faces/${req.faceId}.jpg`,
        controlnet: 'face_landmarker',
        lora_url: params.loraId,
        width: 1024,
        height: 1024,
        num_inference_steps: 30,
        guidance_scale: 7.5,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fal API 오류 (${res.status}): ${text}`);
  }

  const json = await res.json();
  const imageUrl = json.image?.url ?? '';

  return {
    imageUrl,
    thumbnailUrl: json.thumbnail?.url ?? imageUrl,
    provider: 'fal',
    model: 'fal-ai/flux-lora',
    latencyMs: Date.now() - start,
    costUsd: 0.04, // Fal Flux 추정 비용 (변동 가능)
  };
}

async function generateGemini(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다');

  const params = TONE_GENERATION_PARAMS[req.tone];
  const prompt = `${params.promptPrefix}, ${req.emotion} 표정, 한국인 얼굴, ${req.line ?? ''}`.trim();

  // Gemini 2.5 Flash Image 패턴 (예시)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: '', // 사용자 셀피 base64 (업로드 후 저장된 URL 참조)
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 1024,
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API 오류 (${res.status}): ${text}`);
  }

  const json = await res.json();
  const imageUrl = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    ? `data:image/png;base64,${json.candidates[0].content.parts[0].inlineData.data}`
    : '';

  return {
    imageUrl,
    thumbnailUrl: imageUrl,
    provider: 'gemini',
    model: 'gemini-2.5-flash-image',
    latencyMs: Date.now() - start,
    costUsd: 0.002, // Gemini 추정 비용 (변동 가능)
  };
}

/**
 * 사용자 얼굴 + 톤 + 감정으로 이모티콘 이미지 생성.
 * 공급자는 PROVIDER 환경 변수로 선택 (placeholder / replicate / fal / gemini).
 */
export async function generateEmoticon(req: GenerateRequest): Promise<GenerateResult> {
  switch (PROVIDER) {
    case 'replicate':
      return generateReplicate(req);
    case 'fal':
      return generateFal(req);
    case 'gemini':
      return generateGemini(req);
    case 'placeholder':
    default:
      return generatePlaceholder(req);
  }
}

/**
 * 생성 비용 추정 (공급자별, 실제 청구와 다를 수 있음)
 */
export async function estimateCost(provider: string, count: number): Promise<number> {
  const perImage: Record<string, number> = {
    placeholder: 0,
    replicate: 0.0035,
    fal: 0.04,
    gemini: 0.002,
  };
  return (perImage[provider] ?? 0) * count;
}
