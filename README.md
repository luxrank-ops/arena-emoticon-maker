# Arena Emoticon Maker - AI 이모티콘 제작 플랫폼

> **Arena AI**에서 개발한 차세대 이모티콘 제작 SaaS 플랫폼
> Gemini AI로 프롬프트 최적화 → DALL·E 3, Midjourney, Stable Diffusion으로 고품질 이미지 생성

## 🚀 주요 기능

### 핵심 기능
- **AI 프롬프트 최적화**: 캐릭터 컨셉 + 감정 + 대사 → Gemini AI가 최적 프롬프트 자동 생성
- **다중 스타일 지원**: 3D 디즈니/픽사, 2D 귀여운, 픽셀 아트, 스케치, 수채화, 미니멀 (6종)
- **풍부한 감정 표현**: 기쁨, 열정, 슬픔, 사랑, 화남, 놀람, 인정, 졸림 (8종 + 커스텀)
- **즉시 사용 가능**: 생성된 프롬프트를 주요 AI 이미지 생성 도구에 바로 복사/붙여넣기

### 수익화 기능
- **크레딧 시스템**: 생성 1회당 1 크레딧, 가입 시 10 크레딧 무료 제공
- **구독 플랜**: FREE / STARTER (₩9,900) / PRO (₩29,900) / ENTERPRISE (₩99,900)
- **Stripe 결제 연동**: 안전한 결제, 자동 크레딧 충전, 웹훅 처리

### 운영/관리 기능
- **관리자 대시보드**: 사용자 통계, 수익 모니터링, 콘텐츠 모더레이션
- **사용자 대시보드**: 생성 히스토리, 크레딧 관리, 프로필 설정
- **API 제공**: 외부 서비스 연동을 위한 REST API

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Pretendard Font
- **State**: React Hooks + NextAuth.js
- **UI**: 커스텀 디자인 시스템 (Radix UI 기반)

### Backend
- **Runtime**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth.js (OAuth + Credentials)
- **AI**: Google Gemini API (프롬프트 최적화)
- **Payments**: Stripe (구독/크레딧 결제)

### DevOps
- **Deploy**: Vercel (Frontend) + Railway/Neon (DB)
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics + Sentry
- **Testing**: Jest + Playwright

## 📁 프로젝트 구조

```
arena-emoticon-maker/
├── .github/workflows/     # CI/CD 파이프라인
├── prisma/
│   └── schema.prisma      # DB 스키마
├── public/                # 정적 자산
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API 라우트
│   │   │   ├── auth/      # 인증 API
│   │   │   ├── generate/  # 프롬프트 생성 API
│   │   │   ├── user/      # 사용자 관리 API
│   │   │   └── webhooks/  # Stripe 웹훅
│   │   ├── auth/          # 인증 페이지
│   │   ├── dashboard/     # 사용자 대시보드
│   │   ├── admin/         # 관리자 페이지
│   │   ├── layout.tsx     # 루트 레이아웃
│   │   ├── page.tsx       # 홈페이지
│   │   └── globals.css    # 전역 스타일
│   ├── components/
│   │   ├── ui/            # 기본 UI 컴포넌트
│   │   ├── generator/     # 생성기 전용 컴포넌트
│   │   └── layout/        # 레이아웃 컴포넌트
│   ├── lib/
│   │   ├── auth.ts        # NextAuth 설정
│   │   ├── prisma.ts      # Prisma 클라이언트
│   │   └── utils.ts       # 유틸리티 함수
│   ├── hooks/             # 커스텀 훅
│   ├── types/             # TypeScript 타입
│   └── styles/            # 추가 스타일
└── package.json
```

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.17+
- PostgreSQL 14+
- npm/yarn/pnpm

### 설치

```bash
# 저장소 클론
git clone https://github.com/luxrank-ops/arena-emoticon-maker.git
cd arena-emoticon-maker

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 필수 값 입력

# 데이터베이스 마이그레이션
npm run db:push

# 개발 서버 실행
npm run dev
```

### 환경 변수

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/emoticon_maker"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Gemini AI
GEMINI_API_KEY=""

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

## 📦 배포 가이드

### Vercel 배포 (추천)

1. Vercel 프로젝트 생성 및 GitHub 연동
2. 환경 변수 설정 (Production/Preview/Development 각각)
3. 데이터베이스: Neon, Supabase, Railway 등 서버리스 PostgreSQL 사용
4. 도메인 연결 및 SSL 자동 적용

### 데이터베이스 마이그레이션 (Production)

```bash
# 프로덕션 DB에 스키마 적용
npx prisma db push

# 또는 마이그레이션 파일 생성 후 적용
npx prisma migrate deploy
```

### Stripe 웹훅 설정

```bash
# 로컬 테스트용
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 프로덕션 웹훅 엔드포인트
https://your-domain.com/api/webhooks/stripe
```

이벤트: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`

## 🤖 에이전트 조직 구성

이 프로젝트는 **6개 전문 에이전트 팀**으로 운영됩니다:

| 팀 | 역할 | 주요 책임 |
|-----|------|----------|
| **DEV** | Backend/Frontend/AI/DevOps | 기능 개발, API, AI 파이프라인, 배포 자동화 |
| **OPS** | SRE/Release/Support | 인프라, 릴리스 관리, 고객 지원 |
| **BIZ** | Growth/Monetization/Partnership | 성장 지표, 수익화, 제휴 |
| **SEC** | Security/Compliance | 보안 감사, 컴플라이언스, 개인정보보호 |
| **DATA** | Analytics/MLOps | 사용자 분석, 모델 모니터링 |
| **UX** | Design/Research | 사용자 경험, 디자인 시스템 |

자세한 내용은 [AGENTS.md](./AGENTS.md) 참조

## 🧪 테스트

```bash
# 단위/통합 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 타입 체크
npm run type-check

# 린트
npm run lint
```

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일 참조

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

- **Project**: Arena AI
- **Email**: team@arena.ai
- **Issues**: [GitHub Issues](https://github.com/luxrank-ops/arena-emoticon-maker/issues)

---

**Made with ❤️ by Arena AI Team**