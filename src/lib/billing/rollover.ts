import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications/in-app';

/**
 * 구독 플랜별 롤오버(이월) 비율
 * FREE: 0%, STARTER: 0%, PRO: 50%, ENTERPRISE: 100%
 */
const ROLLOVER_RATES: Record<string, number> = {
  FREE: 0,
  STARTER: 0,
  PRO: 0.5,
  ENTERPRISE: 1.0,
};

/**
 * 월간 구독 크레딧 이월 처리
 * 매월 1일 실행되어야 함 (cron job)
 */
export async function processMonthlyRollover(): Promise<{
  processed: number;
  totalRolloverCredits: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let totalRolloverCredits = 0;

  try {
    // 활성 구독 중인 사용자 조회 (STARTER 이상)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        plan: { in: ['STARTER', 'PRO', 'ENTERPRISE'] },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, credits: true },
        },
      },
    });

    for (const sub of subscriptions) {
      try {
        const rolloverRate = ROLLOVER_RATES[sub.plan] || 0;
        
        if (rolloverRate <= 0) continue;

        // 현재 보유 크레딧 중 구독으로 지급된 월간 크레딧 계산
        // 단순화: 현재 크레딧 중 이월 가능한 비율만큼 이월
        // 실제로는 별도 필드(monthlyCreditsBalance)로 관리하는 것이 좋음
        
        const monthlyCredits = getMonthlyCreditsForPlan(sub.plan);
        const rolloverCredits = Math.floor(monthlyCredits * rolloverRate);

        if (rolloverCredits > 0) {
          await prisma.$transaction(async (tx: typeof prisma) => {
            // 크레딧 추가
            await tx.user.update({
              where: { id: sub.userId },
              data: { credits: { increment: rolloverCredits } },
            });

            // 이월 내역 기록
            await tx.payment.create({
              data: {
                userId: sub.userId,
                stripePaymentIntentId: `rollover-${sub.id}-${Date.now()}`,
                amount: 0,
                currency: 'krw',
                status: 'SUCCEEDED',
                creditsGranted: rolloverCredits,
                description: `${sub.plan} 플랜 미사용 크레딧 이월 (${Math.round(rolloverRate * 100)}%)`,
                metadata: {
                  type: 'rollover',
                  plan: sub.plan,
                  rolloverRate,
                  sourceSubscriptionId: sub.id,
                },
              },
            });
          });

          // 알림 발송
          try {
            await notify.creditsGranted(sub.userId, {
              amount: rolloverCredits,
              reason: `${sub.plan} 플랜 미사용 크레딧 이월 (${Math.round(rolloverRate * 100)}%)`,
            });
          } catch (notifyError) {
            console.error(`이월 알림 발송 실패 (userId: ${sub.userId}):`, notifyError);
          }

          totalRolloverCredits += rolloverCredits;
        }

        processed++;
      } catch (subError) {
        const errorMsg = `구독 ${sub.id} 이월 처리 실패: ${subError instanceof Error ? subError.message : '알 수 없는 오류'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return { processed, totalRolloverCredits, errors };
  } catch (error) {
    console.error('월간 이월 처리 전체 실패:', error);
    throw error;
  }
}

/**
 * 플랜별 월간 지급 크레딧
 */
function getMonthlyCreditsForPlan(plan: string): number {
  const credits: Record<string, number> = {
    STARTER: 100,
    PRO: 500,
    ENTERPRISE: 1200,
  };
  return credits[plan] || 0;
}

/**
 * 신규 구독자 첫 달 크레딧 즉시 지급 (구독 생성 시 호출)
 */
export async function grantInitialSubscriptionCredits(userId: string, plan: string): Promise<number> {
  const monthlyCredits = getMonthlyCreditsForPlan(plan);
  
  if (monthlyCredits <= 0) return 0;

  await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: monthlyCredits } },
    });

    await tx.payment.create({
      data: {
        userId,
        stripePaymentIntentId: `initial-${plan}-${Date.now()}`,
        amount: 0,
        currency: 'krw',
        status: 'SUCCEEDED',
        creditsGranted: monthlyCredits,
        description: `${plan} 플랜 가입 크레딧 지급`,
        metadata: {
          type: 'subscription_initial',
          plan,
        },
      },
    });
  });

  return monthlyCredits;
}

/**
 * 구독 변경 시 비례 배분 크레딧 계산
 */
export async function calculateProratedCredits(
  oldPlan: string,
  newPlan: string,
  daysRemaining: number
): Promise<number> {
  const oldMonthly = getMonthlyCreditsForPlan(oldPlan);
  const newMonthly = getMonthlyCreditsForPlan(newPlan);
  
  // 일할 계산: (신규 플랜 월 크레딧 - 구 플랜 월 크레딧) * (남은 일수 / 30)
  const diff = newMonthly - oldMonthly;
  if (diff <= 0) return 0;
  
  return Math.floor(diff * (daysRemaining / 30));
}