import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { PLANS } from '@/lib/pricing';
import { paymentReviewItems } from '@/lib/payment-review';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user.role !== 'admin') return ok({ locked: true });

    const data = await withDB((db) => {
      const paid = db.orders.filter((o) => o.status === 'PAID');
      const revenue = paid.reduce((s, o) => s + o.amount, 0);
      const creditsIssued = db.credits.filter((c) => c.delta > 0).reduce((s, c) => s + c.delta, 0);
      const creditsSpent = db.credits.filter((c) => c.delta < 0).reduce((s, c) => s + c.delta, 0);
      const frames = db.packs.reduce((s, p) => s + p.frames.length, 0);
      const planCount = { FREE: 0, PLUS: 0, STUDIO: 0 };
      for (const u of db.users) planCount[u.plan]++;
      const errors = db.events.filter((e) => e.type === 'error').slice(-8).reverse();
      const recentOrders = db.orders.slice(-8).reverse().map((o) => ({
        id: o.id,
        title: o.title,
        amount: o.amount,
        status: o.status,
        createdAt: o.createdAt,
        kind: o.kind,
      }));
      const topFrames = db.packs
        .flatMap((p) => p.frames)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map((f) => ({ label: f.label, line: f.line, usage: f.usageCount }));

      const paymentReview = paymentReviewItems(db);
      const contentReports = db.contentReports.slice(-20).reverse().map((report) => {
        const pack = db.packs.find((item) => item.id === report.packId);
        const frame = pack?.frames.find((item) => item.id === report.frameId);
        return { ...report, packTitle: pack?.title, frameLabel: frame?.label, line: frame?.line, imageId: frame?.imageId };
      });

      return {
        users: db.users.length,
        plans: planCount,
        packs: db.packs.length,
        frames,
        revenue,
        smr: paid.filter((o) => o.kind === 'subscription').reduce((s, o) => s + o.amount, 0),
        goodsRevenue: paid.filter((o) => o.kind === 'goods').reduce((s, o) => s + o.amount, 0),
        creditsIssued,
        creditsSpent: Math.abs(creditsSpent),
        aiCostEstimate: frames * 54,
        errors,
        recentOrders,
        topFrames,
        paymentReviewCount: paymentReview.length,
        paymentReview: paymentReview.slice(0, 20),
        contentReportCount: db.contentReports.filter((report) => report.status === 'OPEN').length,
        contentReports,
        deletionPending: db.deletionJobs.reduce((sum, job) => sum + job.imageIds.length, 0),
        arpu: db.users.length ? Math.round(revenue / db.users.length) : 0,
        planPrice: { PLUS: PLANS.PLUS.price, STUDIO: PLANS.STUDIO.price },
      };
    });

    return ok({ metrics: data, locked: false });
  } catch (e) {
    return handleError(e);
  }
}
