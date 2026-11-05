import { AuthError } from '@/lib/auth';
import { queueImageDeletion } from '@/lib/deletion';
import { logEvent, uid, withDB } from '@/lib/store';
import type { ContentReport, ContentReportReason } from '@/lib/types';

export async function createContentReport(userId: string, input: { packId: string; frameId: string; reason: ContentReportReason; details?: string }) {
  return withDB((db) => {
    const pack = db.packs.find((item) => item.id === input.packId && item.userId === userId);
    const frame = pack?.frames.find((item) => item.id === input.frameId && !item.hiddenAt);
    if (!pack || !frame) throw new AuthError('CONTENT_NOT_FOUND', '신고할 컷을 찾을 수 없습니다', 404);
    const existing = db.contentReports.find((item) => item.userId === userId && item.frameId === input.frameId && item.status === 'OPEN');
    if (existing) return { report: existing, deduplicated: true };
    const report: ContentReport = {
      id: uid('report'), userId, packId: input.packId, frameId: input.frameId,
      reason: input.reason, details: input.details?.trim() || undefined,
      status: 'OPEN', createdAt: new Date().toISOString(),
    };
    db.contentReports.push(report);
    logEvent(db, userId, 'content_reported', { reportId: report.id, packId: report.packId, frameId: report.frameId, reason: report.reason });
    return { report, deduplicated: false };
  });
}

export async function reviewContentReport(adminId: string, input: { reportId: string; action: 'review' | 'dismiss' | 'hide'; note?: string }) {
  return withDB((db) => {
    const report = db.contentReports.find((item) => item.id === input.reportId);
    if (!report) throw new AuthError('REPORT_NOT_FOUND', '신고를 찾을 수 없습니다', 404);
    if (report.status !== 'OPEN') return { report, imageId: undefined as string | undefined };
    const now = new Date().toISOString();
    let imageId: string | undefined;
    if (input.action === 'hide') {
      const pack = db.packs.find((item) => item.id === report.packId);
      const frame = pack?.frames.find((item) => item.id === report.frameId);
      if (!pack || !frame) throw new AuthError('CONTENT_NOT_FOUND', '이미 삭제된 콘텐츠입니다', 404);
      imageId = frame.imageId;
      frame.hiddenAt = now;
      queueImageDeletion(db, pack.userId, [imageId], 'MODERATION');
      report.status = 'ACTIONED';
    } else {
      report.status = input.action === 'dismiss' ? 'DISMISSED' : 'REVIEWED';
    }
    report.reviewedAt = now;
    report.resolutionNote = input.note?.trim() || undefined;
    logEvent(db, adminId, 'content_moderated', { reportId: report.id, action: input.action, frameId: report.frameId });
    return { report, imageId };
  });
}
