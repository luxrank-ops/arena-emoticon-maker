// ─────────────────────────────────────────────────────────────
// 친구 초대 3컷 보상 — 추적·중복·자기초대·일일 상한 테스트
// 실행: npx tsx scripts/test-referral.ts
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.STORE_BACKEND = 'file';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'emotihak-referral-'));

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

const { withDB } = await import('../src/lib/store');
const referral = await import('../src/lib/referral');
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const now = new Date().toISOString();
const user = (id: string, credits = 12) => ({ id, name: id, plan: 'FREE' as const, credits, role: 'user' as const, createdAt: now, lastGrantAt: now });

console.log('\n[1] 초대 코드 · 링크');
await withDB((db) => {
  db.users.push(user('u-inviter'), user('u-friend'), user('u-self'), user('u-old', 40));
});
const summary = await referral.referralSummaryFor('u-inviter', 'https://emotihak.com');
check('코드는 8자리 hex', /^[a-f0-9]{8}$/.test(summary.code));
check('링크에 ?ref= 코드', summary.link === `https://emotihak.com/?ref=${summary.code}`);
check('보상은 3컷', summary.rewardCuts === 3 && referral.REFERRAL_REWARD_CUTS === 3);
check('초기 실적 0', summary.invited === 0 && summary.earnedCuts === 0);

console.log('\n[2] 방문 기록(PENDING) — 아직 보상 없음');
let invalid: unknown = null;
try { await referral.claimReferral('u-friend', 'zz'); } catch (e) { invalid = e; }
check('잘못된 코드는 INVALID_CODE', (invalid as { code?: string })?.code === 'INVALID_CODE');
await referral.claimReferral('u-friend', summary.code);
const inviterAfterClaim = await withDB((db) => db.users.find((u) => u.id === 'u-inviter')!.credits);
check('방문만으로는 크레딧이 늘지 않는다', inviterAfterClaim === 12);
const duplicate = await referral.claimReferral('u-friend', summary.code);
check('같은 사람의 두 번째 코드는 무시(첫 초대만)', duplicate.claimed === false && duplicate.reason === 'ALREADY_CLAIMED');

console.log('\n[3] 첫 체험을 마치면 초대한 사람에게 3컷');
const reward = await referral.rewardReferralForInvitee('u-friend');
check('보상 지급', reward.rewarded === true && reward.inviterId === 'u-inviter' && reward.cuts === 3);
const ledger = await withDB((db) => db.credits.filter((c) => c.userId === 'u-inviter' && c.reason === 'REFERRAL'));
check('원장에 REFERRAL +3 기록', ledger.length === 1 && ledger[0].delta === 3 && ledger[0].balanceAfter === 15);
check('보상은 멱등 (두 번째 지급 없음)', (await referral.rewardReferralForInvitee('u-friend')).rewarded === false);
const summary2 = await referral.referralSummaryFor('u-inviter');
check('실적 1명 · 3컷', summary2.invited === 1 && summary2.earnedCuts === 3);

console.log('\n[4] 자기 초대 · 기존 사용자 방어');
let self: unknown = null;
try { await referral.claimReferral('u-inviter', summary.code); } catch (e) { self = e; }
check('내 코드로 나를 초대하면 SELF_REFERRAL', (self as { code?: string })?.code === 'SELF_REFERRAL');
await withDB((db) => {
  // 이미 팩을 여러 개 만든 기존 사용자
  db.packs.push({ id: 'pack-a', userId: 'u-old', sheetId: 's', tone: '2d-cute', title: 'a', size: 1, status: 'READY', creditsSpent: 1, createdAt: now, frames: [] } as never);
  db.packs.push({ id: 'pack-b', userId: 'u-old', sheetId: 's', tone: '2d-cute', title: 'b', size: 1, status: 'READY', creditsSpent: 1, createdAt: now, frames: [] } as never);
});
await referral.claimReferral('u-old', summary.code);
const skipped = await referral.rewardReferralForInvitee('u-old');
check('기존 사용자는 보상하지 않고 SKIPPED', skipped.rewarded === false && (await withDB((db) => db.referrals.find((r) => r.inviteeId === 'u-old')!.status)) === 'SKIPPED');

console.log('\n[5] 화면·API 배선');
check('초대 링크 ?ref 파라미터를 잡는 컴포넌트가 레이아웃에 있다', read('src/app/layout.tsx').includes('InviteCapture'));
check('초대 API 가 claim 을 호출', read('src/app/api/referral/route.ts').includes('claimReferral'));
check('첫 미리보기 팩 생성 시 보상 지급', read('src/app/api/packs/route.ts').includes('rewardReferralForInvitee'));
check('팩 화면에 "친구 초대하고 3컷 무료 해제" 카드', read('src/components/studio/PackViewer.tsx').includes('친구 초대하고 3컷 무료 해제'));
check('공유 링크 유입(utm)과 초대(ref)를 함께 기록', read('src/components/referral/InviteCapture.tsx').includes("get('ref')"));
check('크레딧 원장에 REFERRAL 사유', read('src/lib/types.ts').includes("| 'REFERRAL'"));

console.log(`\n친구 초대 테스트: ${passed} 통과, ${failed} 실패`);
assert.equal(failed, 0, '친구 초대 테스트 실패');
