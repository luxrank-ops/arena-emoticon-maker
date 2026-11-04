// Local tests only: never load this stub in a deployed server.
if (process.env.CHECKOUT_TEST_STUB !== '1' || process.env.NODE_ENV === 'production' || process.env.TOSS_SECRET_KEY !== 'test_sk_dummy') throw new Error('Toss stub requires isolated local test settings');
const fs = require('fs');
const original = global.fetch;
global.fetch = async function(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('https://api.tosspayments.com/v1/payments')) return original(input, init);
  const body = init.body ? JSON.parse(init.body) : null;
  if (body) {
    fs.appendFileSync('/tmp/emotime-toss-test-log', JSON.stringify({ key: body.paymentKey, order: body.orderId, amount: body.amount, idem: init.headers['Idempotency-Key'] }) + '\n');
    await new Promise(r => setTimeout(r, 60));
    if (body.paymentKey === 'failed') return Response.json({ code: 'TEST_FAILED' }, { status: 400 });
    if (body.paymentKey === 'wrong') return Response.json({ ...body, totalAmount: body.amount + 1, status: 'DONE', method: '카드' });
    if (body.paymentKey === 'waiting') return Response.json({ ...body, totalAmount: body.amount, status: 'WAITING_FOR_DEPOSIT', method: '가상계좌' });
    return Response.json({ ...body, totalAmount: body.amount, status: 'DONE', method: '카드' });
  }
  return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
};
