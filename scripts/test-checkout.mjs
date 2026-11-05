// Run only against an isolated local server with the Toss API stubbed; never use real keys or users.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.env.CHECKOUT_TEST_BASE_URL;
if (!base || process.env.CHECKOUT_TEST_STUB !== '1' || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use an isolated local server with a stubbed Toss API');
const cookie = `emotime_sid=checkout-test-${randomBytes(8).toString('hex')}`;

async function post(path, body, extra = {}) {
  const res = await fetch(base + path, { method: 'POST', headers: { cookie, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function get(path, extra = {}) {
  const res = await fetch(base + path, { headers: { cookie, ...extra } });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* HTML */ }
  return { status: res.status, body, text };
}
async function order() { const r = await post('/api/checkout', { sku: 'credits-20' }); assert.equal(r.status, 200); return r.body.order; }
async function prepare(id) { const r = await post('/api/checkout/prepare', { orderId: id, agreeDigital: true }); assert.equal(r.status, 200); }
async function recover(id, extra = {}) { return post('/api/checkout/recover', { orderId: id }, extra); }
async function adminLogin() {
  const sid = `checkout-admin-${randomBytes(6).toString('hex')}`;
  const res = await fetch(base + '/api/admin/login', { method: 'POST', headers: { cookie: `emotime_sid=${sid}`, 'content-type': 'application/json' }, body: JSON.stringify({ passcode: 'checkout-admin' }) });
  assert.equal(res.status, 200);
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  const auth = list.find((value) => value.startsWith('emotime_auth='))?.split(';')[0];
  assert.ok(auth);
  return `${auth}; emotime_sid=${sid}`;
}

// 구독은 1차 출시 범위에서 계속 차단한다.
const plan = await post('/api/checkout', { sku: 'plan-plus-monthly' });
assert.equal(plan.status, 503);

// 동의·금액·소유자·출처·동시 승인과 재시도 멱등성.
const o = await order();
assert.equal(o.amount, 4900); assert.equal(o.provider, 'toss');
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' })).status, 409);
await prepare(o.id);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount + 1, paymentKey: 'valid' })).status, 409);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }, { cookie: 'emotime_sid=other-test-user' })).status, 404);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }, { origin: 'https://other.example' })).status, 403);
const [a, b] = await Promise.all([
  post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }),
  post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }),
]);
assert.equal(a.status, 200); assert.equal(b.status, 200);
assert.equal(a.body.credits, 32); assert.equal(b.body.credits, 32);
assert.equal([a.body.alreadyPaid, b.body.alreadyPaid].filter(Boolean).length, 1);
const repeat = await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' });
assert.equal(repeat.body.credits, 32); assert.equal(repeat.body.alreadyPaid, true);
assert.equal((await recover(o.id)).body.credits, 32);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'other' })).status, 409);

// 승인 응답을 잃어도 결제키 조회만으로 복구한다.
const lookupOrder = await order(); await prepare(lookupOrder.id);
const lookedUp = await post('/api/checkout/confirm', { orderId: lookupOrder.id, amount: lookupOrder.amount, paymentKey: 'lookup' });
assert.equal(lookedUp.status, 200); assert.equal(lookedUp.body.credits, 52); assert.equal(lookedUp.body.alreadyPaid, false);

// 사용자가 결제창을 닫은 뒤 저장된 결제키로 복구한다.
const userRecovery = await order(); await prepare(userRecovery.id);
const interrupted = await post('/api/checkout/confirm', { orderId: userRecovery.id, amount: userRecovery.amount, paymentKey: 'flaky' });
assert.equal(interrupted.status, 503); assert.equal(interrupted.body.error.code, 'PAYMENT_RETRY');
assert.equal((await recover(userRecovery.id, { cookie: 'emotime_sid=another-user' })).status, 404);
assert.equal((await recover(userRecovery.id, { origin: 'https://other.example' })).status, 403);
const billing = await get('/billing');
assert.equal(billing.status, 200); assert.ok(billing.text.includes(userRecovery.id)); assert.ok(billing.text.includes('승인 결과 확인'));
const recovered = await recover(userRecovery.id);
assert.equal(recovered.status, 200); assert.equal(recovered.body.credits, 72); assert.equal(recovered.body.alreadyPaid, false);
assert.equal((await recover(userRecovery.id)).body.alreadyPaid, true);

