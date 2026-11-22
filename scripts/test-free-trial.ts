// 무료 체험(일반 방문자 1~2컷) — 상한·원가 방어 테스트 (tsx)
//  · 왜 필요한가: 체험을 열면 컷 1장마다 Gemini 원가가 나간다. 쿠키를 지우거나 새 탭을 열어
//    무한히 만들 수 있으면 그대로 과금 폭주다. 그래서 사용자·IP·전체(하루/월) 상한을
//    저장소 카운터로 강제한다. 이 테스트는 그 상한이 실제로 막는지 확인한다.
// 실행: npx tsx scripts/test-free-trial.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.STORE_BACKEND = 'file';
process.env.DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), `emotime-trial-${Date.now()}`);
for (const key of ['TRIAL_FREE_ENABLED', 'TRIAL_IMAGES_PER_USER_DAY', 'TRIAL_IMAGES_PER_IP_DAY', 'TRIAL_IMAGES_PER_DAY', 'TRIAL_IMAGES_PER_MONTH', 'TRIAL_CUTS_PER_USER_DAY']) {
  delete process.env[key];
}

let pass = 0;
let failCount = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { failCount++; console.log(`  ✘ ${name} ${extra}`); }
}

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const trial = await import('../src/lib/free-trial');
const adminAccess = await import('../src/lib/admin-access');
const { withDB } = await import('../src/lib/store');

const web = { role: 'user' as const, plan: 'FREE' as const, credits: 12 };
const verified = { role: 'user' as const, plan: 'FREE' as const, credits: 12, playVerified: true };
const admin = { role: 'admin' as const, plan: 'FREE' as const, credits: 12 };

console.log('\n[1] 접근 등급 — 관리자 전용 기간에도 일반 방문자는 "체험"까지만');
process.env.GENERATION_ADMIN_ONLY = '1';
delete process.env.TRIAL_FREE_ENABLED;
check('무료 체험 기본값은 켬 (배포만으로 개방)', adminAccess.trialFreeEnabled() === true);
check('aiAccess(관리자) = full', adminAccess.aiAccess(admin) === 'full');
check('aiAccess(검증된 플레이 구매) = full', adminAccess.aiAccess(verified) === 'full');
check('aiAccess(일반 방문자) = trial', adminAccess.aiAccess(web) === 'trial');
check('canUseAiGeneration(일반) = true (체험 경로)', adminAccess.canUseAiGeneration(web) === true);
check('isUnlimited(일반) = false (체험은 무제한 아님)', adminAccess.isUnlimited(web) === false);
process.env.TRIAL_FREE_ENABLED = '0';
check('TRIAL_FREE_ENABLED=0 이면 blocked', adminAccess.aiAccess(web) === 'blocked');
check('TRIAL_FREE_ENABLED=0 이면 canUseAiGeneration=false', adminAccess.canUseAiGeneration(web) === false);
delete process.env.TRIAL_FREE_ENABLED;
process.env.GENERATION_ADMIN_ONLY = '0';
check('GENERATION_ADMIN_ONLY=0 이면 full (기존 공개 경로 유지)', adminAccess.aiAccess(web) === 'full');
process.env.GENERATION_ADMIN_ONLY = '1';
check('실사 스티커는 체험에서 제외', trial.trialToneAllowed('photo-sticker') === false);
check('일반 스타일은 체험 허용', trial.trialToneAllowed('2d-cute') === true);

console.log('\n[2] 기본 상한 값');
const limits = trial.trialLimits();
check('사용자 하루 미리보기 컷 12장 (한 팩 전체)', limits.cutsPerUserDay === 12, JSON.stringify(limits));
check('사용자 하루 이미지 18장 (시안 1 + 12컷 + 재시도 여유)', limits.imagesPerUserDay === 18);
check('전체 하루 45장', limits.imagesPerDay === 45);
check('전체 월 900장', limits.imagesPerMonth === 900);
check('사용자 하루 미리보기 팩 1개', limits.previewPacksPerUserDay === 1);

