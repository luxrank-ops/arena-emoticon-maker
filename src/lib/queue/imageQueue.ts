import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { generateImageWithDalle, buildEmoticonPrompt, STYLE_ART_PROMPTS } from '@/lib/ai/dalle';
import { uploadExternalImage, uploadThumbnail, ensureBucketExists } from '@/lib/storage/supabase';
import { emitGenerationUpdate } from '@/lib/socket/server';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 빌드 타임에는 Redis 연결 생성 안 함 (모킹용)
function createRedisConnection() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    // 빌드 시에는 더미 연결 객체 반환
    return {} as any;
  }
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // BullMQ 요구사항
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: true,
  });
}

const connection = createRedisConnection();

export const imageGenerationQueue = new Queue('image-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// 작업 타입 정의
export interface GenerationJobData {
  generationId: string;
  userId: string;
  characterName: string;
  characterConcept: string;
  emotion: string;
  dialogue?: string;
  style: string;
  model: string;
  size: string;
  quality: string;
  creditsUsed: number;
}

export interface GenerationJobResult {
  imageUrl: string;
  thumbnailUrl: string;
  revisedPrompt: string;
  generationTime: number;
}

/**
 * 이미지 생성 워커
 */
export const imageGenerationWorker = new Worker<GenerationJobData, GenerationJobResult>(
  'image-generation',
  async (job: Job<GenerationJobData, GenerationJobResult>) => {
    const { generationId, userId, characterName, characterConcept, emotion, dialogue, style, model, size, quality, creditsUsed } = job.data;
    const startTime = Date.now();

    try {
      // 1. 상태를 PROCESSING으로 업데이트
      await prisma.generation.update({
        where: { id: generationId },
        data: { status: 'PROCESSING' },
      });

      // 진행률 알림
      await emitGenerationUpdate(generationId, { status: 'PROCESSING', progress: 10 });

      // 2. 버킷 확인
      await ensureBucketExists();

      // 3. 프롬프트 구성
      const artStylePrompt = STYLE_ART_PROMPTS[style] || STYLE_ART_PROMPTS['3d-disney-pixar'];
      const prompt = buildEmoticonPrompt({
        characterName,
        characterConcept,
        emotion,
        dialogue,
        style,
        artStylePrompt,
      });

      await emitGenerationUpdate(generationId, { status: 'PROCESSING', progress: 30 });

      // 4. DALL·E 3로 이미지 생성
      const result = await generateImageWithDalle({
        prompt,
        size: size as '1024x1024' | '1792x1024' | '1024x1792',
        quality: quality as 'standard' | 'hd',
      });

      await emitGenerationUpdate(generationId, { status: 'PROCESSING', progress: 60 });

      // 5. 이미지 Supabase에 저장
      const [imageUpload, thumbnailUpload] = await Promise.all([
        uploadExternalImage(result.imageUrl, userId, generationId),
        uploadThumbnail(result.imageUrl, userId, generationId),
      ]);

      await emitGenerationUpdate(generationId, { status: 'PROCESSING', progress: 90 });

      // 6. DB 업데이트
      const generationTime = Date.now() - startTime;
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'COMPLETED',
          imageUrl: imageUpload.url,
          thumbnailUrl: thumbnailUpload,
          revisedPrompt: result.revisedPrompt,
          generationTime,
          completedAt: new Date(),
        },
      });

      // 7. 완료 알림
      await emitGenerationUpdate(generationId, {
        status: 'COMPLETED',
        progress: 100,
        imageUrl: imageUpload.url,
        revisedPrompt: result.revisedPrompt,
      });

      return {
        imageUrl: imageUpload.url,
        thumbnailUrl: thumbnailUpload,
        revisedPrompt: result.revisedPrompt,
        generationTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`생성 작업 실패 (${generationId}):`, error);

      // 실패 상태 업데이트
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      // 크레딧 환불
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsUsed } },
      });

      // 실패 알림
      await emitGenerationUpdate(generationId, {
        status: 'FAILED',
        error: errorMessage,
      });

      throw error;
    }
  },
  { connection, concurrency: 2 } // 동시 2개 작업 처리
);

// 워커 이벤트 리스너
imageGenerationWorker.on('completed', (job) => {
  console.log(`✅ 생성 완료: ${job.id}`);
});

imageGenerationWorker.on('failed', (job, err) => {
  console.error(`❌ 생성 실패: ${job?.id}`, err);
});

imageGenerationWorker.on('error', (err) => {
  console.error('워커 오류:', err);
});

/**
 * 큐에 작업 추가
 */
export async function addGenerationJob(data: GenerationJobData): Promise<string> {
  const job = await imageGenerationQueue.add('generate', data);
  return job.id!;
}

/**
 * 작업 상태 조회
 */
export async function getJobStatus(jobId: string) {
  const job = await imageGenerationQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
  };
}

/**
 * 큐 통계 조회
 */
export async function getQueueStats() {
  const waiting = await imageGenerationQueue.getWaitingCount();
  const active = await imageGenerationQueue.getActiveCount();
  const completed = await imageGenerationQueue.getCompletedCount();
  const failed = await imageGenerationQueue.getFailedCount();

  return { waiting, active, completed, failed };
}