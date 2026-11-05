// ─────────────────────────────────────────────────────────────
// TWA(Trusted Web Activity) 감지 — 구글 플레이 인앱결제 정책 대응
//  · TWA 내부의 UA 문자열에는 "TWA/" 토큰(TWA/1.0)이 포함된다.
//  · TWA 안에서는 디지털 상품(크레딧)을 웹 결제로 판매하면 안 되므로
//    서버(요청 UA)와 클라이언트(브라우저) 양쪽에서 감지한다.
// ─────────────────────────────────────────────────────────────
export function uaIsTWA(ua: string): boolean {
  return /TWA\//i.test(ua ?? '');
}

/** 브라우저(클라이언트)에서 호출 — 서버 사이드 렌더링 시 false */
export function isTWA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return uaIsTWA(navigator.userAgent);
}
