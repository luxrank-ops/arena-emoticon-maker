# 아키텍처 설계서 — EmotiMe

> Step 2 구현의 단일 기준 문서(Single Source of Truth). 코드가 이 문서를 벗어나면 문서를 먼저 고친다.

---

## 1. 스택

| 레이어 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 15 (App Router) + React 19 + TypeScript strict | 앱인토스 WebView·PWA·SSR 랜딩을 한 코드베이스로 |
| 스타일 | Tailwind CSS + 자체 디자인 토큰 | 미니앱 특유의 좁은 뷰포트 대응 |
| 상태 | Zustand(편집기) + TanStack Query(서버 상태) | 편집기 히스토리/undo에 Zustand가 유리 |
| 캔버스 | Konva + react-konva | 레이어·텍스트·소품 드래그/회전 |
| 얼굴 분석 | MediaPipe FaceLandmarker (WASM, 클라이언트) | 원본을 서버로 보내기 전 품질 컷, 랜드마크는 온디바이스 |
| DB | PostgreSQL + Prisma | 원장(ledger) 트랜잭션 정합성 |
| 큐 | BullMQ + Redis | 24컷 배치 생성, 재시도, 동시성 제어 |
| 저장소 | S3/R2 프리사인드 URL (TTL 15분) | 원본 24h TTL 수명주기 정책 |
| 이미지 후처리 | sharp (정적) + ffmpeg/gifski (GIF) | 360×360, 투명 PNG, 2MB 이하 규격 강제 |
| 결제 | Toss Payments 결제위젯 v2 + 빌링키 | 국내 심사 기준 충족 |
| 관측 | Sentry + PostHog + 구조화 로그(pino) | 퍼널·에러·원가 추적 |
| 테스트 | Vitest(단위) + Playwright(e2e) | 핵심 3경로 회귀 방지 |

---

## 2. 생성 파이프라인 — Identity Lock 3단계

가장 중요한 기술 자산. "같은 얼굴이 24컷 내내 유지되는가"가 제품 품질의 전부.

```
[입력] 셀피 1장
  │  클라이언트: MediaPipe로 얼굴 1개/정면도/해상도/조명/가림 여부 검증
  │  실패 시 즉시 재촬영 안내 (서버 왕복 0)
  ▼
[1단계] FACE PROFILE 추출
  ├ 원본 → 임시 저장 (S3, 24h TTL)
  ├ 랜드마크 요약 벡터(비식별, 128d) + 얼굴 크롭만 유지
  └ 원본 이미지는 파이프라인 종료 후 즉시 삭제 예약
  ▼
[2단계] CHARACTER SHEET 생성 (1회, 사용자가 승인)
  ├ Gemini 2.5 Flash Image: 참조 이미지 + 스타일 프롬프트
  ├ 출력: 정면 / 3·4 측면 / 측면 3컷 (시트)
  └ 사용자 액션: 선택 또는 재생성(무료 2회) ← 품질 편차 리스크의 1차 방어선
  ▼
[3단계] EXPRESSION BANK 생성 (24컷 배치)
  ├ 입력: 승인된 시트 + ExpressionSpec(표정 8종 × 강도 3단계)
  ├ 동시성 3, 실패 1회 자동 재시도, 부분 성공 허용(최소 18컷)
  └ 결과: 투명 PNG 원본(1024px) → 후처리(360px, 대사 합성, 배경)
  ▼
[4단계] COMPOSITE (서버, 생성 API 호출 없음 = 원가 0)
  ├ 대사 텍스트 레이어 · 소품 · 배경 · 프레임
  └ 캐시 키 = hash(시트ID + 표정 + 대사 + 소품 + 배경)
  ▼
[5단계] EXPORT
  ├ kakao-pack: 24종 360×360, 개당 2MB 이하 검증 → ZIP
  ├ gif: 24프레임 이하 루프
  └ goods: 300dpi 업스케일 → POD 파트너 전송
```

### 프롬프트 템플릿 (요지)

```ts
// 3단계 표정 생성 — 불변 조건을 먼저, 변화를 나중에 (identity drift 방지)
const prompt = [
  "Use the reference character sheet as the authoritative identity.",
  "Keep identical: face shape, eyes, nose, mouth silhouette, hair, skin tone,",
  "body proportion, outfit, and outline weight. Do not beautify or age the face.",
  `Emotion: ${spec.emotion}. Intensity: ${spec.intensity}/100.`,
  `Pose: ${spec.pose}. Props: ${spec.props.join(", ") || "none"}.`,
  "Style: clean sticker illustration, thick readable outline, transparent background,",
  "centered composition with 12% margin, no text inside the image.",
].join(" ");
```

- **금지어 필터:** 실존 인물 이름, 정치인, 아동 관련 표현, 성적 표현 → 요청 단계에서 400 반환
- **스타일 명칭:** 상표(픽사/디즈니 등) 대신 `3d-cartoon`, `2d-cute` 등 자체 명칭 사용

