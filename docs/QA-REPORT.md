# QA 리포트 — EmotiMe v0.2.0 실작동 점검

> 점검일: 2026-10-31 (KST) · 대상 커밋: `main` (5dae830) 기반 · 담당: 🔄 DevOps + 🛠️ Lead Developer
> 결론: **앱은 실제로 동작한다.** 전 플로우(얼굴→시트→팩→편집→답장→브리핑→결제→굿즈→운영콘솔)를
> 실행 중인 프로덕션 빌드에 실제 요청을 보내 검증했고, 자동 스모크 **36/36 통과**.
> 점검 중 발견한 결함 7건은 **모두 수정 완료**(같은 브랜치), 남은 리스크 6건은 아래에 정리했다.

---

## 1. 검증 방법

| # | 방법 | 대상 |
| --- | --- | --- |
| 1 | `tsc --noEmit` | 타입 안전성 (strict) |
| 2 | `next build` (production) | 빌드 · 정적 생성 24페이지 |
| 3 | `next start` + `scripts/smoke.mjs` | 실행 중 서버에 대한 E2E 36케이스 |
| 4 | 수동 API 시나리오 (curl, 쿠키 세션 2개) | 권한·멱등성·동시성·크로스유저 격리 |
| 5 | 서버 로그 실시간 관찰 | 런타임 예외 · 누수 |
| 6 | 렌더러 단독 렌더 (resvg → PNG 640컷 조합) | 12감정 · 6화풍 · 9소품 · 7배경 · 경계값 |
| 7 | 온디바이스 얼굴 분석 함수 단독 실행 (napi canvas로 8종 이미지) | 검출 · 품질 경고 · 팔레트 추출 |

환경: Node 22.22 / Next 14.2.35 / DEMO_MODE(키 없음, 절차적 렌더러 + mock 결제) / 데이터 `.data/store.json` 초기화 후 시작

---

## 2. 기능별 점검 결과

| 기능 | 경로 | 확인 내용 | 결과 |
| --- | --- | --- | --- |
| 랜딩 | `/` | 200 · 이모티콘 13개 SSR · 런타임 에러 0 | ✅ |
| 만들기 1단계 | `/studio/upload` | 업로드 UI · 동의 3종 체크 전 버튼 비활성 | ✅ |
| 얼굴 분석(온디바이스) | `analyzeSelfie()` | 정상 셀카/어두운 피부/편중/흐림/풍경/어두운 사진/백지 8종 | ✅ |
| 시트 생성 | `POST /api/sheets` | 시안 3개 · 무료 플랜은 스타일 2종 제한(402) | ✅ |
| 시트 선택 | `POST /api/sheets/:id/choose` | A/B/C 선택 · 미선택 상태 팩 생성 차단(404) | ✅ |
| 팩 생성·크레딧 | `POST /api/packs` | 12/24컷 · 크레딧 차감 · 잔액 부족 402 · **동시 2건 중 1건만 성공** | ✅ |
| 생성 진행률 SSE | `/api/packs/:id/stream` | frame.ready → job.done, 11→12 진행 확인 | ✅ (결함 1건 수정) |
| 팩 뷰어 | `/studio/pack/:id` | 12컷 렌더 · 진행률 바 · ZIP/편집 링크 | ✅ |
| 편집기 | `/editor/:packId/:frameId` | 대사/감정선/표정/소품/배경 PATCH 저장 · 34자 초과 422 | ✅ |
| 톡 답장 | `/reply` | 감정·의도 판독 · 후보 3개 중복 0 · 6개 시나리오 | ✅ (결함 1건 수정) |
| 오늘의 브리핑 | `/brief` | 8컷 중복 0 · KST 요일/시간대 · Free 잠금 배너 | ✅ (결함 2건 수정) |
| 결제 | `/pricing` → `/checkout/:id` → `confirm` | 서버 금액 산정 · 위변조 409 · 동의 누락 422 · 재확인 멱등 | ✅ |
| 크레딧 원장 | `/billing` | 7개 사용자 전원 `credits == Σledger` 일치 | ✅ |
| 굿즈 주문 | `/goods` → `POST /api/goods/orders` | 내 팩 컷만 주문(타인 컷 403) · 플랜 할인 반영 | ✅ |
| 운영 콘솔 | `/admin` · `/api/admin/*` | 비관리자 잠금 · 오답 코드 401 · 로그인 후 매출/원가/플랜 노출 | ✅ |
| 정책 페이지 | `/terms` `/privacy` `/refund` `/support` | 200 · 내부 링크 전부 200 | ✅ |
| 404/가드 | `dev/reset`(prod 403) · 존재하지 않는 팩/시트/주문 404 | — | ✅ |

