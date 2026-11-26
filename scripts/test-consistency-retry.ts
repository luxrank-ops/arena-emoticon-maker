// ─────────────────────────────────────────────────────────────
// AI 특징 재확인 재시도·폴백 테스트 (실제 Gemini 호출 없음 — fetch 스텁)
//  · 일시 실패(연결 오류·5xx·429)는 1회 자동 재시도하고, 두 번째도 실패할 때만 기본 확인으로 폴백
//  · 사진 자체가 쓸 수 없다는 판정(PHOTO_NEEDS_REVIEW)은 재시도하지 않는다
// 실행: npm run test:consistency-retry
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}

/** 64×64 PNG 헤더 — 기본 확인(파일 검사)이 통과하는 최소 입력 */
function png64(): { mimeType: string; base64: string } {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13], 8); // IHDR length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // 'IHDR'
  bytes.set([0, 0, 0, 64, 0, 0, 0, 64], 16); // width·height = 64
  return { mimeType: 'image/png', base64: Buffer.from(bytes).toString('base64') };
}

const guidance = (features = ['short dark hair']) => JSON.stringify({ usable: true, features });
const okBody = (features = ['short dark hair']) => new Response(JSON.stringify({
  candidates: [{ content: { parts: [{ text: guidance(features) }] } }],
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

process.env.GEMINI_API_KEY = 'test-key';
delete (globalThis as any).CLOUDFLARE_ENV;
delete process.env.DEMO_MODE;

const { prepareWithFallback } = await import('../src/lib/ai/consistency');
const realFetch = globalThis.fetch;

/** 호출 순서대로 준비한 응답을 돌려주는 fetch 스텁 */
function stubFetch(plan: Array<() => Response | Promise<Response>>) {
  let calls = 0;
  globalThis.fetch = (async () => {
    const step = plan[Math.min(calls, plan.length - 1)];
    calls++;
    return step();
  }) as typeof fetch;
  return () => calls;
}

const photo = png64();

console.log('[1] 연결 오류 1회 → 자동 재시도로 AI 확인 성공');
{
  const calls = stubFetch([
    () => { throw new Error('connection reset'); },
    () => okBody(),
  ]);
  const result = await prepareWithFallback(photo, 'person');
  check('첫 실패 후 재시도해서 method=ai', result.method === 'ai');
  check('두 번째 분석(특징 검증)까지 완료 = fetch 3회', calls() === 3);
  check('특징 목록을 그대로 돌려준다', result.guidance.features[0] === 'short dark hair');
}

console.log('[2] 5xx 1회 → 자동 재시도로 AI 확인 성공');
{
  const calls = stubFetch([
    () => new Response('upstream error', { status: 500 }),
    () => okBody(),
  ]);
  const result = await prepareWithFallback(photo, 'person');
  check('5xx 1회는 폴백이 아니라 재시도', result.method === 'ai' && calls() === 3);
}

console.log('[3] 429(쿼터) 1회 → 자동 재시도로 AI 확인 성공');
{
  const calls = stubFetch([
    () => new Response('quota', { status: 429 }),
    () => okBody(),
  ]);
  const result = await prepareWithFallback(photo, 'person');
  check('429 1회도 재시도한다', result.method === 'ai' && calls() === 3);
}

console.log('[4] 두 번 연속 실패 → 기본 사진 확인으로 폴백');
{
  const calls = stubFetch([() => new Response('down', { status: 503 })]);
  const result = await prepareWithFallback(photo, 'person');
  check('재시도 후에도 실패하면 method=basic', result.method === 'basic');
  check('AI 호출은 정확히 2회(1회 + 재시도 1회)', calls() === 2);
  check('폴백 안내에 쓰이는 특징 2개를 채운다', result.guidance.features.length === 2);
}

console.log('[5] 사진 판정 실패(usable=false) → 재시도 없이 기본 확인');
{
  const calls = stubFetch([
    () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ usable: false, features: ['x'] }) }] } }] }), { status: 200 }),
  ]);
  const result = await prepareWithFallback(photo, 'person');
  check('사진 판정 실패는 즉시 basic', result.method === 'basic');
  check('재시도하지 않는다 (fetch 1회)', calls() === 1);
}

console.log('[6] 키가 없어도 기본 확인으로 안전하게 진행');
{
  delete process.env.GEMINI_API_KEY;
  const calls = stubFetch([() => okBody()]);
  const result = await prepareWithFallback(photo, 'person');
  check('API 키 없음 → method=basic', result.method === 'basic');
  check('외부 호출 없음', calls() === 0);
  process.env.GEMINI_API_KEY = 'test-key';
}

globalThis.fetch = realFetch;
console.log(`\n✔ consistency retry tests passed (${passed})`);
