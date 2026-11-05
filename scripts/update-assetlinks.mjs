// Digital Asset Links 지문 추가 — Play 앱 서명 키 지문 등록용
//  · Play 앱 서명(Play App Signing) 사용 시, 설치된 앱은 업로드 키가 아닌
//    Play 서명 키로 서명된다 → 그 지문도 assetlinks.json 에 함께 필요.
//  · 사용: node scripts/update-assetlinks.mjs "AA:BB:CC:..." [package_name]
//    (지문은 콘솔 "앱 무결성 → 앱 서명" 의 SHA-256 값)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'public/.well-known/assetlinks.json');

const [fingerprintArg, packageArg] = process.argv.slice(2);
if (!fingerprintArg) {
  console.error('사용: node scripts/update-assetlinks.mjs "AA:BB:CC:..." [package_name]');
  process.exit(1);
}

const normalized = fingerprintArg.trim().toUpperCase().replace(/[^0-9A-F]/g, '').match(/.{2}/g)?.join(':');
if (!normalized || normalized.length !== 94) {
  console.error('오류: SHA-256 지문 형식이 아닙니다 (64자리 16진수, 콜론 구분).');
  process.exit(1);
}

const links = JSON.parse(readFileSync(file, 'utf-8'));
const pkg = packageArg || 'com.emotihak.app';
let updated = 0;
for (const stmt of links) {
  if (stmt.target?.namespace === 'android_app' && stmt.target.package_name === pkg) {
    if (!stmt.target.sha256_cert_fingerprints.includes(normalized)) {
      stmt.target.sha256_cert_fingerprints.push(normalized);
      updated++;
    }
  }
}
if (!updated) {
  // 해당 패키지 문구가 없으면 새 문구를 추가한다
  links.push({
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: [normalized] },
  });
  updated = 1;
}
writeFileSync(file, JSON.stringify(links, null, 2) + '\n');
console.log(`✔ ${file} 에 지문 ${normalized} 추가 (${links.length}개 문구)`);
console.log('  → 커밋 후 배포(메인 머지)하면 https://emotihak.com/.well-known/assetlinks.json 에서 확인 가능');
