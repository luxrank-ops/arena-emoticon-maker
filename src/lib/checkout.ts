import { paymentProvider } from '@/lib/payments';
import { logEvent, uid, withPaymentDB } from '@/lib/store';
import type { Order } from '@/lib/types';

export interface CheckoutConfirmation {
  orderId: string;
  paymentKey: string;
  amount: number;
}

export interface CheckoutResult {
  orderId: string;
  alreadyPaid: boolean;
  credits: number;
  kind: Order['kind'];
}

export class CheckoutError extends Error {
  constructor(public code: string, message: string, public status = 409) {
    super(message);
    this.name = 'CheckoutError';
  }
}

type Reservation =
  | { error: string }
  | { paid: true; order: Order; balance: number }
  | { paid: false; order: Order };

interface TossPayment {
  paymentKey?: string;
  orderId?: string;
  totalAmount?: number;
  status?: string;
  method?: string;
}

function retryError() {
  return new CheckoutError('PAYMENT_RETRY', '결제 승인 결과를 확인하지 못했어요. 다시 확인하거나 고객센터에 문의해 주세요.', 503);
}

async function verifyTossPayment(input: CheckoutConfirmation) {
  let response: Response;
  try {
    response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.orderId,
      },
      body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    throw retryError();
  }

  // 승인 응답을 놓쳤거나 멱등 응답이 만료된 경우 결제키 조회로 복구한다.
  if (!response.ok) {
    try {
      response = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(input.paymentKey)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}` },
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      });
    } catch {
      throw retryError();
    }
  }
  if (!response.ok) throw retryError();

  const data = await response.json().catch(() => null) as TossPayment | null;
  if (!data || data.paymentKey !== input.paymentKey || data.orderId !== input.orderId || data.totalAmount !== input.amount || data.status !== 'DONE' || !['카드', '간편결제'].includes(data.method ?? '')) {
    throw new CheckoutError('PAYMENT_REVIEW', '결제 상태를 자동 확인할 수 없어요. 고객센터에 주문번호를 알려 주세요.');
  }
}

/** 주문 소유자와 금액을 검증하고, 승인된 결제만 한 번 지급한다. */
export async function confirmCheckout(userId: string, input: CheckoutConfirmation): Promise<CheckoutResult> {
  const provider = paymentProvider();
  // 검증된 주문과 결제키를 먼저 저장해 타임아웃 후에도 같은 키로 복구한다.
  const reserved = await withPaymentDB((db): Reservation => {
    const order = db.orders.find((item) => item.id === input.orderId && item.userId === userId);
    if (!order || (order.kind !== 'credits' && order.kind !== 'goods') || order.provider !== provider) return { error: 'ORDER_NOT_FOUND' };
    if (order.amount !== input.amount) return { error: 'AMOUNT_MISMATCH' };
    if (!order.consentAt) return { error: 'CONSENT_REQUIRED' };
    if (order.paymentKey && order.paymentKey !== input.paymentKey) return { error: 'KEY_MISMATCH' };
    if (order.status === 'PAID') return { paid: true, order, balance: db.users.find((user) => user.id === userId)?.credits ?? 0 };
    if (order.status !== 'PENDING') return { error: 'ORDER_UNAVAILABLE' };
    if (!db.users.some((user) => user.id === userId)) return { error: 'ORDER_NOT_FOUND' };
    order.paymentKey = input.paymentKey;
    return { paid: false, order };
  });

  if ('error' in reserved) {
    const messages: Record<string, string> = {
      ORDER_NOT_FOUND: '주문 또는 결제 정보를 확인해 주세요.',
      AMOUNT_MISMATCH: '주문 또는 결제 정보를 확인해 주세요.',
      CONSENT_REQUIRED: '주문 또는 결제 정보를 확인해 주세요.',
      KEY_MISMATCH: '주문 또는 결제 정보를 확인해 주세요.',
      ORDER_UNAVAILABLE: '주문 또는 결제 정보를 확인해 주세요.',
    };
    throw new CheckoutError(reserved.error, messages[reserved.error] ?? '주문 또는 결제 정보를 확인해 주세요.', reserved.error === 'ORDER_NOT_FOUND' ? 404 : 409);
  }
  if (reserved.paid) return { orderId: reserved.order.id, alreadyPaid: true, credits: reserved.balance, kind: reserved.order.kind };

  if (provider === 'toss') {
    await verifyTossPayment(input);
  } else if (provider !== 'mock' || process.env.NODE_ENV === 'production' || !input.paymentKey.startsWith('mock_')) {
    throw new CheckoutError('PAYMENT_UNAVAILABLE', '결제 연동이 준비되지 않아 지금은 구매할 수 없어요', 503);
  }

  // 승인 후 주문 상태, 크레딧 원장과 잔액을 한 번의 CAS 트랜잭션에 반영한다.
  const settled = await withPaymentDB((db): { alreadyPaid: boolean; balance: number } | null => {
    const order = db.orders.find((item) => item.id === input.orderId && item.userId === userId);
    const account = db.users.find((user) => user.id === userId);
    if (!order || !account || order.paymentKey !== input.paymentKey || order.provider !== provider || order.amount !== input.amount) return null;
    if (order.status === 'PAID') return { alreadyPaid: true, balance: account.credits };
    if (order.status !== 'PENDING') return null;
    if (order.kind === 'goods') {
      if (!('goodsStatus' in order) || order.goodsStatus !== 'PENDING_PAYMENT' || !order.productImageId) return null;
      order.status = 'PAID';
      order.paidAt = new Date().toISOString();
      order.goodsStatus = 'AWAITING_FULFILLMENT';
      logEvent(db, userId, 'order_paid', { orderId: order.id, amount: order.amount, provider });
      return { alreadyPaid: false, balance: account.credits };
    }
    if (db.credits.some((entry) => entry.userId === userId && entry.reason === 'PURCHASE' && entry.refType === 'order' && entry.refId === order.id)) return null;
    account.credits += order.credits;
    const now = new Date().toISOString();
    db.credits.push({ id: uid('cr'), userId, delta: order.credits, reason: 'PURCHASE', refType: 'order', refId: order.id, balanceAfter: account.credits, createdAt: now });
    order.status = 'PAID';
    order.paidAt = now;
    logEvent(db, userId, 'order_paid', { orderId: order.id, amount: order.amount, provider });
    return { alreadyPaid: false, balance: account.credits };
  });
  if (!settled) throw new CheckoutError('PAYMENT_REVIEW', '결제 확인이 필요합니다. 고객센터에 문의해 주세요.');
  return { orderId: input.orderId, alreadyPaid: settled.alreadyPaid, credits: settled.balance, kind: reserved.order.kind };
}

/** 저장된 결제키만 사용하므로 닫힌 결제창의 주문도 소유자가 안전하게 복구할 수 있다. */
export async function recoverCheckout(userId: string, orderId: string): Promise<CheckoutResult> {
  const snapshot = await withPaymentDB((db) => {
    const order = db.orders.find((item) => item.id === orderId && item.userId === userId);
    if (!order) return null;
    return {
      paymentKey: order.paymentKey,
      amount: order.amount,
      status: order.status,
      kind: order.kind,
      balance: db.users.find((user) => user.id === userId)?.credits ?? 0,
    };
  });
  if (!snapshot) throw new CheckoutError('ORDER_NOT_FOUND', '주문을 찾을 수 없습니다', 404);
  if (snapshot.status === 'PAID' && !snapshot.paymentKey) {
    return { orderId, alreadyPaid: true, credits: snapshot.balance, kind: snapshot.kind };
  }
  if (snapshot.status !== 'PENDING' && snapshot.status !== 'PAID') {
    throw new CheckoutError('ORDER_UNAVAILABLE', '복구할 수 없는 주문 상태입니다. 고객센터에 문의해 주세요.');
  }
  if (!snapshot.paymentKey) throw new CheckoutError('PAYMENT_NOT_STARTED', '저장된 결제 승인 정보가 없습니다. 주문 페이지에서 결제를 먼저 진행해 주세요.');
  return confirmCheckout(userId, { orderId, paymentKey: snapshot.paymentKey, amount: snapshot.amount });
}
