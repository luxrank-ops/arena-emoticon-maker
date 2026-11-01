import { NextResponse } from 'next/server';
import { storeStatus, withDB } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  const counts = await withDB((db) => ({
    users: db.users.length,
    packs: db.packs.length,
    orders: db.orders.length,
  }));
  return NextResponse.json({
    ok: true,
    service: 'emotime',
    version: '0.2.0',
    mode: process.env.GEMINI_API_KEY ? 'gemini' : 'demo-renderer',
    db: counts,
    // 저장소 상태: persistent(영속) / ephemeral(/tmp · 인스턴스 로컬) / memory(휘발)
    store: storeStatus(),
    latencyMs: Date.now() - t0,
    time: new Date().toISOString(),
  });
}
