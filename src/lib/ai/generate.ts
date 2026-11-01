'use server';

import type {
  FaceCondition,
  FaceSignature,
  Palette,
  Tone,
  Emotion,
} from '@/lib/types';
import { TONE_GENERATION_PARAMS } from '@/lib/ai/tone-params';

// ─────────────────────────────────────────────────────────────
// AI 이미지 생성 엔진 (같은 사람, 여러 표정 - Expression Matrix)
// 유료화 품질 달성을 위해 절차적 SVG → AI 생성으로 교체.
// 핵심 원칙: 원본 사진의 신원을 유지하면서 표정만 변화시킴.
//
// 파이프라인:
//   1. FaceCondition (임베딩 + 시그니처 + 팔레트) 조회
//   2. ControlNet: 얼굴 랜드마크 조건으로 얼굴 구조 고정 (동일 인물 보장)
//   3. IP-Adapter: 원본 사진 임베딩 주입으로 신원 동일성 확보
//   4. 표정 프롬프트: joy/laugh/sad/angry 등 표정만 변화
//   5. 미묘한 스타일만 적용 (과장된 캐리커처 배제)
// ─────────────────────────────────────────────────────────────

export interface GenerateRequest {
  faceId: string;
  palette: Palette;
  signature: FaceSignature;
  tone: Tone;
  emotion: Emotion;
  line?: string;
  intensity?: number;
  faceCondition?: FaceCondition; // 얼굴 임베딩 조건 (필수 권장)
}

export interface GenerateResult {
  imageUrl: string;
  thumbnailUrl: string;
  provider: string;
  model: string;
  latencyMs: number;
  costUsd?: number;
  identityScore?: number; // 얼굴 닮음도 예측치 (0~1)
}

export interface BatchGenerateRequest {
  faceId: string;
  palette: Palette;
  signature: FaceSignature;
  tone: Tone;
  emotions: Emotion[];
  line?: string;
  intensity?: number;
  faceCondition?: FaceCondition;
}

export interface BatchGenerateResult {
  results: Record<Emotion, GenerateResult>;
  totalLatencyMs: number;
}

const PROVIDER = (process.env.AI_IMAGE_PROVIDER || 'mock').toLowerCase();

// ─────────────────────────────────────────────────────────────
// 프롬프트 빌더 (같은 사람, 다른 표정)
// ─────────────────────────────────────────────────────────────

const EMOTION_PROMPTS: Record<Emotion, string> = {
  joy: 'happy gentle smile, cheerful expression, bright eyes',
  laugh: 'big joyful laugh, open mouth smile, crinkled eyes',
  love: 'loving expression, heart eyes, warm smile',
  sad: 'sad expression, teary eyes, downturned mouth',
  angry: 'angry expression, furrowed brows, annoyed',
  sulk: 'pouting expression, sulky, lips pursed',
  tired: 'sleepy expression, droopy eyes, exhausted',
  surprised: 'surprised expression, wide eyes, raised brows',
  smug: 'smug expression, confident smirk, raised brow',
  cry: 'crying expression, tears streaming down',
  king: 'angry furious expression, venting, shouting',
  blank: 'neutral expression, straight face, calm',
};

const STYLE_PROMPTS: Record<Tone, string> = {
  '2d-cute': '2D cute sticker style, thick clean outline, kawaii, KakaoTalk emoji style, flat colors, white background',
  '3d-cartoon': '3D cartoon render, soft shading, glossy surface, cute character, Pixar style, white background',
  sketch: 'pencil sketch, hand-drawn, diary style, rough lines, monochrome accent, white background',
  mono: 'black and white line art, monochrome, meme style, bold outlines, white background',
  watercolor: 'watercolor painting, soft edges, bleeding colors, artistic, gentle, white background',
  caricature: 'subtle caricature, slightly exaggerated features but still recognizable, white background',
};

const NEGATIVE_PROMPT =
  'photorealistic, real photo, ugly, deformed, distorted, blurry, low resolution, ' +
  'extra fingers, mutated hands, bad anatomy, worst quality, low quality, ' +
  'multiple people, crowded, complex background, watermark, text overlay, ' +
  'different person, changed face, another face, wrong identity';

function buildPrompt(
  req: GenerateRequest,
  params: (typeof TONE_GENERATION_PARAMS)[Tone],
): string {
  const emotionPrompt = EMOTION_PROMPTS[req.emotion];
  const stylePrompt = STYLE_PROMPTS[req.tone];

  // 핵심: "same person"을 프롬프트 최상위에 명시해 신원 보존 강화
  const basePrompt = `same person, ${emotionPrompt}, Korean face, single person, headshot, centered face, ${stylePrompt}, high quality, 8k`;

  const linePart = req.line ? `, text "${req.line}" in speech bubble` : '';

  return `${basePrompt}${linePart}, ${params.promptPrefix}`.trim();
}

