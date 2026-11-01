import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { logEvent, uid, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { FaceEmbeddingExtractor } from '@/lib/ai/face-embedding';

const schema = z.object({
  palette: z.object({
    skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    skinShade: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    hair: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    shirt: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  signature: z.object({
    headScale: z.number(), faceWidth: z.number(), eyeSpacing: z.number(), eyeSize: z.number(),
    eyeShape: z.enum(['almond', 'round', 'narrow']),
    browWeight: z.number(), mouthWidth: z.number(), lipThickness: z.number(), noseSize: z.number(),
    hairStyle: z.number(), cheek: z.number(),
    jawline: z.enum(['square', 'round', 'pointed']),
    glasses: z.boolean(),
  }),
  metrics: z.object({
    coverage: z.number(), centering: z.number(), brightness: z.number(), sharpness: z.number(), faceDetected: z.boolean(),
  }),
  consent: z.object({ accepted: z.literal(true), version: z.string().max(20), overseas: z.literal(true) }),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'faceAnalyze', RATE_LIMITS.faceAnalyze);
    if (limited) return limited;
    const body = schema.parse(await req.json());
    const id = uid('face');
    const now = new Date();
    const purgeAfter = new Date(now.getTime() + Number(process.env.FACE_PURGE_HOURS ?? 24) * 3600_000);

    // 얼굴 임베딩 생성 (모델 로드 실패 시 null → 이후 FaceNet/ArcFace 연동 시 채워짐)
    // 서버 사이드에서는 실제 이미지 비트맵이 없어 추출 불가.
    // 클라이언트 측 UploadFlow 에서 /api/face/embed 로 이미지 전송 후 별도 저장.
    const extractor = new FaceEmbeddingExtractor('facenet');
    const result = await extractor.extract(null);
    let embedding: number[] | undefined;
    let embeddingModel: string | undefined;
    if (result) {
      embedding = result.embedding;
      embeddingModel = result.model;
    }

    await withDB((db) => {
      db.faces.push({
        id,
        userId: user.id,
        palette: body.palette,
        signature: body.signature,
        metrics: body.metrics,
        consent: {
          at: now.toISOString(),
          version: body.consent.version,
          ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local',
          overseas: true,
        },
        createdAt: now.toISOString(),
        purgedAt: purgeAfter.toISOString(),
        ...(embedding ? { embedding, embeddingModel } : {}),
      });
      logEvent(db, user.id, 'face_analyzed', {
        faceId: id,
        coverage: Number(body.metrics.coverage.toFixed(2)),
        embedding: !!embedding,
      });
    });

    return ok({
      faceId: id,
      purgeAfter: purgeAfter.toISOString(),
      stored: 'palette+metrics' + (embedding ? '+embedding' : ' only'),
    });
  } catch (e) {
    return handleError(e);
  }
}
