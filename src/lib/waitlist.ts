// ─────────────────────────────────────────────────────────────
// 사전예약(웨이트리스트) — 런칭 알림 2,000명을 담는 그릇
//  · 이메일 1개 = 1건. 대소문자·공백 정규화 후 해시로 중복 판정.
//  · UTM 스냅샷 + 초대 코드(ref)를 함께 저장 → 채널 추적용.
//  · 어뷰징 방어: 세션당 분 3회(rate limit은 라우트에서), 이메일 중복은 조용히 성공 처리
//    (이미 등록된 이메일인지 노출하지 않는다 — 계정 열거 방어).
// ─────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto';
import { uid, withDB } from '@/lib/store';
import type { Locale } from '@/lib/i18n/locale';

export interface WaitlistUtm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

export interface WaitlistSignupInput {
  email: string;
  userId?: string;
  locale?: Locale;
  utm?: WaitlistUtm;
  refCode?: string;
}

export interface WaitlistSignupResult {
  /** 이미 등록된 이메일도 true (열거 방어) */
  ok: true;
  /** 이번 요청으로 새로 등록됐는지 */
  created: boolean;
  /** 현재 누적 사전예약 수 */
  total: number;
}

export class WaitlistError extends Error {
  constructor(public code: 'INVALID_EMAIL', message: string, public status = 422) {
    super(message);
    this.name = 'WaitlistError';
  }
}

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailHashFor(email: string): string {
  return createHash('sha256').update(`emotihak:waitlist:${normalizeEmail(email)}`).digest('hex');
}

function cleanUtm(utm?: WaitlistUtm): WaitlistEntry_utm {
  if (!utm) return undefined;
  const pick = (v: string | undefined) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : undefined);
  const cleaned: WaitlistUtm = {
    source: pick(utm.source),
    medium: pick(utm.medium),
    campaign: pick(utm.campaign),
    content: pick(utm.content),
  };
  return Object.values(cleaned).some(Boolean) ? cleaned : undefined;
}

type WaitlistEntry_utm = WaitlistUtm | undefined;

export async function joinWaitlist(input: WaitlistSignupInput): Promise<WaitlistSignupResult> {
  const email = normalizeEmail(input.email);
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    throw new WaitlistError('INVALID_EMAIL', '이메일 주소를 확인해 주세요.');
  }
  const emailHash = emailHashFor(email);
  const utm = cleanUtm(input.utm);
  const refCode = typeof input.refCode === 'string' && /^[a-f0-9]{8}$/i.test(input.refCode.trim())
    ? input.refCode.trim().toLowerCase()
    : undefined;

  return withDB((db) => {
    db.waitlist ??= [];
    const existing = db.waitlist.find((row) => row.emailHash === emailHash);
    if (existing) return { ok: true as const, created: false, total: db.waitlist.length };
    db.waitlist.push({
      id: uid('wl'),
      email,
      emailHash,
      userId: input.userId,
      locale: input.locale,
      utm,
      refCode,
      createdAt: new Date().toISOString(),
    });
    return { ok: true as const, created: true, total: db.waitlist.length };
  });
}

export async function waitlistCount(): Promise<number> {
  return withDB((db) => (Array.isArray(db.waitlist) ? db.waitlist.length : 0));
}

/** 채널별 사전예약 집계 — 운영 콘솔·주간 리뷰용 (개인정보 없이 카운트만) */
export async function waitlistBySource(): Promise<{ source: string; count: number }[]> {
  return withDB((db) => {
    const rows = Array.isArray(db.waitlist) ? db.waitlist : [];
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = row.utm?.source?.trim() || '(direct)';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  });
}