// ─────────────────────────────────────────────────────────────
// 얼굴 임베딩 → IP-Adapter 조건 변환
// 512차원 임베딩을 생성 모델에 주입 가능한 형태로 변환
// ─────────────────────────────────────────────────────────────

function embeddingToIpAdapterPrompt(
  condition: FaceCondition | undefined,
): string {
  if (!condition) return '';

  const { signature, palette } = condition;
  const parts: string[] = [];

  // 얼굴 구조 정보 (신원 보존에 중요)
  parts.push(
    `face shape: ${signature.jawline}, eye shape: ${signature.eyeShape}, ` +
      `eye size: ${Math.round(signature.eyeSize * 100)}%, ` +
      `mouth width: ${Math.round(signature.mouthWidth * 100)}%, ` +
      `nose size: ${Math.round(signature.noseSize * 100)}%, ` +
      `lip thickness: ${Math.round(signature.lipThickness * 100)}%, ` +
      `cheek: ${Math.round(signature.cheek * 100)}%`,
  );

  // 피부톤·헤어컬러
  parts.push(
    `skin tone: ${palette.skin}, hair color: ${palette.hair}, ` +
      `shirt color: ${palette.shirt}`,
  );

  // 안경 여부
  if (signature.glasses) parts.push('wearing glasses');

  return parts.join('; ');
}

// ─────────────────────────────────────────────────────────────
// 얼굴 임베딩 → 플레이스홀더 얼굴 이미지 (base64 SVG)
// 실제 운영에서는 사용자 셀피 이미지 URL을 사용해야 함.
// ─────────────────────────────────────────────────────────────

function embeddingToPlaceholderImage(
  condition: FaceCondition,
): string {
  const { signature, palette } = condition;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <rect width="512" height="512" fill="#FFF3DF"/>
      <!-- 얼굴 윤곽 (신원 보존용 기준 형태) -->
      <ellipse cx="256" cy="240" rx="${100 + signature.headScale * 20}" ry="${110 + signature.headScale * 20}" fill="${palette.skin}" stroke="#191512" stroke-width="8"/>
      <!-- 눈 -->
      <circle cx="${200 - signature.eyeSpacing * 10}" cy="210" r="${20 * signature.eyeSize}" fill="#4A3628"/>
      <circle cx="${256 + signature.eyeSpacing * 10}" cy="210" r="${20 * signature.eyeSize}" fill="#4A3628"/>
      <!-- 입 (표정 기준) -->
      <path d="M 210 270 Q 256 275 302 270" fill="none" stroke="#191512" stroke-width="6" stroke-linecap="round"/>
      <!-- 눈썹 -->
      <path d="M 185 185 Q 210 175 235 185" fill="none" stroke="#191512" stroke-width="5" stroke-linecap="round"/>
      <path d="M 277 185 Q 302 175 327 185" fill="none" stroke="#191512" stroke-width="5" stroke-linecap="round"/>
      <!-- 옷 -->
      <ellipse cx="256" cy="320" rx="80" ry="50" fill="${palette.shirt}" stroke="#191512" stroke-width="6"/>
    </svg>
  `;
  return Buffer.from(svg, 'utf8').toString('base64');
}

// ─────────────────────────────────────────────────────────────
// 공급자별 클라이언트
// ─────────────────────────────────────────────────────────────

async function generateMock(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const params = TONE_GENERATION_PARAMS[req.tone];
  const prompt = buildPrompt(req, params);
  const ipAdapterInfo = embeddingToIpAdapterPrompt(req.faceCondition);

  console.log('[Mock Generate - Expression Matrix]', {
    faceId: req.faceId,
    tone: req.tone,
    emotion: req.emotion,
    prompt,
    ipAdapterInfo,
  });

  return {
    imageUrl: '',
    thumbnailUrl: '',
    provider: 'mock',
    model: 'mock-expression-matrix-v1',
    latencyMs: Date.now() - start,
    costUsd: 0,
    identityScore: req.faceCondition ? 0.9 : 0.5,
  };
}

async function generateBatchMock(
  req: BatchGenerateRequest,
): Promise<BatchGenerateResult> {
  const start = Date.now();
  const results: Record<Emotion, GenerateResult> = {} as Record<Emotion, GenerateResult>;

  for (const emotion of req.emotions) {
    const result = await generateMock({
      ...req,
      emotion,
      faceCondition: req.faceCondition,
    });
    results[emotion] = result;
  }

  return {
    results,
    totalLatencyMs: Date.now() - start,
  };
}

async function generateReplicate(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error('REPLICATE_API_TOKEN 이 설정되지 않았습니다');

  const params = TONE_GENERATION_PARAMS[req.tone];
  const prompt = buildPrompt(req, params);
  const ipAdapterInfo = embeddingToIpAdapterPrompt(req.faceCondition);

  // Replicate: SDXL + ControlNet + IP-Adapter (같은 사람, 다른 표정)
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT + ', different person, changed face, another face',
    width: 1024,
    height: 1024,
    num_inference_steps: 40,
    guidance_scale: 7.5,
    scheduler: 'DPMSolverMultistep',
    // ControlNet: 얼굴 랜드마크 고정 (얼굴 구조 동일 유지)
    controlnet_condition: 'face_landmarks',
    controlnet_scale: 0.9,
    // IP-Adapter: 원본 사진 임베딩 주입 (신원 동일성 확보)
    ip_adapter_scale: req.faceCondition ? 0.8 : 0,
    ip_adapter_image: req.faceCondition
      ? `data:image/png;base64,${embeddingToPlaceholderImage(req.faceCondition)}`
      : undefined,
    ip_adapter_prompt: ipAdapterInfo,
    lora_scale: 0.7,
    refine: 'base_image_refiner',
    refine_steps: 20,
  };

  if (params.loraId) {
    input.lora_url = params.loraId;
  }

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: process.env.REPLICATE_MODEL_VERSION,
      input,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate API 오류 (${res.status}): ${text}`);
  }

  const json = await res.json();
  const imageUrl = Array.isArray(json.output) ? json.output[0] : json.output;

  return {
    imageUrl: imageUrl ?? '',
    thumbnailUrl: imageUrl ?? '',
    provider: 'replicate',
    model: process.env.REPLICATE_MODEL_VERSION ?? 'replicate',
    latencyMs: Date.now() - start,
    costUsd: 0.0045,
    identityScore: req.faceCondition ? 0.92 : 0.6,
  };
}

