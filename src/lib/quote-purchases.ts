import { quotePackById, type QuotePack } from '@/lib/quote-packs';
import { findUser, logEvent, uid, withDB, withPaymentDB } from '@/lib/store';
import type { QuotePurchase } from '@/lib/types';

export class QuotePurchaseError extends Error {
  code: 'PACK_NOT_FOUND' | 'USER_NOT_FOUND' | 'INSUFFICIENT_CREDITS';

  constructor(code: QuotePurchaseError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

export async function quotePurchaseIds(userId: string): Promise<string[]> {
  return withDB((db) => db.quotePurchases.filter((purchase) => purchase.userId === userId).map((purchase) => purchase.packId));
}

export interface QuotePurchaseResult {
  pack: QuotePack;
  purchase: QuotePurchase | null;
  balance: number;
  alreadyOwned: boolean;
}

/** Atomic entitlement + credit ledger write. Replays never charge twice. */
export async function purchaseQuotePack(userId: string, packId: string, fullAccess = false): Promise<QuotePurchaseResult> {
  const pack = quotePackById(packId);
  if (!pack) throw new QuotePurchaseError('PACK_NOT_FOUND', '대사 팩을 찾을 수 없습니다');

  return withPaymentDB((db) => {
    const user = findUser(db, userId);
    if (!user) throw new QuotePurchaseError('USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
    const existing = db.quotePurchases.find((purchase) => purchase.userId === userId && purchase.packId === pack.id);
    if (existing) return { pack, purchase: existing, balance: user.credits, alreadyOwned: true };

    // Free samples and paid-app/admin full access need no entitlement row or ledger deduction.
    if (fullAccess || pack.priceCredits === 0) {
      return { pack, purchase: null, balance: user.credits, alreadyOwned: true };
    }
    if (user.credits < pack.priceCredits) {
      throw new QuotePurchaseError('INSUFFICIENT_CREDITS', `${pack.priceCredits}크레딧이 필요합니다. 현재 ${user.credits}크레딧입니다.`);
    }

    const purchase: QuotePurchase = {
      id: uid('qpur'),
      userId,
      packId: pack.id,
      creditsSpent: pack.priceCredits,
      createdAt: new Date().toISOString(),
    };
    user.credits -= pack.priceCredits;
    db.credits.push({
      id: uid('cr'),
      userId,
      delta: -pack.priceCredits,
      reason: 'PURCHASE',
      refType: 'quote-pack',
      refId: purchase.id,
      balanceAfter: user.credits,
      createdAt: purchase.createdAt,
    });
    db.quotePurchases.push(purchase);
    logEvent(db, userId, 'quote_pack_purchased', { packId: pack.id, credits: pack.priceCredits });
    return { pack, purchase, balance: user.credits, alreadyOwned: false };
  });
}
