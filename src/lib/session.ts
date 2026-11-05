import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { PLANS } from '@/lib/pricing';
import type { User } from '@/lib/types';
import { ensureSeed, findUser, uid, withDB } from '@/lib/store';
import { maybePurgeFaces } from '@/lib/purge';

export const SID_COOKIE = 'emotime_sid';
export const AUTH_COOKIE = 'emotime_auth';
export const ADMIN_USER_ID = 'account_admin';
export const hashSessionToken = (token: string) => createHash('sha256').update(token).digest('hex');
const GUEST = 'guest_session';

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function resolve(sessionId: string): Promise<User> {
  return withDB((db) => {
    ensureSeed(db);
    // 게스트 쿠키는 인증 수단이 아니다. 계정 ID를 넣어도 해당 회원으로 접속할 수 없다.
    const protectedId = sessionId === ADMIN_USER_ID || db.accounts.some((a) => a.userId === sessionId);
    const guestId = protectedId ? `guest_${hashSessionToken(sessionId)}` : sessionId;
    const existing = findUser(db, guestId);
    if (existing) return { ...grantMonthly(db, existing), role: 'user' as const };

    const user: User = {
      id: guestId,
      name: '이모티학 사용자',
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

/** Next.js 16: cookies() 는 Promise 이므로 반드시 await 한다 (동기 접근은 500 이 된다). */
export async function sessionIdFromCookies(): Promise<string> {
  try {
    return (await cookies()).get(SID_COOKIE)?.value ?? GUEST;
  } catch {
    return GUEST;
  }
}

export async function getCurrentUser(): Promise<User & { isAuthenticated: boolean }> {
  const sid = await sessionIdFromCookies();
  let token: string | undefined;
  try { token = (await cookies()).get(AUTH_COOKIE)?.value; } catch { /* 요청 밖에서는 게스트 */ }
  let user: User | null = null;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const tokenHash = hashSessionToken(token);
    user = await withDB((db) => {
      const session = db.sessions.find((s) => s.tokenHash === tokenHash && Date.parse(s.expiresAt) > Date.now());
      const accountUser = session && findUser(db, session.userId);
      if (!accountUser || (accountUser.id === ADMIN_USER_ID && !process.env.ADMIN_PASSCODE)) return null;
      if (accountUser.id !== ADMIN_USER_ID && !db.accounts.some((a) => a.userId === accountUser.id)) return null;
      return { ...grantMonthly(db, accountUser), role: accountUser.id === ADMIN_USER_ID ? 'admin' as const : 'user' as const };
    });
  }
  const isAuthenticated = !!user;
  user ??= await resolve(sid);
  return { ...user, isAuthenticated };
}

export async function getUserById(id: string): Promise<User | null> {
  return withDB((db) => {
    const u = findUser(db, id);
    return u ? { ...u } : null;
  });
}