스모크 36케이스: 정적 11 · 헬스 1 · 생성 플로우 8 · 추천 5 · 결제 3 · 굿즈 1 · 브리핑 3 · 입력검증 3 · 권한 1

---

## 3. 발견 → 수정한 결함 (7건)

### ① SSE 진행률 스트림이 연결 종료 후에도 무한 루프 (치명)
`src/app/api/packs/[id]/stream/route.ts`
- 증상: 브라우저 탭을 닫거나 새로고침하면 서버 로그에
  `TypeError [ERR_INVALID_STATE]: Controller is already closed` 가 **700ms마다 영구히** 쌓였다.
  `controller.enqueue` 예외가 `catch` → `send()` 재호출로 이어져 `clearInterval` 에 도달하지 못했고,
  클라이언트당 인터벌이 계속 살아남아 CPU/로그를 갉아먹었다(팩 1개·탭 5개면 초당 7회).
- 수정: `req.signal` abort + `cancel()` + enqueue try/catch 에서 타이머를 확실히 정리. 첫 tick 이후에만 인터벌 등록.
- 검증: 연결을 2회 강제로 끊은 뒤 4초 대기 → 로그 무오염, 정상 완료 시 `job.done` 수신 유지.

### ② 오늘의 브리핑이 매 요청 다시 셔플 → 같은 컷 중복
`src/app/api/brief/route.ts`
- 증상: 저장된 브리핑 항목을 복원할 때 `planBrief()` 를 새로 실행해 템플릿을 다시 찾았다.
  셔플이 매번 달라 같은 템플릿이 2번 나오거나 다른 컷이 섞일 수 있었다.
- 수정: `TEMPLATES_BY_ID` 로 항목의 템플릿을 그대로 복원. → 8컷 중복 0 보장(스모크로 고정).

### ③ 서버가 UTC 로 돌면 브리핑 시간대·날짜가 틀림
`src/lib/time.ts`(신규) · `engine.ts` · `api/brief` · `brief`/`billing`/`sheet`/`PackViewer`/`FrameEditor`
- 증상: `getHours()`/`getDay()`/`toLocaleDateString('ko-KR')` 를 서버에서 그대로 사용.
  UTC 10:44(= KST 19:44)에 브리핑이 **"토요일 아침"** 으로 나왔다. 날짜 표시도 브라우저/서버 ICU 차이로
  hydration 불일치 위험이 있었다.
- 수정: KST 기준 시각 분해 유틸(`kstParts`/`kstHour`/`kstDateKey`/`formatKst*`)을 만들어 전 지점 교체.
  표시 문자열은 로케일 데이터에 의존하지 않고 직접 조립하고, 금액 콤마는 `en-US` 로 고정.
- 검증: 동일 시각에 "토요일 저녁 — 오늘 쓸 8컷" · 스모크에 KST 요일 일치 케이스 추가.

### ④ 긴 대사가 말풍선 밖으로 삐져나감 (내보내기 품질)
`src/lib/art/sticker.ts` `renderLine()`
- 증상: 22자 초과 대사에서 밴드 폭(`chars × size × 1.06`)이 텍스트보다 좁아 글자가 판 밖으로 넘쳤고,
  34자에서는 밴드가 1024px 를 넘어 잘렸다. (한글 글리프는 1em, 숫자·영문은 0.5em 이라 추정식이 부정확)
- 수정: 문자 종류별 폭 추정 → 밴드 폭 상한(940px) → 넘칠 때만 `textLength` 로 강제 맞춤.
- 검증: 34자/빈 대사/감정강도 0·100/안경/다크배경 렌더를 PNG로 확인(말풍선 내부 정렬 유지, 빈 대사는 밴드 미표시).

### ⑤ 슬픔 대화에 "배고파아" 추천 (추천 정확도)
`src/lib/recommend/engine.ts`
- 증상: `emotion === 'sad'` 로만 후보를 골라, 카탈로그 유일의 sad 템플릿인 `t-hungry`(배고파아)가
  "오늘 야근 확정… ㅠㅠ" / "미안 늦었어 ㅠㅠ" 의 1순위로 나왔다.
