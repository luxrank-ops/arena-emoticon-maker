// Local tests only: never load this stub in a deployed server.
if (process.env.CHECKOUT_TEST_STUB !== '1' || process.env.NODE_ENV === 'production' || process.env.TOSS_SECRET_KEY !== 'test_sk_dummy') throw new Error('Toss stub requires isolated local test settings');
const fs = require('fs');
const original = global.fetch;
const statePath = '/tmp/emotime-toss-test-state.json';
let savedState = { attempts: {} };
try { savedState = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* first run */ }
const attempts = new Map(Object.entries(savedState.attempts || {}));
const approved = new Map();
const expectedAuth = `Basic ${Buffer.from('test_sk_dummy:').toString('base64')}`;

function header(init, name) {
  const headers = init.headers || {};
  return typeof headers.get === 'function' ? headers.get(name) : headers[name] || headers[name.toLowerCase()];
}
function done(body) {
  const payment = { paymentKey: body.paymentKey, orderId: body.orderId, totalAmount: body.amount, status: 'DONE', method: '카드' };
  approved.set(body.paymentKey, payment);
  return payment;
}

global.fetch = async function(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('https://api.tosspayments.com/v1/payments')) return original(input, init);
  if (header(init, 'Authorization') !== expectedAuth) return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  const body = init.body ? JSON.parse(init.body) : null;
  if (body) {
    const attemptKey = `${body.orderId}:${body.paymentKey}`;
    const count = (attempts.get(attemptKey) || 0) + 1;
    attempts.set(attemptKey, count);
    fs.writeFileSync(statePath, JSON.stringify({ attempts: Object.fromEntries(attempts) }));
    fs.appendFileSync('/tmp/emotime-toss-test-log', JSON.stringify({ type: 'confirm', key: body.paymentKey, order: body.orderId, amount: body.amount, idem: header(init, 'Idempotency-Key') }) + '\n');
    await new Promise(r => setTimeout(r, 60));
    if (body.paymentKey === 'network') throw new Error('simulated network failure');
    if (body.paymentKey === 'failed') return Response.json({ code: 'TEST_FAILED' }, { status: 400 });
    if (body.paymentKey === 'wrong') return Response.json({ paymentKey: body.paymentKey, orderId: body.orderId, totalAmount: body.amount + 1, status: 'DONE', method: '카드' });
    if (body.paymentKey === 'waiting') return Response.json({ paymentKey: body.paymentKey, orderId: body.orderId, totalAmount: body.amount, status: 'WAITING_FOR_DEPOSIT', method: '가상계좌' });
    if (body.paymentKey === 'lookup') {
      done(body);
      return Response.json({ code: 'TEST_APPROVAL_RESPONSE_LOST' }, { status: 503 });
    }
    if (body.paymentKey === 'flaky' && count === 1) {
      done(body);
      return Response.json({ code: 'TEST_APPROVAL_RESPONSE_LOST' }, { status: 503 });
    }
    return Response.json(done(body));
  }

  const paymentKey = decodeURIComponent(url.split('/').pop() || '');
  fs.appendFileSync('/tmp/emotime-toss-test-log', JSON.stringify({ type: 'lookup', key: paymentKey }) + '\n');
  if (paymentKey === 'network') throw new Error('simulated network failure');
  // flaky는 다음 confirm 재시도로만 복구하고, lookup은 조회만으로 복구한다.
  if (paymentKey === 'lookup') return Response.json(approved.get(paymentKey) || { code: 'NOT_FOUND' }, { status: approved.has(paymentKey) ? 200 : 404 });
  return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
};
