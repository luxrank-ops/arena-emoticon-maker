import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications/in-app';

const TOSS_WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET!;

// Fail closed and request retries rather than acknowledging unverified events.
// The old handler assumed an unverified signature format and unreliable metadata.
export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: 'Toss webhook temporarily unavailable pending verification' }, { status: 503 });
}

// 토스페이먼츠 웹훅 이벤트 타입
interface TossWebhookEvent {
  eventType: string;
  eventId: string;
  timestamp: string;
  data: any;
}

interface TossPaymentData {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  totalAmount: number;
  method: string;
  paidAt: string | null;
  metadata?: Record<string, string>;
  cancel?: {
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
  } | null;
}

/**
 * 결제 상태 변경 처리
 */
async function handlePaymentStatusChanged(data: TossPaymentData) {
  const { paymentKey, orderId, status, totalAmount, metadata, cancel } = data;

  console.log(`Payment status changed: ${orderId} -> ${status}`);

  // 주문 ID에서 사용자 ID 및 타입 파악
  const userId = metadata?.userId;
  if (!userId) {
    console.error('No userId in metadata:', metadata);
    return;
  }

  const isSubscription = orderId.startsWith('SUB_');
  const isCredit = orderId.startsWith('CREDIT_');

  if (status === 'DONE') {
    // 결제 완료
    if (isCredit) {
      await handleCreditPaymentSuccess(userId, paymentKey, orderId, totalAmount, metadata);
    } else if (isSubscription) {
      await handleSubscriptionFirstPayment(userId, paymentKey, orderId, totalAmount, metadata);
    }
  } else if (status === 'CANCELED' || (cancel && cancel.cancelAmount > 0)) {
    // 결제 취소/환불
    await handlePaymentCanceled(userId, paymentKey, orderId, cancel?.cancelReason || '결제 취소');
  } else if (status === 'ABORTED' || status === 'EXPIRED') {
    // 결제 중단/만료
    await handlePaymentFailed(userId, paymentKey, orderId, status === 'EXPIRED' ? '결제 만료' : '결제 중단');
  }
}

/**
 * 크레딧 충전 결제 성공 처리
 */
async function handleCreditPaymentSuccess(
  userId: string, 
  paymentKey: string, 
  orderId: string, 
  amount: number, 
  metadata: Record<string, string> | undefined
) {
  const credits = parseInt(metadata?.credits || '0');
  const packageId = metadata?.packageId || 'unknown';

  if (!credits) {
    console.error('Invalid credits in metadata:', metadata);
    return;
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      // 크레딧 지급
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      });

      // 결제 내역 기록
      await tx.payment.create({
        data: {
          userId,
          stripePaymentIntentId: `toss_${paymentKey}`,
          amount,
          currency: 'krw',
          status: 'SUCCEEDED',
          creditsGranted: credits,
          description: `토스 크레딧 충전: ${credits}개 (${packageId})`,
          metadata: { 
            paymentKey, 
            orderId, 
            packageId,
            tossPayment: true 
          },
        },
      });
    });

    // 알림 발송
    try {
      const pkgName = packageId === 'starter' ? '스타터 팩' : 
                      packageId === 'pro' ? '프로 팩' :
                      packageId === 'business' ? '비즈니스 팩' : '엔터프라이즈';
      await notify.paymentSuccess(userId, {
        plan: pkgName,
        amount,
        credits,
        receiptNumber: paymentKey,
      });
    } catch (notifyError) {
      console.error('크레딧 충전 알림 발송 실패:', notifyError);
    }

    console.log(`Credit payment success: userId=${userId}, credits=${credits}, paymentKey=${paymentKey}`);
  } catch (error) {
    console.error('Credit payment success handling failed:', error);
  }
}

/**
 * 구독 첫 결제 성공 처리
 */
async function handleSubscriptionFirstPayment(
  userId: string,
  paymentKey: string,
  orderId: string,
  amount: number,
  metadata: Record<string, string> | undefined
) {
  const planId = metadata?.planId || 'unknown';
  const monthlyCredits = parseInt(metadata?.monthlyCredits || '0');

  if (!monthlyCredits) {
    console.error('Invalid monthlyCredits in metadata:', metadata);
    return;
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      // 첫 달 크레딧 지급
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: monthlyCredits } },
      });

      // 결제 내역 기록
      await tx.payment.create({
        data: {
          userId,
          stripePaymentIntentId: `toss_${paymentKey}`,
          amount,
          currency: 'krw',
          status: 'SUCCEEDED',
          creditsGranted: monthlyCredits,
          description: `구독 첫 결제: ${monthlyCredits}크레딧 (${planId})`,
          metadata: { 
            paymentKey, 
            orderId, 
            planId,
            type: 'subscription_first',
            tossPayment: true 
          },
        },
      });

      // 구독 정보 생성/업데이트 (빌링키는 별도 웹훅에서 처리)
      const planMap: Record<string, string> = {
        monthly_starter: 'STARTER',
        monthly_pro: 'PRO',
        monthly_business: 'ENTERPRISE',
      };

      await tx.subscription.upsert({
        where: { userId },
        update: {
          stripeSubscriptionId: `toss_${paymentKey}`, // 임시로 paymentKey 사용
          plan: (planMap[planId] || 'STARTER') as any,
          status: 'ACTIVE',
        },
        create: {
          userId,
          stripeCustomerId: `toss_${userId}`,
          stripeSubscriptionId: `toss_${paymentKey}`,
          plan: (planMap[planId] || 'STARTER') as any,
          status: 'ACTIVE',
        },
      });
    });

    // 알림 발송
    try {
      await notify.systemAnnouncement(userId, {
        title: '구독 시작됨 🎉',
        message: '구독이 시작되었습니다. 매월 자동으로 크레딧이 지급됩니다.',
        actionUrl: '/dashboard/credits',
        actionLabel: '구독 관리',
      });
    } catch (notifyError) {
      console.error('구독 시작 알림 발송 실패:', notifyError);
    }

    console.log(`Subscription first payment success: userId=${userId}, planId=${planId}, paymentKey=${paymentKey}`);
  } catch (error) {
    console.error('Subscription first payment handling failed:', error);
  }
}

