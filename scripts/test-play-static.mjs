import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file));
const json = (file) => JSON.parse(read(file).toString('utf8'));
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}
function pngSize(file) {
  const data = read(file);
  assert.equal(data.toString('ascii', 1, 4), 'PNG');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

const manifest = json('twa/twa-manifest.json');
const links = json('public/.well-known/assetlinks.json');
const webManifest = json('public/manifest.webmanifest');
check('TWA package and SDK settings', manifest.packageId === 'com.emotihak.app' && manifest.minSdkVersion === 24 && /targetSdkVersion 36/.test(read('twa/app/build.gradle').toString()));
check('signing key is outside Git-tracked paths', manifest.signingKey.path === 'private/android-keystore.p12' && manifest.signingKey.alias === 'emotihak');
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n');
check('no Android private key stores tracked', !tracked.some((file) => /\.(p12|jks|keystore)$/i.test(file) || file.includes('keystore-passwords')));
check('signing secrets ignored', ['twa/private/', '*.p12', '*.jks', '*.keystore'].every((entry) => read('.gitignore').toString().includes(entry)));
check('manifest checksum current', createHash('sha1').update(read('twa/twa-manifest.json')).digest('hex') === read('twa/manifest-checksum.txt').toString().trim());

const statement = links.find((item) => item.target?.namespace === 'android_app' && item.target.package_name === manifest.packageId);
check('Asset Links package present', !!statement);
const fingerprints = statement.target.sha256_cert_fingerprints;
check('Asset Links SHA-256 fingerprints valid', fingerprints.length > 0 && fingerprints.every((value) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value)));
check('old compromised upload fingerprint removed', !fingerprints.includes('6F:33:4E:96:B1:6A:41:3F:D9:E9:70:15:1A:83:19:EF:74:EA:6A:6B:00:4D:0F:2D:48:DE:8C:11:0C:E4:E7:46'));
if (existsSync(path.join(root, 'twa/private/android-keystore-cert.pem'))) {
  const der = execFileSync('openssl', ['x509', '-in', path.join(root, 'twa/private/android-keystore-cert.pem'), '-outform', 'DER']);
  const local = createHash('sha256').update(der).digest('hex').toUpperCase().match(/.{2}/g).join(':');
  check('local upload certificate matches Asset Links', fingerprints.includes(local));
}

check('PWA standalone and required icons', webManifest.start_url === '/' && webManifest.display === 'standalone' && ['192x192', '512x512'].every((size) => webManifest.icons.some((icon) => icon.sizes === size)));
check('TWA and web palettes aligned', manifest.themeColor === webManifest.theme_color && manifest.backgroundColor === webManifest.background_color);
check('offline service worker and registration', ['public/sw.js', 'public/offline.html', 'src/components/PwaRegistration.tsx'].every((file) => existsSync(path.join(root, file))) && read('public/sw.js').toString().includes("request.mode === 'navigate'") && read('src/app/layout.tsx').toString().includes('<PwaRegistration />'));
check('camera pre-disclosure and native capture', read('src/components/studio/UploadFlow.tsx').toString().includes('CameraPermissionDialog') && read('src/components/studio/UploadFlow.tsx').toString().includes('capture={subjectKind'));
check('pinch zoom remains accessible', !/user-scalable\s*=\s*no/i.test(read('src/app/layout.tsx').toString() + read('public/offline.html').toString()));

check('store icon dimensions', JSON.stringify(pngSize('public/icons/icon-512.png')) === '[512,512]');
check('feature graphic dimensions', JSON.stringify(pngSize('public/marketing/feature-graphic-1024x500.png')) === '[1024,500]');
for (const file of ['src/app/account-deletion/page.tsx', 'src/app/api/auth/account/route.ts', 'src/app/api/content-reports/route.ts', 'src/app/api/admin/content-reports/route.ts', 'scripts/prepare-play-signing.mjs']) {
  check(`${file} exists`, existsSync(path.join(root, file)) && read(file).length > 0);
}
console.log(`\nPlay static readiness: ${passed} checks passed`);
console.log('Note: this does not build an AAB, verify Play licensing, or test a physical device.');
