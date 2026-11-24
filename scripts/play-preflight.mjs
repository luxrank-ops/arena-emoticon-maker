#!/usr/bin/env node
// 구글 플레이 인앱결제 "실행 준비" 정적 검사.
//  · 값 자체(서비스 계정 JSON·키)를 절대 출력하지 않는다. 형식·쌍·누락만 본다.
//  · 실제 콘솔 등록·AAB 빌드·기기 테스트를 대체하지 않는다 (마지막에 수동 체크리스트 출력).
//
// 사용:
//   node scripts/play-preflight.mjs           # 운영/스테이징 기준 (배포 전 확인)
//   node scripts/play-preflight.mjs --local   # 로컬 개발 기준(https/실도메인 검사 완화)
//   node scripts/play-preflight.mjs --ci      # CI: 저장소 구조만 검사, 배포 Secret 누락은 경고
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const local = process.argv.includes('--local');
/** CI 에는 배포 Secret 이 없다 → 환경값 누락은 경고, 저장소 구조(매니페스트·코드 경로)만 실패로 본다. */
const ci = process.argv.includes('--ci');
const root = process.cwd();
const env = process.env;
const value = (name) => String(env[name] ?? '').trim();
const present = (name) => value(name).length > 0;
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const passes = [];
const warnings = [];
const failures = [];
const pass = (m) => passes.push(m);
const warn = (m) => warnings.push(m);
const fail = (m) => failures.push(m);
/** 배포 환경값 검사: CI 에서는 경고 */
const failEnv = (m) => (ci ? warnings : failures).push(m);

// ── 1. 패키지·도메인 ─────────────────────────────────────────
let manifest = null;
try {
  manifest = JSON.parse(read('twa/twa-manifest.json'));
} catch {
  fail('twa/twa-manifest.json 을 읽을 수 없습니다.');
}
const pkg = manifest?.packageId ?? '';
const envPkg = value('PLAY_PACKAGE_NAME');
if (!pkg) fail('twa-manifest.json 에 packageId 가 없습니다.');
else if (envPkg && envPkg !== pkg) failEnv(`PLAY_PACKAGE_NAME(${envPkg})이 twa-manifest.json(${pkg})과 다릅니다 — 구매 검증이 404 로 실패합니다.`);
else pass(`패키지 이름 일치: ${pkg}${envPkg ? ' (환경변수)' : ' (매니페스트 기본값)'}`);

const siteUrl = value('NEXT_PUBLIC_SITE_URL');
if (!siteUrl) failEnv('NEXT_PUBLIC_SITE_URL 이 없습니다. TWA 는 배포된 HTTPS 도메인을 열어야 합니다.');
else {
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:' && !local) fail('TWA 대상 도메인은 HTTPS 여야 합니다 (Digital Asset Links 는 HTTPS 에서만 검증됩니다).');
    else if (manifest?.host && url.hostname !== manifest.host && !local) fail(`NEXT_PUBLIC_SITE_URL(${url.hostname})이 TWA 호스트(${manifest.host})와 다릅니다.`);
    else pass(`TWA 호스트 확인: ${url.hostname}`);
  } catch {
    failEnv('NEXT_PUBLIC_SITE_URL 이 올바른 절대 URL 이 아닙니다.');
  }
}

// ── 2. 앱 구현 (매니페스트·권한·빌드) ────────────────────────
if (manifest) {
  if (manifest.features?.playBilling?.enabled === true) pass('twa-manifest: features.playBilling.enabled = true');
  else fail('twa-manifest: features.playBilling.enabled 가 꺼져 있으면 Digital Goods API 가 동작하지 않습니다.');
  if (manifest.alphaDependencies?.enabled === true) pass('twa-manifest: alphaDependencies.enabled = true (Play Billing 전제)');
  else fail('twa-manifest: alphaDependencies.enabled = false — playBilling 에 필요합니다.');
  if (manifest.enableNotifications === true) pass('twa-manifest: enableNotifications = true (playBilling 전제)');
  else warn('twa-manifest: enableNotifications 가 꺼져 있습니다. 일부 기기에서 결제 흐름이 제한될 수 있습니다.');
}
try {
  const androidManifest = read('twa/app/src/main/AndroidManifest.xml');
  if (androidManifest.includes('com.android.vending.BILLING')) pass('AndroidManifest: com.android.vending.BILLING 권한 있음');
  else fail('AndroidManifest 에 BILLING 권한이 없습니다.');
} catch {
  fail('twa/app/src/main/AndroidManifest.xml 을 읽을 수 없습니다.');
}
try {
  const gradle = read('twa/app/build.gradle');
  if (/targetSdkVersion\s+36/.test(gradle)) pass('app/build.gradle: targetSdkVersion 36');
  else warn('app/build.gradle 의 targetSdkVersion 을 확인하세요 (Play 는 매년 상향을 요구합니다).');
} catch {
  warn('twa/app/build.gradle 을 읽을 수 없습니다.');
}

