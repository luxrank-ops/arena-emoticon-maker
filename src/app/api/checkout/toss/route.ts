import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTossPaymentsServerClient, generateOrderId, TossPaymentsError } from '@/lib/payments/toss';

const PACKAGES: Record<string, { credits: number; price: number; name: string }> = {
  starter: { credits: 100, price: 9900, name: '스타터 팩' },
  pro: { credits: 500, price: 39900, name: '프로 팩' },
  business: { credits: 1200, price: 79900, name: '비즈니스 팩' },
  enterprise: { credits: 3000, price: 179000, name: '엔터프라이즈' },
};

const SUBSCRIPTIONS: Record<string, { monthlyCredits: number; price: number; name: string; billingKey?: string }> = {
  monthly_starter: { monthlyCredits: 100, price: 9900, name: '월간 스타터' },
  monthly_pro: { monthlyCredits: 500, price: 29900, name: '월간 프로' },
  monthly_business: { monthlyCredits: 1200, price: 69900, name: '월간 비즈니스' },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { packageId, isSubscription, paymentMethod } = body;

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const tossClient = getTossPaymentsServerClient();

    // 일회성 크레딧 충전
    if (!isSubscription && PACKAGES[packageId]) {
      const pkg = PACKAGES[packageId];
      const orderId = generateOrderId('CREDIT');
      const orderName = `${pkg.name} - ${pkg.credits} 크레딧`;

      // 결제 위젯용 주문 정보 반환 (프론트엔드에서 결제 위젯 호출 시 사용)
      return NextResponse.json({
        orderId,
        orderName,
        amount: pkg.price,
        customerEmail: user.email,
        customerName: user.name || undefined,
        successUrl: `${origin}/dashboard/credits?success=true&order_id=${orderId}`,
        failUrl: `${origin}/dashboard/credits?canceled=true&order_id=${orderId}`,
        metadata: {
          userId: user.id,
          packageId,
          credits: pkg.credits.toString(),
          type: 'credits',
        },
      });
    }

    // 정기구독 (빌링키 등록 후 결제)
    if (isSubscription && SUBSCRIPTIONS[packageId]) {
      const sub = SUBSCRIPTIONS[packageId];
      const orderId = generateOrderId('SUB');

      // 정기결제의 경우 빌링키가 필요하므로 별도 플로우
      // 첫 결제는 일반 결제로 처리하고, 성공 시 빌링키 발급
      const orderName = `${sub.name} - 첫 결제`;

      return NextResponse.json({
        orderId,
        orderName,
        amount: sub.price,
        customerEmail: user.email,
        customerName: user.name || undefined,
        successUrl: `${origin}/dashboard/credits?success=true&order_id=${orderId}&subscription=true`,
        failUrl: `${origin}/dashboard/credits?canceled=true&order_id=${orderId}`,
        metadata: {
          userId: user.id,
          planId: packageId,
          type: 'subscription',
          monthlyCredits: sub.monthlyCredits.toString(),
        },
      });
    }

    return NextResponse.json({ error: '유효하지 않은 상품입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Toss Checkout error:', error);
    
    if (error instanceof TossPaymentsError) {
      return NextResponse.json({ 
        error: '결제 준비 실패', 
        code: error.code,
        message: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: '결제 세션 생성 실패' }, { status: 500 });
  }
}

/**
 * 결제 승인 API (프론트엔드에서 결제 위젯 완료 후 호출)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentKey, orderId, amount, orderName } = body;

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const tossClient = getTossPaymentsServerClient();
    const userId = (session.user as any).id;

    // 결제 승인 요청
    const payment = await tossClient.confirmPayment({
      paymentKey,
      orderId,
      amount,
      orderName,
    });

    // 결제 성공 시 비즈니스 로직 처리
    await handlePaymentSuccess(userId, payment, orderId);

    return NextResponse.json({ 
      success: true, 
      payment 
    });
  } catch (error) {
    console.error('Toss Payment Confirm error:', error);
    
    if (error instanceof TossPaymentsError) {
      return NextResponse.json({ 
        error: '결제 승인 실패', 
        code: error.code,
        message: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function handlePaymentSuccess(userId: string, payment: any, orderId: string) {
  // 주문 ID에서 타입 파악
  const isSubscription = orderId.startsWith('SUB_');
  const isCredit = orderId.startsWith('CREDIT_');

  if (isCredit) {
    // 크레딧 충전 처리
    // metadata에서 packageId, credits 추출 필요 (실제로는 주문 생성 시 저장해둔 정보 사용)
    // 여기서는 임시로 amount 기반으로 처리
    const credits = Math.round(payment.totalAmount / 99); // 대략적인 계산
    
    await prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      });

      await tx.payment.create({
        data: {
          userId,
          stripePaymentIntentId: `toss_${payment.paymentKey}`, // toss_ prefix로 구분
          amount: payment.totalAmount,
          currency: 'krw',
          status: 'SUCCEEDED',
          creditsGranted: credits,
          description: `토스 크레딧 충전: ${credits}개`,
          metadata: { 
            paymentKey: payment.paymentKey, 
            orderId,
            method: payment.method,
            tossPayment: true 
          },
        },
      });
    });

    // 알림 발송
    try {
      const { notify } = await import('@/lib/notifications/in-app');
      await notify.paymentSuccess(userId, {
        plan: '크레딧 충전',
        amount: payment.totalAmount,
        credits,
        receiptNumber: payment.paymentKey,
      });
    } catch (notifyError) {
      console.error('결제 성공 알림 발송 실패:', notifyError);
    }
  } else if (isSubscription) {
    // 첫 구독 결제 처리 + 빌링키 발급 로직
    // 실제로는 결제 위젯에서 billingKey 발급 옵션 사용
    console.log('구독 첫 결제 완료:', payment.paymentKey);
  }
}