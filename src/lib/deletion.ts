import { deleteImage, IMAGE_ID_PATTERN } from '@/lib/images';
import { uid, withDB, type DB } from '@/lib/store';
import type { ImageDeletionJob } from '@/lib/types';

/** 이미지 바이트 삭제를 영속 작업으로 남겨 저장소 일시 장애 후에도 재시도한다. */
export function queueImageDeletion(db: DB, userId: string, imageIds: (string | undefined)[], reason: 'ACCOUNT_DELETION' | 'MODERATION') {
  const ids = [...new Set(imageIds.filter((id): id is string => !!id && IMAGE_ID_PATTERN.test(id)))];
  if (!ids.length) return null;
  const job: ImageDeletionJob = { id: uid('del'), userId, imageIds: ids, reason, createdAt: new Date().toISOString() };
  db.deletionJobs.push(job);
  return job;
}

/**
 * DB에서 이미 계정·콘텐츠가 분리된 이미지를 실제 저장소에서 삭제한다.
 * 실패한 ID만 작업에 남기므로 cron/기회적 스윕이 다시 시도할 수 있다.
 */
export async function processImageDeletionJobs(limit = 5) {
  const jobs = await withDB((db) => db.deletionJobs.slice(0, limit).map((job) => ({ ...job, imageIds: [...job.imageIds] })));
  let deleted = 0;
  let failed = 0;
  for (const job of jobs) {
    const remaining: string[] = [];
    for (const imageId of job.imageIds) {
      try {
        await deleteImage(imageId);
        deleted++;
      } catch {
        failed++;
        remaining.push(imageId);
      }
    }
    await withDB((db) => {
      const current = db.deletionJobs.find((item) => item.id === job.id);
      if (!current) return;
      if (remaining.length) current.imageIds = remaining;
      else db.deletionJobs = db.deletionJobs.filter((item) => item.id !== job.id);
    });
  }
  const pending = await withDB((db) => db.deletionJobs.reduce((sum, job) => sum + job.imageIds.length, 0));
  return { deleted, failed, pending, jobs: jobs.length };
}
