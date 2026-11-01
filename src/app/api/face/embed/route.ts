import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { logEvent, uid, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { FaceEmbeddingExtractor, buildFaceCondition } from '@/lib/ai/face-embedding';
import type { FaceProfile } from '@/lib/types';

const schema = z.object({
  faceId: z.string().min(1),
  imageDataUrl: z.string().min(1), // base64 data URL
});

/**
 * POST /api/face/embed
 * 클라이언트 측에서 얼굴 이미지 데이터 URL을 전송하면,
 * FaceNet/ArcFace 로 임베딩을 추출해 FaceProfile 에 저장.
 *
 * 이후 AI 생성 시 이 임베딩을 ControlNet 조건부로 주입해 동일 인물 보존.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'faceEmbed', RATE_LIMITS.faceEmbed);
    if (limited) return limited;

    const body = schema.parse(await req.json());

    // ImageBitmap 생성 (브라우저 측에서 이미 처리된 데이터를 서버에서 다시 파싱하는 구조는
    // 실제 운영 시 클라이언트 측 tfjs/face-api 로 추출 후 벡터만 전송하는 것이 효율적임)
    // 현재는 인터페이스 정의 단계 → 실제 모델 연동 시 교체
    let embedding: number[] | undefined;
    let embeddingModel: string | undefined;

    try {
      // TODO: base64 → ImageBitmap 변환 후 FaceEmbeddingExtractor.extract 호출
      // 현재는 서버 측 모델 가중치 없음 → 클라이언트 측 추출 후 벡터 전송 방식으로 변경 필요
      const extractor = new FaceEmbeddingExtractor('facenet');
      // 서버에서는 imageDataUrl 을 직접 처리할 수 없음 (브라우저 API 의존)
      // 클라이언트 측에서 임베딩을 추출해 이 엔드포인트로 벡터만 전송하는 패턴 권장
    } catch {
      // 임베딩 실패는 치명적이지 않음
    }

    await withDB((db) => {
      const face = db.faces.find(
        (f) => f.id === body.faceId && f.userId === user.id,
      ) as FaceProfile | undefined;
      if (!face) {
        throw new Error('FACE_NOT_FOUND');
      }
      // 임베딩이 있으면 업데이트, 없으면 기존 유지
      if (embedding) {
        face.embedding = embedding;
        face.embeddingModel = embeddingModel;
      }
      logEvent(db, user.id, 'face_embed', {
        faceId: body.faceId,
        embedding: !!embedding,
        model: embeddingModel ?? '',
      });
    });

    return ok({
      faceId: body.faceId,
      embedding: !!embedding,
      model: embeddingModel,
      message: embedding
        ? '얼굴 임베딩이 저장되었습니다.'
        : '임베딩 생성은 클라이언트 측 모델 연동 후 가능합니다.',
    });
  } catch (e) {
    return handleError(e);
  }
}
