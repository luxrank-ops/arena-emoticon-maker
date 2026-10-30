import { NextResponse } from 'next/server';
import { withDB } from '@/lib/store';

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
    latencyMs: Date.now() - t0,
    time: new Date().toISOString(),
  });
}
