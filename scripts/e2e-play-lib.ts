// 유료 앱(플레이) 풀액세스 — lib 레이어 통합 테스트 (tsx 로 실행)
//  · admin-access 헬퍼(play 뷰어) 단위 검증
//  · DB 플로우: 시트→선택→팩 (TWA=무제한 vs 웹 FREE=차감/차단)
//  · getPackView viewer 파라미터 워터마크 판정
// 실행: npx tsx scripts/e2e-play-lib.ts  (dev 서버 정지 상태, .data 를 사용)
import { uid, withDB } from '../src/lib/store';
import { createSheet, chooseSheet, createPack, getPackView, tonesForPlan, FREE_TONES } from '../src/lib/packs';
import { newImageId, saveImage } from '../src/lib/images';
import {
  bypassesRateLimit,
  creditsLabel,
  effectivePlan,
  isFullAccess,
  isPlayUser,
  isUnlimited,
  planAllows,
  planLabel,
  watermarkFor,
} from '../src/lib/admin-access';
import type { FaceProfile, User } from '../src/lib/types';

let pass = 0, failCount = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { failCount++; console.log(`  ✘ ${name} ${extra}`); }
}

const playViewer = { role: 'user' as const, plan: 'FREE' as const, credits: 12, play: true };
const freeViewer = { role: 'user' as const, plan: 'FREE' as const, credits: 12 };
const adminViewer = { role: 'admin' as const, plan: 'FREE' as const, credits: 12 };

console.log('\n[1] admin-access 헬퍼 (play 뷰어)');
check('effectivePlan(play) = STUDIO', effectivePlan(playViewer) === 'STUDIO');
check('isUnlimited(play)', isUnlimited(playViewer) === true);
check('bypassesRateLimit(play)', bypassesRateLimit(playViewer) === true);
check('planAllows(play, PLUS)', planAllows(playViewer, 'PLUS') === true);
check('watermarkFor(play) = false', watermarkFor(playViewer) === false);
check('planLabel(play) = PLAY', planLabel(playViewer) === 'PLAY');
check('creditsLabel(play) = 무제한', creditsLabel(playViewer) === '무제한');
check('isPlayUser(play)', isPlayUser(playViewer) === true);
check('isFullAccess(play)', isFullAccess(playViewer) === true);
check('effectivePlan(free) = FREE', effectivePlan(freeViewer) === 'FREE');
check('watermarkFor(free) = true', watermarkFor(freeViewer) === true);
check('isUnlimited(free) = false', isUnlimited(freeViewer) === false);
check('effectivePlan(admin) = STUDIO', effectivePlan(adminViewer) === 'STUDIO');
check('tones: FREE 에 watercolor 없음', !FREE_TONES.includes('watercolor'));
check('tones: STUDIO 에 watercolor 있음', tonesForPlan('STUDIO').includes('watercolor'));

console.log('\n[2] DB 플로우 — 사용자 시드');
const now = new Date().toISOString();
const mkUser = (name: string, credits: number): User => ({
  id: uid('usr'), name, plan: 'FREE', credits, role: 'user', createdAt: now, lastGrantAt: now,
});
const mkFace = (userId: string): FaceProfile => ({
  id: uid('face'), userId,
  palette: { skin: '#F6D3B3', skinShade: '#E8BA95', hair: '#332621', shirt: '#5AB8F5', accent: '#FF6B5B' },
  signature: { headScale: 1.02, faceWidth: 0.98, eyeSpacing: 1, eyeSize: 1, eyeShape: 'almond', browWeight: 0.9, mouthWidth: 1, lipThickness: 0.8, noseSize: 0.9, hairStyle: 2, cheek: 0.6, jawline: 'round', glasses: false },
  metrics: { coverage: 0.18, centering: 0.1, brightness: 140, sharpness: 20, faceDetected: true },
  consent: { at: now, version: 'v1.0', ip: '127.0.0.1', overseas: true },
  createdAt: now, purgedAt: new Date(Date.now() + 86400_000).toISOString(),
});
const twaUser = mkUser('TWA 사용자', 12);
const webUser = mkUser('웹 사용자', 12);
const twaFace = mkFace(twaUser.id);
const webFace = mkFace(webUser.id);
await withDB((db) => {
  db.users.push(twaUser, webUser);
  db.faces.push(twaFace, webFace);
});

async function mkSheetWithImage(userId: string, faceId: string, tone: string) {
  const sheet = await createSheet(userId, faceId, tone as any, 'face', 'person');
  const imageId = newImageId();
  await saveImage(imageId, userId, new TextEncoder().encode('test-sticker-bytes'));
  sheet.variants[0].imageId = imageId;
  const chosen = await chooseSheet(userId, sheet.id, 'A');
  return chosen!;
}

console.log('\n[3] TWA(플레이) 사용자: 24컷 팩 무제한');
const twaSheet = await mkSheetWithImage(twaUser.id, twaFace.id, 'watercolor');
const twaPack = await createPack(twaUser.id, twaSheet.id, 24, '플레이 팩', true);
check('24컷 팩 생성됨', twaPack.size === 24 && twaPack.frames.length === 24);
check('creditsSpent = 0', twaPack.creditsSpent === 0, `got ${twaPack.creditsSpent}`);
const twaAfter = await withDB((db) => db.users.find((u) => u.id === twaUser.id)!);
check('크레딧 12 유지', twaAfter.credits === 12, `got ${twaAfter.credits}`);

const viewPlay = await getPackView(twaUser.id, twaPack.id, playViewer);
check('getPackView(play 뷰어) 워터마크 없음', viewPlay.watermark === false, `got ${viewPlay.watermark}`);
const viewFree = await getPackView(twaUser.id, twaPack.id, freeViewer);
check('getPackView(free 뷰어) 워터마크 있음', viewFree.watermark === true, `got ${viewFree.watermark}`);

console.log('\n[4] 웹 FREE 사용자: 24컷 차단 / 12컷 차감');
const webSheet = await mkSheetWithImage(webUser.id, webFace.id, '2d-cute');
let quotaErr: { code?: string } | null = null;
try {
  await createPack(webUser.id, webSheet.id, 24, '웹 24', false);
} catch (e) {
  quotaErr = e as { code?: string };
}
check('24컷 팩 QUOTA_EXCEEDED', quotaErr?.code === 'QUOTA_EXCEEDED', `got ${JSON.stringify(quotaErr)}`);
const webPack = await createPack(webUser.id, webSheet.id, 12, '웹 12', false);
check('12컷 팩 creditsSpent = 12', webPack.creditsSpent === 12, `got ${webPack.creditsSpent}`);
const webAfter = await withDB((db) => db.users.find((u) => u.id === webUser.id)!);
check('크레딧 0으로 차감', webAfter.credits === 0, `got ${webAfter.credits}`);

console.log(`\n결과: ${pass} 통과, ${failCount} 실패`);
process.exit(failCount ? 1 : 0);