console.log('\n[3] 사용자 하루 12컷(한 팩) 제한 (쿠키를 바꿔도 IP·사용자 카운터가 남는다)');
// 전체·IP 상한은 넉넉히 두고 사용자 상한만 본다
process.env.TRIAL_IMAGES_PER_DAY = '100';
process.env.TRIAL_IMAGES_PER_MONTH = '1000';
process.env.TRIAL_IMAGES_PER_IP_DAY = '20';
const userA = { userId: 'guest_a', ipHash: 'ip-a' };
await trial.consumeTrialImage(userA, 'image'); // 시안
let afterOne = await trial.consumeTrialImage(userA, 'cut');
for (let cut = 2; cut <= 12; cut++) afterOne = await trial.consumeTrialImage(userA, 'cut');
check('12컷째까지 허용 (한 팩 전체)', afterOne.cutsUsedToday === 12);
check('남은 컷 0', afterOne.cutsLeftToday === 0);
let cutLimit: unknown = null;
try { await trial.consumeTrialImage(userA, 'cut'); } catch (e) { cutLimit = e; }
check('13컷째는 TRIAL_LIMIT', (cutLimit as { code?: string })?.code === 'TRIAL_LIMIT', JSON.stringify(cutLimit));
check('13컷째 차단 사유 = user', (cutLimit as { scope?: string })?.scope === 'user');
check('차단은 429 로 응답', (cutLimit as { status?: number })?.status === 429);
check('차단 문구에 내일 안내', /내일/.test((cutLimit as Error)?.message ?? ''));
const statusA = await trial.trialStatusFor(userA);
check('상태 조회: 남은 컷 0', statusA.cutsLeftToday === 0);
check('상태 조회: 남은 이미지 5 (18-13)', statusA.imagesLeftToday === 5, JSON.stringify(statusA));

console.log('\n[3a] 미리보기 팩은 사용자·IP 하루 1팩, 이미지 12장을 감당할 때만 열린다');
process.env.TRIAL_IMAGES_PER_DAY = '100';
process.env.TRIAL_IMAGES_PER_MONTH = '1000';
process.env.TRIAL_IMAGES_PER_USER_DAY = '18';
process.env.TRIAL_IMAGES_PER_IP_DAY = '24';
const packSubject = { userId: 'guest_pack', ipHash: 'ip-pack' };
const packStatus = await trial.consumeTrialPreviewPack(packSubject);
check('첫 미리보기 팩은 열린다', packStatus.previewPacksLeftToday === 0, JSON.stringify(packStatus));
let packBlocked: unknown = null;
try { await trial.consumeTrialPreviewPack(packSubject); } catch (e) { packBlocked = e; }
check('같은 날 두 번째 팩은 TRIAL_LIMIT', (packBlocked as { code?: string })?.code === 'TRIAL_LIMIT', JSON.stringify(packBlocked));
check('팩 차단 문구는 잠금 해제 안내', /잠금 해제/.test((packBlocked as Error)?.message ?? ''));
check('미리보기 팩 가능 여부는 읽기 전용으로 확인', (await trial.trialPreviewPackAllowed({ userId: 'guest_pack2', ipHash: 'ip-pack2' })) === true);

console.log('\n[3b] 사진 특징 재확인(AI 비전)도 체험 상한이 있다');
process.env.TRIAL_PREPS_PER_USER_DAY = '2';
const prepSubject = { userId: 'guest_prep', ipHash: 'ip-prep' };
await trial.consumeTrialPrep(prepSubject);
await trial.consumeTrialPrep(prepSubject);
let prepBlocked: unknown = null;
try { await trial.consumeTrialPrep(prepSubject); } catch (e) { prepBlocked = e; }
check('사진 재확인 3회째는 TRIAL_LIMIT', (prepBlocked as { code?: string })?.code === 'TRIAL_LIMIT', JSON.stringify(prepBlocked));
check('차단 사유 = prep', (prepBlocked as { scope?: string })?.scope === 'prep');
process.env.TRIAL_PREPS_PER_USER_DAY = '4';

