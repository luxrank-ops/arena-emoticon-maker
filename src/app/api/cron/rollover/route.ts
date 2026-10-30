import { NextResponse } from 'next/server';

// The old implementation granted credits repeatedly without tracking unused balances.
// Keep this disabled until a transactional, period-idempotent ledger is implemented.
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ error: '크레딧 이월 기능은 안전성 검증을 위해 중지되었습니다.' }, { status: 503 });
}
export const POST = GET;
