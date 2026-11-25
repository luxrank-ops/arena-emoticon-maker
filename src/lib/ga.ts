/**
 * Google Analytics 4 (GA4) 설정.
 *  · 측정 ID(G-...)는 비밀이 아니라 모든 페이지 HTML에 노출되는 공개 값이다.
 *  · Cloudflare Workers 빌드에는 NEXT_PUBLIC_* 가 주입되지 않을 수 있으므로,
 *    환경변수가 비어 있으면 운영 측정 ID로 떨어진다. (빈 값이면 태그가 아예 안 붙어 측정이 끊긴다)
 *  · 속성: analytics.google.com — "이모티학 emotihak.com" (계정 a328414345)
 */
export const GA_MEASUREMENT_ID = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-47XFW9HYF9').trim();

export function gaEnabled() {
  return Boolean(GA_MEASUREMENT_ID);
}