console.log('\n[4] IP 하루 상한 — 다른 세션(새 쿠키)으로 우회해도 같은 IP 면 막힌다');
process.env.TRIAL_IMAGES_PER_IP_DAY = '4';
let ipBlocked: unknown = null;
for (let i = 0; i < 5; i++) {
  try {
    await trial.consumeTrialImage({ userId: `guest_ip_${i}`, ipHash: 'ip-b' }, 'image');
  } catch (e) {
    ipBlocked = e;
    break;
  }
}
check('IP 4장 뒤 5장째는 TRIAL_LIMIT', (ipBlocked as { code?: string })?.code === 'TRIAL_LIMIT', JSON.stringify(ipBlocked));
check('차단 사유 = ip', (ipBlocked as { scope?: string })?.scope === 'ip');
check('문구에 이 연결 안내', /연결/.test((ipBlocked as Error)?.message ?? ''));
process.env.TRIAL_IMAGES_PER_IP_DAY = '20';

console.log('\n[5] 전체 하루 상한 — 방문자가 몰려도 원가가 상한을 넘지 않는다');
const before = await trial.trialGlobalUsage();
process.env.TRIAL_IMAGES_PER_DAY = String(before.day + 1);
process.env.TRIAL_IMAGES_PER_USER_DAY = '50';
await trial.consumeTrialImage({ userId: 'guest_day', ipHash: 'ip-c' }, 'image');
let dailyBlocked: unknown = null;
try { await trial.consumeTrialImage({ userId: 'guest_day2', ipHash: 'ip-d' }, 'image'); } catch (e) { dailyBlocked = e; }
check('전체 상한 도달 시 TRIAL_LIMIT', (dailyBlocked as { code?: string })?.code === 'TRIAL_LIMIT');
check('차단 사유 = daily', (dailyBlocked as { scope?: string })?.scope === 'daily');
check('전체 사용량이 상한과 같다', (await trial.trialGlobalUsage()).day === before.day + 1);

console.log('\n[6] 전체 월 상한 — 하루 상한이 남아도 월 예산은 지킨다');
const monthBefore = await trial.trialGlobalUsage();
process.env.TRIAL_IMAGES_PER_DAY = '100';
process.env.TRIAL_IMAGES_PER_MONTH = String(monthBefore.month + 1);
await trial.consumeTrialImage({ userId: 'guest_month', ipHash: 'ip-e' }, 'image');
let monthBlocked: unknown = null;
try { await trial.consumeTrialImage({ userId: 'guest_month2', ipHash: 'ip-f' }, 'image'); } catch (e) { monthBlocked = e; }
check('월 상한 도달 시 TRIAL_LIMIT', (monthBlocked as { code?: string })?.code === 'TRIAL_LIMIT');
check('차단 사유 = monthly', (monthBlocked as { scope?: string })?.scope === 'monthly');

console.log('\n[7] 카운터는 저장소에 남고, 지난 창(일·월)은 버린다');
// 앞 테스트에서 조인 상한을 풀어 둔다 (이 절은 저장·정리만 본다)
process.env.TRIAL_IMAGES_PER_DAY = '100';
process.env.TRIAL_IMAGES_PER_MONTH = '1000';
process.env.TRIAL_IMAGES_PER_USER_DAY = '50';
process.env.TRIAL_IMAGES_PER_IP_DAY = '50';
const usageRows = await withDB((db) => (Array.isArray(db.trialUsage) ? db.trialUsage.map((row) => row.bucket) : []));
check('사용자 버킷이 저장됨', usageRows.some((bucket) => bucket.startsWith('cut:user:guest_a:')));
check('IP 버킷이 저장됨', usageRows.some((bucket) => bucket.startsWith('img:ip:ip-b:')));
check('전체 일 버킷이 저장됨', usageRows.some((bucket) => bucket.startsWith('img:all:') && bucket.length === 'img:all:YYYY-MM-DD'.length));
await withDB((db) => {
  db.trialUsage.push({ id: 'trial_stale', bucket: 'img:all:2020-01-01', count: 9, updatedAt: new Date().toISOString() });
});
await trial.consumeTrialImage({ userId: 'guest_prune', ipHash: 'ip-g' }, 'image');
const afterPrune = await withDB((db) => db.trialUsage.map((row) => row.bucket));
check('지난 날짜 버킷은 정리됨', !afterPrune.includes('img:all:2020-01-01'));

