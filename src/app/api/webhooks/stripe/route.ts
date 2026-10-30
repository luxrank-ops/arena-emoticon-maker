import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications/in-app';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, type, packageId, credits } = session.metadata || {};

  if (!userId) return;

  if (type === 'credits' && credits) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: parseInt(credits) } },
      });

      await tx.payment.create({
        data: {
          userId,
          stripePaymentIntentId: session.payment_intent as string,
          amount: session.amount_total || 0,
          currency: session.currency || 'krw',
          status: 'SUCCEEDED',
          creditsGranted: parseInt(credits),
          description: `크레딧 충전: ${credits}개`,
          metadata: { sessionId: session.id, packageId },
        },
      });
    });

    // 결제 성공 알림
    try {
      const pkgName = packageId === 'starter' ? '스타터 팩' : 
                      packageId === 'pro' ? '프로 팩' :
                      packageId === 'business' ? '비즈니스 팩' : '엔터프라이즈';
      await notify.paymentSuccess(userId, {
        plan: pkgName,
        amount: session.amount_total || 0,
        credits: parseInt(credits),
        receiptNumber: session.id,
      });
    } catch (notifyError) {
      console.error('결제 성공 알림 발송 실패:', notifyError);
    }
  }
  
  if (type === 'subscription') {
    // 구독 시작 알림
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
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;

  // 구독 플랜별 크레딧 지급
  const planCredits: Record<string, number> = {
    [process.env.STRIPE_PRICE_STARTER || '']: 100,
    [process.env.STRIPE_PRICE_PRO || '']: 500,
    [process.env.STRIPE_PRICE_BUSINESS || '']: 1200,
  };

  const planNames: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER || '']: 'STARTER',
    [process.env.STRIPE_PRICE_PRO || '']: 'PRO',
    [process.env.STRIPE_PRICE_BUSINESS || '']: 'ENTERPRISE',
  };

  const credits = planCredits[priceId] || 0;
  const planName = planNames[priceId] || 'STARTER';

  if (credits > 0) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.user.update({
        where: { id: user.id },
        data: { credits: { increment: credits } },
      });

      await tx.payment.create({
        data: {
          userId: user.id,
          stripePaymentIntentId: invoice.payment_intent as string,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'SUCCEEDED',
          creditsGranted: credits,
          description: `구독 갱신 크레딧: ${credits}개`,
          metadata: { invoiceId: invoice.id, subscriptionId },
        },
      });
    });

    // 구독 갱신 알림
    try {
      const periodEnd = new Date(subscription.current_period_end * 1000);
      await notify.subscriptionRenewed(user.id, {
        plan: planName,
        monthlyCredits: credits,
        nextBillingDate: periodEnd.toLocaleDateString('ko-KR'),
      });
    } catch (notifyError) {
      console.error('구독 갱신 알림 발송 실패:', notifyError);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  const planMap: Record<string, { plan: string; priceId: string }> = {
    [process.env.STRIPE_PRICE_STARTER || '']: { plan: 'STARTER', priceId: process.env.STRIPE_PRICE_STARTER || '' },
    [process.env.STRIPE_PRICE_PRO || '']: { plan: 'PRO', priceId: process.env.STRIPE_PRICE_PRO || '' },
    [process.env.STRIPE_PRICE_BUSINESS || '']: { plan: 'ENTERPRISE', priceId: process.env.STRIPE_PRICE_BUSINESS || '' },
  };

  const planInfo = planMap[priceId] || { plan: 'FREE', priceId: '' };

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan: planInfo.plan as any,
      status: status === 'active' ? 'ACTIVE' : status === 'canceled' ? 'CANCELED' : 'PAST_DUE',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan: planInfo.plan as any,
      status: status === 'active' ? 'ACTIVE' : status === 'canceled' ? 'CANCELED' : 'PAST_DUE',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  const planNames: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER || '']: 'STARTER',
    [process.env.STRIPE_PRICE_PRO || '']: 'PRO',
    [process.env.STRIPE_PRICE_BUSINESS || '']: 'ENTERPRISE',
  };
  const priceId = subscription.items.data[0]?.price.id;
  const planName = planNames[priceId] || 'STARTER';
  const periodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString('ko-KR')
    : '즉시';

  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      status: 'CANCELED',
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      plan: 'FREE',
    },
  });

  // 구독 해지 알림
  try {
    await notify.subscriptionCancelled(user.id, {
      plan: planName,
      expiresAt: periodEnd,
      reason: subscription.cancellation_details?.reason || undefined,
    });
  } catch (notifyError) {
    console.error('구독 해지 알림 발송 실패:', notifyError);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  await prisma.payment.create({
    data: {
      userId: user.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'FAILED',
      creditsGranted: 0,
      description: '결제 실패',
      metadata: { error: paymentIntent.last_payment_error?.message },
    },
  });

  // 결제 실패 알림
  try {
    await notify.paymentFailed(user.id, {
      plan: '크레딧 충전/구독',
      error: paymentIntent.last_payment_error?.message || '알 수 없는 오류',
    });
  } catch (notifyError) {
    console.error('결제 실패 알림 발송 실패:', notifyError);
  }
}