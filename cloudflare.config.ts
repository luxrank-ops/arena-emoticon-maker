import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "arena-emoticon-maker",
    // 대시보드 설정과 맞춘다 (workers.dev 끔, 프리뷰 URL 끔, 커스텀 도메인 emotihak.com)
    workersDev: false,
    previewUrls: false,
    domains: ["emotihak.com"],
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-11-04",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      // 비밀이 아닌 운영 설정 (API 키는 여기에 넣지 않고 Secret 으로 관리)
      DEMO_MODE: bindings.text("0"),
      // 유료 등급 정비 기간에는 관리자만 AI 생성(이미지·특정 재확인). 전체 공개로 전환하려면 "0".
      GENERATION_ADMIN_ONLY: bindings.text("1"),
      GEMINI_PHOTO_MODEL: bindings.text("gemini-3-pro-image-preview"),
      GEMINI_STYLE_MODEL: bindings.text("gemini-3.1-flash-image-preview"),
      GEMINI_TEXT_MODEL: bindings.text("gemini-flash-latest"),
      // 운영은 토스페이먼츠 실결제. 키는 대시보드 Variable/Secret 에서 관리한다
      // (키가 없는 상태면 paymentsUnavailable() 이 503 으로 안전하게 차단한다).
      PAYMENT_PROVIDER: bindings.text("toss"),
      // 새 주문만 중단하는 비상 스위치 (기존 승인·복구는 계속 허용)
      PAYMENT_CHECKOUT_DISABLED: bindings.text("0"),
      STORE_BACKEND: bindings.text("auto"),
      RATE_LIMIT_DISABLED: bindings.text("0"),
      // 구글 플레이 인앱결제 — 상품 등록·서비스 계정 준비 전에는 결제 UI 를 노출하지 않는다.
      // (구매 검증에 쓰는 GOOGLE_PLAY_SERVICE_ACCOUNT_JSON 은 Secret 으로만 둔다.)
      PLAY_PACKAGE_NAME: bindings.text("com.emotihak.app"),
      PLAY_BILLING_ENABLED: bindings.text("0"),
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      STORE_KV: bindings.kv({ id: "cf10a2fa249a4c80b1163ea04948162e" }),
    },
  }),
});