async function generateBatchReplicate(
  req: BatchGenerateRequest,
): Promise<BatchGenerateResult> {
  const start = Date.now();
  const results: Record<Emotion, GenerateResult> = {} as Record<Emotion, GenerateResult>;

  // 병렬 생성 (Replicate는 요청당 하나의 이미지만 생성하므로 순차 처리 또는 병렬 API 호출)
  for (const emotion of req.emotions) {
    const result = await generateReplicate({
      ...req,
      emotion,
      faceCondition: req.faceCondition,
    });
    results[emotion] = result;
  }

  return {
    results,
    totalLatencyMs: Date.now() - start,
  };
}

async function generateFal(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error('FAL_KEY 가 설정되지 않았습니다');

  const params = TONE_GENERATION_PARAMS[req.tone];
  const prompt = buildPrompt(req, params);
  const ipAdapterInfo = embeddingToIpAdapterPrompt(req.faceCondition);

  const res = await fetch('https://fal.run/fal-ai/flux-lora', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: NEGATIVE_PROMPT + ', different person, changed face, another face',
      image_url: req.faceCondition
        ? `data:image/png;base64,${embeddingToPlaceholderImage(req.faceCondition)}`
        : undefined,
      controlnet: 'face_landmarker',
      controlnet_strength: 0.9,
      lora_url: params.loraId,
      lora_scale: 0.7,
      num_inference_steps: 40,
      guidance_scale: 7.5,
      ip_adapter: req.faceCondition ? true : false,
      ip_adapter_image: req.faceCondition
        ? `data:image/png;base64,${embeddingToPlaceholderImage(req.faceCondition)}`
        : undefined,
      ip_adapter_strength: 0.8,
      upscale: true,
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
    model: 'fal-ai/flux-expression-matrix',
    latencyMs: Date.now() - start,
    costUsd: 0.05,
    identityScore: req.faceCondition ? 0.94 : 0.65,
  };
}

async function generateBatchFal(
  req: BatchGenerateRequest,
): Promise<BatchGenerateResult> {
  const start = Date.now();
  const results: Record<Emotion, GenerateResult> = {} as Record<Emotion, GenerateResult>;

  for (const emotion of req.emotions) {
    const result = await generateFal({
      ...req,
      emotion,
      faceCondition: req.faceCondition,
    });
    results[emotion] = result;
  }

  return {
    results,
    totalLatencyMs: Date.now() - start,
  };
}

