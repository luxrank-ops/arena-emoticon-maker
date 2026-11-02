import type { Emotion, Tone } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 사진 → 이모티콘 컷 (Gemini 2.5 Flash Image, 서버 전용)
//  · 사용자의 실제 셀피를 참조 이미지로 직접 넣는다 (SVG 자리표시자 없음).
//  · 원본 사진은 요청 본문으로만 받고, 응답 후 버린다. 저장하지 않는다.
//  · 신원 유지: 같은 사람, 표정만 변경. 과한 캐리커처(대두·기형) 금지.
// ─────────────────────────────────────────────────────────────

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const TIMEOUT_MS = 50_000;

export const EMOTION_PROMPTS: Record<Emotion, string> = {
  joy: 'a gentle happy smile, bright eyes',
  laugh: 'a big joyful laugh with an open mouth and crinkled eyes',
  love: 'a warm loving smile with a soft heart-eyed mood',
  sad: 'a sad expression with downturned mouth and glistening eyes',
  angry: 'an angry expression with furrowed brows',
  sulk: 'a pouting sulky expression with pursed lips',
  tired: 'a sleepy exhausted expression with droopy eyelids',
  surprised: 'a surprised expression with wide eyes and raised eyebrows',
  smug: 'a smug confident smirk with one eyebrow raised',
  cry: 'a crying expression with tears streaming down the cheeks',
  king: 'a furious fed-up expression, shouting in frustration',
  blank: 'a flat, neutral, deadpan expression',
};

/** 화풍 지시. 얼굴 신원 규칙은 별도로 항상 붙는다. */
export const STYLE_DIRECTIONS: Record<Tone, string> = {
  '2d-cute':
    'a cute 2D character sticker in the style of popular KakaoTalk emoticons: thick clean black outline, flat soft colors, simple shading, a stylized but clearly recognizable version of the person',
  caricature:
    'a photorealistic portrait cutout sticker: the real person exactly as in the photo with natural skin texture and realistic lighting, not a cartoon or illustration, with a thin white sticker border',
  doodle:
    'a wobbly hand-drawn crayon doodle sticker in the style of Choi Gosim: naive bold crayon lines, bright primary accent colors, cheerful and charming',
  'office-meme':
    'a humorous Korean office-worker meme sticker in the style of Gwak-cheol and Zanmang Loopy: simple comic line art with flat colors and a small office prop such as a coffee cup',
  'clay-3d':
    'a handcrafted 3D polymer clay figurine sticker: soft matte-glossy clay texture, gentle studio lighting, a cute collectible toy look',
  'pixel-art':
    'a 16-bit retro pixel art sticker with visible square pixels and a limited vibrant palette, Y2K Tamagotchi era game aesthetic',
  '3d-cartoon':
    'a 3D cartoon render sticker with soft shading, glossy surfaces and a cute Pixar-like character look',
  sketch:
    'a pencil sketch sticker with hand-drawn rough lines and light shading, diary-style',
  mono:
    'a bold black and white line-art meme sticker with high contrast, no color',
  watercolor:
    'a soft watercolor painting sticker with gentle bleeding edges and pastel colors',
};

const IDENTITY_RULES =
  'Use the attached photo as the ONLY reference for who this is. Keep the same person: identical face shape, eyes, nose, lips, eyebrows, skin tone, hairstyle and hair color, and glasses if worn. Do not change age, gender or ethnicity. Do not turn the head into an oversized bobble shape or distort the features; the likeness must stay recognizable to friends.';

const LAYOUT_RULES =
  'Single person, head and shoulders, centered, facing the viewer. Plain solid white background. One sticker only. No watermark, no extra text, no logos.';

export interface RenderInput {
  /** 순수 base64 (data: 접두사 없음) */
  photoBase64: string;
  mimeType: string;
  tone: Tone;
  emotion: Emotion;
  /** 말풍선에 넣을 대사 (없으면 말풍선 없음) */
  line?: string;
  /** 시안 구분용 추가 지시 (예: 'natural proportions') */
  variantNote?: string;
}

export function buildRenderPrompt(input: RenderInput): string {
  const parts = [
    `Create ${STYLE_DIRECTIONS[input.tone]} of the person in the reference photo, showing ${EMOTION_PROMPTS[input.emotion]}.`,
    IDENTITY_RULES,
    LAYOUT_RULES,
  ];
  if (input.line) {
    parts.push(
      `Include exactly one speech bubble with the Korean text "${input.line}" written exactly as given, clearly legible.`,
    );
  }
  if (input.variantNote) parts.push(`Variant note: ${input.variantNote}.`);
  return parts.join(' ');
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

export class RenderError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** 사진을 참조해 컷 1장을 만든다. 실패 시 RenderError */
export async function renderWithGemini(input: RenderInput): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new RenderError('AI_NOT_CONFIGURED', 'AI 생성 키가 설정되지 않았습니다');

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: buildRenderPrompt(input) },
          { inlineData: { mimeType: input.mimeType, data: input.photoBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: input.tone === 'caricature' ? 0.3 : 0.5,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  });

  // 일시적 과부하(429/503)는 한 번 재시도한다
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      },
    );

    if (res.status === 429 || res.status === 503) {
      await res.body?.cancel().catch(() => undefined);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      throw new RenderError('AI_BUSY', 'AI 생성 요청이 몰려 있어요. 잠시 후 다시 시도해 주세요');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[gemini-render] http', res.status, text.slice(0, 300));
      throw new RenderError('AI_FAILED', 'AI 생성에 실패했어요. 다시 시도해 주세요');
    }

    const json = (await res.json()) as { candidates?: { content?: { parts?: GeminiPart[] } }[] };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((p) => p.inlineData?.data);
    if (!image?.inlineData?.data) {
      // 안전 필터·텍스트만 응답 → 한 번 더 시도
      if (attempt === 0) continue;
      throw new RenderError('AI_NO_IMAGE', 'AI가 이미지를 만들지 못했어요. 다른 사진으로 다시 시도해 주세요');
    }
    return Buffer.from(image.inlineData.data, 'base64');
  }
  throw new RenderError('AI_FAILED', 'AI 생성에 실패했어요. 다시 시도해 주세요');
}
