import { createHash } from 'node:crypto';
import { AuthError } from '@/lib/auth';
import { processImageDeletionJobs, queueImageDeletion } from '@/lib/deletion';
import { paymentReviewItems } from '@/lib/payment-review';
import { logEvent, uid, withDB } from '@/lib/store';
import type { GoodsOrder } from '@/lib/types';

export interface AccountDeletionResult {
  packs: number;
  sheets: number;
  faces: number;
  imagesQueued: number;
  imageDeletion: Awaited<ReturnType<typeof processImageDeletionJobs>>;
}

/**
 * 인증된 계정과 연관 데이터를 실제로 삭제한다.
 * 법정 보존이 필요한 유료 주문·구매/환불 원장만 남기고, 미해결 결제나 배송은 먼저 정리하도록 차단한다.
 */
export async function deleteAccountPermanently(userId: string): Promise<AccountDeletionResult> {
  const summary = await withDB((db) => {
    const user = db.users.find((item) => item.id === userId);
    const account = db.accounts.find((item) => item.userId === userId);
    if (!user || !account || user.role === 'admin') throw new AuthError('ACCOUNT_NOT_FOUND', '삭제할 회원 계정을 찾을 수 없습니다', 404);

    const paymentReview = paymentReviewItems(db).find((item) => item.userId === userId);
    if (paymentReview) throw new AuthError('PAYMENT_REVIEW_REQUIRED', '미해결 결제가 있어 바로 삭제할 수 없습니다. 결제 내역을 먼저 확인하거나 고객센터에 문의해 주세요', 409);

    const activeGoods = db.orders.find((order): order is GoodsOrder => order.userId === userId && order.kind === 'goods' && order.status === 'PAID' && 'goodsStatus' in order && !['DELIVERED', 'CANCELLED'].includes(order.goodsStatus));
    if (activeGoods) throw new AuthError('ACTIVE_ORDER', '제작·배송 중인 주문이 있어 완료 또는 취소 후 계정을 삭제할 수 있습니다', 409);

    const packs = db.packs.filter((pack) => pack.userId === userId);
    const sheets = db.sheets.filter((sheet) => sheet.userId === userId);
    const faces = db.faces.filter((face) => face.userId === userId);
    const imageIds = [
      ...packs.flatMap((pack) => [pack.characterReferenceImageId, ...pack.frames.map((frame) => frame.imageId)]),
      ...sheets.flatMap((sheet) => sheet.variants.map((variant) => variant.imageId)),
      ...db.orders.filter((order) => order.userId === userId).map((order) => 'productImageId' in order ? order.productImageId : undefined),
    ];
    const queued = queueImageDeletion(db, userId, imageIds, 'ACCOUNT_DELETION');
    const now = new Date().toISOString();

    // 미결제·실패 주문은 금융 기록이 아니므로 삭제하고, 유료 주문은 법정 보존 범위만 남긴다.
    db.orders = db.orders.flatMap((order) => {
      if (order.userId !== userId) return [order];
      if (order.status !== 'PAID') return [];
      order.accountDeletedAt = now;
      if ('shipping' in order) delete order.shipping;
      if ('productImageId' in order) delete order.productImageId;
      if ('trackingCompany' in order) delete order.trackingCompany;
      if ('trackingNumber' in order) delete order.trackingNumber;
      if ('frameThumb' in order) order.frameThumb = '';
      return [order];
    });
    db.credits = db.credits.filter((entry) => entry.userId !== userId || entry.reason === 'PURCHASE' || entry.reason === 'REFUND');

    db.users = db.users.filter((item) => item.id !== userId);
    db.accounts = db.accounts.filter((item) => item.userId !== userId);
    db.sessions = db.sessions.filter((item) => item.userId !== userId);
    db.consistencyPreparations = db.consistencyPreparations.filter((item) => item.userId !== userId);
    db.faces = db.faces.filter((item) => item.userId !== userId);
    db.sheets = db.sheets.filter((item) => item.userId !== userId);
    db.packs = db.packs.filter((item) => item.userId !== userId);
    db.briefs = db.briefs.filter((item) => item.userId !== userId);
    db.contentReports = db.contentReports.filter((item) => item.userId !== userId);
    db.playUsage = db.playUsage.filter((item) => item.userId !== userId);
    db.events = db.events.filter((item) => item.userId !== userId);
    logEvent(db, 'system', 'account_deleted', {
      auditId: createHash('sha256').update(userId).digest('hex').slice(0, 16),
      deletionId: uid('audit'),
      packs: packs.length,
    });
    return { packs: packs.length, sheets: sheets.length, faces: faces.length, imagesQueued: queued?.imageIds.length ?? 0 };
  });

  const imageDeletion = await processImageDeletionJobs();
  return { ...summary, imageDeletion };
}
