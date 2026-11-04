import { fail } from '@/lib/api';

export function paymentProvider(): string {
  return (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase();
}

/** 키가 없거나 서로 다른 환경의 키면 활성화하지 않는다. 운영에서는 테스트 키를 거부한다. */
export function tossConfigured(): boolean {
  const client = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';
  const secret = process.env.TOSS_SECRET_KEY || '';
  const mode = client.startsWith('test_') && secret.startsWith('test_') ? 'test'
    : client.startsWith('live_') && secret.startsWith('live_') ? 'live' : null;
  return !!mode && (process.env.NODE_ENV !== 'production' || mode === 'live');
}

export function paymentsUnavailable(): boolean {
  const provider = paymentProvider();
  if (provider === 'toss') return !tossConfigured();
  return provider !== 'mock' || process.env.NODE_ENV === 'production';
}

export function paymentsUnavailableResponse() {
  return fail('PAYMENT_UNAVAILABLE', '결제 연동이 준비되지 않아 지금은 구매할 수 없어요', 503);
}
