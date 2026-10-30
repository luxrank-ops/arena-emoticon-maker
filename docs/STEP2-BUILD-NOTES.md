# Step 2 구현 노트 — 이모티미 v0.2.0

> Step 1에서 설계한 아키텍처와 **실제 구현의 차이**를 정직하게 기록합니다.
> (협업 규칙 #1: 코드가 문서와 다르면 문서를 먼저 고친다)

---

## 1. 구현 범위 (Step 2 완료)

| # | 산출물 | 구현 위치 | 상태 |
| --- | --- | --- | --- |
| 1 | 프로젝트 스캐폴드 (Next.js 14 App Router + TS strict + Tailwind) | `src/`, `package.json` | ✅ `npm run build` 통과 |
| 2 | 디자인 시스템 (컬러·타이포·카드·버튼·칩·진행바) | `tailwind.config.ts`, `globals.css`, `components/ui.tsx` | ✅ |
| 3 | 랜딩 + 온보딩(업로드/검증) | `app/page.tsx`, `app/studio/upload`, `components/studio/UploadFlow` | ✅ |
| 4 | Identity Lock 1~2단계 (얼굴 분석 → 캐릭터 시트 3종) | `lib/face/analyze.ts`, `lib/packs.ts`, `app/studio/sheet/[id]` | ✅ |
| 5 | 팩 생성 12/24컷 + SSE 진행률 | `app/api/packs/[id]/stream`, `components/studio/PackViewer` | ✅ |
| 6 | 인앱 편집기 (대사·감정선·표정·소품·배경) | `app/editor/[packId]/[frameId]`, `components/editor/FrameEditor` | ✅ |
| 7 | Chat-to-Sticker + Daily Face Brief | `lib/recommend/engine.ts`, `app/reply`, `app/brief` | ✅ |
| 8 | 결제(Provider 추상화 + Mock) + append-only 크레딧 원장 | `lib/credits.ts`, `app/api/checkout*`, `components/payments/*` | ✅ |
| 9 | 굿즈 커머스 + 내보내기(PNG/GIF/ZIP) | `app/goods`, `lib/export.ts` | ✅ |
| 10 | 관리자 콘솔 (KPI·원가·모더레이션·주문) | `app/admin`, `app/api/admin/*` | ✅ |
| 11 | 스모크 테스트 28케이스 | `scripts/smoke.mjs` | ✅ 28/28 |
| 12 | 라이브 프리뷰 + PR | 포트 3000 | ✅ |

---

## 2. 설계 대비 변경 사항 (Deviation Log)

| 항목 | 설계(Step 1) | Step 2 구현 | 이유 / Step 3 전환 계획 |
| --- | --- | --- | --- |
| **이미지 생성** | Gemini 2.5 Flash Image (nano-banana, Identity Lock 3단계) | **절차적 SVG 렌더러**(`lib/art/sticker.ts`) 기본 + Gemini 어댑터 자리 | 키·네트워크 없이도 전 플로우 시연/CI 가능. `spec` → 이미지 계약이 동일해 교체 시 상위 코드 무변경 |
| **얼굴 분석** | MediaPipe FaceLandmarker (WASM) | **Canvas 기반 온디바이스 분석** (YCbCr 피부 마스크 + 라이브러리 없음) | 모델 CDN 의존 제거. 반환 계약(`FaceAnalysis`)은 동일 → MediaPipe로 스왑 |
| **DB** | PostgreSQL + Prisma | **파일 기반 저장소**(`.data/store.json`) with 직렬화 트랜잭션 | 샌드박스에서 DB 설치 불필요. `withDB()` 인터페이스 유지 → Prisma 어댑터로 교체 |
| **큐** | BullMQ + Redis | **인프로세스 + `readyAt` 타임스탬프** 기반 진행률 | 워커 인프라 없이 SSE 진행률 UX 검증. 잡 상태 모델은 동일 |
| **후처리** | sharp + ffmpeg | **브라우저 Canvas + gifenc**(GIF는 클라이언트 생성) | 서버 네이티브 의존 제거 + 사용자 대역폭/원가 절감 |
| **인증** | 토스 로그인 / NextAuth | **익명 세션 쿠키**(middleware 발급) | 온보딩 마찰 0 검증용. `tossUserKey` 필드는 모델에 존재 |
| **결제** | 토스페이먼츠 결제위젯 | `PaymentProvider` 추상화 + **mock**(전체 파이프라인 동작) + toss 분기 구현 | 실결제 없이 주문→승인→원장 지급 검증. `PAYMENT_PROVIDER=toss` 로 전환 |

**바뀌지 않은 것 (계약):** `StickerSpec`, `FrameView`, `CreditEntry`, API 응답 스키마, `PaymentProvider` 인터페이스.
즉, Step 3에서 **어댑터만 갈아끼우면** 프로덕션 스택으로 이동할 수 있습니다.

---

## 3. 보안 · 컴플라이언스 구현 현황

| 항목 | 구현 |
| --- | --- |
| 얼굴 원본 미전송 | 분석은 `'use client'`에서만 수행. 서버 전송 항목은 팔레트·지표·시그니처 |
| 파기 예약 기록 | `FaceProfile.purgedAt = now + FACE_PURGE_HOURS(24h)` |
| 동의 3종 분리 | 업로드 화면 필수 체크 3개(약관/개인정보/국외이전) |
| 결제 금액 위변조 | 금액은 `SKU`에서 서버 산정, confirm 시 `amount` 재검증 |
| 청약철회 동의 | 결제 화면 필수 체크 → `agreeDigital: true` 없으면 422 |
| 멱등성 | 크레딧 원장 `(userId, reason, refType, refId)` 중복 차단 |
| 권한 | `/admin`은 `role==='admin'` 검사 + 서버측 passcode(`ADMIN_PASSCODE`) |
| 헤더 | `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`(camera=self) |
| AI 생성 표시 | 푸터 고지 + ZIP README + 결과물 라벨 |

**아직 안 된 것(정직하게):** 유명인/정치인 유사도 필터, NSFW 분류기, 라이브니스 챌린지, 웹훅 서명 검증(실결제 전), 원본 파기 크론(원본을 받지 않으므로 현재 무의미).

---

## 4. 운영 팁

```bash
# 초기화 (데모 데이터 포함 리셋)
npm run store:reset

# 운영 콘솔 접근
#  → /admin, 코드: emotime-demo (ADMIN_PASSCODE 로 변경)

# 결제를 토스로 전환 (실키 필요)
PAYMENT_PROVIDER=toss TOSS_SECRET_KEY=... TOSS_CLIENT_KEY=...
#  → /api/checkout/confirm 에서 /v1/payments/confirm 호출

# 스모크 테스트
BASE_URL=http://localhost:3000 node scripts/smoke.mjs
```

---

## 5. Step 3 백로그 (DevOps / Auto-Evolution)

1. **CI 고도화** — Lighthouse 예산, `scripts/smoke.mjs`를 preview 배포에 연결, 시각 회귀(스티커 12종 스냅샷)
2. **관측** — Sentry(이미 스캐폴드 위치 확보), PostHog 퍼널(업로드→시트→팩→결제→사용)
3. **프로덕션 어댑터** — Prisma/Postgres, BullMQ, Gemini 이미지 파이프라인, S3 프리사인드
4. **안전장치** — NSFW·유명인 필터, 신고/차단 플로우, 워터마크(C2PA)
5. **성장 실험** — 커플 팩 초대 루프, 가격 A/B, Daily Brief 푸시 문구 최적화
6. **정산** — 원가 대시보드(컷당 원가·캐시 히트율) + 월간 자동 리포트
