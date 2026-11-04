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
      GEMINI_PHOTO_MODEL: bindings.text("gemini-3-pro-image-preview"),
      GEMINI_STYLE_MODEL: bindings.text("gemini-3.1-flash-image-preview"),
      GEMINI_TEXT_MODEL: bindings.text("gemini-2.5-flash"),
      PAYMENT_PROVIDER: bindings.text("mock"),
      STORE_BACKEND: bindings.text("auto"),
      RATE_LIMIT_DISABLED: bindings.text("1"),
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      STORE_KV: bindings.kv({ id: "cf10a2fa249a4c80b1163ea04948162e" }),
    },
  }),
});
