const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

function loadTs(path) {
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module); mod.filename = path; mod.paths = module.paths; mod._compile(js, path); return mod.exports;
}

const { paymentReviewItems } = loadTs('./src/lib/payment-review.ts');
const baseOrder = { userId: 'user-1', kind: 'credits', sku: 'credits-20', title: '크레딧 20팩', amount: 4900, credits: 20, plan: null, provider: 'toss' };
const db = {
  orders: [
    { ...baseOrder, id: 'ord_no_key', status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z' },
    { ...baseOrder, id: 'ord_unsettled', status: 'PENDING', paymentKey: 'secret-key', createdAt: '2026-01-03T00:00:00.000Z' },
    { ...baseOrder, id: 'ord_paid_ok', status: 'PAID', paymentKey: 'secret-key-2', createdAt: '2026-01-02T00:00:00.000Z' },
    { ...baseOrder, id: 'ord_ledger_bad', status: 'PAID', paymentKey: 'secret-key-3', createdAt: '2026-01-04T00:00:00.000Z' },
  ],
  credits: [
    { id: 'cr_ok', userId: 'user-1', delta: 20, reason: 'PURCHASE', refType: 'order', refId: 'ord_paid_ok', balanceAfter: 32, createdAt: '2026-01-02T00:00:00.000Z' },
  ],
};
const review = paymentReviewItems(db);
assert.deepEqual(review.map((item) => item.orderId), ['ord_ledger_bad', 'ord_unsettled']);
assert.equal(review[0].issue, 'LEDGER_MISMATCH'); assert.equal(review[0].canRecover, false);
assert.equal(review[1].issue, 'APPROVAL_UNSETTLED'); assert.equal(review[1].canRecover, true);
assert.ok(!JSON.stringify(review).includes('secret-key'));
assert.ok(!JSON.stringify(review).includes('paymentKey'));

const cloudflareConfig = fs.readFileSync('./cloudflare.config.ts', 'utf8');
assert.match(cloudflareConfig, /RATE_LIMIT_DISABLED:\s*bindings\.text\("0"\)/);
assert.match(cloudflareConfig, /PAYMENT_CHECKOUT_DISABLED:\s*bindings\.text\("0"\)/);
assert.match(cloudflareConfig, /DEMO_MODE:\s*bindings\.text\("0"\)/);
assert.doesNotMatch(cloudflareConfig, /CHECKOUT_TEST_STUB|test_sk_dummy/);

const business = {
  NEXT_PUBLIC_BUSINESS_NAME: 'EmotiMe',
  NEXT_PUBLIC_BUSINESS_OWNER: 'Owner',
  NEXT_PUBLIC_BUSINESS_REG_NO: '123-45-67890',
  NEXT_PUBLIC_BUSINESS_ADDRESS: 'Busan',
  NEXT_PUBLIC_BUSINESS_TEL: '0500-000-0000',
  NEXT_PUBLIC_SUPPORT_EMAIL: 'support@emotime.invalid',
  NEXT_PUBLIC_MAIL_ORDER_NO: '2026-Busan-0000',
};
const shared = {
  ...process.env,
  ...business,
  PAYMENT_PROVIDER: 'toss',
  STORE_BACKEND: 'firestore',
  FIREBASE_PROJECT_ID: 'unit-project',
  FIREBASE_CLIENT_EMAIL: 'unit@emotime.invalid',
  FIREBASE_PRIVATE_KEY: 'unit-private-key',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
  ADMIN_PASSCODE: 'unit-admin-passcode',
  DEMO_MODE: '0',
  CHECKOUT_TEST_STUB: '0',
  RATE_LIMIT_DISABLED: '0',
  NEXT_PUBLIC_PLATFORM: 'web',
};
function preflight(args, env) {
  const result = spawnSync(process.execPath, ['scripts/payment-preflight.mjs', ...args], { env, encoding: 'utf8' });
  return { ...result, output: `${result.stdout}${result.stderr}` };
}
const testRun = preflight(['--test'], { ...shared, NEXT_PUBLIC_TOSS_CLIENT_KEY: 'test_ck_unit_valid', TOSS_SECRET_KEY: 'test_sk_unit_valid' });
assert.equal(testRun.status, 0, testRun.output);
const liveRun = preflight([], { ...shared, NEXT_PUBLIC_SITE_URL: 'https://emotime.invalid', NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_unit_valid', TOSS_SECRET_KEY: 'live_sk_unit_valid' });
assert.equal(liveRun.status, 0, liveRun.output);
assert.ok(!liveRun.output.includes('live_sk_unit_valid'));
const mismatched = preflight([], { ...shared, NEXT_PUBLIC_SITE_URL: 'https://emotime.invalid', NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_unit_valid', TOSS_SECRET_KEY: 'test_sk_DO_NOT_LEAK' });
assert.notEqual(mismatched.status, 0);
assert.ok(!mismatched.output.includes('test_sk_DO_NOT_LEAK'));
const fileStore = preflight([], { ...shared, NEXT_PUBLIC_SITE_URL: 'https://emotime.invalid', NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_unit_valid', TOSS_SECRET_KEY: 'live_sk_unit_valid', STORE_BACKEND: 'file' });
assert.notEqual(fileStore.status, 0);
const partialKv = preflight([], { ...shared, NEXT_PUBLIC_SITE_URL: 'https://emotime.invalid', NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_unit_valid', TOSS_SECRET_KEY: 'live_sk_unit_valid', KV_REST_API_URL: 'https://real.upstash.io' });
assert.notEqual(partialKv.status, 0);

const savedEnv = { client: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY, secret: process.env.TOSS_SECRET_KEY, nodeEnv: process.env.NODE_ENV, disabled: process.env.PAYMENT_CHECKOUT_DISABLED };
const originalLoad = Module._load;
try {
  Module._load = function(request, parent, isMain) {
    if (request === '@/lib/api') return { fail: () => { throw new Error('unused in configuration test'); } };
    return originalLoad.call(this, request, parent, isMain);
  };
  const { checkoutSuspended, tossConfigured } = loadTs('./src/lib/payments.ts');
  delete process.env.PAYMENT_CHECKOUT_DISABLED;
  assert.equal(checkoutSuspended(), false);
  process.env.PAYMENT_CHECKOUT_DISABLED = '1';
  assert.equal(checkoutSuspended(), true);
  delete process.env.PAYMENT_CHECKOUT_DISABLED;
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'live_ck_valid';
  process.env.TOSS_SECRET_KEY = 'live_sk_valid';
  assert.equal(tossConfigured(), true);
  process.env.TOSS_SECRET_KEY = 'test_sk_valid';
  assert.equal(tossConfigured(), false);
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'test_ck_valid';
  process.env.TOSS_SECRET_KEY = 'test_sk_valid';
  assert.equal(tossConfigured(), false);
  process.env.NODE_ENV = 'development';
  assert.equal(tossConfigured(), true);
  process.env.TOSS_SECRET_KEY = 'test_ck_wrong_kind';
  assert.equal(tossConfigured(), false);
} finally {
  Module._load = originalLoad;
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_TOSS_CLIENT_KEY: savedEnv.client, TOSS_SECRET_KEY: savedEnv.secret, NODE_ENV: savedEnv.nodeEnv, PAYMENT_CHECKOUT_DISABLED: savedEnv.disabled })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

console.log('Payment readiness tests passed: reconciliation, secret-safe preflight, exact key-pair and store validation');
