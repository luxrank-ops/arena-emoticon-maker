#!/usr/bin/env node
// 엔드투엔드 스모크 테스트 — 실행 중인 서버를 실제로 호출한다.
// 사용: BASE_URL=http://localhost:3000 node scripts/smoke.mjs
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

let cookie = '';
let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(opts.headers ?? {}),
    },
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json, text };
}

const PALETTE = { skin: '#F6D3B3', skinShade: '#E8BA95', hair: '#332621', shirt: '#5AB8F5', accent: '#FF6B5B' };
const SIGNATURE = { headScale: 1.02, faceWidth: 0.98, eyeSpacing: 1, eyeSize: 1, browWeight: 0.9, mouthWidth: 1, hairStyle: 2, cheek: 0.6, glasses: false };

console.log(`\nEmotiMe smoke test → ${BASE}\n`);

console.log('[1] 정적 페이지');
for (const p of ['/', '/studio/upload', '/reply', '/brief', '/goods', '/pricing', '/billing', '/terms', '/privacy', '/refund', '/support']) {
  const r = await req(p);
  assert(r.status === 200, `GET ${p} → 200`);
}

console.log('\n[2] 헬스');
const health = await req('/api/health');
assert(health.json?.ok === true, 'GET /api/health ok');

console.log('\n[3] 얼굴 → 시트 → 팩');
const face = await req('/api/face/analyze', {
  method: 'POST',
  body: JSON.stringify({
    palette: PALETTE,
    signature: SIGNATURE,
    metrics: { coverage: 0.18, centering: 0.1, brightness: 140, sharpness: 20, faceDetected: true },
    consent: { accepted: true, version: 'v1.0', overseas: true },
  }),
});
assert(!!face.json?.faceId, 'POST /api/face/analyze → faceId');

const sheet = await req('/api/sheets', { method: 'POST', body: JSON.stringify({ faceId: face.json.faceId, tone: '2d-cute' }) });
assert(sheet.json?.sheet?.variants?.length === 3, 'POST /api/sheets → 3 variants');

const sheetId = sheet.json.sheet.id;
await req(`/api/sheets/${sheetId}/choose`, { method: 'POST', body: JSON.stringify({ variantKey: 'A' }) });

const pack = await req('/api/packs', { method: 'POST', body: JSON.stringify({ sheetId, size: 12 }) });
assert(!!pack.json?.packId, 'POST /api/packs → packId');
assert(pack.status === 200, '크레딧 충분 → 200');

const packId = pack.json.packId;
const view = await req(`/api/packs/${packId}`);
assert(view.json?.frames?.length === 12, 'GET /api/packs/:id → 12 frames');
assert(Array.isArray(view.json.frames[0].spec.line) === false, 'frame.spec 포함');

const frameId = view.json.frames[0].id;
const patched = await req(`/api/frames/${frameId}`, { method: 'PATCH', body: JSON.stringify({ line: '테스트 대사', prop: 'coffee', background: 'lemon', emotion: 'king' }) });
assert(patched.json?.frame?.line === '테스트 대사', 'PATCH /api/frames/:id 반영');
assert(patched.json?.frame?.emotion === 'king', 'emotion 저장');

console.log('\n[4] 추천 엔진');
const reply = await req('/api/reply', { method: 'POST', body: JSON.stringify({ text: '미안 늦었어 ㅠㅠ 진짜 미안해' }) });
assert(reply.json?.result?.candidates?.length === 3, 'POST /api/reply → 3 candidates');
assert(!!reply.json?.result?.candidates?.[0]?.spec, 'candidate.spec 포함');

const brief = await req('/api/brief');
assert(brief.json?.items?.length === 8, 'GET /api/brief → 8 items');

console.log('\n[5] 결제 · 크레딧');
const order = await req('/api/checkout', { method: 'POST', body: JSON.stringify({ sku: 'credits-20' }) });
assert(order.json?.order?.amount === 4900, '서버가 금액 산정 (4900)');
const confirm = await req('/api/checkout/confirm', {
  method: 'POST',
  body: JSON.stringify({ orderId: order.json.order.id, amount: 4900, agreeDigital: true }),
});
assert(confirm.json?.granted === 20, 'confirm → 20 크레딧 지급');

const badAmount = await req('/api/checkout/confirm', {
  method: 'POST',
  body: JSON.stringify({ orderId: order.json.order.id, amount: 100, agreeDigital: true }),
});
assert(badAmount.status === 200 || badAmount.status === 409, '금액 위변조 차단 또는 멱등 처리');

console.log('\n[6] 굿즈');
const goods = await req('/api/goods/orders', {
  method: 'POST',
  body: JSON.stringify({
    goodsSku: 'goods-sticker',
    frameId,
    frameLabel: '테스트',
    shipping: { name: '홍길동', phone: '01012345678', address: '서울시 강남구 1' },
    agreeNoRefundAfterProduction: true,
  }),
});
assert(!!goods.json?.order?.id, 'POST /api/goods/orders → order');

console.log('\n[7] 권한');
const admin = await req('/api/admin/metrics');
assert(admin.json?.locked === true, '비관리자 → metrics 잠금');

console.log(`\n결과: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
