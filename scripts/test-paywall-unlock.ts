// ─────────────────────────────────────────────────────────────
// 페이월 · 단건 잠금 해제 · 3단 가격 매트릭스 테스트
//  · 무료 미리보기 12컷 팩이 크레딧 없이 만들어지고, 결제 전에는 잠긴다.
//  · ₩5,900 / ₩7,900 / ₩6,900 완성권과 ₩19,900 Creator Pro 가 서버 금액 검증표에 있다.
//  · 결제 승인(모의) 뒤에만 팩 잠금이 풀리고 내보내기 권한이 열린다.
// 실행: npx tsx scripts/test-paywall-unlock.ts
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-paywall-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.GENERATION_ADMIN_ONLY = '0';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const pricing = await import('../src/lib/pricing');
const { withDB } = await import('../src/lib/store');
const { withPaymentDB } = await import('../src/lib/store');
const { createSheet, chooseSheet, createPack, packExportState, unlockPack, getPackView } = await import('../src/lib/packs');
const { newImageId, saveImage } = await import('../src/lib/images');
const { DEFAULT_PALETTE, DEFAULT_SIGNATURE } = await import('../src/lib/art/sticker');
const { confirmCheckout } = await import('../src/lib/checkout');
const { PREVIEW_WATERMARK, PREVIEW_PACK_SIZE } = await import('../src/lib/trial-policy');

console.log('\n[1] 3단 가격 매트릭스 — 서버 금액 검증표(SKUS)와 화면이 같은 값');
check('단건 팩 완성권 ₩5,900', pricing.SKUS['pack-unlock-single'].price === 5900 && pricing.SKUS['pack-unlock-single'].kind === 'unlock');
check('2인 케미 완성권 ₩7,900', pricing.SKUS['pack-unlock-duo'].price === 7900);
check('반려동물 완성권 ₩6,900', pricing.SKUS['pack-unlock-pet'].price === 6900);
check('Creator Pro 월 이용권 ₩19,900 · STUDIO 등급', pricing.SKUS['plan-creator-monthly'].price === 19900 && pricing.SKUS['plan-creator-monthly'].plan === 'STUDIO' && pricing.SKUS['plan-creator-monthly'].kind === 'subscription');
check('시즌·테마 크레딧 ₩9,900 ~ ₩22,000', pricing.SKUS['credits-theme-9900'].price === 9900 && pricing.SKUS['credits-theme-22000'].price === 22000);
check('가격 매트릭스 3단', pricing.PRICE_TIERS.length === 3 && pricing.PRICE_TIERS.map((tier) => tier.id).join(',') === 'single,theme,creator');
check('Creator Pro 표기 가격 = SKU 가격', pricing.PLANS.STUDIO.price === 19900 && pricing.PLANS.STUDIO.acr === true);
check('팩 구성별 완성권 자동 선택', pricing.unlockSkuForPack('duo-chemi', 'person') === 'pack-unlock-duo' && pricing.unlockSkuForPack(null, 'pet') === 'pack-unlock-pet' && pricing.unlockSkuForPack('situation', 'person') === 'pack-unlock-single');
check('미리보기 워터마크 문구 노출', PREVIEW_WATERMARK === '이모티학으로 내 얼굴 짤 만들기' && PREVIEW_PACK_SIZE === 12);

console.log('\n[2] 무료 12컷 미리보기 팩 — 크레딧 0, 워터마크, 잠김');
const now = new Date().toISOString();
await withDB((db) => {
  db.users.push({ id: 'u-free', name: 'free', plan: 'FREE', credits: 12, role: 'user', createdAt: now, lastGrantAt: now });
  db.faces.push({
    id: 'face-free', userId: 'u-free', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE,
    metrics: { coverage: 0.5, centering: 0.9, brightness: 0.5, sharpness: 0.9, faceDetected: true },
    consent: { at: now, version: 'v1.2', ip: '0.0.0.0', overseas: true },
    createdAt: now, purgedAt: new Date(Date.now() + 86400000).toISOString(),
  });
});
const imageId = newImageId();
await saveImage(imageId, 'u-free', new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]));
const sheet = await createSheet('u-free', 'face-free', '2d-cute', 'face', 'person', undefined, 1);
await withDB((db) => { db.sheets.find((s) => s.id === sheet.id)!.variants[0].imageId = imageId; });
await chooseSheet('u-free', sheet.id, 'A');

const before = await withDB((db) => db.users.find((u) => u.id === 'u-free')!.credits);
const preview = await createPack('u-free', sheet.id, 12, '미리보기', false, undefined, 'ko', undefined, undefined, { preview: true });
const afterCredits = await withDB((db) => db.users.find((u) => u.id === 'u-free')!.credits);
check('미리보기 팩은 12컷', preview.frames.length === 12 && preview.size === 12);
check('미리보기 팩은 크레딧을 쓰지 않는다', afterCredits === before && preview.creditsSpent === 0);
check('미리보기 팩에 워터마크 문구·Flash 표시', preview.preview?.watermark === PREVIEW_WATERMARK && preview.preview?.model === 'flash');
const freeViewer = { role: 'user' as const, plan: 'FREE' as const, credits: 12 };
const lockedState = packExportState(preview, freeViewer);
check('무료 등급은 잠김 · 워터마크 · 5,900원 완성권', !lockedState.unlocked && lockedState.watermark && lockedState.unlockSku === 'pack-unlock-single' && lockedState.unlockPrice === 5900);
const view = await getPackView('u-free', preview.id, freeViewer);
check('팩 화면 응답에 잠금 상태가 실린다', view.unlocked === false && view.watermark === true && view.exportState.reason === 'paywall');

