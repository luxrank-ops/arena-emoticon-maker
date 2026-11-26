import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

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
    // Cron Trigger — 매일 18:00 UTC = 03:00 KST 에 worker/index.ts 의 scheduled 가
    // /api/cron/purge 를 호출한다 (얼굴 파생 정보 24시간 내 파기 약속의 실제 실행 경로).
    // 기존 vercel.json 의 크론은 제거해 스케줄을 이곳 한 곳으로 모았다.
    triggers: [triggers.scheduled({ schedule: "0 18 * * *" })],
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
      // 무료 미리보기(일반 방문자 12컷 워터마크 팩) — 배포만으로 열린다. 닫으려면 "0".
      //  · 상한은 free-trial.ts 가 이 값으로 강제한다(사용자·IP·전체 하루/월, 미리보기 팩 수).
      //  · 원가: 미리보기는 Flash 모델 ≈ $0.02/장 → 12컷 팩 ≈ $0.24, 하루 45장 ≈ $0.9 (월 900장 ≈ $18).
      TRIAL_FREE_ENABLED: bindings.text("1"),
      TRIAL_IMAGES_PER_USER_DAY: bindings.text("18"),
      TRIAL_IMAGES_PER_IP_DAY: bindings.text("24"),
      TRIAL_IMAGES_PER_DAY: bindings.text("45"),
      TRIAL_IMAGES_PER_MONTH: bindings.text("900"),
      TRIAL_CUTS_PER_USER_DAY: bindings.text("12"),
      TRIAL_PREVIEW_PACKS_PER_USER_DAY: bindings.text("1"),
      TRIAL_PREVIEW_PACKS_PER_IP_DAY: bindings.text("2"),
      GEMINI_PHOTO_MODEL: bindings.text("gemini-3-pro-image-preview"),
      GEMINI_STYLE_MODEL: bindings.text("gemini-3.1-flash-image-preview"),
      GEMINI_TEXT_MODEL: bindings.text("gemini-flash-latest"),
      // 운영은 포트원(PortOne) V2 → KG이니시스 결제창.
      // 스토어 ID는 공개 값이라 코드에 두고, 채널키(PORTONE_CHANNEL_KEY)·API 시크릿(PORTONE_API_SECRET)은
      // 대시보드 Variable/Secret 에서 관리한다(값이 없으면 paymentsUnavailable() 이 503 으로 안전하게 차단한다).
      PAYMENT_PROVIDER: bindings.text("portone"),
      PORTONE_STORE_ID: bindings.text("store-f9fe74e1-f7f8-4678-b4a7-7bf143b15b16"),
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
