// ─────────────────────────────────────────────────────────────
// TWA(Trusted Web Activity) 감지 — 구글 플레이 유료 앱 대응
//  · TWA 내부의 UA 문자열에는 "TWA/" 토큰(TWA/1.0)이 포함된다.
//  · 구글 플레이에서 구매한 유료 앱은 앱(TWA) 안에서는 모든 기능을
//    무제한으로 제공한다 (결제는 플레이스토어에서 이미 완료).
//  · 미들웨어가 UA 를 검사해 x-emotihak-play 헤더를 요청에 붙이고,
//    세션 해석(getCurrentUser)에서 사용자에 play 플래그를 부여한다.
//  · 주의: UA 는 클라이언트 통제 가능 → 웹에서 TWA UA 를 위조하면
//    풀액세스를 탈 수 있다. 완전 폐쇄는 커스텀 TWA + Google Play
//    License Verification (LVD) 이 필요 (docs/PLAY-STORE.md 참조).
// ─────────────────────────────────────────────────────────────
export const PLAY_HEADER = 'x-emotihak-play';

export function uaIsTWA(ua: string): boolean {
  return /TWA\//i.test(ua ?? '');
}

/** 브라우저(클라이언트)에서 호출 — 서버 사이드 렌더링 시 false */
export function isTWA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return uaIsTWA(navigator.userAgent);
}
