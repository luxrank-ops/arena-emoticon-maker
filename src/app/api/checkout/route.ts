import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const PACKAGES: Record<string, { credits: number; price: number; name: string }> = {
  starter: { credits: 100, price: 9900, name: '스타터 팩' },
  pro: { credits: 500, price: 39900, name: '프로 팩' },
  business: { credits: 1200, price: 79900, name: '비즈니스 팩' },
  enterprise: { credits: 3000, price: 179000, name: '엔터프라이즈' },
};

const SUBSCRIPTIONS: Record<string, { monthlyCredits: number; price: number; name: string; priceId: string }> = {
  monthly_starter: { monthlyCredits: 100, price: 9900, name: '월간 스타터', priceId: process.env.STRIPE_PRICE_STARTER || '' },
  monthly_pro: { monthlyCredits: 500, price: 29900, name: '월간 프로', priceId: process.env.STRIPE_PRICE_PRO || '' },
  monthly_business: { monthlyCredits: 1200, price: 69900, name: '월간 비즈니스', priceId: process.env.STRIPE_PRICE_BUSINESS || '' },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { packageId, isSubscription } = body;

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (isSubscription && SUBSCRIPTIONS[packageId]) {
      const sub = SUBSCRIPTIONS[packageId];
      
      if (!sub.priceId) {
        return NextResponse.json({ error: '구독 플랜이 설정되지 않았습니다.' }, { status: 400 });
      }

      const stripeSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: sub.priceId, quantity: 1 }],
        success_url: `${origin}/dashboard/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/credits?canceled=true`,
        metadata: {
          userId: user.id,
          planId: packageId,
          type: 'subscription',
        },
      });

      return NextResponse.json({ url: stripeSession.url });
    }

    if (PACKAGES[packageId]) {
      const pkg = PACKAGES[packageId];

      const stripeSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'krw',
            product_data: {
              name: `${pkg.name} - ${pkg.credits} 크레딧`,
              description: `이모티콘 생성용 크레딧 ${pkg.credits}개`,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        }],
        success_url: `${origin}/dashboard/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/credits?canceled=true`,
        metadata: {
          userId: user.id,
          packageId,
          credits: pkg.credits.toString(),
          type: 'credits',
        },
      });

      return NextResponse.json({ url: stripeSession.url });
    }

    return NextResponse.json({ error: '유효하지 않은 상품입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: '결제 세션 생성 실패' }, { status: 500 });
  }
}

// Prisma import at top level for webhook
import prisma from '@/lib/prisma';