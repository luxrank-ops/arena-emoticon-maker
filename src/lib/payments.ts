import { fail } from '@/lib/api';

export function paymentProvider(): string {
  return (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase();
}

/** 키가 없거나 서로 다른 환경의 키면 활성화하지 않는다. 운영에서는 테스트 키를 거부한다. */
export function tossConfigured(): boolean {
  const client = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';
  const secret = process.env.TOSS_SECRET_KEY || '';
  const mode = client.startsWith('test_ck_') && secret.startsWith('test_sk_') ? 'test'
    : client.startsWith('live_ck_') && secret.startsWith('live_sk_') ? 'live' : null;
  return !!mode && (process.env.NODE_ENV !== 'production' || mode === 'live');
}

/** 포트원(PortOne) V2 결제창: 스토어 ID·채널키·API 시크릿이 모두 있어야 활성화한다. */
export function portoneConfigured(): boolean {
  const storeId = process.env.PORTONE_STORE_ID || process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '';
  const channelKey = process.env.PORTONE_CHANNEL_KEY || '';
  const apiSecret = process.env.PORTONE_API_SECRET || '';
  return !!storeId && !!channelKey && !!apiSecret;
}

/** 결제창을 그리는 데 필요한 공개 값(스토어 ID·채널키) — 시크릿은 포함하지 않는다. */
export function portoneClientConfig(): { storeId: string; channelKey: string } | null {
  if (!portoneConfigured()) return null;
  return {
    storeId: process.env.PORTONE_STORE_ID || process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '',
    channelKey: process.env.PORTONE_CHANNEL_KEY || '',
  };
}

export function paymentsUnavailable(): boolean {
  const provider = paymentProvider();
  if (provider === 'toss') return !tossConfigured();
  if (provider === 'portone') return !portoneConfigured();
  return provider !== 'mock' || process.env.NODE_ENV === 'production';
}

export function paymentsUnavailableResponse() {
  return fail('PAYMENT_UNAVAILABLE', '결제 연동이 준비되지 않아 지금은 구매할 수 없어요', 503);
}

/** 비상 시 새 주문·결제 준비만 멈추고 기존 승인 확인과 복구는 계속 허용한다. */
export function checkoutSuspended(): boolean {
  return process.env.PAYMENT_CHECKOUT_DISABLED === '1';
}

export function checkoutSuspendedResponse() {
  return fail('CHECKOUT_SUSPENDED', '새 결제를 잠시 멈췄어요. 기존 주문의 승인 결과 확인은 계속할 수 있습니다.', 503);
}
