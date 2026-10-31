import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';

// ─────────────────────────────────────────────────────────────
// 요청 제한 (슬라이딩 윈도우, 인메모리)
//  · 데모 원가는 0이지만, 실서비스에서 답장/얼굴분석/결제 엔드포인트는 남용 경로가 된다.
//  · 키 = 세션 ID + 버킷 이름 → 로그인 없이도 세션 단위로 제한된다.
//  · 멀티 인스턴스에서는 인스턴스별 제한이 되므로, 프로덕션에서는 Redis(BullMQ 인프라) 기반으로
//    교체할 것 (docs/ARCHITECTURE.md ADR-008 과 동일한 어댑터 전략).
// ─────────────────────────────────────────────────────────────

const WINDOW_MS = 60_000;
const MAX_KEYS = 5_000;

interface Bucket {
  hits: number[];
}
const store = globalThis as unknown as { __emotimeRate?: Map<string, Bucket> };
store.__emotimeRate ??= new Map<string, Bucket>();
const buckets = store.__emotimeRate;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

export function rateLimit(key: string, limit: number, windowMs = WINDOW_MS, now = Date.now()): RateLimitResult {
  const from = now - windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) {
      // 메모리 보호: 가장 오래된 키부터 제거
      const oldest = buckets.keys().next().value;
      if (oldest) buckets.delete(oldest);
    }
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => t > from);
  if (bucket.hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.hits[0] + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec, limit };
  }
  bucket.hits.push(now);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSec: 0, limit };
}

/** 라우트에서 한 줄로 쓰는 헬퍼. 제한 초과 시 NextResponse(429) 반환. */
export function enforceRateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowMs = WINDOW_MS,
): NextResponse | null {
  if (process.env.RATE_LIMIT_DISABLED === '1') return null;
  const result = rateLimit(`${userId}:${bucket}`, limit, windowMs);
  if (result.allowed) return null;
  const res = fail('RATE_LIMITED', `요청이 너무 많습니다. ${result.retryAfterSec}초 후 다시 시도해 주세요`, 429);
  res.headers.set('Retry-After', String(result.retryAfterSec));
  res.headers.set('X-RateLimit-Limit', String(result.limit));
  res.headers.set('X-RateLimit-Remaining', '0');
  return res;
}

/** 테스트/개발용 초기화 */
export function resetRateLimits() {
  buckets.clear();
}

export const RATE_LIMITS = {
  reply: 30,
  faceAnalyze: 15,
  sheets: 20,
  packs: 10,
  checkout: 10,
  confirm: 10,
  goods: 10,
  brief: 40,
  adminLogin: 5,
  adminPurge: 5,
  cron: 10,
} as const;