/**
 * 결제 취소/환불 처리
 */
async function handlePaymentCanceled(
  userId: string,
  paymentKey: string,
  orderId: string,
  reason: string
) {
  try {
    // 기존 결제 내역 찾기
    const existingPayment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: `toss_${paymentKey}` },
    });

    if (existingPayment && existingPayment.status === 'SUCCEEDED') {
      // 크레딧 차감 (이미 지급된 경우)
      if (existingPayment.creditsGranted > 0) {
        await prisma.$transaction(async (tx: any) => {
          await tx.user.update({
            where: { id: userId },
            data: { credits: { decrement: existingPayment.creditsGranted } },
          });

          await tx.payment.create({
            data: {
              userId,
              stripePaymentIntentId: `toss_${paymentKey}_cancel`,
              amount: -existingPayment.amount,
              currency: 'krw',
              status: 'REFUNDED',
              creditsGranted: -existingPayment.creditsGranted,
              description: `결제 취소 환불: ${reason}`,
              metadata: { 
                originalPaymentKey: paymentKey,
                originalOrderId: orderId,
                cancelReason: reason,
                tossPayment: true 
              },
            },
          });
        });
      }
    }

    // 알림 발송
    try {
      await notify.paymentFailed(userId, {
        plan: '크레딧 충전/구독',
        error: `결제가 취소되었습니다: ${reason}`,
      });
    } catch (notifyError) {
      console.error('결제 취소 알림 발송 실패:', notifyError);
    }

    console.log(`Payment canceled: userId=${userId}, paymentKey=${paymentKey}, reason=${reason}`);
  } catch (error) {
    console.error('Payment cancel handling failed:', error);
  }
}

/**
 * 결제 실패/만료 처리
 */
async function handlePaymentFailed(
  userId: string,
  paymentKey: string,
  orderId: string,
  reason: string
) {
  try {
    await prisma.payment.create({
      data: {
        userId,
        stripePaymentIntentId: `toss_${paymentKey}`,
        amount: 0,
        currency: 'krw',
        status: 'FAILED',
        creditsGranted: 0,
        description: `결제 실패: ${reason}`,
        metadata: { 
          paymentKey, 
          orderId,
          failReason: reason,
          tossPayment: true 
        },
      },
    });

    // 알림 발송
    try {
      await notify.paymentFailed(userId, {
        plan: '크레딧 충전/구독',
        error: reason,
      });
    } catch (notifyError) {
      console.error('결제 실패 알림 발송 실패:', notifyError);
    }

    console.log(`Payment failed: userId=${userId}, paymentKey=${paymentKey}, reason=${reason}`);
  } catch (error) {
    console.error('Payment failed handling failed:', error);
  }
}

/**
 * 빌링키 상태 변경 처리 (정기결제용)
 */
async function handleBillingKeyStatusChanged(data: any) {
  const { billingKey, customerKey, status } = data;
  
  console.log(`Billing key status changed: ${billingKey} -> ${status}`);
  
  if (status === 'ACTIVE') {
    // 빌링키 활성화 시 구독 정보 업데이트
    // customerKey를 통해 사용자 매핑 필요
  }
}

/**
 * 정기결제(빌링) 결제 상태 변경 처리
 */
async function handleBillingPaymentStatusChanged(data: any) {
  const { paymentKey, orderId, status, totalAmount, billingKey, customerKey } = data;
  
  console.log(`Billing payment status changed: ${orderId} -> ${status}`);

  if (status === 'DONE') {
    // 정기결제 성공 시 크레딧 지급
    // customerKey로 사용자 찾기 필요
  } else if (status === 'CANCELED' || status === 'FAILED') {
    // 정기결제 실패 처리
  }
}

/**
 * 현금영수증 상태 변경 처리
 */
async function handleCashReceiptStatusChanged(data: any) {
  console.log('Cash receipt status changed:', data);
  // 필요시 처리
}