// Run after test-checkout.mjs against the same data and stub state, with PAYMENT_CHECKOUT_DISABLED=1.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = process.env.CHECKOUT_TEST_BASE_URL;
if (!base || process.env.CHECKOUT_TEST_STUB !== '1' || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use an isolated local server with a stubbed Toss API');
const fixture = JSON.parse(readFileSync(process.env.CHECKOUT_SUSPENSION_FIXTURE || '/tmp/emotime-checkout-suspension.json', 'utf8'));
const cookie = fixture.cookie;
async function post(path, body) {
  const res = await fetch(base + path, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}

const newOrder = await post('/api/checkout', { sku: 'credits-20' });
assert.equal(newOrder.status, 503); assert.equal(newOrder.body.error.code, 'CHECKOUT_SUSPENDED');
const prepared = await post('/api/checkout/prepare', { orderId: fixture.orderId, agreeDigital: true });
assert.equal(prepared.status, 503); assert.equal(prepared.body.error.code, 'CHECKOUT_SUSPENDED');
const recovered = await post('/api/checkout/recover', { orderId: fixture.orderId });
assert.equal(recovered.status, 200); assert.equal(recovered.body.alreadyPaid, false); assert.equal(recovered.body.credits, fixture.expectedCredits);
const repeated = await post('/api/checkout/recover', { orderId: fixture.orderId });
assert.equal(repeated.status, 200); assert.equal(repeated.body.alreadyPaid, true); assert.equal(repeated.body.credits, fixture.expectedCredits);

console.log('Checkout suspension test passed: new orders blocked while existing approval recovery remains available');
