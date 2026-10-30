import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

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

  const credits = planCredits[priceId] || 0;

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
}