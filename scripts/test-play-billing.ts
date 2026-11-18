// 구글 플레이 인앱결제 — 서버 검증·자격 원장 테스트 (tsx)
//  · UA 신호만으로는 유료 자격이 열리지 않는지 (P0-2 회귀 방지)
//  · 검증 설정이 없으면 아무 자격도 만들지 않는지 (fail-closed)
//  · 구글 API 스텁으로 검증 → acknowledge → 자격 기록 → 환불 회수까지
//  · TWA 매니페스트/AndroidManifest 의 Play Billing 설정과 클라이언트 골격 확인
// 실행: npx tsx scripts/test-play-billing.ts
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 저장소는 import 시점에 환경변수를 읽는다 → 모듈을 동적으로 불러온다.
process.env.STORE_BACKEND = 'file';
process.env.DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), `emotime-play-billing-${Date.now()}`);
delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
delete process.env.PLAY_VERIFY_WITH_FIREBASE_SA;
delete process.env.PLAY_API_BASE_URL;
delete process.env.PLAY_TOKEN_URL;

let pass = 0;
let failCount = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { failCount++; console.log(`  ✘ ${name} ${extra}`); }
}

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

const adminAccess = await import('../src/lib/admin-access');
const playPurchases = await import('../src/lib/play-purchases');
const { withDB } = await import('../src/lib/store');

const uaOnly = { role: 'user' as const, plan: 'FREE' as const, credits: 12, play: true };
const verified = { role: 'user' as const, plan: 'FREE' as const, credits: 12, play: true, playVerified: true };
const web = { role: 'user' as const, plan: 'FREE' as const, credits: 12 };
const admin = { role: 'admin' as const, plan: 'FREE' as const, credits: 12 };

console.log('\n[1] UA 신호만으로는 유료 자격·AI 생성이 열리지 않는다 (P0-2)');
process.env.GENERATION_ADMIN_ONLY = '1';
// 무료 체험(2026-11-18)이 기본 켜짐이라, '닫혀 있을 때'의 차단을 먼저 확인한다.
process.env.TRIAL_FREE_ENABLED = '0';
check('isFullAccess(UA만) = false', adminAccess.isFullAccess(uaOnly) === false);
check('isFullAccess(검증된 구매) = true', adminAccess.isFullAccess(verified) === true);
check('isFullAccess(웹 FREE) = false', adminAccess.isFullAccess(web) === false);
check('canUseAiGeneration(UA만) = false', adminAccess.canUseAiGeneration(uaOnly) === false);
check('canUseAiGeneration(웹 FREE) = false (체험 닫힘)', adminAccess.canUseAiGeneration(web) === false);
check('canUseAiGeneration(검증된 구매) = true', adminAccess.canUseAiGeneration(verified) === true);
check('canUseAiGeneration(관리자) = true', adminAccess.canUseAiGeneration(admin) === true);
// 체험이 열려 있어도 '무제한(full)'이 아니라 '맛보기(trial)'다 — 팩·배치는 여전히 막힌다.
process.env.TRIAL_FREE_ENABLED = '1';
check('aiAccess(UA만) = trial', adminAccess.aiAccess(uaOnly) === 'trial');
check('aiAccess(웹 FREE) = trial', adminAccess.aiAccess(web) === 'trial');
check('isUnlimited(UA만) = false', adminAccess.isUnlimited(uaOnly) === false);
delete process.env.TRIAL_FREE_ENABLED;
check('effectivePlan(UA만) = FREE', adminAccess.effectivePlan(uaOnly) === 'FREE');
check('watermarkFor(UA만) = true', adminAccess.watermarkFor(uaOnly) === true);
check('watermarkFor(검증된 구매) = false', adminAccess.watermarkFor(verified) === false);

console.log('\n[2] 관리자 로그인 기본값은 fail-closed');
delete process.env.ADMIN_LOGIN_ANY_IDENTIFIER;
check('ADMIN_LOGIN_ANY_IDENTIFIER 미설정 = 닉네임만', adminAccess.adminLoginAnyIdentifier() === false);
process.env.ADMIN_LOGIN_ANY_IDENTIFIER = '1';
check('ADMIN_LOGIN_ANY_IDENTIFIER=1 이면 허용', adminAccess.adminLoginAnyIdentifier() === true);
delete process.env.ADMIN_LOGIN_ANY_IDENTIFIER;