---

## 3. 데이터 모델 (Prisma 초안)

```prisma
model User {
  id            String   @id @default(cuid())
  tossUserKey   String?  @unique        // 앱인토스 로그인 연동
  email         String?  @unique
  displayName   String?
  plan          Plan     @default(FREE)
  createdAt     DateTime @default(now())
  wallets       Wallet[]
  faceProfiles  FaceProfile[]
  packs         Pack[]
  orders        GoodsOrder[]
  consents      Consent[]
}

enum Plan { FREE PLUS STUDIO }

model Wallet {           // 크레딧 지갑 (잔액은 항상 원장 합계로 검증)
  id        String  @id @default(cuid())
  userId    String
  balance   Int     @default(0)
  user      User    @relation(fields: [userId], references: [id])
  entries   CreditEntry[]
}

model CreditEntry {      // append-only 원장
  id        String   @id @default(cuid())
  walletId  String
  delta     Int                     // +충전 / -차감
  reason    CreditReason            // SIGNUP_BONUS, SUBSCRIPTION_GRANT, GENERATION, REFUND
  refType   String?                 // "pack" | "order" | "subscription"
  refId     String?
  createdAt DateTime @default(now())

  @@index([walletId, createdAt])
  @@unique([walletId, refType, refId, reason]) // 멱등성 보장
}

model FaceProfile {
  id            String   @id @default(cuid())
  userId        String
  landmarkHash  String              // 비식별 요약 (원본 아님)
  sourceKey    String?              // S3 키, 24h 후 null 처리
  purgeAfter    DateTime             // 파기 예약 시각
  purgedAt      DateTime?
  user          User     @relation(fields: [userId], references: [id])
}

model CharacterSheet {
  id         String  @id @default(cuid())
  faceId     String
  styleKey   String
  status     JobStatus @default(QUEUED)
  sheetKeys  String[]  // 정면/3-4/측면
  chosenKey  String?
}

model Pack {
  id          String   @id @default(cuid())
  userId      String
  title       String
  sheetId     String
  tone        String            // 무뚝뚝/애교/킹받음...
  status      JobStatus @default(QUEUED)
  frames      Frame[]
  createdAt   DateTime @default(now())
}

model Frame {
  id         String  @id @default(cuid())
  packId     String
  emotion    String  // joy, angry, kingbap, sulk, ...
  intensity  Int     // 0~100
  templateId String? // SituationTemplate
  line       String? // 대사
  imageKey   String  // 렌더 결과
  animation  Boolean @default(false)
  usageCount Int     @default(0)  // 어떤 컷이 실제로 쓰였는지 (추천 학습)
}

model SituationTemplate {
  id        String  @id
  category  String  // work, money, love, food, apology, reaction
  emotion   String
  label     String  // "야근 각"
  embedding Float[] // 3축 벡터(시간대·감정·관계) 기반
  isEvergreen Boolean // 만능 컷 여부
  weight    Float   @default(1)
}

model DailyBrief {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime // KST 기준 날짜 (userId+date unique)
  frameIds  String[]
  openedAt  DateTime?
}

model GoodsOrder {
  id            String   @id @default(cuid())
  userId        String
  productId     String
  frameId       String
  amount        Int
  status        OrderStatus @default(PAID)
  paymentKey    String?
  shippingJson  Json
  createdAt     DateTime @default(now())
}

enum JobStatus { QUEUED RUNNING SUCCEEDED PARTIAL FAILED }
enum OrderStatus { PENDING PAID PRODUCING SHIPPED DELIVERED CANCELLED REFUNDED }
enum CreditReason { SIGNUP_BONUS SUBSCRIPTION_GRANT GENERATION REFUND ADMIN_GIFT }
```

**정합성 규칙**
- 크레딧 차감은 `SELECT ... FOR UPDATE` + 원장 1행 삽입을 **단일 트랜잭션**으로
- 모든 결제/생성 요청에 `idempotencyKey` (프리사인드 업로드 ID + 프레임 인덱스)
- 지갑 잔액은 **캐시 값**, 진실은 항상 `sum(CreditEntry.delta)`

---

