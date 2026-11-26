# 업그레이드 — Creator Pro 월 제공 크레딧 120 → 80 (2026-11-26)

사용자 승인에 따라 **Creator Pro 1개월 이용권(₩19,900, `plan-creator-monthly`)의 월 제공 크레딧을 120 → 80으로 하향**했다.
`실사 짤`·`실사 포토` 기본 선택(`gemini-3-pro-image`) 전환으로 컷당 원가가 올라가, 120크레딧(컷당 ≈166원) 구성은 원가를 밑돌 수 있었다.
80크레딧이면 컷당 **≈249원**(19,900 ÷ 80)으로 실사 모델 기준 마진이 남는다.

## 1. 무엇이 바뀌나 (단일 소스 = `src/lib/pricing.ts`)
| 위치 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `PLANS.STUDIO.credits` | 120 | **80** |
| `PLANS.STUDIO.features` | 월 120크레딧 (24컷 모션 일괄 생성) | **월 80크레딧 (24컷 모션 3개 + 8컷)** |
| `PRICE_TIERS[creator].points` | 월 120크레딧 · 24컷 모션 일괄 생성 | **월 80크레딧 · 24컷 모션 3개 + 8컷** |
| `SKUS['plan-creator-monthly'].credits` | 120 | **80** |
| `SKUS['plan-creator-monthly'].desc` | 월 120크레딧 · 24컷 모션 · … | **월 80크레딧 · 24컷 모션 · …** |
| `EnglishLanding` Creator Pro 카드 | 32 motion cuts · commercial licence … | **80 credits/mo** · 32 motion cuts · commercial licence … |

- 가격(₩19,900)과 판매 단위(1개월 이용권, 자동 갱신 없음)는 그대로다.
- `시즌·테마 크레딧 80팩`(₩22,000, 무기한 80크레딧)과 숫자가 겹치므로, 구독 카드는 `월 80크레딧`처럼 **`월`을 붙여** 무기한 크레딧 팩과 구분한다.
- 80크레딧은 24컷 팩 3개(72크레딧) + 8컷이라 32컷 팩 2개 + 16컷 구성도 가능하다.

## 2. 지급 경로 (코드 변경 없이 이 표를 따라간다)
- **웹 결제(PortOne)**: `SKUS['plan-creator-monthly'].credits` → 주문 생성 시 `order.credits` → 승인 settle에서 `SUBSCRIPTION_GRANT` 원장 기록.
- **월 자동 지급**: `src/lib/session.ts` `grantMonthly()` 가 `PLANS[user.plan].credits` 를 읽는다.
- **구글 플레이 구독**: 상품 자격(`PLAY_SUBSCRIPTION_PRODUCT_ID`)이 `STUDIO` 등급을 열고, 웹과 같은 `PLANS.STUDIO.credits` 를 쓴다. Play Console 상품 설명의 크레딧 숫자는 콘솔에서 따로 고쳐야 한다.
- **이미 지급된 크레딧**: 원장은 append-only라 소급 차감하지 않는다. 다음 월 지급분부터 80이 적용된다.
- 레거시 `PLUS`(월 36크레딧)·레거시 크레딧 SKU 는 이번 변경과 무관하다.

## 3. 검증
- `scripts/test-paywall-unlock.ts` 에 회귀 검사를 추가: `SKUS['plan-creator-monthly'].credits === 80` · `PLANS.STUDIO.credits === 80` · 요금제 카드 문구에 `80크레딧` 포함.
- `npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build` 통과.
- 배포 후 실서버 `https://emotihak.com/pricing` 에서 Creator Pro 카드가 `월 80크레딧`으로 보이는지 확인.

## 4. 되돌리는 방법
`src/lib/pricing.ts` 의 `credits` 두 곳과 문구 세 곳만 120으로 되돌리면 즉시 원복된다(마이그레이션·DB 변경 없음).
