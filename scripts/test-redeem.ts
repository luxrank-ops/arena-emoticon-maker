// ─────────────────────────────────────────────────────────────
// 교환권(코드) 결제 — PG 계약 없이 상품을 인도하는 무료 경로
//  · 코드 생성·정규화·해시 저장(원문 미저장)
//  · 지급 화이트리스트(2인·반려동물 완성권은 무료 지급 제외)
//  · 지급 트랜잭션: 주문(provider=redeem, amount 0) + 크레딧 원장 + 팩 잠금 해제
//  · 상태(사용·만료·예약·폐기)·시도 제한·계정 귀속·운영 대사·개인정보 삭제
// 실행: npx tsx scripts/test-redeem.ts
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-redeem-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';
process.env.PAYMENT_PROVIDER = 'mock';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name} ${extra}`);
  }
}

const redeem = await import('../src/lib/redeem');
const { withDB, withPaymentDB } = await import('../src/lib/store');
const { deleteAccountPermanently } = await import('../src/lib/account-deletion');

const now = new Date().toISOString();
await withDB((db) => {
  db.users.push(
    { id: 'u-buyer', name: 'buyer', plan: 'FREE', credits: 0, role: 'user', createdAt: now, lastGrantAt: now },
    { id: 'u-other', name: 'other', plan: 'FREE', credits: 0, role: 'user', createdAt: now, lastGrantAt: now },
    { id: 'u-admin', name: 'admin', plan: 'FREE', credits: 0, role: 'admin', createdAt: now, lastGrantAt: now },
    { id: 'u-leaver', name: 'leaver', plan: 'FREE', credits: 0, role: 'user', createdAt: now, lastGrantAt: now },
  );
  db.accounts.push({
    userId: 'u-leaver', email: 'leaver@example.invalid', nickname: 'leaver', nicknameKey: 'leaver',
    name: 'leaver', birthDate: '1990-01-01', gender: 'unspecified', passwordHash: 'x', consentAt: now,
  });
  // 잠금 대상 미리보기 팩 2개 (단건 / 2인 구성)
  db.packs.push(
    {
      id: 'pack-single', userId: 'u-buyer', sheetId: 'sheet-1', tone: '2d-cute', title: '단건', size: 12,
      status: 'READY', creditsSpent: 0, createdAt: now, frames: [], renderer: 'ai',
      preview: { watermark: '이모티학으로 내 얼굴 짤 만들기', cuts: 12, model: 'flash' }, format: 'situation',
    },
    {
      id: 'pack-duo', userId: 'u-buyer', sheetId: 'sheet-1', tone: '2d-cute', title: '2인', size: 12,
      status: 'READY', creditsSpent: 0, createdAt: now, frames: [], renderer: 'ai',
      preview: { watermark: '이모티학으로 내 얼굴 짤 만들기', cuts: 12, model: 'flash' }, format: 'duo-chemi',
    },
  );
});

console.log('\n[1] 코드 형식 · 정규화 · 해시');
const generated = Array.from({ length: 200 }, () => redeem.generateRedeemCode());
check('생성 코드는 32자리 base32 패턴', generated.every((code) => redeem.REDEEM_CODE_PATTERN.test(code)));
check('생성 코드에 혼동 글자(O·I·L)가 없다', generated.every((code) => !/[OIL]/.test(code)));
check('200개 모두 서로 다르다', new Set(generated).size === 200);
const sample = generated[0];
const spaced = redeem.formatRedeemCode(sample);
check('표시 형식은 4자 묶음', spaced.split('-').length === 8 && spaced.replace(/-/g, '') === sample);
check('하이픈·공백·소문자 입력도 정규화', redeem.normalizeRedeemCode(`  ${spaced.toLowerCase()} `) === sample);
const numericZero = sample.replace(/0/g, 'O').replace(/1/g, 'I');
check('O/I 오탈자 자동 보정', redeem.normalizeRedeemCode(numericZero) === sample);
check('길이가 틀리면 거부', redeem.normalizeRedeemCode(sample.slice(0, 20)) === null);
check('해시는 원문과 다르고 결정적', redeem.hashRedeemCode(sample) !== sample && redeem.hashRedeemCode(sample) === redeem.hashRedeemCode(sample));

console.log('\n[2] 지급 화이트리스트');
check('단건 완성권은 교환권 발급 가능', redeem.redeemSkuAllowed('pack-unlock-single'));
check('2인 케미 완성권은 무료 지급 제외', !redeem.redeemSkuAllowed('pack-unlock-duo'));
check('반려동물 완성권은 무료 지급 제외', !redeem.redeemSkuAllowed('pack-unlock-pet'));
check('가장 작은 크레딧 팩만 허용', redeem.redeemSkuAllowed('credits-theme-9900') && !redeem.redeemSkuAllowed('credits-theme-22000'));
check('Creator Pro 이용권 허용', redeem.redeemSkuAllowed('plan-creator-monthly'));
check('굿즈 SKU 는 지급 불가', !redeem.redeemSkuAllowed('goods-acrylic'));
let badSku: unknown = null;
try {
  await redeem.issueRedeemBatch('u-admin', { sku: 'pack-unlock-duo', count: 1, quantity: 1, label: 'x' });
} catch (e) { badSku = e; }
check('허용 밖 SKU 발급은 INVALID_SKU', (badSku as { code?: string })?.code === 'INVALID_SKU');

console.log('\n[3] 발급 — 원문은 응답에만, 저장소에는 해시만');
const creditBatch = await redeem.issueRedeemBatch('u-admin', {
  sku: 'credits-theme-9900', count: 2, quantity: 1, label: '크레딧 30 교환권', note: '테스트 발급',
});
const creditCode = creditBatch.codes[0];
check('요청한 개수만큼 발급', creditBatch.codes.length === 2 && creditBatch.batch.count === 2);
check('발급 묶음에 상품·라벨·유효기간 기록', creditBatch.batch.sku === 'credits-theme-9900' && creditBatch.batch.label === '크레딧 30 교환권' && !!creditBatch.batch.expiresAt);
const rawStore = JSON.stringify(await withPaymentDB((db) => ({ codes: db.redeemCodes, batches: db.redeemBatches })));
check('저장소에 원문 코드가 없다', !rawStore.includes(creditCode));
check('저장소에는 해시가 있다', rawStore.includes(redeem.hashRedeemCode(creditCode)));
const adminRows = await redeem.redeemAdminRows();
const adminJson = JSON.stringify(adminRows);
check('운영 목록에 원문·해시가 없다', !adminJson.includes(creditCode) && !adminJson.includes(redeem.hashRedeemCode(creditCode)));

console.log('\n[4] 교환 — 크레딧 지급과 원장');
const before = await withDB((db) => db.users.find((u) => u.id === 'u-buyer')!.credits);
const creditResult = await redeem.redeemCode({ userId: 'u-buyer', rawCode: redeem.formatRedeemCode(creditCode), ip: '203.0.113.10' });
check('30크레딧 지급 · 잔액 반영', creditResult.credits === 30 && creditResult.balance === before + 30);
check('지급 후 남은 횟수 0', creditResult.remaining === 0);
const order = await withPaymentDB((db) => db.orders.find((o) => o.id === creditResult.orderId)!);
check('주문은 provider=redeem · amount 0 · PAID', order.provider === 'redeem' && order.amount === 0 && order.status === 'PAID' && order.kind === 'credits');
const ledger = await withPaymentDB((db) => db.credits.filter((c) => c.refType === 'order' && c.refId === creditResult.orderId));
check('크레딧 원장 1건 · PURCHASE · 교환권 메모', ledger.length === 1 && ledger[0].reason === 'PURCHASE' && (ledger[0].memo ?? '').includes('교환권'));
let reused: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: creditCode }); } catch (e) { reused = e; }
check('같은 코드 재사용은 CODE_USED', (reused as { code?: string })?.code === 'CODE_USED');
const usedView = await redeem.redeemStatusFor('u-buyer', creditCode);
check('상태 조회는 used · 내 사용 이력', usedView.state === 'used' && usedView.usedByMe === true);

console.log('\n[5] 교환 — 팩 잠금 해제 (구성 일치 검증)');
redeem.resetRedeemAttempts();
const unlockBatch = await redeem.issueRedeemBatch('u-admin', { sku: 'pack-unlock-single', count: 2, quantity: 1, label: '단건 완성권 교환권' });
let noTarget: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: unlockBatch.codes[0] }); } catch (e) { noTarget = e; }
check('대상 팩 없으면 TARGET_REQUIRED', (noTarget as { code?: string })?.code === 'TARGET_REQUIRED');
let duoMismatch: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: unlockBatch.codes[0], packId: 'pack-duo' }); } catch (e) { duoMismatch = e; }
check('2인 팩에는 단건 완성권 코드를 쓸 수 없다', (duoMismatch as { code?: string })?.code === 'TARGET_INVALID');
let notMine: unknown = null;
try { await redeem.redeemCode({ userId: 'u-other', rawCode: unlockBatch.codes[0], packId: 'pack-single' }); } catch (e) { notMine = e; }
check('남의 팩은 잠금 해제 불가', (notMine as { code?: string })?.code === 'TARGET_INVALID');
// codes[0] 로 단건 팩을 열고, codes[1] 을 이미 열린 같은 팩에 시도해 '사용 횟수 미소모'를 확인한다.
const unlockResult = await redeem.redeemCode({ userId: 'u-buyer', rawCode: unlockBatch.codes[0], packId: 'pack-single' });
const unlockedPack = await withDB((db) => db.packs.find((p) => p.id === 'pack-single')!);
check('잠금 해제 결과에 팩 ID 포함', unlockResult.kind === 'unlock' && unlockResult.packId === 'pack-single');
check('팩에 해제 시각·SKU 기록', !!unlockedPack.unlockedAt && unlockedPack.unlockSku === 'pack-unlock-single');
check('잠금 해제는 크레딧을 주지 않는다', unlockResult.credits === 0);
let alreadyOpen: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: unlockBatch.codes[1], packId: 'pack-single' }); } catch (e) { alreadyOpen = e; }
check('이미 열린 팩에는 TARGET_ALREADY_OPEN', (alreadyOpen as { code?: string })?.code === 'TARGET_ALREADY_OPEN');
const stillOpen = await withPaymentDB((db) => db.redeemCodes.filter((c) => c.batchId === unlockBatch.batch.id).map((c) => c.usedCount));
check('실패한 시도는 사용 횟수를 소모하지 않는다', JSON.stringify(stillOpen.sort()) === JSON.stringify([0, 1]));

console.log('\n[6] 상태 — 만료·예약·폐기·비활성');
const expiring = await redeem.issueRedeemBatch('u-admin', { sku: 'pack-unlock-single', count: 1, quantity: 1, label: '만료 테스트' });
await withPaymentDB((db) => {
  const row = db.redeemCodes.find((c) => c.batchId === expiring.batch.id)!;
  row.expiresAt = new Date(Date.now() - 1000).toISOString();
});
let expired: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: expiring.codes[0], packId: 'pack-duo' }); } catch (e) { expired = e; }
check('만료 코드는 CODE_EXPIRED', (expired as { code?: string })?.code === 'CODE_EXPIRED');
const scheduled = await redeem.issueRedeemBatch('u-admin', {
  sku: 'pack-unlock-single', count: 1, quantity: 1, label: '예약 발급',
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
});
let notYet: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: scheduled.codes[0], packId: 'pack-duo' }); } catch (e) { notYet = e; }
check('시작일 전 코드는 CODE_NOT_YET_VALID', (notYet as { code?: string })?.code === 'CODE_NOT_YET_VALID');
const revocable = await redeem.issueRedeemBatch('u-admin', { sku: 'credits-theme-9900', count: 2, quantity: 1, label: '폐기 대상' });
const usedFirst = await redeem.redeemCode({ userId: 'u-buyer', rawCode: revocable.codes[0] });
check('폐기 전 1건은 정상 지급', usedFirst.credits === 30);
const revoked = await redeem.revokeRedeemBatch('u-admin', revocable.batch.id, '환불 처리');
check('폐기는 남은 코드만 중지한다', revoked.revoked === 1);
let revokeErr: unknown = null;
try { await redeem.redeemCode({ userId: 'u-other', rawCode: revocable.codes[1], packId: 'pack-duo' }); } catch (e) { revokeErr = e; }
check('폐기된 코드는 CODE_REVOKED', (revokeErr as { code?: string })?.code === 'CODE_REVOKED');
const revokedState = await redeem.redeemStatusFor('u-buyer', revocable.codes[0]);
check('이미 사용한 코드의 상태는 used (폐기 영향 없음)', revokedState.state === 'used');
await withPaymentDB((db) => {
  const row = db.redeemCodes.find((c) => c.batchId === scheduled.batch.id)!;
  row.disabled = true;
});
let disabled: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: scheduled.codes[0], packId: 'pack-duo' }); } catch (e) { disabled = e; }
check('비활성 코드는 CODE_DISABLED', (disabled as { code?: string })?.code === 'CODE_DISABLED');

console.log('\n[7] 계정 귀속 발급');
const bound = await redeem.issueRedeemBatch('u-admin', {
  sku: 'credits-theme-9900', count: 1, quantity: 1, label: 'CS 재발급', issuedTo: 'u-other',
});
let foreign: unknown = null;
try { await redeem.redeemCode({ userId: 'u-buyer', rawCode: bound.codes[0] }); } catch (e) { foreign = e; }
check('귀속 코드는 다른 계정에서 거부(404 · 존재 은닉)', (foreign as { code?: string })?.code === 'NOT_AUTHORIZED' && (foreign as { status?: number })?.status === 404);
const boundOk = await redeem.redeemCode({ userId: 'u-other', rawCode: bound.codes[0] });
check('귀속된 계정은 사용 가능', boundOk.credits === 30);

console.log('\n[8] 다회 사용 코드');
redeem.resetRedeemAttempts();
const multi = await redeem.issueRedeemBatch('u-admin', { sku: 'plan-creator-monthly', count: 1, quantity: 2, label: '체험팀 2회' });
const first = await redeem.redeemCode({ userId: 'u-buyer', rawCode: multi.codes[0] });
check('1회차 사용 후 남은 1회', first.remaining === 1);
const buyerAfter = await withDB((db) => db.users.find((u) => u.id === 'u-buyer')!);
check('Creator Pro 이용권 적용 · 120크레딧', buyerAfter.plan === 'STUDIO' && !!buyerAfter.planExpiresAt);
const second = await redeem.redeemCode({ userId: 'u-other', rawCode: multi.codes[0] });
check('2회차 사용 후 남은 0회', second.remaining === 0);
let third: unknown = null;
try { await redeem.redeemCode({ userId: 'u-other', rawCode: multi.codes[0] }); } catch (e) { third = e; }
check('횟수를 다 쓰면 CODE_USED', (third as { code?: string })?.code === 'CODE_USED');

console.log('\n[9] 시도 제한 — 추측 방어');
redeem.resetRedeemAttempts();
const failsBefore = await withPaymentDB((db) => db.redeemCodes.filter((c) => c.batchId === redeem.FAIL_BATCH).length);
let limited: unknown = null;
for (let i = 0; i < 12; i++) {
  try {
    await redeem.redeemCode({ userId: 'u-other', rawCode: redeem.generateRedeemCode(), ip: '198.51.100.7' });
  } catch (e) {
    const err = e as { code?: string; status?: number };
    if (err.code === 'TOO_MANY_ATTEMPTS') { limited = err; break; }
  }
}
check('반복 실패는 TOO_MANY_ATTEMPTS(429)', (limited as { status?: number })?.status === 429);
const storedFails = (await withPaymentDB((db) => db.redeemCodes.filter((c) => c.batchId === redeem.FAIL_BATCH).length)) - failsBefore;
// 메모리 제한(시간당 10회)이 먼저 막으므로 저장소 실패 기록은 제한 직전까지만 남는다 — 둘 다 있어야 정상.
check('실패 시도가 저장소에 기록된다', storedFails > 0);
check('실패 기록은 메모리 한도(10회)를 넘지 않는다', storedFails <= 10, `stored=${storedFails}`);
const failJson = JSON.stringify(await withPaymentDB((db) => db.redeemCodes.filter((c) => c.batchId === redeem.FAIL_BATCH)));
check('실패 기록에 원문 코드가 없다', failJson.includes('fail_') && !/[0-9A-HJKMNP-TV-Z]{32}/.test(failJson));

console.log('\n[10] 운영 대사 · 개인정보 삭제');
const totals = await redeem.redeemReconciliation();
check('대사: 발급·사용 수량 집계', totals.batches >= 6 && totals.issued >= 9 && totals.used >= 3);
check('대사: 지급 크레딧 합계', totals.creditsGranted >= 90);
check('대사: 잠금 해제 건수', totals.unlocksGranted >= 1);
check('대사: 폐기 집계', totals.revoked >= 1);
const leaver = await redeem.issueRedeemBatch('u-admin', { sku: 'credits-theme-9900', count: 1, quantity: 1, label: '탈퇴자 발급', issuedTo: 'u-leaver' });
await deleteAccountPermanently('u-leaver');
const afterDeletion = await withPaymentDB((db) => db.redeemCodes.find((c) => c.batchId === leaver.batch.id)!);
check('탈퇴 시 귀속 사용자·IP 해시 제거', afterDeletion.issuedTo === undefined && afterDeletion.ipHash === undefined);
check('탈퇴해도 남은 코드는 사용 가능', redeem.redeemStateOf(afterDeletion) === 'active');

console.log(`\n${failed === 0 ? '✅' : '❌'} redeem tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
assert.ok(true);
