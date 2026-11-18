// ─────────────────────────────────────────────────────────────
// 풀액세스(관리자 + 플레이 구매자) 접근 제어 (서버 전용 · 단일 소스)
//  · 관리자: 운영자 코드(ADMIN_PASSCODE) 검증 세션(role === 'admin') — 운영 콘솔 포함
//  · 플레이 구매자: 서버가 구매 토큰을 검증해 남긴 자격 기록(playVerified)만 인정한다.
//    TWA/ UA 토큰은 "앱 안에서 실행 중"이라는 환경 신호일 뿐 구매 증명이 아니므로
//    (isPlayUser) 자격 판정에 쓰지 않는다. 위조한 UA 로 유료 기능이 열리던 경로를 닫았다.
//    구매 자격이 확인된 사용자는 크레딧 차감 없이 플랜 게이트가 열리지만, 요청 제한과
//    KST 일일 AI 공정 이용 한도는 그대로 유지한다.
//  · 관리자와 플레이는 "기능 풀액세스"에서 동일하지만 운영 콘솔(metrics/purge)은
//    관리자 전용으로 분리한다.
// ─────────────────────────────────────────────────────────────
import { createHash, timingSafeEqual } from 'node:crypto';
import { ADMIN_NICKNAME, ADMIN_PASSCODE_ENV } from '@/lib/admin-config';
import { PLANS } from '@/lib/pricing';
import type { Plan, User } from '@/lib/types';

/** 풀액세스 사용자에게 허용되는 최고 플랜 (모든 기능 확인용) */
export const ADMIN_PLAN: Plan = 'STUDIO';

export type Viewer = Pick<User, 'role' | 'plan' | 'credits' | 'play'> & {
  /** 서버가 구글 플레이 구매 토큰을 검증해 확인한 자격 (play_purchases ACTIVE) */
  playVerified?: boolean;
};

export function isAdmin(viewer: Viewer | null | undefined): boolean {
  return viewer?.role === 'admin';
}

/**
 * TWA(구글 플레이 앱) 안에서 실행 중이라는 환경 신호.
 * 구매·자격 증명이 아니므로 이 값만으로 유료 기능을 열지 않는다 (UI 안내용).
 */
export function isPlayUser(viewer: Viewer | null | undefined): boolean {
  return viewer?.play === true;
}

/** 서버에서 구매가 확인된 플레이 구매자 */
export function hasPlayEntitlement(viewer: Viewer | null | undefined): boolean {
  return viewer?.playVerified === true;
}

/** 기능 풀액세스: 관리자 또는 서버 검증된 플레이 구매자 */
export function isFullAccess(viewer: Viewer | null | undefined): boolean {
  return isAdmin(viewer) || hasPlayEntitlement(viewer);
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
  if (hasPlayEntitlement(viewer)) return 'PLAY';
  return PLANS[effectivePlan(viewer)].name;
}

/** 표시용 잔액 문구 */
export function creditsLabel(viewer: Viewer | null | undefined): string {
  if (isAdmin(viewer)) return '무제한';
  if (hasPlayEntitlement(viewer)) return '차감 없음';
  return String(viewer?.credits ?? 0);
}

export { ADMIN_NICKNAME };

// ── 운영자 코드 검증 (서버 전용) ─────────────────────────────
// ── AI 생성 허용 범위 (베타 정비) ────────────────────────────
/** 관리자 전용 안내 문구 (API 응답·화면 공용) */
export const AI_ADMIN_ONLY_MESSAGE = '현재 베타 정비 중으로 관리자만 AI 생성이 가능합니다.';

/**
 * AI 생성(이미지 생성·사진 특징 재확인)을 관리자에게만 허용할지.
 *  · 기본값 1(관리자 전용) — 유료 등급 정비가 끝날 때까지 무료 사용자 유입으로 인한 역마진을 막는다.
 *  · 운영에서 전체 공개로 되돌리려면 Worker 변수 GENERATION_ADMIN_ONLY=0.
 */
export function generationAdminOnly(): boolean {
  const raw = String((globalThis as any).CLOUDFLARE_ENV?.GENERATION_ADMIN_ONLY ?? process.env.GENERATION_ADMIN_ONLY ?? '1').trim();
  return raw !== '0';
}

/**
 * 무료 체험 개방 스위치 (2026-11-18).
 *  · 기본값 1(켬) — 배포만으로 일반 방문자가 '시안 1장 + 컷 2장' 맛보기를 할 수 있다.
 *  · 닫으려면 Worker 변수 TRIAL_FREE_ENABLED=0 (상한·원가 방어 코드는 그대로 남는다).
 *  · 맛보기의 원가는 free-trial.ts 의 사용자·IP·하루·월 카운터가 막는다.
 */
export function trialFreeEnabled(): boolean {
  const raw = String((globalThis as any).CLOUDFLARE_ENV?.TRIAL_FREE_ENABLED ?? process.env.TRIAL_FREE_ENABLED ?? '1').trim().toLowerCase();
  return !(raw === '0' || raw === 'false' || raw === 'off');
}

/**
 * AI 생성 접근 등급
 *  · full    : 관리자·서버 검증된 플레이 구매자·DEMO 모드 — 제한 없이 생성
 *  · trial   : 일반 방문자 — 무료 체험 상한(사용자·IP·전체) 안에서만 생성
 *  · blocked : 관리자 전용 기간 + 체험 닫힘
 */
export type AiAccess = 'full' | 'trial' | 'blocked';

/**
 * 이 사용자가 지금 AI 생성을 요청할 수 있는지 (서버 측 단일 판단 지점)
 *  · 관리자: 항상 허용.
 *  · 플레이 구매자: **서버에서 구매가 검증된 경우에만** 허용한다(원가 방어는 play-usage 일일 한도).
 *    UA/헤더만으로는 절대 열지 않는다 — 그 신호는 위조할 수 있다.
 *  · 그 밖의 사용자: GENERATION_ADMIN_ONLY 가 꺼져 있으면 허용, 켜져 있어도 무료 체험이 열려 있으면
 *    'trial'(맛보기 전용 — 렌더 라우트가 free-trial 카운터로 원가를 막는다).
 */
export function aiAccess(viewer: Viewer | null | undefined): AiAccess {
  if (isAdmin(viewer)) return 'full';
  // DEMO_MODE 는 AI 를 호출하지 않고 절차적 SVG 로만 그리므로 비용이 0 → CI·시연 경로는 막지 않는다.
  const demo = String((globalThis as any).CLOUDFLARE_ENV?.DEMO_MODE ?? process.env.DEMO_MODE ?? '').trim();
  if (demo === '1') return 'full';
  if (hasPlayEntitlement(viewer)) return 'full';
  if (!generationAdminOnly()) return 'full';
  return trialFreeEnabled() ? 'trial' : 'blocked';
}

export function canUseAiGeneration(viewer: Viewer | null | undefined): boolean {
  return aiAccess(viewer) !== 'blocked';
}

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
 *  · 기본 false(fail-closed) — 운영자 닉네임 + 운영자 코드 조합만 관리자 세션이 된다.
 *    (기본값이 열려 있으면 아무 식별자나 시도할 수 있어 코드 유출 시 공격면이 넓어진다.)
 *  · 로컬/프리뷰에서 아무 식별자로 들어와야 할 때만 ADMIN_LOGIN_ANY_IDENTIFIER=1 을 명시한다.
 */
export function adminLoginAnyIdentifier(): boolean {
  return process.env.ADMIN_LOGIN_ANY_IDENTIFIER === '1';
}
