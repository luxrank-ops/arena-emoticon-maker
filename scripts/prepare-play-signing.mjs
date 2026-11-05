// Create or reuse an upload key without ever writing private material into Git.
// Requires OpenSSL only; does not build an AAB and never prints passwords.
// Usage:
//   node scripts/prepare-play-signing.mjs --replace-upload "OLD:SHA256:..."
//   node scripts/prepare-play-signing.mjs             # reuse existing ignored key
//   node scripts/prepare-play-signing.mjs --force ... # rotate an existing upload key
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const twaDir = path.join(root, 'twa');
const privateDir = path.join(twaDir, 'private');
const args = process.argv.slice(2);
const force = args.includes('--force');
const replaceIndex = args.indexOf('--replace-upload');
const replaceFingerprint = replaceIndex >= 0 ? args[replaceIndex + 1] : undefined;
if (replaceIndex >= 0 && !replaceFingerprint) throw new Error('--replace-upload 뒤에 기존 SHA-256 지문을 입력하세요.');

function normalizeFingerprint(value) {
  const normalized = value.trim().toUpperCase().replace(/[^0-9A-F]/g, '').match(/.{2}/g)?.join(':');
  if (!normalized || normalized.length !== 95) throw new Error('SHA-256 지문 형식이 아닙니다.');
  return normalized;
}

mkdirSync(privateDir, { recursive: true, mode: 0o700 });
chmodSync(privateDir, 0o700);

function createPkcs12(baseName, alias, commonName) {
  const keyPath = path.join(privateDir, `${baseName}.key.pem`);
  const certPath = path.join(privateDir, `${baseName}-cert.pem`);
  const storePath = path.join(privateDir, `${baseName}.p12`);
  const passwordPath = path.join(privateDir, `${baseName}-password.txt`);
  writeFileSync(passwordPath, randomBytes(36).toString('base64url') + '\n', { mode: 0o600 });
  chmodSync(passwordPath, 0o600);
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:4096', '-keyout', keyPath, '-out', certPath, '-days', '9131', '-nodes', '-subj', `/CN=${commonName}`], { stdio: ['ignore', 'ignore', 'pipe'] });
    execFileSync('openssl', ['pkcs12', '-export', '-out', storePath, '-inkey', keyPath, '-in', certPath, '-name', alias, '-passout', `file:${passwordPath}`], { stdio: ['ignore', 'ignore', 'pipe'] });
    chmodSync(storePath, 0o600);
  } finally {
    rmSync(keyPath, { force: true });
  }
  return { certPath, storePath, passwordPath };
}

const uploadStore = path.join(privateDir, 'android-keystore.p12');
const uploadCert = path.join(privateDir, 'android-keystore-cert.pem');
const uploadPassword = path.join(privateDir, 'android-keystore-password.txt');
if (force && existsSync(uploadStore)) {
  const rotatedDir = path.join(privateDir, `rotated-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  mkdirSync(rotatedDir, { mode: 0o700 });
  for (const file of [uploadStore, uploadCert, uploadPassword]) if (existsSync(file)) renameSync(file, path.join(rotatedDir, path.basename(file)));
}
if (!existsSync(uploadStore)) createPkcs12('android-keystore', 'emotihak', 'EmotiHak Upload');

const fingerprint = createHash('sha256').update(execFileSync('openssl', ['x509', '-in', uploadCert, '-outform', 'DER'])).digest('hex').toUpperCase().match(/.{2}/g).join(':');
const manifestPath = path.join(twaDir, 'twa-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.signingKey = { path: 'private/android-keystore.p12', alias: 'emotihak' };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(path.join(twaDir, 'manifest-checksum.txt'), createHash('sha1').update(readFileSync(manifestPath)).digest('hex') + '\n');

const linksPath = path.join(root, 'public/.well-known/assetlinks.json');
const links = JSON.parse(readFileSync(linksPath, 'utf8'));
const pkg = manifest.packageId;
let statement = links.find((item) => item.target?.namespace === 'android_app' && item.target.package_name === pkg);
if (!statement) {
  statement = { relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: [] } };
  links.push(statement);
}
const fingerprints = statement.target.sha256_cert_fingerprints;
if (replaceFingerprint) {
  const old = normalizeFingerprint(replaceFingerprint);
  statement.target.sha256_cert_fingerprints = fingerprints.filter((item) => item !== old);
}
if (!statement.target.sha256_cert_fingerprints.includes(fingerprint)) statement.target.sha256_cert_fingerprints.push(fingerprint);
writeFileSync(linksPath, JSON.stringify(links, null, 2) + '\n');

console.log('✔ 업로드 키 준비 완료 (개인 키·비밀번호는 twa/private/ 에만 저장, Git 추적 제외)');
console.log(`  업로드 인증서 SHA-256: ${fingerprint}`);
console.log('  Asset Links와 twa-manifest.json을 갱신했습니다.');
console.log('  Play 앱 서명 인증서 지문은 Console에서 확인한 뒤 update-assetlinks.mjs로 별도 추가하세요.');
console.log('  AAB는 생성하지 않았습니다. 비밀번호는 비밀 관리자에 백업하고 로컬 파일을 안전하게 보관하세요.');
