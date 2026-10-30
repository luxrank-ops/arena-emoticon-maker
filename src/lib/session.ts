import { cookies } from 'next/headers';
import { PLANS } from '@/lib/pricing';
import type { User } from '@/lib/types';
import { ensureSeed, findUser, uid, withDB } from '@/lib/store';

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
      role: sessionId === 'admin_session' ? 'admin' : 'user',
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
  return { ...user };
}

export async function getUserById(id: string): Promise<User | null> {
  return withDB((db) => {
    const u = findUser(db, id);
    return u ? { ...u } : null;
  });
}
