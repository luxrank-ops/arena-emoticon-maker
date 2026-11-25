import { GA_MEASUREMENT_ID } from '@/lib/ga';

/**
 * GA4 gtag.js — 서버 렌더 HTML 의 <head> 에 직접 넣는다(스크립트 로더 없이 가장 확실한 방식).
 *  · send_page_view:false — 페이지뷰는 AnalyticsProvider 가 라우트 변경마다 직접 보낸다.
 *    (App Router 는 클라이언트 이동 시 자동 페이지뷰가 없다)
 *  · 쿠키 기반 측정이므로 개인정보처리방침의 쿠키 고지와 함께 동작한다.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html:
            `window.dataLayer=window.dataLayer||[];` +
            `function gtag(){dataLayer.push(arguments);}` +
            `window.gtag=gtag;` +
            `gtag('js',new Date());` +
            `gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false,anonymize_ip:true});`,
        }}
      />
    </>
  );
}