console.log('\n[3] 2인·반려동물 완성권 가격과 반려동물 사진 가드');
const duoPrice = packExportState({ ...preview, format: 'duo-chemi', subjectKind: 'person' }, freeViewer);
check('2인 케미 팩은 7,900원 완성권', duoPrice.unlockSku === 'pack-unlock-duo' && duoPrice.unlockPrice === 7900);
const petPrice = packExportState({ ...preview, format: 'pet-meme', subjectKind: 'pet' }, freeViewer);
check('반려동물 팩은 6,900원 완성권', petPrice.unlockSku === 'pack-unlock-pet' && petPrice.unlockPrice === 6900);
let petGuard: unknown = null;
try {
  await createPack('u-free', sheet.id, 12, '펫', false, undefined, 'ko', 'pet-meme', undefined, { preview: true });
} catch (e) { petGuard = e; }
check('반려동물 집사 밈은 반려동물 사진 없이는 거부', (petGuard as { code?: string })?.code === 'PET_PHOTO_REQUIRED');

console.log('\n[4] 결제 승인(모의) 후에만 잠금 해제 · 금액 위조 차단');
const orderId = 'ord_test_unlock_1';
await withPaymentDB((db) => {
  db.orders.push({
    id: orderId, userId: 'u-free', kind: 'unlock', sku: 'pack-unlock-single', title: '단건 팩 완성권',
    amount: 5900, credits: 0, plan: null, status: 'PENDING', provider: 'mock',
    packId: preview.id, consentAt: new Date().toISOString(), createdAt: new Date().toISOString(),
  });
});
let mismatch: unknown = null;
try {
  await confirmCheckout('u-free', { orderId, paymentKey: `mock_${orderId}`, amount: 100 });
} catch (e) { mismatch = e; }
check('금액이 다르면 AMOUNT_MISMATCH', (mismatch as { code?: string })?.code === 'AMOUNT_MISMATCH');
const still = await withDB((db) => db.packs.find((p) => p.id === preview.id)!);
check('금액 위조 주문으로는 잠금이 풀리지 않는다', !still.unlockedAt);
const result = await confirmCheckout('u-free', { orderId, paymentKey: `mock_${orderId}`, amount: 5900 });
check('정상 승인 후 kind=unlock', result.kind === 'unlock' && result.packId === preview.id);
const unlockedPack = await withDB((db) => db.packs.find((p) => p.id === preview.id)!);
check('팩에 잠금 해제 시각·SKU 기록', !!unlockedPack.unlockedAt && unlockedPack.unlockSku === 'pack-unlock-single');
const openState = packExportState(unlockedPack, freeViewer);
check('잠금 해제 후 내보내기 열림 · 워터마크 없음', openState.unlocked && !openState.watermark && openState.reason === 'unlocked');
const again = await confirmCheckout('u-free', { orderId, paymentKey: `mock_${orderId}`, amount: 5900 });
check('같은 주문 재확인은 alreadyPaid(멱등)', again.alreadyPaid === true);

console.log('\n[5] 유료 등급·업그레이드 경로');
const proViewer = { role: 'user' as const, plan: 'STUDIO' as const, credits: 120, planExpiresAt: new Date(Date.now() + 86400000).toISOString() };
check('Creator Pro 는 모든 팩을 연다', packExportState(preview, proViewer).unlocked === true);
const expired = { role: 'user' as const, plan: 'STUDIO' as const, credits: 0, planExpiresAt: new Date(Date.now() - 1000).toISOString() };
const adminAccess = await import('../src/lib/admin-access');
check('만료된 이용권은 무료로 돌아간다', adminAccess.effectivePlan(expired) === 'FREE');
const legacyPack = { ...preview, preview: undefined, createdAt: '2026-11-01T00:00:00.000Z', unlockedAt: undefined };
check('개편 전에 만든 팩은 잠그지 않는다', packExportState(legacyPack, freeViewer).unlocked === true);

console.log('\n[6] 화면·API 배선');
const packPage = read('src/app/studio/pack/[id]/page.tsx');
check('팩 화면이 잠금 상태와 심사 시트를 내려준다', packPage.includes('view.exportState') && packPage.includes('buildReviewSheet'));
const viewer = read('src/components/studio/PackViewer.tsx');
check('잠긴 팩은 내보내기 대신 잠금 해제 CTA', viewer.includes("t('잠금 해제하고 내려받기'") && viewer.includes('CheckoutButton'));
check('미리보기 컷에 반복 워터마크 오버레이', viewer.includes('lockWatermark') && viewer.includes('-rotate-[20deg]') && viewer.includes('opacity-45'));
check('잠금 해제 후 고화질 재생성(finalize)', viewer.includes('finalize: true'));
check('굿즈 업셀 배너(3컷 · 20% 번들)', viewer.includes('아크릴 키링') && viewer.includes('bundle=1'));
const checkoutRoute = read('src/app/api/checkout/route.ts');
check('주문 생성이 팩 소유·잠금 상태를 확인', checkoutRoute.includes('unlockSkuForPack') && checkoutRoute.includes('ALREADY_UNLOCKED'));
check('잠금 해제한 팩은 규격 ZIP 을 연다', read('src/app/studio/pack/[id]/page.tsx').includes('packaging: view.exportState.unlocked'));
const render = read('src/app/api/render/route.ts');
check('미리보기는 Flash · 잠금 해제 후 고화질', render.includes("as 'preview' | 'final'") && render.includes('hiResAt'));
check('워터마크 문구를 내보내기에 전달', read('src/lib/export.ts').includes('watermarkText'));

console.log(`\n페이월·잠금 해제 테스트: ${passed} 통과, ${failed} 실패`);
assert.equal(failed, 0, '페이월·잠금 해제 테스트 실패');