// 아직 결제창을 제출하지 않은 주문은 복구하지 않고 결제를 이어 가게 한다.
const notStarted = await order();
const notStartedResult = await recover(notStarted.id);
assert.equal(notStartedResult.status, 409); assert.equal(notStartedResult.body.error.code, 'PAYMENT_NOT_STARTED');
assert.ok((await get('/billing')).text.includes('결제 계속'));

// 운영자는 소유자·거래 대조 후 같은 검증 경로로 미지급 주문을 복구할 수 있다.
const adminRecovery = await order(); await prepare(adminRecovery.id);
assert.equal((await post('/api/checkout/confirm', { orderId: adminRecovery.id, amount: adminRecovery.amount, paymentKey: 'flaky' })).status, 503);
assert.equal((await post('/api/admin/payments/recover', { orderId: adminRecovery.id })).status, 403);
const adminCookie = await adminLogin();
const review = await get('/api/admin/metrics', { cookie: adminCookie });
assert.equal(review.status, 200);
const reviewItem = review.body.metrics.paymentReview.find((item) => item.orderId === adminRecovery.id);
assert.equal(reviewItem?.issue, 'APPROVAL_UNSETTLED'); assert.equal(reviewItem?.canRecover, true);
assert.ok(!('paymentKey' in reviewItem));
assert.equal((await post('/api/admin/payments/recover', { orderId: adminRecovery.id }, { cookie: adminCookie, origin: 'https://other.example' })).status, 403);
const adminRecovered = await post('/api/admin/payments/recover', { orderId: adminRecovery.id }, { cookie: adminCookie });
assert.equal(adminRecovered.status, 200); assert.equal(adminRecovered.body.credits, 92); assert.equal(adminRecovered.body.alreadyPaid, false);
assert.equal((await recover(adminRecovery.id)).body.alreadyPaid, true);
const reviewAfter = await get('/api/admin/metrics', { cookie: adminCookie });
assert.ok(!reviewAfter.body.metrics.paymentReview.some((item) => item.orderId === adminRecovery.id));
assert.ok(!JSON.stringify(reviewAfter.body.metrics.paymentReview).includes('paymentKey'));

// 금액·상태·수단이 다르거나 실패한 승인은 어떤 경로에서도 지급하지 않는다.
for (const key of ['wrong', 'waiting', 'failed', 'network']) {
  const item = await order(); await prepare(item.id);
  const result = await post('/api/checkout/confirm', { orderId: item.id, amount: item.amount, paymentKey: key });
  assert.notEqual(result.status, 200, `${key} must not grant credits`);
}

// 재시작 뒤 새 결제만 중단하는 비상 스위치 검사에 사용할 미지급 주문을 남긴다.
const suspended = await order(); await prepare(suspended.id);
assert.equal((await post('/api/checkout/confirm', { orderId: suspended.id, amount: suspended.amount, paymentKey: 'flaky' })).status, 503);
writeFileSync(process.env.CHECKOUT_SUSPENSION_FIXTURE || '/tmp/emotime-checkout-suspension.json', JSON.stringify({ orderId: suspended.id, cookie, expectedCredits: 112 }));

// 모든 실제 승인 호출은 주문 단위 멱등키를 사용하고, 조회 복구가 실행됐는지 확인한다.
const log = readFileSync('/tmp/emotime-toss-test-log', 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
for (const entry of log.filter((item) => item.type === 'confirm')) assert.equal(entry.idem, entry.order);
assert.ok(log.some((entry) => entry.type === 'lookup' && entry.key === 'lookup'));

console.log('Checkout tests passed: consent, ownership, origin, idempotency, lookup recovery, user/admin recovery, reconciliation review, and failed approval guards');
