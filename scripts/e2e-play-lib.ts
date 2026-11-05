// 유료 앱(플레이) 풀액세스 — lib 레이어 통합 테스트 (tsx 로 실행)
//  · admin-access 헬퍼(play 뷰어) 단위 검증
//  · DB 플로우: 시트→선택→팩 (TWA=크레딧 무차감 vs 웹 FREE=차감/차단)
//  · getPackView viewer 파라미터 워터마크 판정
// 실행: npx tsx scripts/e2e-play-lib.ts  (dev 서버 정지 상태, .data 를 사용)
import { uid, withDB } from '../src/lib/store';
import { createSheet, chooseSheet, createPack, getPackView, tonesForPlan, FREE_TONES } from '../src/lib/packs';
import { loadImage, newImageId, saveImage } from '../src/lib/images';
import { consumePlayGeneration } from '../src/lib/play-usage';
import { createContentReport, reviewContentReport } from '../src/lib/content-reports';
import { processImageDeletionJobs } from '../src/lib/deletion';
import { deleteAccountPermanently } from '../src/lib/account-deletion';
import { hashPassword } from '../src/lib/auth';
import { kstDateKey } from '../src/lib/time';
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
check('bypassesRateLimit(play) = false', bypassesRateLimit(playViewer) === false);
check('bypassesRateLimit(admin) = true', bypassesRateLimit(adminViewer) === true);
check('planAllows(play, PLUS)', planAllows(playViewer, 'PLUS') === true);
check('watermarkFor(play) = false', watermarkFor(playViewer) === false);
check('planLabel(play) = PLAY', planLabel(playViewer) === 'PLAY');
check('creditsLabel(play) = 차감 없음', creditsLabel(playViewer) === '차감 없음');
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

console.log('\n[3] TWA(플레이) 사용자: 24컷 팩 크레딧 무차감');
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

console.log('\n[5] Play KST 일일 AI 공정 이용');
process.env.PLAY_DAILY_GENERATION_LIMIT = '2';
const quotaViewer = { ...playViewer, id: twaUser.id };
await consumePlayGeneration(quotaViewer);
const usage = await consumePlayGeneration(quotaViewer);
check('생성 시도가 영속 사용량에 누적됨', usage?.count === 2, `got ${usage?.count}`);
let playLimitErr: { code?: string } | null = null;
try { await consumePlayGeneration(quotaViewer); } catch (e) { playLimitErr = e as { code?: string }; }
check('일일 한도 초과 PLAY_FAIR_USE_LIMIT', playLimitErr?.code === 'PLAY_FAIR_USE_LIMIT', `got ${JSON.stringify(playLimitErr)}`);
check('관리자는 공정 이용 카운터에서 제외', await consumePlayGeneration({ ...adminViewer, id: 'account_admin' }) === null);

console.log('\n[6] AI 콘텐츠 신고·숨김·이미지 삭제');
const reportedFrameId = twaPack.frames[0].id;
const reportedImageId = newImageId();
await saveImage(reportedImageId, twaUser.id, new TextEncoder().encode('reported-image'));
await withDB((db) => { db.packs.find((pack) => pack.id === twaPack.id)!.frames[0].imageId = reportedImageId; });
const reported = await createContentReport(twaUser.id, { packId: twaPack.id, frameId: reportedFrameId, reason: 'OTHER', details: 'test report' });
const duplicate = await createContentReport(twaUser.id, { packId: twaPack.id, frameId: reportedFrameId, reason: 'OTHER' });
check('신고 생성 및 중복 접수 방지', !reported.deduplicated && duplicate.deduplicated && duplicate.report.id === reported.report.id);
let foreignReportErr: { code?: string } | null = null;
try { await createContentReport(webUser.id, { packId: twaPack.id, frameId: reportedFrameId, reason: 'OTHER' }); } catch (e) { foreignReportErr = e as { code?: string }; }
check('다른 사용자 팩 신고 차단', foreignReportErr?.code === 'CONTENT_NOT_FOUND');
await reviewContentReport('account_admin', { reportId: reported.report.id, action: 'hide', note: 'tested' });
const deletionSweep = await processImageDeletionJobs();
const moderated = await withDB((db) => ({
  hidden: !!db.packs.find((pack) => pack.id === twaPack.id)!.frames[0].hiddenAt,
  status: db.contentReports.find((report) => report.id === reported.report.id)!.status,
  pending: db.deletionJobs.reduce((sum, job) => sum + job.imageIds.length, 0),
}));
check('숨김·검토 상태 저장', moderated.hidden && moderated.status === 'ACTIONED');
check('신고 이미지 물리 삭제', !(await loadImage(reportedImageId)) && deletionSweep.pending === 0 && moderated.pending === 0);
const moderatedView = await getPackView(twaUser.id, twaPack.id, playViewer);
check('숨긴 컷이 팩 뷰에서 제외돼 자동 재생성되지 않음', moderatedView.total === 23 && !moderatedView.frames.some((frame) => frame.id === reportedFrameId));

