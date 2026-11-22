// ─────────────────────────────────────────────────────────────
// 친구 초대(추천) — 워터마크 바이럴 루프의 서버 쪽 추적
//  · 초대 링크: https://emotihak.com/?ref=<코드>  (공유 이미지 하단 워터마크에도 같은 링크)
//  · 초대받은 사람이 '처음 미리보기 팩을 만들거나 가입'하면 초대한 사람에게 3컷(크레딧) 지급.
//  · 방문만으로는 지급하지 않는다 (원가·어뷰징 방어). 초대 1명당 1회, 하루 5명까지.
// ─────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto';
import { logEvent, uid, withDB } from '@/lib/store';
import type { Referral, User } from '@/lib/types';

export const REFERRAL_REWARD_CUTS = 3;
export const REFERRAL_DAILY_CAP = 5;
export const REFERRAL_CODE_PATTERN = /^[a-f0-9]{8}$/;

export class ReferralError extends Error {
  constructor(public code: 'INVALID_CODE' | 'SELF_REFERRAL' | 'ALREADY_CLAIMED' | 'NOT_NEW_USER' | 'INVITER_NOT_FOUND' | 'DAILY_CAP', message: string, public status = 409) {
    super(message);
    this.name = 'ReferralError';
  }
}

export function referralCodeFor(userId: string): string {
  return createHash('sha256').update(`emotihak:ref:${userId}`).digest('hex').slice(0, 8);
}

export function referralLinkFor(code: string, origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://emotihak.com').replace(/\/+$/, '');
  return `${base}/?ref=${code}`;
}

export interface ReferralSummary {
  code: string;
  link: string;
  /** 나를 통해 들어온 사람 수 (보상 완료 기준) */
  invited: number;
  /** 받은 보너스 컷 합계 */
  earnedCuts: number;
  rewardCuts: number;
}

/** 내 초대 코드·실적. 코드는 처음 필요할 때 발급해 사용자에 저장한다. */
export async function referralSummaryFor(userId: string, origin?: string): Promise<ReferralSummary> {
  return withDB((db) => {
    const user = db.users.find((item) => item.id === userId);
    let code = user?.referralCode;
    if (!code && user) {
      code = referralCodeFor(userId);
      user.referralCode = code;
    }
    code = code ?? referralCodeFor(userId);
    const mine = (db.referrals ?? []).filter((row) => row.inviterId === userId && row.status === 'REWARDED');
    return {
      code,
      link: referralLinkFor(code, origin),
      invited: mine.length,
      earnedCuts: mine.reduce((sum, row) => sum + row.rewardCuts, 0),
      rewardCuts: REFERRAL_REWARD_CUTS,
    };
  });
}

/**
 * 초대받은 사람의 방문 기록 (PENDING). 아직 보상은 없다.
 *  · 이미 다른 초대 코드를 쓴 사용자는 다시 기록하지 않는다 (첫 초대만 인정).
 */
export async function claimReferral(inviteeId: string, rawCode: string): Promise<{ claimed: boolean; reason?: string }> {
  const code = rawCode.trim().toLowerCase();
  if (!REFERRAL_CODE_PATTERN.test(code)) throw new ReferralError('INVALID_CODE', '초대 코드를 확인해 주세요.', 422);

  return withDB((db) => {
    const invitee = db.users.find((item) => item.id === inviteeId);
    if (!invitee) throw new ReferralError('INVITER_NOT_FOUND', '사용자를 찾을 수 없습니다.', 404);
    const existing = (db.referrals ?? []).find((row) => row.inviteeId === inviteeId);
    if (existing) return { claimed: false, reason: 'ALREADY_CLAIMED' };

    const inviter = db.users.find((item) => (item.referralCode ?? referralCodeFor(item.id)) === code);
    if (!inviter) throw new ReferralError('INVITER_NOT_FOUND', '초대 코드를 찾을 수 없습니다.', 404);
    if (inviter.id === inviteeId) throw new ReferralError('SELF_REFERRAL', '내 초대 링크로는 보상을 받을 수 없어요.', 409);

    const referral: Referral = {
      id: uid('ref'),
      inviterId: inviter.id,
      inviteeId,
      code,
      rewardCuts: REFERRAL_REWARD_CUTS,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    db.referrals.push(referral);
    return { claimed: true };
  });
}

function kstDay(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

/**
 * 초대받은 사람이 실제로 체험(미리보기 팩 생성)이나 가입을 마쳤을 때 보상을 지급한다.
 *  · 초대 1명당 1회, 하루 5명까지.
 *  · 지급은 멱등: 이미 REWARDED 면 아무 것도 하지 않는다.
 */
export async function rewardReferralForInvitee(inviteeId: string): Promise<{ rewarded: boolean; inviterId?: string; cuts?: number }> {
  return withDB((db) => {
    const referral = (db.referrals ?? []).find((row) => row.inviteeId === inviteeId);
    if (!referral || referral.status !== 'PENDING') return { rewarded: false };
    const inviter = db.users.find((item) => item.id === referral.inviterId);
    if (!inviter) return { rewarded: false };
    // 초대받은 사람이 이미 팩을 여러 개 가진 기존 사용자면 보상하지 않는다 (신규 한정).
    const inviteePacks = db.packs.filter((pack) => pack.userId === inviteeId).length;
    if (inviteePacks > 1) {
      referral.status = 'SKIPPED';
      referral.reason = 'NOT_NEW_USER';
      return { rewarded: false };
    }
    const day = kstDay();
    const todayRewards = (db.referrals ?? []).filter((row) =>
      row.inviterId === inviter.id && row.status === 'REWARDED' && (row.rewardedAt ?? '').slice(0, 10) >= day,
    ).length;
    if (todayRewards >= REFERRAL_DAILY_CAP) {
      referral.status = 'SKIPPED';
      referral.reason = 'DAILY_CAP';
      return { rewarded: false };
    }
    inviter.credits += REFERRAL_REWARD_CUTS;
    db.credits.push({
      id: uid('cr'),
      userId: inviter.id,
      delta: REFERRAL_REWARD_CUTS,
      reason: 'REFERRAL',
      refType: 'referral',
      refId: referral.id,
      balanceAfter: inviter.credits,
      createdAt: new Date().toISOString(),
      memo: `친구 초대 보상 · ${REFERRAL_REWARD_CUTS}컷`,
    });
    referral.status = 'REWARDED';
    referral.rewardedAt = new Date().toISOString();
    logEvent(db, inviter.id, 'referral_rewarded', { inviteeId, cuts: REFERRAL_REWARD_CUTS });
    return { rewarded: true, inviterId: inviter.id, cuts: REFERRAL_REWARD_CUTS };
  });
}

/** 테스트·운영 점검용: 초대 코드로 초대자 찾기 */
export async function inviterForCode(code: string): Promise<User | null> {
  return withDB((db) => db.users.find((item) => (item.referralCode ?? referralCodeFor(item.id)) === code) ?? null);
}
