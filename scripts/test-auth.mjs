// Run against an isolated local test server: AUTH_TEST_BASE_URL=http://localhost:3000 node scripts/test-auth.mjs
// Optionally set ADMIN_PASSCODE to exercise administrator login. Never run against a real user database.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const base = process.env.AUTH_TEST_BASE_URL;
if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('AUTH_TEST_BASE_URL must point to an isolated local server');
function client() {
  const jar = new Map();
  return async (path, body, extraHeaders = {}, method) => {
    const headers = { ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(base + path, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const pos = pair.indexOf('=');
      jar.set(pair.slice(0, pos), pair.slice(pos + 1));
    }
    return { status: res.status, text: await res.text() };
  };
}
const a = client();
const b = client();
const suffix = randomBytes(6).toString('hex');
const account = { email: `test-${suffix}@example.com`, name: '테스트', nickname: `test${suffix}`, birthDate: '1990-01-01', gender: 'unspecified', password: 'test-password', consent: true };
assert.equal((await a('/api/auth/signup', account)).status, 200);
assert.match((await a('/')).text, new RegExp(account.nickname));
assert.equal((await b('/api/auth/signup', account)).status, 409);
assert.equal((await b('/api/auth/signup', { ...account, email: `other-${suffix}@example.com`, nickname: '풍고' })).status, 409);
assert.equal((await b('/api/auth/signup', { ...account, email: `child-${suffix}@example.com`, nickname: `child${suffix}`, birthDate: '2025-01-01' })).status, 422);
assert.equal((await b('/api/auth/signup', { ...account, email: `agree-${suffix}@example.com`, nickname: `agree${suffix}`, consent: false })).status, 422);
assert.equal((await a('/api/auth/logout', {})).status, 200);
assert.doesNotMatch((await a('/')).text, new RegExp(account.nickname));
assert.equal((await a('/api/auth/login', { identifier: account.nickname, password: 'wrong' })).status, 401);
assert.equal((await a('/api/auth/login', { identifier: account.email, password: account.password })).status, 200);
assert.match((await a('/')).text, new RegExp(account.nickname));
assert.equal((await b('/api/auth/login', { identifier: account.email, password: account.password }, { Origin: 'https://example.org' })).status, 403);
const forged = await fetch(base + '/api/admin/metrics', { headers: { Cookie: 'emotime_sid=account_admin' } });
assert.equal((await forged.json()).locked, true);
if (process.env.ADMIN_PASSCODE) {
  const admin = client();
  assert.equal((await admin('/api/auth/login', { identifier: '풍고', password: process.env.ADMIN_PASSCODE })).status, 200);
  assert.match((await admin('/')).text, /무제한/);
  assert.equal(JSON.parse((await admin('/api/admin/metrics')).text).locked, false);
  assert.equal((await admin('/api/auth/logout', {})).status, 200);
  assert.equal(JSON.parse((await admin('/api/admin/metrics')).text).locked, true);
}
assert.equal((await a('/account-deletion')).status, 200);
assert.equal((await a('/api/auth/account', { password: 'wrong', confirmation: '영구 삭제' }, {}, 'DELETE')).status, 401);
assert.equal((await a('/api/auth/account', { password: account.password, confirmation: '삭제' }, {}, 'DELETE')).status, 422);
assert.equal((await a('/api/auth/account', { password: account.password, confirmation: '영구 삭제' }, { Origin: 'https://example.org' }, 'DELETE')).status, 403);
const deleted = await a('/api/auth/account', { password: account.password, confirmation: '영구 삭제' }, {}, 'DELETE');
assert.equal(deleted.status, 200, deleted.text);
assert.equal(JSON.parse(deleted.text).deleted, true);
assert.doesNotMatch((await a('/')).text, new RegExp(account.nickname));
assert.equal((await b('/api/auth/signup', account)).status, 200);
console.log('Auth and account-deletion integration tests passed');
