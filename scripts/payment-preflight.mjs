#!/usr/bin/env node
// Static launch configuration checks only. Never prints secret values or contacts payment providers.
const testMode = process.argv.includes('--test');
const failures = [];
const passes = [];
const warnings = [];
const env = process.env;
const value = (name) => String(env[name] || '').trim();
const present = (name) => value(name).length > 0;
const placeholder = (name) => /dummy|change-me|replace|example|your[_-]/i.test(value(name));
const pass = (message) => passes.push(message);
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

if (value('PAYMENT_PROVIDER') === 'toss') pass('PAYMENT_PROVIDER=toss');
else fail('PAYMENT_PROVIDER를 toss로 설정해야 합니다. mock은 운영 결제에 사용할 수 없습니다.');

for (const name of ['NEXT_PUBLIC_TOSS_CLIENT_KEY', 'TOSS_SECRET_KEY']) {
  const expectedPrefix = `${testMode ? 'test' : 'live'}_${name === 'NEXT_PUBLIC_TOSS_CLIENT_KEY' ? 'ck' : 'sk'}_`;
  if (!present(name)) fail(`${name}이 없습니다.`);
  else if (!value(name).startsWith(expectedPrefix)) fail(`${name}의 ${testMode ? '테스트' : '라이브'} 키 종류가 올바르지 않습니다.`);
  else if (placeholder(name)) fail(`${name}에 예시·스텁 값을 사용할 수 없습니다.`);
  else pass(`${name} 형식 확인`);
}
if (present('NEXT_PUBLIC_TOSS_CLIENT_KEY') && present('TOSS_SECRET_KEY')) {
  const clientMode = value('NEXT_PUBLIC_TOSS_CLIENT_KEY').startsWith('live_') ? 'live' : value('NEXT_PUBLIC_TOSS_CLIENT_KEY').startsWith('test_') ? 'test' : 'unknown';
  const secretMode = value('TOSS_SECRET_KEY').startsWith('live_') ? 'live' : value('TOSS_SECRET_KEY').startsWith('test_') ? 'test' : 'unknown';
  if (clientMode !== secretMode) fail('토스 클라이언트 키와 시크릿 키의 테스트/라이브 종류가 서로 다릅니다.');
}

const firestore = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'].every(present);
const kv = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'].every(present);
const backend = value('STORE_BACKEND') || 'auto';
if (!['auto', 'firestore', 'kv', 'file'].includes(backend)) fail('STORE_BACKEND는 auto, firestore, kv 중 하나여야 합니다.');
if (backend === 'file') fail('결제는 파일 저장소를 사용할 수 없습니다. Firestore 또는 KV CAS가 필요합니다.');
if (backend === 'firestore' && !firestore) fail('STORE_BACKEND=firestore이지만 FIREBASE_* 설정이 완전하지 않습니다.');
if (backend === 'kv' && !kv) fail('STORE_BACKEND=kv이지만 KV_REST_API_URL/TOKEN 설정이 완전하지 않습니다.');
if (backend === 'auto' && !firestore && !kv) fail('영속 결제 저장소가 없습니다. Firestore 또는 KV CAS를 설정해야 합니다.');
if ((firestore || kv) && backend !== 'file') pass(`영속 결제 저장소 설정 확인 (${backend})`);
if (['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'].some(present) && !firestore) fail('FIREBASE_* 값이 일부만 설정되어 있습니다.');
if (['KV_REST_API_URL', 'KV_REST_API_TOKEN'].some(present) && !kv) fail('KV_REST_API_URL/TOKEN 값이 일부만 설정되어 있습니다.');
for (const name of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) {
  if (present(name) && placeholder(name)) fail(`${name}에 예시·스텁 값을 사용할 수 없습니다.`);
}

try {
  const site = new URL(value('NEXT_PUBLIC_SITE_URL'));
  if (!testMode && site.protocol !== 'https:') fail('운영 NEXT_PUBLIC_SITE_URL은 HTTPS여야 합니다.');
  if (!testMode && ['localhost', '127.0.0.1', '::1'].includes(site.hostname)) fail('운영 사이트 URL이 로컬 주소입니다.');
  pass(`결제 콜백 기준 도메인 확인: ${site.origin}/checkout/success · ${site.origin}/checkout/fail`);
} catch {
  fail('NEXT_PUBLIC_SITE_URL을 올바른 절대 URL로 설정해야 합니다.');
}