console.log('\n[7] 계정 삭제·법정 결제 기록 분리');
const deleteUser = mkUser('삭제 테스트', 12);
const deleteFace = mkFace(deleteUser.id);
const paidOrderId = uid('order');
const pendingOrderId = uid('order');
const goodsOrderId = uid('order');
const productImageId = newImageId();
await saveImage(productImageId, deleteUser.id, new TextEncoder().encode('goods-image'));
await withDB((db) => {
  db.users.push(deleteUser);
  db.faces.push(deleteFace);
  db.accounts.push({ userId: deleteUser.id, email: 'delete@example.com', nickname: '삭제테스트', nicknameKey: '삭제테스트', name: '테스트', birthDate: '1990-01-01', gender: 'unspecified', passwordHash: '', consentAt: now });
  db.sessions.push({ tokenHash: 'a'.repeat(64), userId: deleteUser.id, expiresAt: new Date(Date.now() + 86400_000).toISOString() });
  db.orders.push(
    { id: paidOrderId, userId: deleteUser.id, kind: 'credits', sku: 'credits-12', title: '크레딧', amount: 1200, credits: 12, plan: null, status: 'PAID', provider: 'mock', createdAt: now, paidAt: now, consentAt: now, paymentKey: 'mock_paid' },
    { id: pendingOrderId, userId: deleteUser.id, kind: 'credits', sku: 'credits-12', title: '미해결', amount: 1200, credits: 12, plan: null, status: 'PENDING', provider: 'mock', createdAt: now, consentAt: now, paymentKey: 'mock_pending' },
    { id: goodsOrderId, userId: deleteUser.id, kind: 'goods', sku: 'goods', title: '굿즈', amount: 5000, credits: 0, plan: null, status: 'PAID', provider: 'mock', createdAt: now, paidAt: now, consentAt: now, frameId: 'frame', frameThumb: 'thumb', shipping: { name: '이름', phone: '010', address: '주소' }, goodsStatus: 'DELIVERED', productImageId, trackingCompany: '택배', trackingNumber: '123' },
  );
  db.credits.push({ id: uid('cr'), userId: deleteUser.id, delta: 12, reason: 'PURCHASE', refType: 'order', refId: paidOrderId, balanceAfter: 24, createdAt: now });
  db.playUsage.push({ id: uid('play'), userId: deleteUser.id, date: kstDateKey(), count: 2, updatedAt: now });
});
// 비밀번호 해시 형식도 실제와 동일하게 저장해 삭제 전 재인증 테스트 데이터를 구성한다.
const deletePasswordHash = await hashPassword('delete-password');
await withDB((db) => { db.accounts.find((account) => account.userId === deleteUser.id)!.passwordHash = deletePasswordHash; });
const deleteSheet = await mkSheetWithImage(deleteUser.id, deleteFace.id, '2d-cute');
const deletePack = await createPack(deleteUser.id, deleteSheet.id, 12, '삭제 팩', false);
await createContentReport(deleteUser.id, { packId: deletePack.id, frameId: deletePack.frames[0].id, reason: 'PRIVACY' });
let pendingDeleteErr: { code?: string } | null = null;
try { await deleteAccountPermanently(deleteUser.id); } catch (e) { pendingDeleteErr = e as { code?: string }; }
check('미해결 결제가 있으면 삭제 차단', pendingDeleteErr?.code === 'PAYMENT_REVIEW_REQUIRED', `got ${JSON.stringify(pendingDeleteErr)}`);
await withDB((db) => { db.orders = db.orders.filter((order) => order.id !== pendingOrderId); });
const deleted = await deleteAccountPermanently(deleteUser.id);
const afterDelete = await withDB((db) => ({
  accountGone: !db.users.some((user) => user.id === deleteUser.id) && !db.accounts.some((account) => account.userId === deleteUser.id) && !db.sessions.some((session) => session.userId === deleteUser.id),
  contentGone: !db.faces.some((face) => face.userId === deleteUser.id) && !db.sheets.some((sheet) => sheet.userId === deleteUser.id) && !db.packs.some((pack) => pack.userId === deleteUser.id) && !db.contentReports.some((report) => report.userId === deleteUser.id) && !db.playUsage.some((item) => item.userId === deleteUser.id),
  purchaseRetained: db.credits.some((entry) => entry.userId === deleteUser.id && entry.reason === 'PURCHASE'),
  generationRemoved: !db.credits.some((entry) => entry.userId === deleteUser.id && entry.reason === 'GENERATION'),
  paidOrder: db.orders.find((order) => order.id === paidOrderId),
  goodsOrder: db.orders.find((order) => order.id === goodsOrderId),
  pending: db.deletionJobs.reduce((sum, job) => sum + job.imageIds.length, 0),
}));
check('계정·세션·콘텐츠·신고·사용량 삭제', afterDelete.accountGone && afterDelete.contentGone);
check('유료 주문·구매 원장만 보존', !!afterDelete.paidOrder?.accountDeletedAt && afterDelete.purchaseRetained && afterDelete.generationRemoved);
check('배송·추적·상품 이미지 정보 제거', !!afterDelete.goodsOrder && !('shipping' in afterDelete.goodsOrder) && !('productImageId' in afterDelete.goodsOrder) && !('trackingNumber' in afterDelete.goodsOrder));
check('삭제 이미지 재시도 작업 완료', deleted.imageDeletion.pending === 0 && afterDelete.pending === 0 && !(await loadImage(productImageId)));

console.log(`\n결과: ${pass} 통과, ${failCount} 실패`);
process.exit(failCount ? 1 : 0);
