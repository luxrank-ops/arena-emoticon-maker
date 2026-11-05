import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { AUTH_COOKIE, ADMIN_USER_ID, hashSessionToken } from '@/lib/session';
import { ADMIN_NICKNAME } from '@/lib/admin-config';
import { adminLoginAnyIdentifier, matchesAdminPasscode } from '@/lib/admin-access';
import { PLANS } from '@/lib/pricing';
import { uid, withDB } from '@/lib/store';

const scrypt = promisify(scryptCallback);
export { ADMIN_NICKNAME };
const SESSION_SECONDS = 60 * 60 * 24 * 30;
/** 관리자 로그인 실패 허용 횟수 (15분 롤링) */
const MAX_ADMIN_ATTEMPTS = 5;
export const nicknameKey = (value: string) => value.trim().normalize('NFKC').toLowerCase();
const emailSchema = z.string().trim().email().max(254).transform((s) => s.toLowerCase());
const nicknameSchema = z.string().trim().min(2).max(20).refine((s) => /^[\p{L}\p{N}_-]+$/u.test(s), '닉네임은 문자, 숫자, 밑줄, 하이픈만 사용할 수 있습니다');
const birthSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return false;
  const now = new Date();
  const today = new Date(now.getTime() + 9 * 3600_000);
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) age--;
  return age >= 14 && age <= 120;
}, '올바른 생년월일을 입력해 주세요. 만 14세 이상만 가입할 수 있습니다.');
export const signupSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(40),
  nickname: nicknameSchema,
  birthDate: birthSchema,
  gender: z.enum(['male', 'female', 'unspecified']),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다').max(128),
  consent: z.literal(true, { errorMap: () => ({ message: '이용약관 및 개인정보 수집에 동의해 주세요' }) }),
});
export const loginSchema = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });

async function derive(password: string, salt: string): Promise<Buffer> {
  return await scrypt(password, salt, 64) as Buffer;
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [type, salt, digest] = hash.split('$');
  if (type !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(digest ?? '')) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(digest, 'hex'));
}

export class AuthError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export async function signup(input: z.infer<typeof signupSchema>) {
  const key = nicknameKey(input.nickname);
  if (key === nicknameKey(ADMIN_NICKNAME)) throw new AuthError('NICKNAME_RESERVED', '사용할 수 없는 닉네임입니다', 409);
  const passwordHash = await hashPassword(input.password);
  const userId = `account_${randomBytes(16).toString('hex')}`;
  const now = new Date().toISOString();
  await withDB((db) => {
    if (db.accounts.some((a) => a.email === input.email || a.nicknameKey === key)) {
      throw new AuthError('DUPLICATE_ACCOUNT', '이미 사용 중인 이메일 또는 닉네임입니다', 409);
    }
    db.users.push({ id: userId, name: input.nickname, plan: 'FREE', credits: PLANS.FREE.credits, role: 'user', createdAt: now, lastGrantAt: now });
    db.accounts.push({ userId, email: input.email, name: input.name, nickname: input.nickname, nicknameKey: key, birthDate: input.birthDate, gender: input.gender, passwordHash, consentAt: now });
    db.credits.push({ id: uid('cr'), userId, delta: PLANS.FREE.credits, reason: 'SIGNUP_BONUS', balanceAfter: PLANS.FREE.credits, createdAt: now });
  });
  await createSession(userId);
}

export async function login(identifier: string, password: string) {
  const key = nicknameKey(identifier);
  const adminNickname = key === nicknameKey(ADMIN_NICKNAME);

  // 관리자 로그인 — 운영자 코드(ADMIN_PASSCODE)만 검증한다.
  //  · 관리자 닉네임('풍고')으로 시도하면 항상 코드 검증 → 실패 시 401.
  //  · 다른 식별자여도 코드가 정확히 일치하면 관리자 세션을 발급한다(관리자 모드 체험용, ADMIN_LOGIN_ANY_IDENTIFIER=0 으로 끌 수 있음).
  if (adminNickname || adminLoginAnyIdentifier()) {
    if (!process.env.ADMIN_PASSCODE) {
      if (adminNickname) throw new AuthError('ADMIN_DISABLED', '관리자 로그인이 설정되지 않았습니다', 503);
    } else {
      // 공유 저장소에서 관리자 로그인 시도를 제한한다. 쿠키 교체나 인스턴스 변경으로 우회하지 못하도록 한다.
      const allowed = await withDB((db) => {
        const now = Date.now();
        db.adminLoginAttempts = db.adminLoginAttempts.filter((time) => time > now - 15 * 60_000);
        if (db.adminLoginAttempts.length >= MAX_ADMIN_ATTEMPTS) return false;
        db.adminLoginAttempts.push(now);
        return true;
      });
      if (!allowed) throw new AuthError('RATE_LIMITED', '관리자 로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요', 429);
      if (matchesAdminPasscode(password)) {
        await withDB((db) => {
          const existing = db.users.find((u) => u.id === ADMIN_USER_ID);
          const now = new Date().toISOString();
          if (!existing) {
            db.users.push({ id: ADMIN_USER_ID, name: ADMIN_NICKNAME, role: 'admin', plan: 'STUDIO', credits: 0, createdAt: now, lastGrantAt: now });
          } else {
            // 과거에 FREE 로 만들어진 관리자 계정도 플랜 게이트에서 제외되게 한다.
            existing.role = 'admin';
            existing.plan = 'STUDIO';
          }
        });
        await createSession(ADMIN_USER_ID);
        return;
      }
      if (adminNickname) throw new AuthError('INVALID_LOGIN', '이메일 또는 닉네임과 비밀번호를 확인해 주세요', 401);
    }
  }
  const account = await withDB((db) => db.accounts.find((a) => a.email === identifier.trim().toLowerCase() || a.nicknameKey === key) ?? null);
  // 존재하지 않는 계정도 scrypt를 수행해 계정 존재 여부 노출을 줄인다.
  const valid = await verifyPassword(password, account?.passwordHash ?? 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128));
  if (!account || !valid) throw new AuthError('INVALID_LOGIN', '이메일 또는 닉네임과 비밀번호를 확인해 주세요', 401);
  await createSession(account.userId);
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  let old: string | undefined;
  try { old = (await cookies()).get(AUTH_COOKIE)?.value; } catch { /* noop */ }
  await withDB((db) => {
    db.sessions = db.sessions.filter((s) => Date.parse(s.expiresAt) > Date.now() && (!old || s.tokenHash !== hashSessionToken(old)));
    db.sessions.push({ tokenHash, userId, expiresAt });
  });
  (await cookies()).set(AUTH_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS });
}

export async function logout() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (token) await withDB((db) => { db.sessions = db.sessions.filter((s) => s.tokenHash !== hashSessionToken(token)); });
  (await cookies()).set(AUTH_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}
