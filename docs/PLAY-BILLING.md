# 구글 플레이 인앱결제 (Play Billing) — 연동 구조와 남은 단계

> 2026-11-15 기준. 앱은 **무료 다운로드 + 인앱결제(구독·크레딧)** 모델입니다.
> 이 문서는 "이미 코드에 들어간 것"과 "Console·기기에서만 할 수 있는 것"을 구분합니다.

## 1. 왜 이 모델인가

- 구글은 TWA(PWA 래핑) 앱에 대해 **다운로드에 돈을 받지 말고** 기능·콘텐츠를 인앱결제·구독으로 팔라고 안내합니다(Chrome for Developers, *Use Play Billing in your Trusted Web Activity*).
- 웹(emotihak.com)은 같은 서비스가 무료로 열려 있어 유료 다운로드는 차별화가 되지 않고, 결제정책 위반 소지도 있었습니다.
- 그래서 앱 안에서 판매하는 디지털 재화는 전부 Play Billing 으로 보내고, 웹의 토스 결제는 앱 밖 결제로 유지합니다.

## 2. 코드에 들어간 것

| 위치 | 역할 |
|---|---|
| `src/lib/play-products.ts` | 상품 ID 상수(구독 1종·크레딧 1종). 서버·클라이언트 공용, 환경변수 미사용 |
| `src/lib/play-billing.ts` | 브라우저 측 골격: `getDigitalGoodsService('https://play.google.com/billing')` → `getDetails` → `PaymentRequest` → 구매 토큰을 서버로 전송. **화면에서 자격을 열지 않는다** |
| `src/components/payments/PlayBillingButton.tsx` | 구매 버튼 + '이전 구매 복원'. 상품이 콘솔에 없으면 "준비 중"으로 비활성 |
| `src/app/api/play/purchases/verify/route.ts` | `POST` 구매 토큰 서버 검증·acknowledge·자격 기록(로그인 필수, 상품 허용 목록 검사), `GET` 내 자격 목록(토큰 미노출) |
| `src/lib/play-purchases.ts` | Play Developer API 호출, 자격 판정, 환불 회수, 재검증 |
| `src/app/api/cron/play-entitlements/route.ts` | 활성 구매 재검증 크론(환불·만료 회수). `CRON_SECRET` 보호 |
| `src/lib/session.ts` | 요청마다 `playVerified` 계산 → `canUseAiGeneration`·플랜 게이트의 단일 근거 |
| `twa/twa-manifest.json` | `features.playBilling.enabled = true`, `alphaDependencies.enabled = true` |
| `twa/app/src/main/AndroidManifest.xml` | `com.android.vending.BILLING` 권한 |

### 자격 판정 규칙

1. 구매 토큰을 구글에 조회한다 (`purchases.products.get` / `purchases.subscriptionsv2.get`).
2. 활성 상태(단품: `purchaseState=0`, 구독: `ACTIVE`·`IN_GRACE_PERIOD`)면 서버가 `:acknowledge` 를 호출한다 — 3일 내 미확인 시 구글 자동 환불.
3. `play_purchases` 에 `userId` 기준으로 기록한다. **자격은 계정에 귀속**되고 기기·UA 와 무관하다.
4. 요청마다 `status=ACTIVE` 이고 만료 전인 기록이 있을 때만 유료 기능(크레딧 무차감·워터마크 제거·전체 스타일·24컷·AI 생성)이 열린다.
5. 환불·취소·만료는 재검증 크론이 `REVOKED` 로 바꿔 자격을 회수한다.

`TWA/` UA 는 "앱 안에서 실행 중"이라는 UI 힌트일 뿐이며, 위조해도 유료 기능이 열리지 않는다(P0-2 회귀는 `npm run test:play:billing` 이 막는다).

## 3. 환경변수 / Secret

