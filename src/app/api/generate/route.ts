import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CREDIT_COSTS } from '@/lib/utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `당신은 전문 이모티콘 프롬프트 엔지니어입니다.
사용자의 캐릭터 컨셉, 감정, 대사, 스타일을 받아 DALL·E 3, Midjourney, Stable Diffusion 등에서
고품질 이모티콘 이미지를 생성할 수 있는 최적의 프롬프트를 작성해주세요.

규칙:
1. 통일된 캐릭터 스타일 유지 (캐릭터 시트처럼 일관성)
2. 흰색 배경 (transparent 배경 권장)
3. 이모티콘 세트 렌더링에 최적화된 구도
4. 말풍선 대사 영역 고려
5. 고품질, 상업용 라이선스 가능한 스타일
6. 한국어 프롬프트와 영어 프롬프트 모두 제공`;

const STYLE_PROMPTS = {
  '3d-disney-pixar': '3D 디즈니/픽사 스타일, 말랑한 소프트 질감, 서브서페이스 스캐터링, 부드러운 스튜디오 조명, 옥테인 렌더, 8k, 마스터피스',
  '2d-cute': '2D 벡터 아트, 플랫 디자인, 깔끔한 라인 아트, 파스텔 색상, 귀여운 비율, 셀 쉐이딩, 흰색 배경',
  'pixel-art': '픽셀 아트, 32x32 또는 64x64, 레트로 게임 스타일, 제한된 팔레트, 선명한 픽셀, 투명 배경',
  'sketch': '연필 스케치, 손그림 느낌, 자연스러운 선, 종이 질감, 아날로그 감성, 부드러운 그림자',
  'watercolor': '수채화 일러스트, 물번짐 효과, 투명한 레이어, 부드러운 그라데이션, 예술적 감성, 흰색 여백',
  'minimal': '미니멀 라인 아트, 단색 라인, 여백의 미, 심플한 형태, 본질만 표현, 벡터 스타일',
};

function buildPrompt(data: {
  characterName: string;
  emotion: string;
  dialogue: string;
  style: string;
}): { korean: string; english: string } {
  const styleDesc = STYLE_PROMPTS[data.style as keyof typeof STYLE_PROMPTS] || STYLE_PROMPTS['3d-disney-pixar'];
  
  const korean = `[캐릭터] ${data.characterName}
[감정/표정] ${data.emotion}
[말풍선 대사] "${data.dialogue}"
[아트 스타일] ${styleDesc}
[기술 사양] 통일된 캐릭터 디자인, 흰색 배경, 이모티콘 세트 최적화, 고해상도, 상업용 가능`;

  const english = `Character: ${data.characterName}
Emotion/Expression: ${data.emotion}
Speech Bubble: "${data.dialogue}"
Art Style: ${styleDesc}
Technical: Consistent character design, white background, emoji set optimized, high resolution, commercial license ready`;

  return { korean, english };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { characterName, emotion, dialogue, style } = body;

    if (!characterName || !emotion) {
      return NextResponse.json(
        { error: '캐릭터명과 감정은 필수입니다.' },
        { status: 400 }
      );
    }

    // 크레딧 확인
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { credits: true },
    });

    if (!user || user.credits < CREDIT_COSTS.generation) {
      return NextResponse.json(
        { error: '크레딧이 부족합니다.' },
        { status: 402 }
      );
    }

    // 기본 프롬프트 구성
    const basePrompt = buildPrompt({ characterName, emotion, dialogue: dialogue || '', style: style || '3d-disney-pixar' });

    // Gemini AI로 프롬프트 개선
    let revisedPrompt = basePrompt.english;
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `${SYSTEM_PROMPT}

사용자 입력:
- 캐릭터: ${characterName}
- 감정: ${emotion}
- 대사: "${dialogue || '없음'}"
- 스타일: ${style || '3d-disney-pixar'}

기본 프롬프트 (영어):
${basePrompt.english}

위 정보를 바탕으로 DALL·E 3, Midjourney v6, Stable Diffusion XL에서 최상의 결과를 낼 수 있도록
프롬프트를 개선해주세요. 영어 프롬프트만 출력하세요.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        revisedPrompt = response.text().trim();
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        // Gemini 실패 시 기본 프롬프트 사용
      }
    }

    // 데이터베이스에 기록 및 크레딧 차감
    const generation = await prisma.$transaction(async (tx: typeof prisma) => {
      // 크레딸 차감
      await tx.user.update({
        where: { id: (session.user as any).id },
        data: { credits: { decrement: CREDIT_COSTS.generation } },
      });

      // 생성 기록 저장
      const gen = await tx.generation.create({
        data: {
          userId: (session.user as any).id,
          prompt: basePrompt.korean,
          revisedPrompt,
          emotion,
          dialogue: dialogue || null,
          style: style || '3d-disney-pixar',
          status: 'COMPLETED',
          creditsUsed: CREDIT_COSTS.generation,
        },
      });

      // 업데이트된 크레딧 조회
      const updatedUser = await tx.user.findUnique({
        where: { id: (session.user as any).id },
        select: { credits: true },
      });

      return { ...gen, remainingCredits: updatedUser?.credits ?? 0 };
    });

    return NextResponse.json({
      prompt: basePrompt.korean,
      revisedPrompt,
      creditsUsed: CREDIT_COSTS.generation,
      remainingCredits: generation.remainingCredits,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}