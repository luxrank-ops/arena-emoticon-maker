import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { addGenerationJob, GenerationJobData } from '@/lib/queue/imageQueue';
import { CREDIT_COSTS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      characterName,
      characterConcept,
      emotion,
      dialogue,
      style = '3d-disney-pixar',
      model = 'dall-e-3',
      size = '1024x1024',
      quality = 'standard',
    } = body;

    if (!characterName || !characterConcept || !emotion) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
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

    // 크레딧 선차감 (작업 실패 시 환불됨)
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { credits: { decrement: CREDIT_COSTS.generation } },
    });

    // 생성 레코드 생성 (PENDING 상태)
    const generation = await prisma.generation.create({
      data: {
        userId: (session.user as any).id,
        prompt: '', // 워커에서 채워짐
        emotion,
        dialogue: dialogue || null,
        style,
        model,
        size,
        quality,
        status: 'PENDING',
        creditsUsed: CREDIT_COSTS.generation,
      },
    });

    // 큐에 작업 추가
    const jobData: GenerationJobData = {
      generationId: generation.id,
      userId: (session.user as any).id,
      characterName,
      characterConcept,
      emotion,
      dialogue,
      style,
      model,
      size,
      quality,
      creditsUsed: CREDIT_COSTS.generation,
    };

    await addGenerationJob(jobData);

    return NextResponse.json({
      generationId: generation.id,
      status: 'PENDING',
      message: '이미지 생성이 시작되었습니다. 잠시 후 결과를 확인하세요.',
    });
  } catch (error) {
    console.error('이미지 생성 요청 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}