| 이름 | 필수 | 설명 |
|---|---|---|
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | 검증 시 필수 | Play Console > 설정 > API 액세스에서 초대한 서비스 계정 JSON 전체. 없으면 검증 엔드포인트가 503(fail-closed) |
| `PLAY_PACKAGE_NAME` | 아니오 | 기본 `com.emotihak.app` |
| `PLAY_PRODUCT_IDS` | 아니오 | 콘솔 상품 ID 를 쉼표로. 비우면 코드 기본값 2종 |
| `PLAY_BILLING_ENABLED` | 아니오 | `1` 일 때만 요금제 화면에 플레이 결제 버튼 노출(기본 0) |
| `PLAY_VERIFY_WITH_FIREBASE_SA` | 아니오 | Firebase 서비스 계정에 Play 권한을 준 경우 `1` |
| `PLAY_DAILY_GENERATION_LIMIT` | 아니오 | 구매자 1인당 KST 일일 AI 생성 시도 상한(기본 96) |
| `PLAY_API_BASE_URL` / `PLAY_TOKEN_URL` | 테스트만 | 구글 API 스텁 주소. **배포 환경에 넣지 않는다** |

실행 순서·콘솔 화면·실기기 체크리스트는 [PLAY-RUNBOOK.md](./PLAY-RUNBOOK.md), 자동 점검은 `npm run preflight:play`.

## 4. Console·기기에서 해야 하는 것 (코드 밖)

1. Play Console > **수익 창출 > 인앱 상품**: `emotihak_credits_20` 등록(소비성).
2. **구독**: `emotihak_plus_monthly` 등록(월간, 무료 체험 여부 결정).
3. **설정 > API 액세스**: 서비스 계정을 만들고 Play Console 권한 부여 → JSON 키를 Worker Secret 으로 등록.
4. `cd twa && bubblewrap update && bubblewrap build --aab` — 매니페스트의 `playBilling`·`alphaDependencies` 가 반영된다.
   (Bubblewrap 경고대로 **생성된 Android 프로젝트를 직접 오래 편집하지 말 것.** `update` 는 수동 추가 파일을 덮어쓴다.)
5. AAB 업로드 → **앱 무결성 > 앱 서명 인증서 SHA-256** 을 `node scripts/update-assetlinks.mjs "…"` 로 추가·배포.
6. 내부 테스트 트랙에서 설치 → 주소창 없는 전체화면인지, 결제 시트가 뜨는지 실기기 확인.
7. 확인 후 `PLAY_BILLING_ENABLED=1` 로 바꿔 결제 버튼을 노출.
8. 재검증 크론 스케줄 등록(예: 매일 1회 `GET /api/cron/play-entitlements`, `Authorization: Bearer $CRON_SECRET`).

## 5. 아직 없는 것 (출시 전 판단 필요)

- Console 상품 등록 전이므로 **실제 결제 성립은 아직 불가**하다. 이 상태에서 `PLAY_BILLING_ENABLED=0` 이면 결제 버튼도 뜨지 않는다.
- 2026-11-24 부로 **소비성 크레딧 지급이 원장에 연결됐다.** 서버 검증 → `credits` 지급(1회, 멱등) → 구글 `:consume` 순서로 처리하고, 지급 근거는 `refType='play-purchase'` 다.
  구독 상품은 크레딧을 지급하지 않고 자격만 만든다. 지급 크레딧 수는 `PLAY_CREDITS_PER_PURCHASE`(기본 20)와 콘솔 상품 설명이 같아야 한다.
- consume 실패(`consumeError`)는 기록만 남는다 — 재시도 크론은 아직 없다. 실기기 테스트에서 재구매가 막히면 `/admin` 기록과 구글 응답을 대조한다.
- 구독 해지·플랜 변경 UI 는 없다(플레이 스토어 구독 관리로 이동).
- 12명×14일 비공개 테스트는 별도 일정이다.

## 6. 검증

```bash
npm run test:play:billing      # 검증·acknowledge·환불 회수·UA 회귀 방지 (구글 API 스텁)
npm run test:play:static       # TWA 매니페스트·assetlinks
npm run test:launch            # 요금제·문구·CTA 정적 점검
DATA_DIR=/tmp/emotime-play STORE_BACKEND=file npm run test:play
```

테스트는 로컬 HTTP 스텁을 쓰므로 실제 구글 결제·실기기 동작을 증명하지 않는다.
