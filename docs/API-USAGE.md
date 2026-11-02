# API 소모량 · 원가 추적

> "지금까지 생성 API를 몇 번 불렀고, 얼마가 나갔나?"를 한 곳에서 답한다.
> 단가 소스는 [`src/lib/ai/prices.json`](../src/lib/ai/prices.json) 하나뿐이다 (앱·CLI 공용).

---

## 1. 무엇을 세는가

`UsageEvent.type === 'generate'` 이벤트만 **API 호출 1건**으로 센다.
즉 실제 생성 공급자(Gemini / Fal / Replicate)를 부른 경로만 포함한다.

| 경로 | 이벤트 meta | 원가 |
| --- | --- | --- |
| `/api/render` (스튜디오 시트·컷) | `provider`,`model`,`latencyMs`,`costUsd`,`attempts`,`promptTokens`,`outputTokens`,`kind` | 실측/추정 |
| `/api/generate` (단일 표정) | `provider`,`model`,`latencyMs`,`costUsd` | 실측/추정 |
| `/api/generate/batch` (표정 매트릭스) | 위와 동일 + `batch:true` | 실측/추정 |
| `/api/reply`, `/api/brief` | — | **0원** (표정 뱅크 재조합만) |

- **실측**: 공급자 응답에 단가가 있거나 코드가 채운 `costUsd`
- **추정**: `costUsd` 가 없을 때 `prices.json` 의 모델 단가 × 1장
- Gemini 응답에는 금액이 없어 `costUsd` 는 **공시 단가 기준 추정치**다. 토큰 수(`usageMetadata`)는
  이벤트에 남겨두므로, 나중에 실제 단가로 재계산할 수 있다.

---

## 2. 확인 방법 2가지

### ① CLI (전체 기간 · 예산 게이트)

```bash
node scripts/api-usage.mjs                # 요약
node scripts/api-usage.mjs --days 7       # 최근 7일
node scripts/api-usage.mjs --budget 50000 # 예산 초과 시 exit 2 (CI 게이트)
node scripts/api-usage.mjs --json         # 기계 판독용
node scripts/api-usage.mjs --md           # reports/api-usage-YYYY-MM-DD.md
```

출력 예시:

```
생성 API 호출   6회
추정 원가       539원 ($0.385 · 환율 1,400원/USD)
호출당 평균     90원
지연            평균 18.2s · p95 42.0s
집계 기준       실측 2건 · 추정 3건

[모델]
  gemini-3.1-flash-image-preview   3회   164원
  gemini-3-pro-image-preview       2회   375원
```

- 파일 저장소(`.data/store.json`)만 읽는다. **Firestore/KV** 를 쓰는 배포에서는 CLI 대신 ②를 쓴다.
- 저장소가 없으면 "0건"으로 끝난다 (앱을 한 번도 실행하지 않은 상태).

### ② 관리자 콘솔 `/admin`

`API 소모량` 카드에 총 호출·원가·컷당 평균·모델별 표·p95 지연이 표시된다.
`GET /api/admin/metrics` 는 같은 값을 `apiUsage` 로 내려준다 (관리자 세션 필요).

---

## 3. 단가 · 환율 바꾸기

`src/lib/ai/prices.json` 만 수정하면 앱과 CLI가 동시에 반영된다.

```json
{
  "fxKrwPerUsd": 1400,
  "models": { "gemini-3-pro-image-preview": 0.134, "gemini-3.1-flash-image-preview": 0.039 },
  "providers": { "gemini": 0.039, "replicate": 0.0045, "fal": 0.05, "mock": 0 }
}
```

배포 환경에서만 덮어쓰려면:

```bash
FX_KRW_PER_USD=1380
AI_PRICE_USD_JSON='{"models":{"gemini-3-pro-image-preview":0.12}}'
```

---

## 4. 무료 쿼터 · 남용 가드레일

| 장치 | 설정 | 효과 |
| --- | --- | --- |
| 레이트리밋 | `src/lib/ratelimit.ts` — generate 10회/분, batch 5회/분 | 폭주로 인한 과금 폭탄 방지 |
| 초안 무료 | 시트 시안(3안)은 크레딧 미차감, 재생성만 1크레딧 | 무료 사용자 원가 상한 |
| 원가 0 경로 | `reply` · `brief` 는 생성 호출 0회 | DAU가 늘어도 API 원가 불변 |
| 예산 게이트 | `node scripts/api-usage.mjs --budget <원>` | CI/크론에서 초과 감지 (exit 2) |
| Sentry/PostHog | traces 5%, replays 0, autocapture off | 관측 도구 자체 쿼터 보호 (`docs/OBSERVABILITY.md` §4) |

---

## 5. 지금 확인된 원가 리스크

| 항목 | 값 | 의미 |
| --- | --- | --- |
| 문서상 원가 가정 | 컷당 54원 | `docs/QA-REPORT.md` · 옛 `/admin` 카드의 하드코딩 값 |
| 실사 포토 모델 | `gemini-3-pro-image-preview` **약 188원/컷** | 가정치의 3.5배 |
| 캐릭터 모델 | `gemini-3.1-flash-image-preview` **약 55원/컷** | 가정치와 거의 일치 |
| 컷당 상한 | `AI_COST_CAP_KRW=60` | **코드에서 차단하지 않음** — 관리자 콘솔 경고로만 노출 |

→ Plus 9,900원 / 36크레딧 기준, 36컷을 전부 포토 모델로 만들면 **약 6,700원(원가율 68%)**.
가격을 유지하려면 (a) 포토 모델은 크레딧 2~3배 차감, (b) 하루 N컷만 허용, (c) 상한 초과 모델을
기본 스타일에서 제외하는 정책이 필요하다. 계산 근거는 `npm run usage` 로 언제든 재확인할 수 있다.

## 6. 한계

1. **과거 데이터 백필 불가** — 2026-11-02 이전 `render` 이벤트에는 `costUsd`/`model` 이 없어,
   집계 시 `provider: 'gemini'` 기본 단가(0.039)로 추정된다. 정확도가 필요한 구간은 `model` 부터 채울 것.
2. **이벤트 보존 4,000건** — `store.ts` 가 5,000건 초과 시 오래된 이벤트를 버린다. 장기 원가 추이는
   월 1회 `--md` 리포트를 저장소 밖(BI/스프레드시트)에 보관할 것.
3. **원격 저장소 미지원 (CLI)** — Firestore/KV 사용 시 `/admin` 카드 또는 `apiUsage` API로 확인.
4. **재시도 비용** — 429/503 재시도는 실패 응답이라 과금되지 않지만, `attempts` 로 시도 횟수는 남는다.
