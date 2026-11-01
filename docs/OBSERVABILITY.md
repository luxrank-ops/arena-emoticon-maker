# 관측 · 분석 연동 가이드 (Sentry + PostHog)

Step 3 에서 만든 **자체 로그/에러 수집/리포트** 위에, 이제 **Sentry(에러·성능)** 와 **PostHog(프로덕트 분석)** 를
실제 SDK 로 연결했습니다. **키를 넣지 않으면 전부 no-op** 이므로 로컬·CI·프리뷰에서 아무 것도 깨지지 않습니다.

---

## 1. 켜는 방법 (3분)

### Sentry
```bash
# .env.local / Vercel Environment Variables
SENTRY_DSN=https://<public-key>@o<org>.ingest.sentry.io/<project-id>
NEXT_PUBLIC_SENTRY_DSN=$SENTRY_DSN          # 브라우저 에러도 수집하려면 동일 값
NEXT_PUBLIC_SENTRY_ENV=production            # 선택 (없으면 VERCEL_ENV/NODE_ENV)
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05   # 선택 (기본 5%)

# 소스맵 업로드까지 원할 때만 (없으면 업로드 생략)
SENTRY_ORG=luxrank-ops
SENTRY_PROJECT=arena-emoticon-maker
SENTRY_AUTH_TOKEN=sntrys_...
```

### PostHog
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # EU 리전이면 eu.i.posthog.com
POSTHOG_KEY=phc_...                                  # 서버 이벤트(결제·팩 생성)용, 선택
POSTHOG_HOST=https://us.i.posthog.com
```

> **확인**: 키를 넣고 `npm run build && npm run start` 후
> - Sentry: `/api/health?boom=1` 같은 강제 오류(또는 존재하지 않는 팩 조회) 후 Issues 확인
> - PostHog: `/studio/upload` 에서 사진 분석 → `photo_analyzed` 이벤트 확인

---

## 2. 붙은 지점

| 레이어 | 파일 | 동작 |
| --- | --- | --- |
| 서버 초기화 | `instrumentation.ts` → `sentry.server.config.ts` | Node 런타임에서 `Sentry.init` |
| 엣지 초기화 | `instrumentation.ts` → `sentry.edge.config.ts` | 미들웨어/엣지 런타임 |
| 브라우저 초기화 | `sentry.client.config.ts` + `next.config.js`(`withSentryConfig`) | 클라이언트 에러 수집 |
| 공통 정책 | `sentry.shared.ts` | DSN 없으면 `enabled:false`, **민감정보 스크럽**, 샘플링 |
| API 에러 | `src/lib/api.ts` → `src/lib/observability.ts` → `Sentry.captureException` | 태그=`scope`, fingerprint=스코프+메시지 |
| 렌더 에러 | `src/app/global-error.tsx` | 전역 에러 바운더리 → Sentry |
| 페이지뷰 | `src/components/analytics/AnalyticsProvider.tsx` | App Router 라우트 변경마다 `$pageview` |
| 퍼널(브라우저) | `src/lib/analytics.ts` | `photo_analyzed` · `sheet_created` · `sheet_failed` · `export_sticker` |
| 퍼널(서버) | `src/lib/analytics-server.ts` | `order_paid` · `pack_created` (광고 차단기 영향 없음) |

---

## 3. 개인정보·컴플라이언스 설계

이 서비스는 **얼굴 사진**을 다루므로 분석 도구를 "기본값 수집" 으로 두지 않았습니다.

- **원본 이미지·대사·프롬프트는 전송 금지**: `sentry.shared.ts` 의 스크럽 훅이 `photo|image|line|text|token|address|phone` 키를
  `[filtered]` 로 치환하고, 문자열은 120자로 자릅니다. `sendDefaultPii: false`, `event.user` 는 **내부 userId 만** 유지.
- **세션 리플레이·프로파일링 OFF**: 얼굴이 화면에 남는 서비스 특성상 과수집 리스크가 큽니다.
- **PostHog 쿠키 미사용**: `persistence: 'memory'` + `autocapture: false` + `mask_all_text: true`.
  브라우저 저장소에 식별자를 남기지 않으므로 **사전 동의 전에도 국내법상 안전한 범위**에서 동작합니다.
  (향후 쿠키 기반 리타게팅을 도입하려면 별도 동의 배너가 필요합니다 — `docs/COMPLIANCE.md` 참조)
- **이벤트 화이트리스트**: `track()` 은 문자열 60자·숫자·불리언만 통과시켜 자유 텍스트 유출을 구조적으로 차단합니다.

---

## 4. 무료 쿼터 가드레일

| 항목 | 설정 | 이유 |
| --- | --- | --- |
| Sentry traces | `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05` | 성능 트랜잭션 5% 샘플링 |
| Sentry replays | `0` | 용량 폭증 방지 |
| PostHog autocapture | off | 이벤트 수 폭주·PII 유출 동시 방지 |
| 서버 이벤트 | 결제·팩 생성만 | 고가치 이벤트만 `flush()` 동기 전송 |

---

## 5. 장애 시 폴백

- DSN/KEY 미설정 → SDK `enabled:false` (또는 `if (!KEY) return`) → **기존 구조화 로그 + `/admin` 에러 카드**가 그대로 동작.
- Sentry 전송 실패 → `try/catch` 로 삼켜 **요청은 정상 처리**.
- PostHog 전송 실패 → `flush()` 를 `try/catch` 로 감싸 결제 흐름을 막지 않음(`void captureServer(...)`).
