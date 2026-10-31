#!/usr/bin/env node
// 엔드투엔드 스모크 테스트 — 실행 중인 서버를 실제로 호출한다.
// 사용: BASE_URL=http://localhost:3000 node scripts/smoke.mjs
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// 쿠키 병: Set-Cookie 는 여러 개일 수 있고, 기존 쿠키를 덮어쓰면 세션이 날아간다
const jar = new Map();
let passed = 0;
let failed = 0;

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorbCookies(res) {
  const list =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  for (const raw of list) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

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
  const cookies = cookieHeader();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { cookie: cookies } : {}),
      ...(opts.headers ?? {}),
    },
    redirect: 'manual',
  });
  absorbCookies(res);
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

const sadReply = await req('/api/reply', { method: 'POST', body: JSON.stringify({ text: '오늘 야근 확정… 나 집에 언제 가냐 ㅠㅠ' }) });
assert(
  ['t-cryy', 't-hug', 't-cheer'].includes(sadReply.json?.result?.candidates?.[0]?.templateId),
  '슬픔 대화 → 위로/울음 컷이 1순위 (배고파 컷 오답 방지)',
);
const laughReply = await req('/api/reply', { method: 'POST', body: JSON.stringify({ text: '야 너 또 늦었네 ㅋㅋㅋ 개웃기네' }) });
assert(laughReply.json?.result?.mood === 'laugh', 'ㅋㅋ 대화 → 웃김 감정 판독');

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

console.log('\n[7] 브리핑 정합성');
const briefAgain = await req('/api/brief');
const briefIds = briefAgain.json.items.map((i) => i.templateId);
assert(new Set(briefIds).size === briefIds.length, '브리핑 8컷 템플릿 중복 없음');
assert(briefAgain.json.items.every((i) => typeof i.line === 'string' && i.line.length > 0), '모든 항목에 대사 포함');
const kstWeekday = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(new Date());
assert(briefAgain.json.headline.includes(kstWeekday), `헤드라인 요일 = KST 요일(${kstWeekday})`);

console.log('\n[8] 입력 검증');
const longLine = await req(`/api/frames/${frameId}`, { method: 'PATCH', body: JSON.stringify({ line: 'ㄱ'.repeat(60) }) });
assert(longLine.status === 422, '34자 초과 대사 → 422');
const badSize = await req('/api/packs', { method: 'POST', body: JSON.stringify({ sheetId, size: 13 }) });
assert(badSize.status === 422, '허용되지 않은 팩 사이즈 → 422');
const noConsent = await req('/api/face/analyze', {
  method: 'POST',
  body: JSON.stringify({ palette: PALETTE, signature: SIGNATURE, metrics: { coverage: 0.1, centering: 0.1, brightness: 120, sharpness: 12, faceDetected: true } }),
});
assert(noConsent.status === 422, '동의 없이 얼굴 분석 → 422');

console.log('\n[9] 카카오 규격 패키저');
const kakao12 = await req(`/api/packs/${packId}/kakao`);
assert(kakao12.json?.validation?.ok === false, '12컷 팩 → 규격 미충족(24종 필요)');
assert(kakao12.json.validation.checks.find((c) => c.id === 'count')?.blocking === true, '24종 검사는 차단 항목');
assert(kakao12.json.validation.checks.find((c) => c.id === 'pixel')?.pass === true, '360×360 항목 통과');
assert(kakao12.json.packaging === false, 'Free 플랜 → 패키징(ZIP) 미제공');

console.log('\n[10] 얼굴 파기 정책');
const cronNoAuth = await req('/api/cron/purge');
assert(cronNoAuth.status === 403 || cronNoAuth.status === 401, '크론 시크릿 없으면 파기 실행 거부(fail-closed)');
const purgeLocked = await req('/api/admin/purge', { method: 'POST', body: JSON.stringify({}) });
assert(purgeLocked.status === 403, '비관리자 → 파기 실행 403');

console.log('\n[11] 권한 · 관리자 세션 위조');
const forged = await fetch(`${BASE}/api/admin/metrics`, { headers: { cookie: 'emotime_sid=admin_session' } });
const forgedJson = await forged.json();
assert(forgedJson.locked === true, '쿠키 값만으로 관리자 권한 획득 불가');
const admin = await req('/api/admin/metrics');
assert(admin.json?.locked === true, '비관리자 → metrics 잠금');

console.log('\n[12] 운영자 로그인 · 무차별 대입 제한');
// 별도 세션으로 시도 → 본 세션의 로그인은 제한에 걸리지 않는다
const bruteCookie = `emotime_sid=brute-${Date.now().toString(36)}`;
let rateLimited = false;
let attempts = 0;
for (let i = 0; i < 8; i++) {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: bruteCookie },
    body: JSON.stringify({ passcode: `wrong-${i}` }),
  });
  attempts++;
  if (res.status === 429) {
    rateLimited = true;
    assert(!!res.headers.get('retry-after'), '429 응답에 Retry-After 헤더');
    break;
  }
}
assert(rateLimited, `연속 오답 ${attempts}회 → 429 요청 제한`);

console.log('\n[13] 관리자 로그인 후 파기 → 팩 렌더 유지');
const login = await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ passcode: process.env.ADMIN_PASSCODE || 'emotime-demo' }) });
if (login.status === 503) {
  // 운영 환경 + ADMIN_PASSCODE 미설정 → fail-closed 가 정상 동작
  assert(login.json?.error?.code === 'ADMIN_DISABLED', '운영자 코드 미설정 → 로그인 차단(503 fail-closed)');
  console.log('  ! ADMIN_PASSCODE 미설정 환경이라 파기 후 렌더 시나리오는 건너뜀 (CI 는 값을 주입해 실행)');
} else {
  assert(login.json?.admin === true, '운영자 로그인 성공');
  const before = await req('/api/admin/purge');
  assert(typeof before.json?.stats?.stored === 'number', `파기 통계 조회 (status=${before.status}, body=${before.text.slice(0, 120)})`);
  const purge = await req('/api/admin/purge', { method: 'POST', body: JSON.stringify({ force: true }) });
  assert(purge.json?.result?.purged >= 1, `강제 파기 실행 (${purge.json?.result?.purged}건)`);
  const afterPurge = await req(`/api/packs/${packId}`);
  assert(afterPurge.status === 200, '파기 후에도 팩 조회 200');
  assert(afterPurge.json?.frames?.length === 12 && !!afterPurge.json.frames[0].spec?.palette, '파기 후에도 스냅샷으로 렌더 가능');
  const purgedFace = await req('/api/admin/purge');
  assert(purgedFace.json?.stats?.stored === 0, '보관 중인 얼굴 프로필 0건');
  const purgedSheetPage = await req(`/studio/sheet/${sheetId}`);
  assert(purgedSheetPage.status === 200 && purgedSheetPage.text.includes('얼굴 정보가 파기'), '파기된 시트 → 안내 화면(404 아님)');
  const newSheet = await req('/api/sheets', { method: 'POST', body: JSON.stringify({ faceId: face.json.faceId, tone: '2d-cute' }) });
  assert(newSheet.status === 404, '파기된 얼굴로 시트 재생성 → 404 안내');
}

console.log(`\n결과: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