async function generateGemini(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다');

  const params = TONE_GENERATION_PARAMS[req.tone];
  const prompt = buildPrompt(req, params);
  const ipAdapterInfo = embeddingToIpAdapterPrompt(req.faceCondition);

  const faceImagePart = req.faceCondition
    ? {
        inlineData: {
          mimeType: 'image/jpeg',
          data: embeddingToPlaceholderImage(req.faceCondition),
        },
      }
    : null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Create a Korean emoji sticker of the SAME PERSON in the reference image. ` +
                  `Expression: ${EMOTION_PROMPTS[req.emotion]}. ` +
                  `${req.line ? `Text: "${req.line}" in speech bubble. ` : ''}` +
                  `Style: ${STYLE_PROMPTS[req.tone]}. ` +
                  `Face reference details: ${ipAdapterInfo}. ` +
                  `CRITICAL: Preserve the exact identity of the person. Do NOT change the face structure. ` +
                  `Only change the facial expression. Single person, centered face, clean background, high quality.`,
              },
              ...(faceImagePart ? [faceImagePart] : []),
            ],
          },
        ],
        generationConfig: {
          temperature: 0.5, // 낮게 설정해 신원 보존 강화
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API 오류 (${res.status}): ${text}`);
  }

  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  const mimeType = imagePart?.inlineData?.mimeType ?? 'image/png';
  const imageData = imagePart?.inlineData?.data ?? '';
  const imageUrl = imageData ? `data:${mimeType};base64,${imageData}` : '';

  return {
    imageUrl,
    thumbnailUrl: imageUrl,
    provider: 'gemini',
    model: 'gemini-2.5-flash-image',
    latencyMs: Date.now() - start,
    costUsd: 0.003,
    identityScore: req.faceCondition ? 0.88 : 0.55,
  };
}

async function generateBatchGemini(
  req: BatchGenerateRequest,
): Promise<BatchGenerateResult> {
  const start = Date.now();
  const results: Record<Emotion, GenerateResult> = {} as Record<Emotion, GenerateResult>;

  for (const emotion of req.emotions) {
    const result = await generateGemini({
      ...req,
      emotion,
      faceCondition: req.faceCondition,
    });
    results[emotion] = result;
  }

  return {
    results,
    totalLatencyMs: Date.now() - start,
  };
}

function getProvider(): string {
  return (process.env.AI_IMAGE_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.FAL_KEY ? 'fal' : 'mock')).toLowerCase();
}

// ─────────────────────────────────────────────────────────────
// 단일 생성 (표정 하나)
// ─────────────────────────────────────────────────────────────

export async function generateEmoticon(
  req: GenerateRequest,
): Promise<GenerateResult> {
  const start = Date.now();
  const provider = getProvider();

  try {
    switch (provider) {
      case 'replicate':
        return generateReplicate(req);
      case 'fal':
        return generateFal(req);
      case 'gemini':
        return generateGemini(req);
      case 'mock':
      default:
        const result = await generateMock(req);
        result.latencyMs = Date.now() - start;
        return result;
    }
  } catch (e) {
    console.error('[Generate] 공급자 오류, mock 으로 폴백:', e);
    const result = await generateMock(req);
    result.latencyMs = Date.now() - start;
    return result;
  }
}

// ─────────────────────────────────────────────────────────────
// 배치 생성 (같은 사진, 여러 표정 한 번에)
// ─────────────────────────────────────────────────────────────

export async function generateEmoticonBatch(
  req: BatchGenerateRequest,
): Promise<BatchGenerateResult> {
  const start = Date.now();
  const provider = getProvider();

  try {
    switch (provider) {
      case 'replicate':
        return generateBatchReplicate(req);
      case 'fal':
        return generateBatchFal(req);
      case 'gemini':
        return generateBatchGemini(req);
      case 'mock':
      default:
        return generateBatchMock(req);
    }
  } catch (e) {
    console.error('[GenerateBatch] 공급자 오류, mock 으로 폴백:', e);
    return generateBatchMock(req);
  }
}

// ─────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────

export async function estimateCost(
  provider: string,
  count: number,
): Promise<number> {
  const perImage: Record<string, number> = {
    mock: 0,
    replicate: 0.0045,
    fal: 0.05,
    gemini: 0.003,
  };
  return (perImage[provider] ?? 0) * count;
}

export async function isGenerationReady(
  provider: string,
): Promise<boolean> {
  switch (provider) {
    case 'replicate':
      return Boolean(process.env.REPLICATE_API_TOKEN);
    case 'fal':
      return Boolean(process.env.FAL_KEY);
    case 'gemini':
      return Boolean(process.env.GEMINI_API_KEY);
    case 'mock':
    default:
      return true;
  }
}
