import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { logEvent, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import type { Tone, Emotion } from '@/lib/types';
import {
  generateEmoticonBatch,
  estimateCost,
} from '@/lib/ai/generate';
import { buildFaceCondition } from '@/lib/ai/face-embedding';

const batchSchema = z.object({
  faceId: z.string().min(1),
  tone: z.enum([
    '2d-cute', '3d-cartoon', 'sketch', 'mono', 'watercolor', 'caricature',
  ]),
  emotions: z.array(
    z.enum([
      'joy', 'laugh', 'love', 'sad', 'angry', 'sulk', 'tired',
      'surprised', 'smug', 'cry', 'king', 'blank',
    ]),
  ).min(1).max(12),
  line: z.string().max(34).optional(),
  intensity: z.number().min(0).max(100).optional(),
});

/**
 * POST /api/generate/batch
 * 같은 사진으로 여러 표정을 한 번에 생성 (Expression Matrix).
 * 유료 사용자가 한 장의 사진으로 여러 감정의 이모티콘을 일괄 생성할 때 사용.
 *
 * 흐름:
 * 1. faceId 로 FaceProfile 조회 → 임베딩 확인
 * 2. 임베딩이 없으면 400 (사전 얼굴 분석 필요)
 * 3. 각 표정에 대해 AI 생성 공급자 호출 (ControlNet + IP-Adapter, 동일 인물 보존)
 * 4. 모든 결과 이미지 URL 반환 + 이벤트 로깅
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'generateBatch', RATE_LIMITS.generateBatch);
    if (limited) return limited;

    const body = batchSchema.parse(await req.json());

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

    // FaceCondition 구성 (얼굴 임베딩 → 생성 조건 변환)
    const condition = buildFaceCondition(profile as any);
    if (!condition) {
      return fail('EMBEDDING_INVALID', '얼굴 임베딩이 유효하지 않습니다.', 400);
    }

    // 배치 AI 생성 호출 (Identity Lock: 얼굴 임베딩 주입, 같은 사람 다른 표정)
    const batchResult = await generateEmoticonBatch({
      faceId: body.faceId,
      palette: profile.palette,
      signature: profile.signature,
      tone: body.tone,
      emotions: body.emotions,
      line: body.line,
      intensity: body.intensity ?? 80,
      faceCondition: condition,
    });

    // 생성 이벤트 로깅 (각 표정별)
    await withDB((db) => {
      for (const [emotion, result] of Object.entries(batchResult.results)) {
        logEvent(db, user.id, 'generate', {
          faceId: body.faceId,
          tone: body.tone,
          emotion,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          costUsd: result.costUsd ?? 0,
          batch: true,
        });
      }
    });

    const totalCost = Object.values(batchResult.results).reduce(
      (sum, r) => sum + (r.costUsd ?? 0),
      0,
    );

    return ok({
      results: batchResult.results,
      totalLatencyMs: batchResult.totalLatencyMs,
      totalCost,
      provider: Object.values(batchResult.results)[0]?.provider ?? 'mock',
      model: Object.values(batchResult.results)[0]?.model ?? 'mock',
    });
  } catch (e) {
    return handleError(e);
  }
}
