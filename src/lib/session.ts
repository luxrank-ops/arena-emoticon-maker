import { cookies } from 'next/headers';
import { PLANS } from '@/lib/pricing';
import type { User } from '@/lib/types';
import { ensureSeed, findUser, uid, withDB } from '@/lib/store';
import { maybePurgeFaces } from '@/lib/purge';

export const SID_COOKIE = 'emotime_sid';
const GUEST = 'guest_session';

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function resolve(sessionId: string): Promise<User> {
  return withDB((db) => {
    ensureSeed(db);
    const existing = findUser(db, sessionId);
    if (existing) return grantMonthly(db, existing);

    const user: User = {
      id: sessionId,
      name: '이모티미 사용자',
      plan: 'FREE',
      credits: PLANS.FREE.credits,
      // 관리자 권한은 오직 운영자 코드 검증(/api/admin/login)으로만 부여한다.
      // (과거: sessionId === 'admin_session' 이면 admin → 쿠키 위조로 권한 탈취 가능)
      role: 'user',
      createdAt: new Date().toISOString(),
      lastGrantAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.credits.push({
      id: uid('cr'),
      userId: user.id,
      delta: PLANS.FREE.credits,
      reason: 'SIGNUP_BONUS',
      balanceAfter: user.credits,
      createdAt: new Date().toISOString(),
    });
    return user;
  });
}

/** 월간 크레딧 자동 지급 (월이 바뀌면 1회) */
function grantMonthly(db: Parameters<Parameters<typeof withDB>[0]>[0], user: User): User {
  const now = new Date();
  if (monthKey(new Date(user.lastGrantAt)) === monthKey(now)) return user;
  const amount = PLANS[user.plan].credits;
  user.credits += amount;
  user.lastGrantAt = now.toISOString();
  db.credits.push({
    id: uid('cr'),
    userId: user.id,
    delta: amount,
    reason: 'SUBSCRIPTION_GRANT',
    balanceAfter: user.credits,
    createdAt: now.toISOString(),
  });
  return user;
}

export function sessionIdFromCookies(): string {
  try {
    return cookies().get(SID_COOKIE)?.value ?? GUEST;
  } catch {
    return GUEST;
  }
}

export async function getCurrentUser(): Promise<User> {
  const sid = sessionIdFromCookies();
  const user = await resolve(sid);
  // 얼굴 파기 기회적 스윕 (5분에 1회, 비동기 fire-and-forget)
  //  · 크론이 없는 환경에서도 24시간 파기 정책이 실제로 지켜지게 하는 안전망
  void maybePurgeFaces();
  return { ...user };
}

export async function getUserById(id: string): Promise<User | null> {
  return withDB((db) => {
    const u = findUser(db, id);
    return u ? { ...u } : null;
  });
}