// ── 3. 서명·Asset Links ─────────────────────────────────────
try {
  const links = JSON.parse(read('public/.well-known/assetlinks.json'));
  const statement = links.find((item) => item.target?.namespace === 'android_app' && item.target.package_name === pkg);
  if (!statement) fail('assetlinks.json 에 이 패키지의 statement 가 없습니다 — 앱이 주소창 있는 크롬 탭으로 열립니다.');
  else if (!(statement.target.sha256_cert_fingerprints ?? []).length) fail('assetlinks.json 에 SHA-256 지문이 없습니다.');
  else pass(`assetlinks.json 지문 ${statement.target.sha256_cert_fingerprints.length}개 등록됨(업로드 키 + Play 앱 서명 키)`);
} catch {
  fail('public/.well-known/assetlinks.json 을 읽을 수 없습니다.');
}
if (existsSync(path.join(root, 'twa/private/android-keystore.p12'))) pass('업로드 키스토어가 로컬에 있음 (Git 제외 경로)');
else warn('twa/private/android-keystore.p12 없음 → `node scripts/prepare-play-signing.mjs` 로 생성하거나 새로 받은 키를 넣으세요. (이 파일은 Git 에 올리지 않습니다)');
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n');
if (tracked.some((file) => /\.(p12|jks|keystore)$/i.test(file))) fail('서명 키가 Git 에 추적되고 있습니다 — 즉시 제거·회전하세요.');
else pass('서명 키·비밀번호가 Git 에 없음');

// ── 4. 서버 검증 설정 ──────────────────────────────────────
const sa = value('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
if (sa) {
  try {
    const parsed = JSON.parse(sa);
    if (!parsed.client_email || !parsed.private_key) failEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON 에 client_email/private_key 가 없습니다.');
    else pass(`서비스 계정 JSON 형식 확인 (${parsed.client_email.replace(/^[^@]+/, '***')})`);
  } catch {
    failEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON 이 JSON 이 아닙니다(따옴표·개행 확인).');
  }
} else if (value('PLAY_VERIFY_WITH_FIREBASE_SA') === '1' && value('FIREBASE_CLIENT_EMAIL') && value('FIREBASE_PRIVATE_KEY')) {
  pass('Firebase 서비스 계정으로 Play 검증 (PLAY_VERIFY_WITH_FIREBASE_SA=1)');
  warn('Firebase 서비스 계정에 androidpublisher 권한이 실제로 부여됐는지 Play Console 에서 확인해야 합니다.');
} else {
  failEnv('구매 검증 자격증명이 없습니다 → /api/play/purchases/verify 가 503 으로 막혀 결제해도 자격이 생기지 않습니다.');
}

const ids = (value('PLAY_PRODUCT_IDS') || 'emotihak_plus_monthly,emotihak_credits_20').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) fail('상품 ID 목록이 비어 있습니다.');
else pass(`허용 상품 ID: ${ids.join(', ')}`);
const productsFile = read('src/lib/play-products.ts');
for (const id of ids) {
  if (!productsFile.includes(`'${id}'`)) warn(`${id} 가 src/lib/play-products.ts 에 없습니다 — 화면 버튼·소비성 판정이 코드 기본값과 어긋날 수 있습니다.`);
}

if (value('PLAY_BILLING_ENABLED') === '1') pass('PLAY_BILLING_ENABLED=1 — 앱·웹 요금제 화면에 플레이 결제 버튼 노출');
else warn('PLAY_BILLING_ENABLED=0 — 결제 버튼이 숨겨져 있습니다(의도된 상태면 무시). 켜려면 Worker 변수를 1 로.');

