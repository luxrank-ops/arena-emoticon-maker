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

## 4. 리스크 · 후속 처리 현황

| 우선 | 항목 | 내용 · 권고 |
| --- | --- | --- |
| P1 | 브라우저 클릭 플로우 미검증 | 이 샌드박스에는 헤드리스 브라우저가 없어 **Canvas/GIF/JSZip 다운로드는 코드 리뷰 + 서버 렌더 검증**까지만 했다. 실기기에서 `/editor` PNG·GIF, `/studio/pack` ZIP, 사진 업로드 한 번씩 확인 필요 |
| ✅ 해결 | 얼굴 파기 | 2차에서 크론 + 기회적 스윕으로 실제 구현 (§5-⑥) |
| ✅ 해결 | 카톡 패키저 | 2차에서 24종·360×360·2MB 검증 + ZIP 패키징 구현 (§5-⑦) |
| ✅ 해결 | 요청 제한·관리자 인증 | 2차에서 레이트리밋 도입, 쿠키 위조 우회 차단, fail-closed (§5-⑤, ⑧) |
| P3 | 파일 저장소 단일 프로세스 | `.data/store.json` 은 프로세스 내 직렬화만 보장. 멀티 인스턴스 배포 시 원장 정합성이 깨질 수 있어 Prisma 어댑터 전까지는 단일 인스턴스 전제 |
| P3 | 사과/축하 의도 가중치 | "미안 늦었어 ㅠㅠ" → 위로 컷, "생일인데 저녁 먹을래" → 식사 컷이 나온다. 룰 기반 한계로, `is-it-okay` 계열 템플릿 추가와 의도 가중치 조정을 권장 |

---

## 5. 2차 후속 조치 (2026-10-31, 커밋 후속)

1차 리포트의 P1/P2 중 **코드로 해결 가능한 항목을 모두 처리**했다. 새 스모크는 **53/53 통과**.

### ⑤ 관리자 세션 위조 차단 (보안 · 치명)
`src/lib/session.ts` · `src/app/api/admin/login/route.ts`
- 증상: 사용자 생성 시 `role: sessionId === 'admin_session' ? 'admin' : 'user'`.
  미들웨어는 **이미 존재하는 쿠키를 그대로 신뢰**하므로, `Cookie: emotime_sid=admin_session` 한 줄로
  누구나 운영 콘솔 권한을 얻을 수 있었다.
- 수정: 관리자 권한은 오직 운영자 코드 검증으로만 부여. `ADMIN_PASSCODE` 미설정 + production → **503 fail-closed**
  (기본값 `emotime-demo` 는 로컬/데모에서만), 비교는 `timingSafeEqual`, 로그인 시도 5회/분 제한.
- 검증: 위조 쿠키로 `/api/admin/metrics` → `locked: true` (스모크 고정).

### ⑥ 얼굴 파기 스케줄러 (P1 · 정책)
`src/lib/purge.ts` · `/api/cron/purge` · `/api/admin/purge` · `vercel.json`(일 1회 크론) · `src/lib/session.ts`
- 증상: `purgedAt` 은 **예약 기록만** 있고 실제 삭제가 없어 "24시간 내 파기" 고지가 사실과 달랐다.
- 구현: 예약 시각 도달분 삭제 + `face_purged` 이벤트(파기 시각·대상·사유) 기록.
  크론이 없는 환경을 위해 **요청 처리 중 5분 1회 기회적 스윕**(`FACE_PURGE_SWEEP_MS`).
  운영 콘솔에 파기 현황/예정 확인/즉시 실행 패널 추가.
- **팩 렌더 유지 설계:** 파기하면 팩이 안 그려지는 문제가 생기므로, 팩 생성 시 `Pack.identity`
  (팔레트+시그니처+화풍)를 고정한다. 파기 후에도 모든 팩·굿즈·답장·브리핑이 같은 얼굴로 계속 렌더된다.
- 검증(포트 3001, `FACE_PURGE_HOURS=0`): 예약 파기 1건 실행 → 이벤트 `reason: scheduled` 기록 →
  시트 재생성 404 · 팩 조회 200(스냅샷) · 시트 페이지는 404 대신 "얼굴 정보가 파기되었습니다" 안내.

