import { fail } from '@/lib/api';

// ─────────────────────────────────────────────────────────────
// 결제 안전 가드 (서버 전용)
//  · PAYMENT_PROVIDER 가 'toss' 가 아니면 결제는 mock(가짜) 이다.
//  · mock 결제는 실제 돈을 받지 않으므로, 운영 환경(NODE_ENV=production)에서는
//    크레딧 지급·굿즈 주문 접수를 모두 막는다. 로컬 개발에서는 기존처럼 동작한다.
// ─────────────────────────────────────────────────────────────

export function paymentProvider(): string {
  return (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase();
}

/** 운영 환경인데 실제 결제 연동(toss)이 없으면 true → 결제 관련 요청을 거부한다 */
export function paymentsUnavailable(): boolean {
  return process.env.NODE_ENV === 'production' && paymentProvider() !== 'toss';
}

export function paymentsUnavailableResponse() {
  return fail('PAYMENT_UNAVAILABLE', '결제 연동이 준비되지 않아 지금은 구매할 수 없어요', 503);
}