// ── 5. 결제가 깨지지 않게 하는 주변 설정 ───────────────────
const store = value('STORE_BACKEND') || 'auto';
const firestore = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'].every(present);
const kv = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'].every(present);
if (store === 'file' || store === 'local') failEnv('STORE_BACKEND=file — 플레이 자격·크레딧 원장이 인스턴스 로컬에 남아 유실됩니다. Firestore 또는 KV 가 필요합니다.');
else if (store === 'auto' && !firestore && !kv) failEnv('영속 저장소가 없습니다. 자격 기록(play_purchases)·원장이 재시작마다 사라집니다.');
else pass(`영속 저장소 설정 확인 (${store})`);

if (present('CRON_SECRET')) pass('CRON_SECRET 있음 — /api/cron/play-entitlements 로 환불·만료 자격 회수 가능');
else if (local) warn('CRON_SECRET 미설정(로컬). 운영에서는 설정해야 재검증 크론이 동작합니다.');
else failEnv('CRON_SECRET 이 없으면 운영에서 재검증 크론이 403 으로 거부됩니다 — 환불 후에도 자격이 남습니다.');

if (value('RATE_LIMIT_DISABLED') === '1' && !local) failEnv('운영에서 RATE_LIMIT_DISABLED=1 을 사용하면 안 됩니다.');
if (value('DEMO_MODE') === '1' && !local) failEnv('운영에서 DEMO_MODE=1 은 결제·AI 를 목업으로 만듭니다.');
if (!present('ADMIN_PASSCODE')) failEnv('ADMIN_PASSCODE 없음 — 구매 대사·복구 콘솔(/admin)을 쓸 수 없습니다.');

// ── 6. 코드 측 필수 경로 ───────────────────────────────────
const checks = [
  ['src/lib/play-billing.ts', 'getDigitalGoodsService'],
  ['src/lib/play-billing.ts', 'new PaymentRequest('],
  ['src/lib/play-billing.ts', '/api/play/purchases/verify'],
  ['src/lib/play-purchases.ts', ':consume'],
  ['src/lib/play-purchases.ts', 'refType: \'play-purchase\''],
  ['src/app/api/play/purchases/verify/route.ts', 'isAllowedPlayProduct'],
  ['src/app/api/cron/play-entitlements/route.ts', 'revalidatePlayEntitlements'],
];
for (const [file, needle] of checks) {
  if (read(file).includes(needle)) pass(`${file} ← ${needle}`);
  else fail(`${file} 에 ${needle} 가 없습니다 — 플레이 결제 필수 경로가 빠졌습니다.`);
}

// ── 출력 ───────────────────────────────────────────────────
console.log(`\n구글 플레이 인앱결제 preflight (${ci ? 'CI' : local ? 'local' : '운영'} 기준)\n`);
for (const m of passes) console.log(`  ✓ ${m}`);
for (const m of warnings) console.log(`  ! ${m}`);
for (const m of failures) console.error(`  ✗ ${m}`);

console.log('\n사람이 직접 해야 하는 항목 (자동 검사로 대체 불가):');
console.log('  □ Play Console > 수익 창출 > 인앱 상품/구독 등록 (아래 상품 ID 와 정확히 동일)');
console.log('  □ Play Console > 설정 > API 액세스: 서비스 계정 초대 + 권한 부여');
console.log('  □ bubblewrap build --aab → 내부 테스트 트랙 업로드');
console.log('  □ 앱 무결성 > 앱 서명 SHA-256 → node scripts/update-assetlinks.mjs 로 추가 후 배포');
console.log('  □ 실기기(내부 테스트 설치)에서 결제 시트·자격 반영·환불 회수 확인');
console.log('  □ 12명 × 14일 비공개 테스트 요건(신규 개인 개발자) 확인');
console.log(`  □ 상품: ${ids.join(' / ')}`);
if (failures.length) {
  console.error(`\n결과: ${failures.length}개 문제를 먼저 해결해야 합니다. (통과 ${passes.length} / 경고 ${warnings.length})`);
  process.exitCode = 1;
} else {
  console.log(`\n정적 검사 통과 (통과 ${passes.length} / 경고 ${warnings.length}). 위 수동 항목 전에는 실결제를 켜지 마세요.`);
}
