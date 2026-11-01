import { findUser, uid, withDB } from '@/lib/store';
import type { CreditEntry } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 크레딧 원장 (append-only)
//  · 잔액은 캐시, 진실은 항상 원장 합계
//  · (userId, refType, refId, reason) 멱등키로 중복 차감 차단
// ─────────────────────────────────────────────────────────────

export class CreditError extends Error {
  code: 'INSUFFICIENT' | 'DUPLICATE' | 'NO_USER';
  constructor(code: CreditError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

interface DeltaInput {
  userId: string;
  delta: number;
  reason: CreditEntry['reason'];
  refType?: string;
  refId?: string;
}

export async function applyCredits(input: DeltaInput): Promise<{ balance: number; entry: CreditEntry }> {
  return withDB((db) => {
    const user = findUser(db, input.userId);
    if (!user) throw new CreditError('NO_USER', '사용자를 찾을 수 없습니다');

    if (input.refType && input.refId) {
      const dup = db.credits.find(
        (c) =>
          c.userId === input.userId &&
          c.reason === input.reason &&
          c.refType === input.refType &&
          c.refId === input.refId,
      );
      if (dup) throw new CreditError('DUPLICATE', '이미 처리된 요청입니다');
    }

    if (input.delta < 0 && user.credits + input.delta < 0) {
      throw new CreditError('INSUFFICIENT', '크레딧이 부족합니다');
    }

    user.credits += input.delta;
    const entry: CreditEntry = {
      id: uid('cr'),
      userId: input.userId,
      delta: input.delta,
      reason: input.reason,
      refType: input.refType,
      refId: input.refId,
      balanceAfter: user.credits,
      createdAt: new Date().toISOString(),
    };
    db.credits.push(entry);
    return { balance: user.credits, entry };
  });
}

export async function creditHistory(userId: string, limit = 20) {
  return withDB((db) =>
    db.credits
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  );
}

export async function ledgerBalance(userId: string) {
  return withDB((db) => db.credits.filter((c) => c.userId === userId).reduce((s, c) => s + c.delta, 0));
}
