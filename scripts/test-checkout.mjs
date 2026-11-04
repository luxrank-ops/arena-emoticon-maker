// Run only against an isolated local server with the Toss API stubbed; never use real keys or users.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const base = process.env.CHECKOUT_TEST_BASE_URL;
if (!base || process.env.CHECKOUT_TEST_STUB !== '1' || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use an isolated local server with a stubbed Toss API');
const cookie = `emotime_sid=checkout-test-${randomBytes(8).toString('hex')}`;
async function post(path, body, extra = {}) {
  const res = await fetch(base + path, { method: 'POST', headers: { cookie, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function order() { const r = await post('/api/checkout', { sku: 'credits-20' }); assert.equal(r.status, 200); return r.body.order; }
async function prepare(id) { const r = await post('/api/checkout/prepare', { orderId: id, agreeDigital: true }); assert.equal(r.status, 200); }
const plan = await post('/api/checkout', { sku: 'plan-plus-monthly' }); assert.equal(plan.status, 503);
const o = await order(); assert.equal(o.amount, 4900); assert.equal(o.provider, 'toss');
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' })).status, 409);
await prepare(o.id);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount + 1, paymentKey: 'valid' })).status, 409);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }, { cookie: 'emotime_sid=other-test-user' })).status, 404);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }, { origin: 'https://other.example' })).status, 403);
const [a,b] = await Promise.all([post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }), post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' })]);
assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(a.body.credits, 32); assert.equal(b.body.credits, 32);
assert.equal([a.body.alreadyPaid,b.body.alreadyPaid].filter(Boolean).length,1);
const repeat = await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'valid' }); assert.equal(repeat.body.credits, 32); assert.equal(repeat.body.alreadyPaid, true);
assert.equal((await post('/api/checkout/confirm', { orderId: o.id, amount: o.amount, paymentKey: 'other' })).status, 409);
for (const key of ['wrong','waiting','failed']) {
  const x = await order(); await prepare(x.id);
  const r = await post('/api/checkout/confirm', { orderId:x.id, amount:x.amount, paymentKey:key });
  assert.notEqual(r.status,200,`${key} must not grant credits`);
}
console.log('Checkout tests passed: consent, amounts, ownership, origin, concurrent idempotency, failed or pending approvals, and subscription guard');