console.log('\n[3] 검증 설정이 없으면 아무 자격도 만들지 않는다');
check('playVerificationConfigured() = false', playPurchases.playVerificationConfigured() === false);
let unconfigured: unknown = null;
try {
  await playPurchases.verifyAndRecordPlayPurchase('usr_test', { productId: 'emotihak_credits_20', purchaseToken: 'tok-active' });
} catch (e) { unconfigured = e; }
check(
  '미설정 상태는 503 PLAY_VERIFICATION_UNAVAILABLE',
  (unconfigured as { code?: string; status?: number })?.code === 'PLAY_VERIFICATION_UNAVAILABLE'
    && (unconfigured as { status?: number })?.status === 503,
  JSON.stringify(unconfigured),
);
check('미설정 상태에서 원장이 비어 있음', await withDB((db) => db.playPurchases.length) === 0);

console.log('\n[4] 구글 API 스텁으로 검증 → acknowledge → 자격');
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const acknowledged: string[] = [];
const server: Server = createServer((req, res) => {
  const url = req.url ?? '';
  if (url === '/token') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'stub-access-token', expires_in: 3600 }));
    return;
  }
  if (url.includes(':acknowledge')) {
    acknowledged.push(url);
    res.writeHead(204);
    res.end();
    return;
  }
  const inapp = url.match(/purchases\/products\/([^/]+)\/tokens\/([^/:]+)$/);
  const subs = url.match(/purchases\/subscriptionsv2\/tokens\/([^/:]+)$/);
  if (inapp) {
    const token = decodeURIComponent(inapp[2]);
    if (token === 'tok-active') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ purchaseState: 0, acknowledgementState: 0, orderId: 'GPA.1000' }));
      return;
    }
    if (token === 'tok-refunded') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ purchaseState: 1, acknowledgementState: 1, orderId: 'GPA.1001' }));
      return;
    }
    if (token === 'tok-broken') {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'boom' }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  if (subs) {
    const token = decodeURIComponent(subs[1]);
    if (token === 'sub-active') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        acknowledgementState: '1',
        latestOrderId: 'GPA.2000',
        lineItems: [{ expiryTime: new Date(Date.now() + 30 * 86_400_000).toISOString() }],
      }));
      return;
    }
    if (token === 'sub-expired') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED', acknowledgementState: '1', lineItems: [] }));
      return;
    }
    res.writeHead(404);
    res.end('{}');
    return;
  }
  res.writeHead(404);
  res.end('{}');
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;

process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'play-verify@test.iam.gserviceaccount.com', private_key: privateKey });
process.env.PLAY_TOKEN_URL = `http://127.0.0.1:${port}/token`;
process.env.PLAY_API_BASE_URL = `http://127.0.0.1:${port}/androidpublisher/v3`;
process.env.PLAY_PACKAGE_NAME = 'com.emotihak.app';

check('playVerificationConfigured() = true', playPurchases.playVerificationConfigured() === true);
const record = await playPurchases.verifyAndRecordPlayPurchase('usr_play', { productId: 'emotihak_credits_20', purchaseToken: 'tok-active' });
check('구매 검증 결과 ACTIVE', record.status === 'ACTIVE', record.status);
check('서버가 acknowledge 를 호출함', record.acknowledged === true && acknowledged.length === 1, JSON.stringify(acknowledged));
check('자격이 계정에 기록됨', await playPurchases.hasActivePlayEntitlement('usr_play') === true);
check('다른 계정에는 자격 없음', await playPurchases.hasActivePlayEntitlement('usr_other') === false);
const again = await playPurchases.verifyAndRecordPlayPurchase('usr_play', { productId: 'emotihak_credits_20', purchaseToken: 'tok-active' });
check('재검증해도 기록은 1건(중복 없음)', again.id === record.id && await withDB((db) => db.playPurchases.length) === 1);
check('조회 응답에 구매 토큰이 노출되지 않음', !('purchaseToken' in (await playPurchases.listPlayEntitlements('usr_play'))[0]));

const sub = await playPurchases.verifyAndRecordPlayPurchase('usr_sub', { productId: 'emotihak_plus_monthly', purchaseToken: 'sub-active', kind: 'SUBS' });
check('구독 활성 상태 → ACTIVE + 만료일 기록', sub.status === 'ACTIVE' && !!sub.expiresAt, JSON.stringify(sub));
const expired = await playPurchases.verifyAndRecordPlayPurchase('usr_expired', { productId: 'emotihak_plus_monthly', purchaseToken: 'sub-expired', kind: 'SUBS' });
check('만료 구독은 자격 없음', expired.status === 'REVOKED' && await playPurchases.hasActivePlayEntitlement('usr_expired') === false);

