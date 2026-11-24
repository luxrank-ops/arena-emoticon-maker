// ─────────────────────────────────────────────────────────────
// 구글 플레이 인앱결제 상품 ID (서버·클라이언트 공용 — 값만 있는 파일)
//  · 콘솔에 등록하는 상품 ID 와 정확히 같아야 한다. 등록 전에는 구매가 성립하지 않는다.
//  · 이 파일은 클라이언트 번들에도 들어가므로 환경변수를 읽지 않는다.
//    서버 쪽 허용 목록은 src/lib/play-purchases.ts 의 allowedPlayProductIds() 를 쓴다.
// ─────────────────────────────────────────────────────────────

export const PLAY_SUBSCRIPTION_PRODUCT_ID = 'emotihak_plus_monthly';
export const PLAY_CREDITS_PRODUCT_ID = 'emotihak_credits_20';

export const PLAY_PRODUCT_DEFAULTS = [PLAY_SUBSCRIPTION_PRODUCT_ID, PLAY_CREDITS_PRODUCT_ID] as const;

/**
 * 소비성(consumable) 상품 — 살 때마다 다시 살 수 있어야 하므로 구매 후 구글에 `:consume` 을 호출한다.
 * (acknowledge 만 하면 같은 상품을 다시 구매할 수 없다)
 * 구독·비소비성 상품은 여기에 넣지 않는다.
 */
export const PLAY_CONSUMABLE_PRODUCT_IDS = [PLAY_CREDITS_PRODUCT_ID] as const;

/** 크레딧 상품 1회 구매로 지급하는 크레딧 수 (콘솔 상품 설명과 같아야 한다) */
export const PLAY_CREDITS_PER_PURCHASE = 20;

export function isPlayConsumable(productId: string): boolean {
  return (PLAY_CONSUMABLE_PRODUCT_IDS as readonly string[]).includes(productId);
}
