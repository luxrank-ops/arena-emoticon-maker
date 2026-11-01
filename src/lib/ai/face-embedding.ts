import type { FaceCondition, FaceProfile } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 얼굴 임베딩 파이프라인 (Identity Lock)
// FaceNet / ArcFace 모델을 사용하여 사용자 얼굴의 고유 벡터를 추출.
// 생성 시 이 벡터를 ControlNet/임베딩 조건부로 주입해 동일 인물 보존.
// ─────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  embedding: number[]; // 512차원 얼굴 임베딩
  model: string;       // 사용 모델명 (예: 'facenet', 'arcface')
  confidence: number;  // 감지 신뢰도 0~1
  faceDetected: boolean;
}

/**
 * 얼굴 임베딩 추출 인터페이스.
 * 실제 모델 로드는 공급자별로 구현 (온디바이스 tfjs / 서버 python / API).
 * 현재는 구조 정의만 포함. 모델 가중치 다운로드 후 교체 예정.
 */
export class FaceEmbeddingExtractor {
  private model: string;
  private initialized = false;

  constructor(model = 'facenet') {
    this.model = model;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    // TODO: 실제 모델 로드
    // 예: await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
    // 예: await tf.loadGraphModel('https://.../facenet_model.json')
    this.initialized = true;
  }

  /**
   * 이미지 비트맵에서 얼굴 임베딩 추출.
   * 여러 얼굴 중 가장 신뢰도 높은 1개 선택.
   * imageBitmap 이 없으면 null 반환 (클라이언트 연동 시 사용).
   */
  async extract(
    imageBitmap: ImageBitmap | null,
  ): Promise<EmbeddingResult | null> {
    await this.init();

    if (!imageBitmap) return null;

    // TODO: 실제 임베딩 추출 로직 교체
    // 현재는 플레이스홀더 (모델 미연동 시 null 반환)
    if (typeof window === 'undefined') {
      // 서버 사이드: 실제 모델 연동 필요
      return null;
    }

    // 브라우저 환경에서도 모델 가중치 없이는 추출 불가 → null
    // 실제 구현 시 face-api.js / tensorflow.js 로 교체
    return null;
  }

  /**
   * 두 임베딩 간 유사도 계산 (코사인 유사도).
   * 동일 인물 판정 임계값: 0.6↑ (모델에 따라 조정)
   */
  static similarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * 임베딩이 유효한지 검증 (512차원, 값 범위 등).
   */
  static isValid(embedding: number[]): boolean {
    return (
      Array.isArray(embedding) &&
      embedding.length === 512 &&
      embedding.every((v) => typeof v === 'number' && isFinite(v))
    );
  }
}

/**
 * FaceProfile 에 임베딩 필드를 주입해 저장용으로 변환.
 */
export function attachEmbedding(
  profile: FaceProfile,
  embedding: number[],
  model: string,
): FaceProfile {
  return {
    ...profile,
    embedding,
    embeddingModel: model,
  };
}

/**
 * 생성 요청용 FaceCondition 구성.
 * 저장된 FaceProfile 에서 임베딩과 시그니처를 추출.
 */
export function buildFaceCondition(
  profile: FaceProfile,
): FaceCondition | null {
  if (!profile.embedding || !FaceEmbeddingExtractor.isValid(profile.embedding)) {
    return null;
  }
  return {
    faceId: profile.id,
    embedding: profile.embedding,
    signature: profile.signature,
    palette: profile.palette,
  };
}