### ⑦ 카카오 규격 패키저 (P1 · BM)
`src/lib/packager.ts` · `/api/packs/[id]/kakao` · `src/lib/export.ts` · `PackViewer`
- 검증: **24종 · 360×360px · PNG · 개당 2MB 이하 · 투명 배경 · 대사 길이/중복**.
  서버는 팩 데이터로 판정, 클라이언트는 렌더 결과의 실제 바이트/픽셀을 재검사해 `validation.json` 동봉.
- 내보내기: 배경을 투명으로 다시 그려 `kakao/01.png…24.png` + 검증 리포트 ZIP (Studio 플랜).
- 검증: 24컷 팩 → 6개 체크 전부 pass, 23개/2MB 초과 → fail. 실제 PNG 24장(360px) = 13.8~19.3KB로 한도 내.

### ⑧ 레이트리밋 (P2 · 남용 방지)
`src/lib/ratelimit.ts` → reply 30/분, 얼굴분석 15, 시트 20, 팩 10, 결제 10, 굿즈 10, 브리핑 40, 관리자 로그인 5.
- 429 + `Retry-After`/`X-RateLimit-*` 헤더. 31번째 요청에서 429 확인. 인메모리(프로세스 단위)이며
  멀티 인스턴스에서는 Redis 어댑터로 교체 필요(ADR-008 과 동일 전략).

### ⑨ 운영자 코드 미설정 환경의 fail-closed / CI 스모크
- 운영에서 `ADMIN_PASSCODE` 가 비어 있으면 **입력값과 무관하게 503 `ADMIN_DISABLED`** 로 응답하도록
  검사 순서를 입력 검증 **앞**으로 옮겼다(빈 코드 422 → 503). `/admin` 화면도 `데모 코드` 대신
  "로그인이 차단되었습니다" 안내를 노출한다.
- 그동안 스모크 §13 은 관리자 로그인을 전제로 해서 CI(코드 미주입)에서 실패했다.
  → CI 워크플로에서 `ADMIN_PASSCODE`/`CRON_SECRET` 을 주입하고, 스모크는 503 을 만나면
  fail-closed 자체를 검증하고 파기 시나리오만 건너뛰도록 수정(`46 passed, 0 failed`).
  정상 주입 시 `53 passed, 0 failed`.

### ⑩ 배포 게이트: Vercel Hobby 크론 제한
- 1차 구현은 `vercel.json` 에 매시 크론(`0 * * * *`)을 넣었지만, **Hobby 플랜은 1일 1회만 허용**해
  배포가 `ERROR` 로 막혔다(`Hobby accounts are limited to daily cron jobs`).
- 수정: 크론은 일 1회(03:00 KST)로 내리고, **24h 이내 파기 보장은 요청 중 5분 1회 기회적 스윕**이 담당.
  Pro 플랜에서는 매시로 올리는 것을 권장(주석·README 에 명시).

### ⑪ 스모크 하네스 버그
`scripts/smoke.mjs` — `Set-Cookie` 를 단일 변수로 덮어써 로그인 직후 세션이 사라지던 문제(쿠키 병 도입).
이 버그 때문에 1차에서는 관리자 로그인 이후 시나리오를 검증할 수 없었다.

---

### ⑬ 운영 배포 후 라이브 재점검 (수정 반영 확인)
- `/api/health` → `{"ok":true,"store":{"dir":"/tmp/.data","mode":"ephemeral","lastError":null}}` (프로덕션)
- `/`, `/pricing`, `/reply`, `/brief`, `/admin` 모두 정상 렌더로 복구 확인.
- 부수 결함: 운영에 `ADMIN_PASSCODE` 를 설정하자 `/admin` 이 **"데모 코드: emotime-demo"** 를 그대로 노출.
  `demoHint` 조건이 "운영이 아니거나 코드가 설정됨"이라, 실제 코드가 바뀌어도 데모 값을 안내했다.
  → 실제 설정값이 `emotime-demo` 일 때만 안내하도록 수정. (운영 코드 사용 시 안내 숨김 확인)

