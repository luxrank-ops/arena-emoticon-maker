# 이모티미 · EmotiMe

> **내 얼굴로 만드는 3초 이모티콘, 오늘 쓸 답장까지.**
> 셀카 1장 → 캐릭터 시트 → 12/24컷 팩 → 매일 아침 오늘의 답장 추천 → 실물 굿즈

유료 미니앱(앱인토스 · PWA)을 목표로 하는 **개인 사진 기반 이모티콘 제작 서비스**입니다.
레거시 코드(v0.1.0)는 전면 초기화했고, 현재 저장소는 **v0.2.0 동작하는 제품**입니다.

---

## 지금 바로 되는 것

| 기능 | 경로 | 설명 |
| --- | --- | --- |
| 랜딩 | `/` | 시장 근거 · 킬러 기능 4종 · 가격 |
| 만들기 | `/studio/upload` → `/studio/sheet/[id]` → `/studio/pack/[id]` | 온디바이스 얼굴 분석 → 캐릭터 3안 선택 → 12/24컷 생성(SSE 진행률) |
| 편집 | `/editor/[packId]/[frameId]` | 대사 · 감정선 · 표정 · 소품 · 배경 + PNG/GIF 내보내기 |
| 톡 답장 | `/reply` | 대화 붙여넣기 → 감정/의도 판독 → 내 얼굴 답장 3장 (평균 응답 < 2s, 생성 호출 0) |
| 오늘의 브리핑 | `/brief` | 요일·시간대 기반 8컷 자동 큐레이션 (원가 0) |
| 굿즈 | `/goods` | 아크릴·포토카드·머그 주문 (POD 시뮬레이션) |
| 요금제/결제 | `/pricing` → `/checkout/[orderId]` | Plus/Studio/크레딧, 청약철회 동의 · 서버 금액 검증 · 원장 지급 |
| 마이페이지 | `/billing` | 크레딧 원장 · 결제 내역 · 내 팩 |
| 운영 콘솔 | `/admin` | 매출 · 원가 · 플랜 분포 · 최다 사용 컷 (코드 `emotime-demo`) |
| 정책 | `/terms` `/privacy` `/refund` `/support` | PG 심사 대응 문서 |
| 관측 | Sentry · PostHog | 에러 추적 + 퍼널 분석(사진·대사 미전송, 키 없으면 no-op) |

## 빠른 시작

```bash
npm install
cp .env.example .env.local     # 값이 없으면 DEMO_MODE 로 동작 (API 키 불필요)
npm run dev                    # http://localhost:3000
npm run build && npm run start # 프로덕션 빌드
BASE_URL=http://localhost:3000 node scripts/smoke.mjs   # 28 케이스 스모크
node scripts/ops-report.mjs    # KPI 리포트 → reports/ops-YYYY-MM-DD.md
```

- **관측/분석은 키를 넣는 순간 켜집니다.** `SENTRY_DSN`·`NEXT_PUBLIC_POSTHOG_KEY` 가 없으면 SDK 는 no-op 이고,
  기존 구조화 로그 + `/admin` 에러 카드만으로 동작합니다. 연동 지점·개인정보 설계는 [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).

- **API 키 없이 전 플로우가 동작합니다.** 이미지 생성은 절차적 SVG 렌더러가 담당하고, 결제는 Mock Provider가
  실제와 동일한 주문→승인→원장 지급 파이프라인을 수행합니다.
- Gemini/토스로 전환하려면 `.env.local`의 `GEMINI_API_KEY` 또는 `PAYMENT_PROVIDER=toss`를 설정하세요.

## 기술 스택

Next.js 14 (App Router) · React 18 · TypeScript strict · Tailwind CSS · Zod · Zustand
이미지: **절차적 SVG 렌더러**(서버/클라이언트 공용, 0.1초) · 내보내기: Canvas + gifenc + JSZip
데이터: 파일 기반 저장소(`.data/store.json`) — Prisma/Postgres 어댑터로 교체 가능한 인터페이스

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/STEP1-REPORT.md](docs/STEP1-REPORT.md) | 시장 분석 · 4대 킬러 기능 · BM · 아키텍처 · 로드맵 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Identity Lock 파이프라인 · 데이터 모델 · API 계약 · ADR |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | 토스페이먼츠 심사 · 청약철회 · 개인정보 · AI 표시 의무 |
| [docs/STEP2-BUILD-NOTES.md](docs/STEP2-BUILD-NOTES.md) | **구현 결과 · 설계 대비 변경 로그 · 보안 현황** |
| [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | **Sentry · PostHog 실연동** — 붙은 지점 · 개인정보 설계 · 무료 쿼터 가드레일 |
| [AGENTS.md](AGENTS.md) | 5개 서브 에이전트 조직 · 스프린트 보드 |

## 핵심 설계 3원칙

1. **원본 얼굴은 저장하지 않는다** — 분석은 브라우저, 서버에는 팔레트·지표만 (파기 예약 기록).
2. **생성은 비싸고, 조합은 공짜다** — 팩은 1회 생성, 사용(답장·브리핑)은 표정 뱅크 재조합 → 원가 0.
3. **결제 수단은 갈아끼운다** — `PaymentProvider`로 mock / 토스 / IAP 교체, 금액은 항상 서버 산정.

## 면책

생성 결과물은 AI가 만들었습니다. 본인 사진에 한해 사용 가능하며, 타인 합성·비방 목적 사용은 약관으로 금지됩니다.
