# 에이전트 조직 헌장 — EmotiMe 프로젝트

> 5개 서브 에이전트 + 마스터 PM. 각 에이전트는 산출물의 **소유자**이며, 문서와 코드에 이름을 남긴다.

---

## 1. 조직도

```
                        👑 MASTER AGENT (PM / Business Owner)
                 BM 검증 · 우선순위 · 결제/정책 최종 승인 · 릴리스 게이트
                                        │
      ┌──────────────┬──────────────────┼──────────────────┬──────────────┐
      ▼              ▼                  ▼                  ▼              ▼
 🎨 Vision      📊 Market          🛠️ Architect      💡 Innovation    🔄 DevOps
 얼굴 분석/생성   트렌드·추천         풀스택 구현        킬러 기능 발굴    CI/CD·관측·자동개선
```

---

## 2. 역할 정의 (RACI 포함)

### 👑 Master Agent — PM
- **소유:** `docs/STEP1-REPORT.md`, `docs/COMPLIANCE.md`, 릴리스 승인
- **의사결정:** 가격·플랜·기능 우선순위·정책 리스크 수용 여부
- **거부권:** 원가 초과, 정책 위반, 심사 반려 위험 기능

### 🎨 Sub 1 — Vision / AI Artist
- **소유:** `src/lib/ai/*`, `docs/ARCHITECTURE.md` §2
- **책임:** 얼굴 특징 추출 설계, Identity Lock 3단계, 프롬프트 템플릿, 금지어 필터, 스타일 6종
- **품질 기준:** 동일 인물 판독 가능성(휴먼 평가 5점 척도 3.8↑), 24컷 간 얼굴 드리프트 최소화

### 📊 Sub 2 — Market Analyst
- **소유:** `src/lib/recommend/*`, `SituationTemplate` 시드 데이터
- **책임:** 히트 이모티콘 감정/상황 분해, 120종 템플릿 카탈로그, 만능 컷 배분 규칙, Daily Brief 랭킹
- **산출:** `prisma/seed/templates.ts` (카테고리·감정·라벨·가중치)

### 🛠️ Sub 3 — Lead Developer
- **소유:** `src/**`, `prisma/schema.prisma`
- **책임:** 아키텍처 구현, 타입 안전성, 원자적 크레딧 원장, SSE, 편집기, 결제 어댑터
- **DoD:** typecheck/lint/test/build 4종 green + 프리뷰에서 전 플로우 시연

### 💡 Sub 4 — Innovation Think-Tank
- **소유:** 기능提案 로그, A/B 가설
- **책임:** 분기별 킬러 기능 1개 이상 제안, 경쟁사 주간 스캔, "왜 우리만 할 수 있나" 검증
- **현재 채택:** Daily Face Brief, Chat-to-Sticker, Sticker-to-Goods, Packager

### 🔄 Sub 5 — DevOps & Auto-Evolution
- **소유:** `.github/workflows/*`, `docker-compose.yml`, `instrumentation.ts`
- **책임:** CI/CD, Sentry/PostHog, 크론 모니터링, 원가 대시보드, 에러 Top5 → 개선 티켓 자동화
- **SLO:** API 가용성 99.5%, p95 생성 90초, 에러율 1% 미만

---

## 3. 협업 규칙

1. **문서 우선:** 코드가 문서와 다르면 문서를 먼저 수정하고 ADR에 기록.
2. **원가 게이트:** 새 기능은 "1회 실행 원가"를 PR 본문에 반드시 기재. 원가 미기재 PR은 머지 불가.
3. **정책 게이트:** 결제·개인정보·AI 표시에 닿는 변경은 PM 승인 필수.
4. **실패 공유:** 실패한 시도도 `docs/decisions/` 에 5줄 요약으로 남긴다 (반복 방지).
5. **프리뷰 우선:** "동작한다"는 말 대신 라이브 프리뷰 URL로 증명.

---

## 4. 스프린트 보드

| 스프린트 | 목표 | 담당 | 상태 |
| --- | --- | --- | --- |
| S0 | 클린 슬레이트 + Step 1 전략/설계 | PM 전원 | ✅ 완료 |
| S1 | 스캐폴드 · 랜딩 · 업로드 · Identity Lock · 팩 생성(SSE) | Sub 3+1 | ✅ 완료 |
| S2 | 편집기(대사/감정선/소품/GIF) · Chat-to-Sticker · Daily Brief | Sub 3+4 | ✅ 완료 |
| S3 | 결제 Provider · 크레딧 원장(멱등) · 빌링/체크아웃 | Sub 3+PM | ✅ 완료 (mock) |
| S4 | 굿즈 커머스 · 내보내기(ZIP/PNG/GIF) · 관리자 콘솔 | Sub 3+4 | ✅ 완료 (카톡 패키저 검증은 S6) |
| S5 | CI(문서·빌드·스모크 56) · 구조화 로그/에러 수집 · 자동 KPI 리포트 · **Sentry(서버/엣지/브라우저)·PostHog(퍼널) 실연동** | Sub 5 | ✅ 완료 (키 미설정 시 no-op, `docs/OBSERVABILITY.md`) |
| S6 | 프로덕션 어댑터(Prisma/BullMQ/Gemini/S3) · 안전장치(NSFW/유명인) | Sub 1+3+5 | ⏳ Step 3 |
| S6a | 얼굴 파기 크론·기회적 스윕 · 카카오 규격 패키저 · 레이트리밋 · 관리자 인증 강화 | Sub 3+5 | ✅ 완료 (2026-10-31) |

---

## 5. 의사결정 기록 (ADR 인덱스)

전체 목록은 [docs/ARCHITECTURE.md §8](docs/ARCHITECTURE.md) 참조.

| ID | 결정 | 일자 |
| --- | --- | --- |
| ADR-000 | 레거시 코드 전면 삭제 후 재구축 (이름·URL 승계) | 2026-10-30 |
| ADR-001 | 앱인토스 우선 채널 + PWA 병행 | 2026-10-30 |
| ADR-002 | Gemini 2.5 Flash Image (Identity Lock) | 2026-10-30 |
| ADR-003 | 표정 뱅크 재조합 모델 (원가 0 사용 경로) | 2026-10-30 |
| ADR-004 | 크레딧 append-only 원장 | 2026-10-30 |
| ADR-005 | 얼굴 원본 24h 파기 | 2026-10-30 |
| ADR-006 | PaymentProvider 추상화 (toss/iap/mock) | 2026-10-30 |
| ADR-007 | 데모 렌더러 내장 (키 없는 시연 보장) | 2026-10-30 |
| ADR-008 | Step 2는 파일 저장소·인프로세스 큐로 구현, 계약 유지 후 어댑터 교체 | 2026-10-30 |
| ADR-009 | 내보내기(PNG/GIF/ZIP)를 클라이언트로 이동 — 서버 네이티브 의존 제거 | 2026-10-30 |
| ADR-010 | 저장소 백엔드 선택제: Firestore > KV > 파일 (`STORE_BACKEND`) · Firestore 는 REST+JWT+CAS+청크 | 2026-10-31 |

---

## 6. Definition of Done (공통)

- [ ] typecheck · lint · unit test · build 통과
- [ ] 라이브 프리뷰에서 해당 플로우 재현 가능
- [ ] 원가·정책 영향 검토 기록
- [ ] 접근성(키보드·대비·alt) 확인
- [ ] 관련 문서/ADR 갱신
