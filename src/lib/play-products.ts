// ─────────────────────────────────────────────────────────────
// 구글 플레이 인앱결제 상품 ID (서버·클라이언트 공용 — 값만 있는 파일)
//  · 콘솔에 등록하는 상품 ID 와 정확히 같아야 한다. 등록 전에는 구매가 성립하지 않는다.
//  · 이 파일은 클라이언트 번들에도 들어가므로 환경변수를 읽지 않는다.
//    서버 쪽 허용 목록은 src/lib/play-purchases.ts 의 allowedPlayProductIds() 를 쓴다.
// ─────────────────────────────────────────────────────────────

export const PLAY_SUBSCRIPTION_PRODUCT_ID = 'emotihak_plus_monthly';
export const PLAY_CREDITS_PRODUCT_ID = 'emotihak_credits_20';

export const PLAY_PRODUCT_DEFAULTS = [PLAY_SUBSCRIPTION_PRODUCT_ID, PLAY_CREDITS_PRODUCT_ID] as const;
