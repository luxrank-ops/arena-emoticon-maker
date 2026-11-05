// ─────────────────────────────────────────────────────────────
// 풀액세스(관리자 + 플레이 유료 앱) 접근 제어 (서버 전용 · 단일 소스)
//  · 관리자: 운영자 코드(ADMIN_PASSCODE) 검증 세션(role === 'admin') — 운영 콘솔 포함
//  · 플레이 사용자: 구글 플레이에서 구매한 유료 앱(TWA) 사용자 — 요청 UA 로 매 요청 결정.
//    앱 안에서는 크레딧 차감 없이 플랜 게이트(스타일·워터마크·Daily Brief·
//    카카오 패키징·굿즈 할인)를 연다. UA는 구매 증명이 아니므로 요청 제한과
//    KST 일일 AI 공정 이용 한도는 별도로 유지한다.
//  · 관리자와 플레이는 "기능 풀액세스"에서 동일하지만 운영 콘솔(metrics/purge)은
//    관리자 전용으로 분리한다.
// ─────────────────────────────────────────────────────────────
import { createHash, timingSafeEqual } from 'node:crypto';
import { ADMIN_NICKNAME, ADMIN_PASSCODE_ENV } from '@/lib/admin-config';
import { PLANS } from '@/lib/pricing';
import type { Plan, User } from '@/lib/types';

/** 풀액세스 사용자에게 허용되는 최고 플랜 (모든 기능 확인용) */
export const ADMIN_PLAN: Plan = 'STUDIO';

export type Viewer = Pick<User, 'role' | 'plan' | 'credits' | 'play'>;

export function isAdmin(viewer: Viewer | null | undefined): boolean {
  return viewer?.role === 'admin';
}

/** 구글 플레이 유료 앱(TWA) 사용자 */
export function isPlayUser(viewer: Viewer | null | undefined): boolean {
  return viewer?.play === true;
}

/** 기능 풀액세스: 관리자 또는 플레이 유료 앱 사용자 */
export function isFullAccess(viewer: Viewer | null | undefined): boolean {
  return isAdmin(viewer) || isPlayUser(viewer);
}

/** 표시용 플랜: 풀액세스 사용자는 최고 플랜으로 취급 (워터마크 제거·상업 라이선스·굿즈 할인 포함) */
export function effectivePlan(viewer: Viewer | null | undefined): Plan {
  return isFullAccess(viewer) ? ADMIN_PLAN : (viewer?.plan ?? 'FREE');
}

/** 플랜 게이트 통과 (스타일 수·Daily Brief·카카오 패키징 등) */
export function planAllows(viewer: Viewer | null | undefined, required: Plan): boolean {
  const order: Plan[] = ['FREE', 'PLUS', 'STUDIO'];
  return order.indexOf(effectivePlan(viewer)) >= order.indexOf(required);
}

/** 크레딧을 쓰지 않는다 (팩 생성·다시 그리기 모두) */
export function isUnlimited(viewer: Viewer | null | undefined): boolean {
  return isFullAccess(viewer);
}

/** UA는 구매 증명이 아니므로 속도 제한을 우회하지 않는다. 운영자만 예외다. */
export function bypassesRateLimit(viewer: Viewer | null | undefined): boolean {
  return isAdmin(viewer);
}

/** 워터마크 없는 내보내기 */
export function watermarkFor(viewer: Viewer | null | undefined): boolean {
  return PLANS[effectivePlan(viewer)].watermark;
}

/** 화면에 보여줄 플랜 이름 */
export function planLabel(viewer: Viewer | null | undefined): string {
  if (isAdmin(viewer)) return '관리자';
  if (isPlayUser(viewer)) return 'PLAY';
  return PLANS[effectivePlan(viewer)].name;
}

/** 표시용 잔액 문구 */
export function creditsLabel(viewer: Viewer | null | undefined): string {
  if (isAdmin(viewer)) return '무제한';
  if (isPlayUser(viewer)) return '차감 없음';
  return String(viewer?.credits ?? 0);
}

export { ADMIN_NICKNAME };

// ── 운영자 코드 검증 (서버 전용) ─────────────────────────────
/** 운영자 코드가 서버에 설정돼 있는지. 미설정이면 관리자 로그인은 fail-closed. */
export function hasAdminPasscode(): boolean {
  return !!process.env[ADMIN_PASSCODE_ENV];
}

/** 입력 길이와 관계없이 비교 시간을 일정하게 유지한다. */
export function matchesAdminPasscode(input: string): boolean {
  const expected = process.env[ADMIN_PASSCODE_ENV];
  if (!expected) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(input), digest(expected));
}

/**
 * 관리자 닉네임이 아니어도 운영자 코드만 맞으면 관리자로 로그인할지.
 *  · 기본 true — 로컬/프리뷰에서 아무 식별자(닉네임·이메일)와 운영자 코드로 들어올 수 있다.
 *  · 운영에서 닉네임까지 강제하려면 ADMIN_LOGIN_ANY_IDENTIFIER=0.
 */
export function adminLoginAnyIdentifier(): boolean {
  return process.env.ADMIN_LOGIN_ANY_IDENTIFIER !== '0';
}