### ⑫ 프로덕션(서버리스) 저장소 폴백 — 배포는 성공, 앱은 미동작 (P0)
- 머지 후 실제 도메인(`https://arena-emoticon-maker.vercel.app`)을 열어보니 `/`, `/pricing` 모두
  에러 화면("잠깐 문제가 생겼어요")이 떴다. Vercel 배포 상태는 `READY` 였다.
- 원인: `src/lib/store.ts` 의 저장 경로 기본값이 `process.cwd()/.data` 인데,
  **Vercel 런타임 파일시스템은 `/tmp` 외 읽기 전용**이다. `DATA_DIR` 도 설정돼 있지 않았다.
  쓰기 실패가 페이지 렌더까지 전파돼 사이트 전체가 죽었다.
- 로컬 재현: `DATA_DIR` 를 쓸 수 없는 경로로 두고 프로덕션 빌드를 띄우면 `/`, `/api/health` 가
  **응답 없이 멈춘다**(타임아웃). 로컬·CI 는 쓰기 가능한 cwd 를 쓰므로 그동안 초록불이었다.
- 수정:
  1. 저장 위치를 후보 순서로 해석 — `DATA_DIR` → (Vercel) `/tmp/.data` → `cwd/.data` → `os.tmpdir()`.
     최초 1회 mkdir+write 프로브로 **실제 쓰기 가능 여부**를 확인하고 결과를 캐시.
  2. 프로브에 500ms 상한 — `/proc` 처럼 예외 대신 **멈추는** 경로에서도 요청이 걸리지 않게.
  3. `save()` 는 더 이상 던지지 않는다. 전부 실패하면 프로세스 메모리로 서비스(`mode:'memory'`)하고
     페이지는 계속 뜬다. 실패는 `lastError` 로 표면화.
  4. `/api/health` 에 `store: { dir, mode, lastError }` 노출 → 배포가 휘발성으로 도는지 즉시 확인.
  5. 스모크 §14 추가(모드 계약 · 경로 확보). 56 케이스.
- 검증: `DATA_DIR=/proc/ro-data VERCEL=1` 로 띄워 `store.dir=/tmp/.data`, `mode=ephemeral`,
  `/ /pricing /studio/upload /admin` 모두 200 (`before: 응답 없음`).
- 남은 과제: `/tmp` 는 **인스턴스 로컬 · 콜드스타트 시 소실** → 세션·주문이 인스턴스 간 공유되지 않는다.
  실서비스 전 Vercel KV/Postgres 어댑터로 교체 필요(`docs/ARCHITECTURE.md` §3).
- 운영 환경변수도 함께 등록: `ADMIN_PASSCODE`(없으면 `/admin` 503), `CRON_SECRET`(없으면 크론 거부).

## 6. 재현 방법

```bash
npm install
cp .env.example .env.local
npm run build && npm run start
BASE_URL=http://localhost:3000 node scripts/smoke.mjs   # 56 passed
# ADMIN_PASSCODE 를 비우고 띄우면 관리자 구간은 fail-closed 검증만 수행 → 46 passed
```

수동 확인 체크리스트(브라우저)

1. `/studio/upload` → 셀카 업로드 → 동의 3개 체크 → 시트 → 시안 선택 → 12컷 생성
2. 생성 중 탭을 닫고 다시 `/studio/pack/:id` → 진행률 이어서 완료되는지
3. `/editor/...` → 대사 입력(길게/짧게) → PNG · GIF 내려받기
4. `/reply` → "미안 늦었어 ㅠㅠ" → 위로 컷이 1순위인지 → 대사 복사 · PNG
5. `/pricing` → 크레딧 결제 → `/billing` 에서 원장 반영 확인
6. `/admin` → `emotime-demo` 로그인 → 매출/원가 카드 + **얼굴 파기 패널**(예정 확인/즉시 실행) 확인
7. Studio 구독 → 24컷 팩 → 팩 페이지의 **카카오 규격 패키저** 패널에서 6개 검사 통과 → ZIP 내려받기
8. `/editor` 에서 긴 대사(30자) 입력 → 말풍선 안에 들어오는지 확인
