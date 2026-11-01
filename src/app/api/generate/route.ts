import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { logEvent, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import type { Tone, Emotion } from '@/lib/types';
import { generateEmoticon } from '@/lib/ai/generate';
import { TONE_GENERATION_PARAMS } from '@/lib/ai/tone-params';
import { buildFaceCondition } from '@/lib/ai/face-embedding';

const schema = z.object({
  faceId: z.string().min(1),
  tone: z.enum([
    '2d-cute', '3d-cartoon', 'sketch', 'mono', 'watercolor', 'caricature',
  ]),
  emotion: z.enum([
    'joy', 'laugh', 'love', 'sad', 'angry', 'sulk', 'tired',
    'surprised', 'smug', 'cry', 'king', 'blank',
  ]),
  line: z.string().max(34).optional(),
  intensity: z.number().min(0).max(100).optional(),
});

/**
 * POST /api/generate
 * 사용자 얼굴 조건부로 이모티콘 이미지 생성.
 *
 * 흐름:
 * 1. faceId 로 FaceProfile 조회 → 임베딩 확인
 * 2. 임베딩이 없으면 400 (사전 얼굴 분석 필요)
 * 3. AI 생성 공급자 호출 (ControlNet + LoRA 조건부)
 * 4. 결과 이미지 URL 반환 + 이벤트 로깅
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'generate', RATE_LIMITS.generate);
    if (limited) return limited;

    const body = schema.parse(await req.json());

    // FaceProfile 조회 (임베딩 확인)
    const profile = await withDB((db) => {
      return db.faces.find((f) => f.id === body.faceId && f.userId === user.id) ?? null;
    }) as { id: string; embedding?: number[]; embeddingModel?: string; palette: any; signature: any } | null;

    if (!profile) {
      return fail('FACE_NOT_FOUND', '등록된 얼굴 정보가 없습니다. 먼저 얼굴 분석을 완료해 주세요.', 404);
    }

    if (!profile.embedding) {
      return fail('EMBEDDING_MISSING', '얼굴 임베딩이 없습니다. 얼굴 분석을 다시 완료해 주세요.', 400);
    }

    // FaceCondition 구성
    const condition = buildFaceCondition(profile as any);
    if (!condition) {
      return fail('EMBEDDING_INVALID', '얼굴 임베딩이 유효하지 않습니다.', 400);
    }

    // 톤별 생성 파라미터
    const toneParams = TONE_GENERATION_PARAMS[body.tone];

    // AI 생성 호출
    const result = await generateEmoticon({
      faceId: body.faceId,
      palette: profile.palette,
      signature: profile.signature,
      tone: body.tone,
      emotion: body.emotion,
      line: body.line,
      intensity: body.intensity ?? 80,
    });

    // 생성 이벤트 로깅
    await withDB((db) => {
      logEvent(db, user.id, 'generate', {
        faceId: body.faceId,
        tone: body.tone,
        emotion: body.emotion,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        costUsd: result.costUsd ?? 0,
      });
    });

    return ok({
      imageUrl: result.imageUrl,
      thumbnailUrl: result.thumbnailUrl,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      costUsd: result.costUsd,
      toneParams,
    });
  } catch (e) {
    return handleError(e);
  }
}
