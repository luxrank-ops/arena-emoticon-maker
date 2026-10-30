import { NextResponse } from 'next/server';

// This integration does not yet persist and verify server-side orders or support billing keys.
// Do not accept payments until settlement, refunds and reconciliation are implemented.
const unavailable = () => NextResponse.json(
  { error: '토스 결제는 안전성 검증이 완료될 때까지 사용할 수 없습니다.' },
  { status: 503 },
);
export const POST = unavailable;
export const PUT = unavailable;
