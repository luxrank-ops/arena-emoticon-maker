// ─────────────────────────────────────────────────────────────
// 구글 플레이 결제 — 웹앱(Digital Goods API + PaymentRequest) 골격 (브라우저 전용)
//
// 동작 순서
//  1) 앱(TWA) 안에서만 결제 서비스를 얻는다: getDigitalGoodsService('https://play.google.com/billing')
//  2) 상품 정보·가격은 구글에서 받는다 (우리 가격표를 쓰지 않는다)
//  3) PaymentRequest 로 구매 → purchaseToken 회수
//  4) purchaseToken 을 서버(/api/play/purchases/verify)로 보내 검증·acknowledge·자격 기록
//
// 원칙
//  · 이 파일은 결제 UI 만 담당한다. **화면에서 유료 기능을 열지 않는다** —
//    유료 자격은 서버 검증 기록(play_purchases)으로만 판정된다.
//  · 결제 서비스가 없으면(브라우저·미지원 기기) 조용히 unsupported 를 돌려준다.
// ─────────────────────────────────────────────────────────────

import { PLAY_CREDITS_PRODUCT_ID, PLAY_SUBSCRIPTION_PRODUCT_ID } from '@/lib/play-products';

export const PLAY_BILLING_METHOD = 'https://play.google.com/billing';
export const PLAY_BILLING_SERVICE = 'https://play.google.com/billing';

export interface PlayItemDetails {
  itemId: string;
  title: string;
  price: { currency: string; value: string };
}

export type PlayPurchaseOutcome =
  | { status: 'purchased'; productId: string; verified: boolean; message?: string }
  | { status: 'unsupported' }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

interface DigitalGoodsServiceLike {
  getDetails(itemIds: string[]): Promise<PlayItemDetails[]>;
  listPurchases(): Promise<{ itemId?: string; purchaseToken: string }[]>;
  acknowledge(purchaseToken: string, type: 'onetime' | 'repeatable'): Promise<void>;
}

interface DigitalGoodsWindow extends Window {
  getDigitalGoodsService?: (service: string) => Promise<DigitalGoodsServiceLike>;
}

export function playItemIds() {
  return {
    subscription: PLAY_SUBSCRIPTION_PRODUCT_ID,
    credits: PLAY_CREDITS_PRODUCT_ID,
  };
}

/** 앱(TWA) 안에서 Digital Goods API 를 쓸 수 있는지 */
export function digitalGoodsAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as DigitalGoodsWindow).getDigitalGoodsService === 'function';
}

async function getService(): Promise<DigitalGoodsServiceLike | null> {
  if (!digitalGoodsAvailable()) return null;
  try {
    const service = await (window as DigitalGoodsWindow).getDigitalGoodsService!(PLAY_BILLING_SERVICE);
    return service ?? null;
  } catch {
    // 일반 브라우저에서는 지정된 결제 방법이 없어 reject 된다 → 미지원으로 처리.
    return null;
  }
}

/** 상품 정보·가격 (구글이 정한 가격을 그대로 보여준다) */
export async function getPlayItemDetails(itemIds: string[]): Promise<PlayItemDetails[]> {
  const service = await getService();
  if (!service) return [];
  try {
    return await service.getDetails(itemIds);
  } catch {
    return [];
  }
}

/** 이 계정(기기)이 이미 보유한 구매 — '구매 복원' 안내용. 서버 기록과 함께 확인한다. */
export async function listPlayPurchases(): Promise<{ itemId?: string; purchaseToken: string }[]> {
  const service = await getService();
  if (!service) return [];
  try {
    return await service.listPurchases();
  } catch {
    return [];
  }
}

async function verifyOnServer(productId: string, purchaseToken: string, kind: 'INAPP' | 'SUBS') {
  const res = await fetch('/api/play/purchases/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, purchaseToken, kind }),
  });
  const payload = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, payload };
}

/**
 * 상품 하나를 구매하고 서버 검증까지 마친다.
 *  · 서버 검증이 실패하면 'purchased' + verified:false 로 돌려준다 — 화면은 이때 유료 기능을 열지 않는다.
 */
export async function purchasePlayItem(
  productId: string,
  kind: 'INAPP' | 'SUBS' = 'INAPP',
): Promise<PlayPurchaseOutcome> {
  const service = await getService();
  if (!service || typeof window === 'undefined' || typeof window.PaymentRequest !== 'function') {
    return { status: 'unsupported' };
  }
  const [details] = await service.getDetails([productId]);
  if (!details?.price) {
    return { status: 'failed', message: '구글 플레이에 이 상품이 아직 등록되지 않았습니다.' };
  }
  let response: PaymentResponse;
  try {
    const request = new PaymentRequest(
      [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku: productId } }],
      {
        total: {
          label: details.title || '이모티학',
          amount: { currency: details.price.currency, value: details.price.value },
        },
      },
    );
    response = await request.show();
  } catch {
    return { status: 'cancelled' };
  }

  const payment = response.details as { purchaseToken?: string; itemId?: string };
  const purchaseToken = payment?.purchaseToken ?? '';
  if (!purchaseToken) {
    await response.complete('fail').catch(() => undefined);
    return { status: 'failed', message: '구매 토큰을 받지 못했습니다. 다시 시도해 주세요.' };
  }
  await response.complete('success').catch(() => undefined);

  try {
    const verified = await verifyOnServer(payment.itemId ?? productId, purchaseToken, kind);
    if (verified.ok) return { status: 'purchased', productId, verified: true };
    return {
      status: 'purchased',
      productId,
      verified: false,
      message: (verified.payload as { error?: { message?: string } } | null)?.error?.message
        ?? '구매는 접수됐지만 서버 확인이 끝나지 않았습니다. 잠시 후 자동으로 다시 확인합니다.',
    };
  } catch {
    return {
      status: 'purchased',
      productId,
      verified: false,
      message: '구매는 접수됐지만 네트워크 문제로 서버 확인이 끝나지 않았습니다. 잠시 후 다시 확인해 주세요.',
    };
  }
}
