import type { DB } from '@/lib/store';

export type PaymentReviewIssue = 'APPROVAL_UNSETTLED' | 'LEDGER_MISMATCH';

export interface PaymentReviewItem {
  orderId: string;
  userId: string;
  title: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  issue: PaymentReviewIssue;
  canRecover: boolean;
}

/** 결제키가 저장됐지만 지급되지 않은 주문과 PAID·원장 불일치를 찾는다. 결제키는 노출하지 않는다. */
export function paymentReviewItems(db: DB): PaymentReviewItem[] {
  return db.orders.flatMap((order): PaymentReviewItem[] => {
    const base = {
      orderId: order.id,
      userId: order.userId,
      title: order.title,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    };
    if (order.status === 'PENDING' && order.paymentKey) {
      return [{ ...base, issue: 'APPROVAL_UNSETTLED', canRecover: true }];
    }
    if (order.kind === 'credits' && order.status === 'PAID') {
      const ledgerCount = db.credits.filter((entry) => entry.userId === order.userId && entry.reason === 'PURCHASE' && entry.refType === 'order' && entry.refId === order.id).length;
      if (ledgerCount !== 1) return [{ ...base, issue: 'LEDGER_MISMATCH', canRecover: false }];
    }
    return [];
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