console.log('\n[8] 라우트·화면 배선 (체험 경로가 팩 대량 생성을 우회하지 못한다)');
const render = read('src/app/api/render/route.ts');
check('렌더가 체험 카운터를 소비', render.includes('consumeTrialImage'));
check('렌더에 체험 컷(preview) 대상', render.includes("kind: z.literal('preview')"));
check('렌더가 미리보기 팩이 아닌 팩 컷은 막음', /access === 'trial' && plan\.kind === 'frame' && !\('previewPack' in plan && plan\.previewPack\)/.test(render));
check('렌더가 미리보기 팩은 Flash(저비용) 품질로 표시', render.includes("as 'preview' | 'final'") && render.includes('pack.preview && pack.unlockedAt'));
check('렌더가 잠금 해제 후 고화질 재생성을 지원', render.includes('finalize: z.boolean().optional()'));
check('렌더가 체험 스타일을 제한', render.includes('trialToneAllowed(plan.tone)'));
check('렌더가 체험 시안을 1장으로 제한', render.includes('TRIAL_VARIANT_KEYS'));
const packs = read('src/app/api/packs/route.ts');
check('팩 생성: 미리보기 팩은 허용, 그 외 대량 생성은 차단', packs.includes('consumeTrialPreviewPack') && packs.includes('TRIAL_ONLY'));
check('단건 생성도 체험에서 차단', read('src/app/api/generate/route.ts').includes('TRIAL_ONLY'));
check('배치 생성도 체험에서 차단', read('src/app/api/generate/batch/route.ts').includes('TRIAL_ONLY'));
const sheets = read('src/app/api/sheets/route.ts');
check('시안은 체험에서 1장만', /access === 'trial' \? 1 : 3/.test(sheets));
check('시안도 체험 스타일 제한', sheets.includes('trialToneAllowed(body.tone)'));
check('사진 재확인도 체험 상한을 소비', read('src/app/api/face/consistency/route.ts').includes('consumeTrialPrep'));
check('시트 화면이 체험 상태를 내려줌', read('src/app/studio/sheet/[id]/page.tsx').includes('trialStatusFor'));
check('시트 선택 화면에 12컷 미리보기 패널', read('src/components/studio/SheetPicker.tsx').includes('createPreview'));
check('미리보기 팩은 12컷 고정', read('src/components/studio/SheetPicker.tsx').includes('PREVIEW_PACK_SIZE'));
check('업로드 화면에 체험 안내', read('src/components/studio/UploadPageContent.tsx').includes('TRIAL_MESSAGES.banner'));
check('홈에 12컷 미리보기 CTA', read('src/app/page.tsx').includes('12컷 무료로 미리보기'));
const cf = read('cloudflare.config.ts');
check('Worker 변수에 체험 개방 스위치', /TRIAL_FREE_ENABLED:\s*bindings\.text\("1"\)/.test(cf));
check('Worker 변수에 미리보기 하루 상한', /TRIAL_PREVIEW_PACKS_PER_USER_DAY:\s*bindings\.text\("1"\)/.test(cf));
check('원가 보호 플래그(관리자 전용)는 그대로 1', /GENERATION_ADMIN_ONLY:\s*bindings\.text\("1"\)/.test(cf));
check('결제 가드는 건드리지 않음 (PLAY_BILLING_ENABLED=0)', /PLAY_BILLING_ENABLED:\s*bindings\.text\("0"\)/.test(cf));

console.log(`\n결과: ${pass} 통과, ${failCount} 실패`);
assert.ok(failCount === 0, '무료 체험 상한 테스트 실패');
process.exit(failCount ? 1 : 0);
