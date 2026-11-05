import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-quote-test-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';

try {
  const { QUOTE_PACKS, quotePackById, quotePackView } = await import('../src/lib/quote-packs');
  const { purchaseQuotePack, quotePurchaseIds, QuotePurchaseError } = await import('../src/lib/quote-purchases');
  const { withDB } = await import('../src/lib/store');

  assert.equal(QUOTE_PACKS.length, 5);
  assert.equal(QUOTE_PACKS.reduce((sum, pack) => sum + pack.lines.length, 0), 38);
  assert.equal(new Set(QUOTE_PACKS.map((pack) => pack.id)).size, QUOTE_PACKS.length);
  const allLineIds = QUOTE_PACKS.flatMap((pack) => pack.lines.map((line) => line.id));
  assert.equal(new Set(allLineIds).size, allLineIds.length);
  for (const pack of QUOTE_PACKS) {
    assert.equal(pack.lines.length, pack.priceCredits === 0 ? 6 : 8);
    assert.equal(pack.rights.kind, 'ORIGINAL');
    assert.ok(pack.lines.every((line) => line.line && line.label && line.emotion));
    assert.equal(quotePackById(pack.id), pack);
    const locked = quotePackView(pack, pack.priceCredits === 0);
    if (pack.priceCredits > 0) {
      assert.equal(locked.access, 'PREVIEW');
      assert.deepEqual(locked.lines, pack.lines.slice(0, 2));
      assert.ok(!JSON.stringify(locked).includes(pack.lines[2].line));
    } else {
      assert.equal(locked.access, 'FULL');
      assert.equal(locked.lines.length, pack.lines.length);
    }
    assert.equal(quotePackView(pack, true).lines.length, pack.lines.length);
  }

  const now = new Date().toISOString();
  const user = (id: string, credits: number) => ({ id, name: id, plan: 'FREE' as const, credits, role: 'user' as const, createdAt: now, lastGrantAt: now });
  await withDB((db) => { db.users.push(user('quote-rich', 12), user('quote-poor', 5), user('quote-full', 10)); });

  // Concurrent replays create one entitlement and one ledger deduction.
  const paid = quotePackById('film-romance')!;
  const results = await Promise.all([purchaseQuotePack('quote-rich', paid.id), purchaseQuotePack('quote-rich', paid.id)]);
  assert.equal(results.filter((result) => !result.alreadyOwned).length, 1);
  assert.ok(results.every((result) => result.balance === 6));
  assert.deepEqual(await quotePurchaseIds('quote-rich'), [paid.id]);
  await withDB((db) => {
    assert.equal(db.quotePurchases.filter((purchase) => purchase.userId === 'quote-rich').length, 1);
    const entries = db.credits.filter((entry) => entry.userId === 'quote-rich');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].delta, -paid.priceCredits);
    assert.equal(entries[0].balanceAfter, 6);
    assert.equal(entries[0].refType, 'quote-pack');
    assert.ok(db.events.some((event) => event.userId === 'quote-rich' && event.type === 'quote_pack_purchased'));
  });
  const replay = await purchaseQuotePack('quote-rich', paid.id);
  assert.equal(replay.alreadyOwned, true);
  assert.equal(replay.balance, 6);

  await assert.rejects(() => purchaseQuotePack('quote-poor', 'fantasy-epic'), (error) => error instanceof QuotePurchaseError && error.code === 'INSUFFICIENT_CREDITS');
  await withDB((db) => {
    assert.equal(db.users.find((item) => item.id === 'quote-poor')?.credits, 5);
    assert.equal(db.quotePurchases.some((purchase) => purchase.userId === 'quote-poor'), false);
    assert.equal(db.credits.some((entry) => entry.userId === 'quote-poor'), false);
  });

  const full = await purchaseQuotePack('quote-full', 'noir-mystery', true);
  assert.equal(full.balance, 10);
  assert.equal(full.alreadyOwned, true);
  const free = await purchaseQuotePack('quote-full', 'daily-cuts');
  assert.equal(free.balance, 10);
  await withDB((db) => assert.equal(db.quotePurchases.some((purchase) => purchase.userId === 'quote-full'), false));
  await assert.rejects(() => purchaseQuotePack('missing-user', paid.id), (error) => error instanceof QuotePurchaseError && error.code === 'USER_NOT_FOUND');
  await assert.rejects(() => purchaseQuotePack('quote-rich', 'not-a-pack'), (error) => error instanceof QuotePurchaseError && error.code === 'PACK_NOT_FOUND');

  console.log('quote-pack tests: catalog privacy, atomic purchase, replay, balance, full/free access passed');
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
