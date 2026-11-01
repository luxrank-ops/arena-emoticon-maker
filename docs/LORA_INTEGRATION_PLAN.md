# 스타일 LoRA 학습 및 생성 API 연동 계획서 (3단계)

## 1. 개요
`arena-emoticon-maker` 프로젝트의 스타일 LoRA 학습 및 외부 AI 생성 API(Replicate / Fal.ai) 연동을 위한 상세 구현 계획서입니다.

## 2. 아키텍처 및 연동 흐름
\`\`\`
[사용자 셀피 업로드] 
       ↓
[Next.js API (/api/generate)] 
       ↓ (Multipart / JSON)
[AI 추론 공급자 (Replicate / Fal.ai)]
       ↓ (LoRA Weight + Base Model: Flux.1 / SDXL)
[이모티콘 결과물 반환 및 Firestore 저장]
\`\`\`

## 3. 세부 작업 단계
1. **API 클라이언트 유틸리티 구현** (`src/lib/ai/replicate.ts` 또는 `fal.ts`)
   - Replicate/Fal.ai SDK 설치 및 환경 변수(`REPLICATE_API_TOKEN` / `FAL_KEY`) 설정
   - 비동기 생성 요청 및 웹훅(Webhook) 또는 폴링(Polling) 처리 로직 작성
2. **이모티콘 생성 API 엔드포인트 작성** (`src/app/api/generate/route.ts`)
   - 사용자 셀피 이미지 업로드 및 프롬프트 조합
   - 스타일별 `loraId` 매핑 (귀여운 3D, 웹툰 스타일, 픽셀아트 등)
3. **테스트 및 검증**
   - 로컬 환경 및 Vercel 프리뷰 환경에서 모의(Mock) 데이터 및 실제 API 호출 테스트

## 4. 환경 변수 추가 목록 (Vercel 설정 필요)
- `REPLICATE_API_TOKEN` 또는 `FAL_KEY`
- `DEFAULT_LORA_ID`
\`\`\`