const businessFields = [
  'NEXT_PUBLIC_BUSINESS_NAME',
  'NEXT_PUBLIC_BUSINESS_OWNER',
  'NEXT_PUBLIC_BUSINESS_REG_NO',
  'NEXT_PUBLIC_BUSINESS_ADDRESS',
  'NEXT_PUBLIC_BUSINESS_TEL',
  'NEXT_PUBLIC_SUPPORT_EMAIL',
  'NEXT_PUBLIC_MAIL_ORDER_NO',
];
for (const name of businessFields) {
  if (!present(name)) fail(`${name}을 실제 운영 정보로 명시해야 합니다.`);
  else if (placeholder(name)) fail(`${name}에 예시 값이 남아 있습니다.`);
}
if (businessFields.every((name) => present(name) && !placeholder(name))) pass('사업자·통신판매·고객센터 환경값 형식 확인');
if (present('NEXT_PUBLIC_SUPPORT_EMAIL') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value('NEXT_PUBLIC_SUPPORT_EMAIL'))) fail('NEXT_PUBLIC_SUPPORT_EMAIL 형식이 올바르지 않습니다.');

if (!present('ADMIN_PASSCODE') || placeholder('ADMIN_PASSCODE')) fail('결제 대사 콘솔용 ADMIN_PASSCODE를 안전하게 설정해야 합니다.');
else pass('운영자 콘솔 접근 설정 확인');
if (!testMode && value('DEMO_MODE') === '1') fail('운영에서 DEMO_MODE=1을 사용할 수 없습니다.');
if (!testMode && value('CHECKOUT_TEST_STUB') === '1') fail('CHECKOUT_TEST_STUB은 어떤 배포 환경에도 설정하면 안 됩니다.');
if (!testMode && value('RATE_LIMIT_DISABLED') === '1') fail('운영에서 RATE_LIMIT_DISABLED=1을 사용할 수 없습니다.');
if (value('PAYMENT_CHECKOUT_DISABLED') === '1') fail('PAYMENT_CHECKOUT_DISABLED=1이면 새 결제가 중단됩니다. 출시 전에 해제 여부를 확인하세요.');
if (value('NEXT_PUBLIC_PLATFORM') && value('NEXT_PUBLIC_PLATFORM') !== 'web') warn('웹 결제 기준 검사입니다. 스토어 빌드의 디지털 상품 결제 정책을 별도로 확인하세요.');
if (testMode) warn('테스트 키 형식 검사 모드입니다. 라이브 키와 실제 결제를 검증하지 않습니다.');

console.log(`\n결제 설정 preflight (${testMode ? 'test' : 'production'})\n`);
for (const message of passes) console.log(`  ✓ ${message}`);
for (const message of warnings) console.log(`  ! ${message}`);
for (const message of failures) console.error(`  ✗ ${message}`);
console.log('\n사람이 직접 확인해야 하는 항목 (자동 검사 대체 불가):');
console.log('  □ 토스 상점 심사·계약, 실제 도메인, 카드 기반 결제 외 수단 비활성화');
console.log('  □ 같은 상점의 키 쌍, Secret 저장소 등록, 실제 테스트 결제와 PC·모바일 인증');
console.log('  □ 사업자·통신판매 정보의 정확성, 고객센터 응대, 환불정책 법률 검토와 시행일');
console.log('  □ 원격 저장소 연결·장애 테스트, 토스 거래와 원장 대사, 미지급·환불 운영 훈련');
console.log('  □ 정기결제·자동 환불·가상계좌·굿즈를 활성화하지 않았는지 최종 확인');

if (failures.length) {
  console.error(`\n결과: ${failures.length}개 설정 문제를 먼저 해결해야 합니다.`);
  process.exitCode = 1;
} else {
  console.log('\n정적 설정 검사는 통과했습니다. 위 수동 항목을 완료하기 전에는 실결제를 활성화하지 마세요.');
}