- 수정: 감정별 우선 템플릿 `MOOD_PREFERRED` 매핑 도입 + 풀 중복 제거.
- 검증: 슬픔 → `ㅠㅠ / 안아줘 / 할 수 있어!`, 분노 → `킹받네 / 왜 그러는데 / 흥`, 설렘 → `사랑해 ♥ / 보고싶어 / 굿굿`.

### ⑥ Free 플랜인데 톡 답장 PNG에 워터마크가 없음 (수익 정책 불일치)
`src/components/reply/ReplyStudio.tsx` · `src/app/reply/page.tsx`
- 증상: 팩/편집기 내보내기는 `watermark` 를 반영하지만 답장 내보내기는 `watermark: false` 하드코딩.
- 수정: 서버에서 `PLANS[plan].watermark` 를 내려주도록 prop 추가.

### ⑦ 구형 WebView에서 워터마크 그리기 실패 위험 + ZIP 안내문의 규격 불일치
`src/lib/export.ts`
- 증상: `ctx.roundRect` 는 Safari 16.4+ / Chrome 99+ 전용 → 구형 앱인토스 WebView 에서 내보내기 예외.
  또한 ZIP 안내문은 "360px 규격"이라고 썼지만 실제 PNG 는 720px 이었다.
- 수정: `arcTo` 폴백 추가, ZIP 은 카카오 제안 규격인 **360×360** 으로 내보내고 안내문에 실제 px/컷 수를 기록.

---

## 4. 남은 리스크 · 권고 (미수정, 판단 필요)

| 우선 | 항목 | 내용 · 권고 |
| --- | --- | --- |
| P1 | 브라우저 클릭 플로우 미검증 | 이 샌드박스에는 헤드리스 브라우저가 없어 **Canvas/GIF/JSZip 다운로드는 코드 리뷰 + 서버 렌더 검증**까지만 했다. 실기기에서 `/editor` PNG·GIF, `/studio/pack` ZIP, 사진 업로드 한 번씩 확인 필요 |
| P1 | 얼굴 파기 미구현 | `purgedAt`(24h) 은 **예약 기록만** 남고 실제 삭제 작업이 없다. 저장 데이터에 원본은 없지만 정책 문구와 동작을 맞추려면 크론/배치가 필요 (S6) |
| P1 | 카톡 패키저 미구현 | 랜딩 "기능 04"와 Studio 플랜이 "규격 자동 검증"을 약속하지만 2MB·24종 검증·리사이즈 로직은 없다(AGENTS.md 에도 S6 로 표기). 심사/마케팅 문구와 코드 정합 필요 |
| P2 | 요청 제한 없음 | `/api/reply`·`/api/face/analyze`·`/api/checkout` 에 레이트리밋이 없다. 데모 원가는 0이지만 실서비스에서는 남용/스팸 경로 |
| P2 | 기본 운영자 코드 | `ADMIN_PASSCODE` 미설정 시 `emotime-demo` 로 동작. 운영 배포에서는 env 필수화 + 미설정 시 로그인 차단 권장 |
| P3 | 파일 저장소 단일 프로세스 | `.data/store.json` 은 프로세스 내 직렬화만 보장. 멀티 인스턴스 배포 시 원장 정합성이 깨질 수 있어 Prisma 어댑터 전까지는 단일 인스턴스 전제 |
| P3 | 사과/축하 의도 가중치 | "미안 늦었어 ㅠㅠ" → 위로 컷, "생일인데 저녁 먹을래" → 식사 컷이 나온다. 룰 기반 한계로, `is-it-okay` 계열 템플릿 추가와 의도 가중치 조정을 권장 |

---

## 5. 재현 방법

```bash
npm install
cp .env.example .env.local
npm run build && npm run start
BASE_URL=http://localhost:3000 node scripts/smoke.mjs   # 36 passed
```

수동 확인 체크리스트(브라우저)

1. `/studio/upload` → 셀카 업로드 → 동의 3개 체크 → 시트 → 시안 선택 → 12컷 생성
2. 생성 중 탭을 닫고 다시 `/studio/pack/:id` → 진행률 이어서 완료되는지
3. `/editor/...` → 대사 입력(길게/짧게) → PNG · GIF 내려받기
4. `/reply` → "미안 늦었어 ㅠㅠ" → 위로 컷이 1순위인지 → 대사 복사 · PNG
5. `/pricing` → 크레딧 결제 → `/billing` 에서 원장 반영 확인
6. `/admin` → `emotime-demo` 로그인 → 매출/원가 카드 확인
