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

### 관리자 무제한 및 구도 선택
관리자 세션은 생성 크레딧 차감과 일반 사용 요청 제한을 적용하지 않으며 모든 스타일을 사용할 수 있다. 외부 AI 호출 비용은 계속 발생한다. 관리자 코드는 서버의 `ADMIN_PASSCODE` 환경변수로만 설정하고 미설정 시 로그인을 차단한다. 네 자리 코드는 추측하기 쉬우므로 운영에서는 더 긴 비밀번호와 별도의 접근 제어를 권장한다. 로그인 제한은 인스턴스별 메모리에만 적용되므로 다중 인스턴스 운영에서는 공유 제한 저장소와 추가 인증이 필요하다. 얼굴/전신 구도는 시트와 팩에 저장되어 시안, 컷 및 재생성 프롬프트에 적용된다. 기존 데이터는 얼굴 구도로 처리한다.

### AI 컷 악세사리
AI 컷 편집기에서 악세사리를 최대 3개 선택하고 다시 그리면 선택한 지시가 이미지 생성 프롬프트에 포함된다. 마지막으로 성공한 이미지의 선택만 컷에 저장하며, 선택 해제도 다시 그려야 적용된다. 악세사리 자체의 추가 비용은 없고 기존 다시 그리기 비용(일반 사용자 1크레딧, 관리자 면제)과 실패 시 환불 정책을 따른다. 생성에는 기존과 같이 Gemini 호출 비용이 발생하며 결과는 모델에 따라 달라질 수 있다.

### 원본 사진과 시안 일관성
AI 렌더링은 원본 사진을 인물의 우선 기준으로, 팩 생성 시 선택한 시안 이미지를 스타일·외형의 보조 참조로 Google Gemini에 함께 전달한다. 기존 팩은 시트의 선택 시안을 사용하며, 시안 이미지가 없으면 원본만으로 생성한다. 결과의 동일성은 모델이 보장하지 않으며 FaceNet/ArcFace 임베딩 추출·자동 유사도 검증은 아직 구현되지 않았다. 나이 변경 및 얼굴 형태 변경을 지시하던 상충 프롬프트는 제거했다. 원본은 서버에 저장하지 않고 탭의 sessionStorage에서 시트·팩별로 연결한다. 다른 팩을 만들 때 사진이 바뀌지 않으며, 사진이 없으면 사용자가 같은 사진을 다시 제공해야 한다(동일 사진인지 자동 검증하지 않음). 생성 시안의 외부 전송은 개인정보 안내에 명시한다. 추가 AI 호출은 없으나 참조 이미지 입력량이 늘어 모델별 비용과 지연이 증가할 수 있다.

### 실사 카톡 스티커 스타일
기존 생성 흐름에 `photo-sticker` 화풍을 추가한다. 12컷 또는 16컷의 고정 표정·한국어 대사를 각각 독립된 프레임과 Gemini 요청으로 생성하고, 선택 시안과 원본을 참조한다. 결과는 흰색 불투명 배경이며, 카카오톡에서 사용할 수 있는 이미지 스타일을 목표로 할 뿐 정식 스토어 등록 또는 제안 규격 충족을 보장하지 않는다. 기존 스타일과 24컷 생성은 유지된다. 컷당 기존과 같이 1크레딧(관리자 면제)이며 시안 3회와 컷별 외부 이미지 생성 비용이 발생한다. 실제 1회 원가는 모델 및 공급자 요금에 따라 확인이 필요하다. 텍스트 정확도·표정·원본 유사도는 생성 모델에 따라 달라질 수 있다.

### 회원 인증
회원은 이메일·이름·닉네임·생년월일과 선택적 성별, 비밀번호 및 필수 동의로 가입한다. 만 14세 미만 가입은 법정대리인 동의 절차가 없어 차단한다. 비밀번호는 고유 솔트의 scrypt 해시로만 보관한다. 로그인은 이메일 또는 닉네임으로 하며 인증 쿠키에는 임의 토큰, 저장소에는 토큰 해시와 만료시각을 둔다. 로그아웃 시 서버 세션을 폐기한다. 게스트 쿠키는 회원·관리자 인증에 사용할 수 없고, 게스트 팩·잔액은 자동 이전하지 않는다. 관리자 닉네임은 예약되어 있으며 비밀번호는 서버의 ADMIN_PASSCODE로만 설정한다. 관리자 생성 크레딧 면제는 인증된 계정에만 적용한다. 관리자 로그인 시도는 공유 DB에서 15분당 5회로 제한하지만, 4자리 코드는 취약하므로 운영에서는 강력한 비밀번호와 별도 접근 제어가 필요하다. 일반 인증 제한은 인스턴스별 메모리 기반이므로 다중 인스턴스 운영 시 공유 제한 및 모니터링이 필요하다. Vercel 로컬 임시 저장소는 계정·세션이 사라질 수 있으므로 운영 전에 지속적인 공유 저장소를 구성하고 장애 시 폴백 정책을 재검토해야 한다. 비밀번호 재설정·이메일 인증 및 자동 탈퇴는 아직 제공하지 않는다.

### 생성 전 일관성 준비
사진 업로드와 동의 후 이미지 생성 전에 Gemini 비전 모델로 원본 사진을 최대 두 차례 확인한다. AI 확인이 실패하거나 얼굴이 불명확하다고 판정되면 서버에서 이미지 형식·크기와 실제 디코딩을 두 단계로 확인하고, 원본 사진을 기준으로 삼는 일반 지침으로 대체한다. 기본 확인은 얼굴 분석이나 동일성 검증이 아니며 사용자에게 이를 표시한다. 유효하지 않은 사진은 차단한다. 이미지 생성 이후 검토·보정·재생성은 하지 않는다. 기존 사용자·사진·토큰 결합 및 1시간 유효기간은 유지한다. AI 이미지 생성 자체에는 여전히 Gemini 이미지 모델 및 유효한 API 키가 필요하다. 원본은 저장하지 않고 사진 해시·지침·토큰 해시를 임시 보관한다. AI 확인은 최대 두 번 호출되며 추가 비용이 발생할 수 있고 두 방식 모두 동일성을 보장하지 않는다.

선택한 시안의 이미지가 준비된 경우에만 팩을 생성하며, 컷 생성 및 다시 그리기는 팩에 고정된 시안 이미지를 소유자가 읽을 수 있을 때만 진행한다. 시안이 없어지면 기존 결과는 볼 수 있지만 새 컷 생성은 차감 전에 중단하고 안내한다. 컷의 구도·스타일·의상과 얼굴 특징을 사진 및 시안 기준에 맞추도록 요청하되, 생성 품질이나 동일인 여부를 보장하지 않는다. 사진을 다시 올릴 때는 시안 생성에 사용한 같은 사진을 사용해야 한다.

### 코믹 감정 표현
시안 선택 후 기존 자동 구성 대신 오리지널 코믹 반응 24종 중 팩 크기에 맞게 중복 없이 선택할 수 있다. 각 선택은 독립 컷의 감정·기본 문구·동작 지침으로 저장되며, 컷별 이미지 생성과 기존 사진·시안 참조 및 생성 전 확인 절차를 그대로 사용한다. 기존 팩 편집에서도 코믹 표현을 선택하고 유료 사용자는 다시 그리기 1크레딧(관리자는 면제)으로 적용할 수 있다. 기존 팩·기본 표정 구성은 그대로 유지한다. 특정 캐릭터나 검증된 인기 순위를 모방한 목록은 아니며 생성 결과의 실제 유사도, 문구 정확성 및 카카오 심사 통과는 보장하지 않는다.
