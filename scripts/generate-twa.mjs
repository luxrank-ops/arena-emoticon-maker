// TWA 프로젝트 생성 (bubblewrap 템플릿 기반, JDK/Android SDK 불필요)
//  · public/manifest.webmanifest + 로컬 아이콘을 사용해 twa/ 에 안드로이드 프로젝트를 생성한다.
//  · 오프라인 행을 위해 fetch 를 로컬 파일로 대치한다 (emotihak.com 은 접근하지 않는다).
//  · 실행: node scripts/generate-twa.mjs
//  · 결과: twa/twa-manifest.json, twa/android/, twa/manifest-checksum.txt
//  · AAB 빌드는 사용자 로컬에서 `bubblewrap build --aab` (JDK17 + Android SDK 필요).
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { TwaManifest, TwaGenerator, ConsoleLog, BufferedLog, fetchUtils } = require('@bubblewrap/core');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const twaDir = path.join(root, 'twa');
const HOST = 'emotihak.com';
const MANIFEST_URL = `https://${HOST}/manifest.webmanifest`;

// ── 오프라인 fetch: emotihak.com 요청만 로컬 파일로 대치 ─────────
const LOCAL_ROUTES = {
  '/manifest.webmanifest': 'public/manifest.webmanifest',
  '/icons/icon-192.png': 'public/icons/icon-192.png',
  '/icons/icon-512.png': 'public/icons/icon-512.png',
  '/icons/icon-maskable-512.png': 'public/icons/icon-maskable-512.png',
};
fetchUtils.fetch = async (url) => {
  const u = new URL(String(url));
  if (u.host === HOST && LOCAL_ROUTES[u.pathname]) {
    const file = readFileSync(path.join(root, LOCAL_ROUTES[u.pathname]));
    return new Response(file, { status: 200, headers: { 'content-type': u.pathname.endsWith('.png') ? 'image/png' : 'application/manifest+json' } });
  }
  throw new Error(`generate-twa: 예상치 못한 네트워크 접근을 차단했습니다 — ${u}`);
};

// ── TWA 매니페스트 구성 ─────────────────────────────────────────
const webManifest = JSON.parse(readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf-8'));
const twa = TwaManifest.fromWebManifestJson(new URL(MANIFEST_URL), webManifest);
twa.host = HOST;
twa.startUrl = '/';
twa.name = '이모티학';
twa.launcherName = '이모티학';
twa.packageId = 'com.emotihak.app';
twa.appVersionCode = 1;
twa.appVersionName = '1';
twa.minSdkVersion = 24;
twa.signingKey = { path: 'android-keystore.p12', alias: 'emotihak' };
twa.generatorApp = 'Bubblewrap CLI';

if (!existsSync(path.join(twaDir, 'android-keystore.p12'))) {
  console.error('오류: twa/android-keystore.p12 를 찾을 수 없습니다. 먼저 서명 키를 생성하세요.');
  process.exit(1);
}

await twa.saveToFile(path.join(twaDir, 'twa-manifest.json'));

// ── 안드로이드 프로젝트 생성 (템플릿 + 아이콘) ─────────────────
const log = new BufferedLog(new ConsoleLog('Generating TWA'));
const generator = new TwaGenerator();
await generator.createTwaProject(twaDir, twa, log, () => {});
log.flush();

// bubblewrap init 과 동일한 체크섬 파일
const checksum = createHash('sha1').update(readFileSync(path.join(twaDir, 'twa-manifest.json'))).digest('hex');
writeFileSync(path.join(twaDir, 'manifest-checksum.txt'), checksum);

console.log('✔ twa/ 프로젝트 생성 완료');
console.log(`  패키지: ${twa.packageId} · 호스트: ${twa.host} · 아이콘: ${twa.iconUrl}`);
console.log('  다음: twa/ 에서 `bubblewrap build --aab` (JDK17 + Android SDK 필요)');