## 4. API 계약 (핵심 10개)

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/face/analyze` | 셀피 검증 + 프로필 생성 (multipart, ≤8MB) | user |
| POST | `/api/character-sheet` | 시트 생성 (스타일) | user |
| POST | `/api/character-sheet/:id/choose` | 시트 확정 | user |
| POST | `/api/packs` | 24컷 팩 생성 요청 → jobId | user |
| GET | `/api/packs/:id/stream` | SSE 진행률(생성 컷 수/상태) | user |
| POST | `/api/reply` | Chat-to-Sticker: 대화 → 3컷 추천 | user |
| GET | `/api/brief/today` | Daily Brief 조회 | user |
| POST | `/api/frames/:id/compose` | 대사/소품/배경 합성 (캐시) | user |
| POST | `/api/export` | kakao-pack / gif / zip | user |
| POST | `/api/checkout` + `/api/webhooks/toss` | 결제 요청 / 웹훅 | user / 서명 |
| GET | `/api/goods` · POST `/api/goods/orders` | 굿즈 | public / user |
| GET | `/api/admin/metrics` | KPI 집계 | admin |

**에러 규약:** `{ error: { code, message, hint? } }` + `code`는 `FACE_NOT_FOUND`, `QUOTA_EXCEEDED`, `POLICY_BLOCKED`, `PAYMENT_FAILED` 등 15종 고정.

**SSE 이벤트:** `job.queued` → `frame.ready`(n/24) → `job.partial` | `job.done` | `job.failed`

---

## 5. 폴더 구조 (Step 2에서 생성)

```
src/
├── app/
│   ├── (marketing)/            랜딩 · 가격 · 약관/개인정보/환불 (PG 심사 대응)
│   ├── (app)/
│   │   ├── studio/upload       셀피 업로드/검증
│   │   ├── studio/sheet        캐릭터 시트 선택
│   │   ├── studio/pack/[id]    팩 보기 + 진행률
│   │   ├── editor/[id]         편집기 (Konva)
│   │   ├── reply               Chat-to-Sticker
│   │   ├── brief               오늘의 얼굴 브리핑
│   │   ├── goods               굿즈 스토어 · 주문
│   │   └── billing             플랜/크레딧
│   ├── admin/                  운영 콘솔
│   └── api/                    Route Handlers (위 계약)
├── components/                 ui/ · studio/ · editor/ · commerce/
├── lib/
│   ├── ai/                     gemini.ts · prompt.ts · demo-renderer.ts
│   ├── media/                  sharp.ts · gif.ts · kakao-spec.ts
│   ├── payments/               provider.ts · toss.ts · iap.ts · mock.ts
│   ├── credits/                ledger.ts (원자적 차감)
│   ├── recommend/              brief.ts · reply.ts
│   └── db.ts · auth.ts · env.ts (zod 검증)
├── workers/                    pack.worker.ts · purge.worker.ts · brief.worker.ts
└── tests/                      unit · e2e
```

---

## 6. 데모 모드 (키 없이도 완전 동작)

라이브 프리뷰·CI·심사 시연에서 API 키 없이 전 플로우가 돌아가야 한다.

- `DEMO_MODE=1` 또는 `GEMINI_API_KEY` 부재 시 → `demo-renderer.ts` 사용
- 방식: 얼굴 랜드마크 비율을 읽어 **SVG 캐리커처를 절차적으로 생성** (눈/입/볼터치 파라미터를 표정별로 변경)
- 결과물은 실제 서비스와 동일한 크기·투명도·파일명 규격 → 다운스트림(편집기/내보내기/굿즈) 코드 변경 0
- UI에 "데모 렌더러" 배지 노출 (오해 방지)

이 구조 덕분에 **결제·큐·DB가 없어도** 프론트 전체를 검증할 수 있고, Step 2 첫 실행부터 시연이 가능하다.

---

## 7. 성능·비용 목표

| 항목 | 목표 |
| --- | --- |
| 팩 24컷 생성 (동시성 3) | 90초 이내 |
| Chat-to-Sticker 응답 | p95 1.5초 (생성 호출 0) |
| Daily Brief | 매일 07:30 KST, 재조합만 (원가 0) |
| 컷당 평균 원가 | ≤ 54원 (캐시 히트 포함 40원 이하) |
| LCP (모바일 4G) | ≤ 2.0s |
| Lighthouse | 성능 85+ / 접근성 95+ |

---

## 8. 의사결정 기록 (ADR)

| ID | 결정 | 대안 | 근거 |
| --- | --- | --- | --- |
| ADR-001 | 앱인토스 WebView + PWA 단일 코드베이스 | 네이티브 RN | 심사·배포 속도, 수수료 0% 파일럿 |
| ADR-002 | Gemini 2.5 Flash Image 채택 | Flux Kontext / GPT Image | 캐릭터 일관성 벤치 우위 + 장당 $0.039 |
| ADR-003 | 표정 뱅크 + 재조합 | 매 요청 생성 | 원가·지연 문제 해결 (핵심) |
| ADR-004 | 크레딧 원장 append-only | 잔액 컬럼만 증감 | 환불/분쟁/회계 추적성 |
| ADR-005 | 얼굴 원본 24h 파기 | 영구 보관 후 재학습 | 민감정보 규제 리스크 제거 |
| ADR-006 | PaymentProvider 추상화 | 토스 직결 | IAP/웹/테스트 3경로 병존 |
| ADR-007 | 데모 렌더러(SVG 절차 생성) 내장 | 목업 이미지 | 키 없는 환경에서도 완전 시연 |