console.log('\n[5] 환불·취소·오류 처리');
const refunded = await playPurchases.verifyAndRecordPlayPurchase('usr_refund', { productId: 'emotihak_credits_20', purchaseToken: 'tok-refunded' });
check('환불된 구매는 REVOKED', refunded.status === 'REVOKED', refunded.status);
check('환불 계정은 자격 없음', await playPurchases.hasActivePlayEntitlement('usr_refund') === false);
let notFound: unknown = null;
try {
  await playPurchases.verifyAndRecordPlayPurchase('usr_missing', { productId: 'emotihak_credits_20', purchaseToken: 'tok-nowhere' });
} catch (e) { notFound = e; }
check('없는 구매는 404 PLAY_PURCHASE_NOT_FOUND', (notFound as { code?: string })?.code === 'PLAY_PURCHASE_NOT_FOUND');
let broken: unknown = null;
try {
  await playPurchases.verifyAndRecordPlayPurchase('usr_broken', { productId: 'emotihak_credits_20', purchaseToken: 'tok-broken' });
} catch (e) { broken = e; }
check('구글 5xx 는 502 PLAY_VERIFICATION_FAILED', (broken as { code?: string; status?: number })?.code === 'PLAY_VERIFICATION_FAILED' && (broken as { status?: number })?.status === 502);

console.log('\n[6] 재검증 크론 (환불 회수)');
await withDB((db) => {
  const record = db.playPurchases.find((item) => item.purchaseToken === 'tok-active');
  if (record) record.status = 'ACTIVE';
});
const revalidated = await playPurchases.revalidatePlayEntitlements();
check('활성 구매는 재검증에서 유지', revalidated.configured === true && revalidated.revoked === 0, JSON.stringify(revalidated));
check('재검증 후에도 자격 유지', await playPurchases.hasActivePlayEntitlement('usr_play') === true);
// 구매가 구글에서 사라진 상황 (스텁은 남은 토큰을 404 로 응답)
await withDB((db) => {
  const record = db.playPurchases.find((item) => item.purchaseToken === 'tok-active');
  if (record) record.purchaseToken = 'tok-gone';
});
const revokedByCron = await playPurchases.revalidatePlayEntitlements();
check('구글에서 사라진 구매는 회수', revokedByCron.revoked >= 1, JSON.stringify(revokedByCron));
check('회수 후 자격 없음', await playPurchases.hasActivePlayEntitlement('usr_play') === false);

console.log('\n[7] 상품 허용 목록');
check('등록 상품 ID 는 허용', playPurchases.isAllowedPlayProduct('emotihak_credits_20') === true);
check('임의 상품 ID 는 거부', playPurchases.isAllowedPlayProduct('hacked_sku') === false);
process.env.PLAY_PRODUCT_IDS = 'custom_sku';
check('운영 환경변수로 상품 목록 교체', playPurchases.isAllowedPlayProduct('custom_sku') === true && playPurchases.isAllowedPlayProduct('emotihak_credits_20') === false);
delete process.env.PLAY_PRODUCT_IDS;

console.log('\n[8] TWA / 웹앱 골격');
const manifest = JSON.parse(read('twa/twa-manifest.json'));
check('twa-manifest 에 playBilling 활성', manifest.features?.playBilling?.enabled === true);
check('playBilling 은 alphaDependencies 필요 → 활성', manifest.alphaDependencies?.enabled === true);
check('알림 위임 활성 (playBilling 전제)', manifest.enableNotifications === true);
check('AndroidManifest 에 BILLING 권한', read('twa/app/src/main/AndroidManifest.xml').includes('com.android.vending.BILLING'));
const billing = read('src/lib/play-billing.ts');
check('Digital Goods API 사용', billing.includes('getDigitalGoodsService') && billing.includes('https://play.google.com/billing'));
check('PaymentRequest 사용', billing.includes('new PaymentRequest('));
check('구매 토큰은 서버로 검증 요청', billing.includes('/api/play/purchases/verify'));
check('클라이언트는 자격을 직접 만들지 않음', !/localStorage|document\.cookie/.test(billing));
const route = read('src/app/api/play/purchases/verify/route.ts');
check('검증 엔드포인트는 로그인 필수', route.includes("isAuthenticated") && route.includes('LOGIN_REQUIRED'));
check('검증 엔드포인트는 미설정 시 503', route.includes('PLAY_VERIFICATION_UNAVAILABLE'));
check('검증 엔드포인트는 상품 허용 목록 검사', route.includes('isAllowedPlayProduct'));
check('GENERATION_ADMIN_ONLY 기본값은 1 (원가 보호 유지)', /GENERATION_ADMIN_ONLY:\s*bindings\.text\("1"\)/.test(read('cloudflare.config.ts')));

server.close();
console.log(`\n결과: ${pass} 통과, ${failCount} 실패`);
process.exit(failCount ? 1 : 0);
