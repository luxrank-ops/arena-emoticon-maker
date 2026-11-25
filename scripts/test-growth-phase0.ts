// ─────────────────────────────────────────────────────────────
// Phase 0 그로스 — 웨이트리스트·초대 UI·채널 랜딩 테스트
// 실행: npx tsx scripts/test-growth-phase0.ts
//  · 공유 OG(sharp 합성) 라우트는 Cloudflare Workers(vinext) 호환 문제로 이식하지 않았다.
//    정적 OG 이미지(/og/emotihak-og.png)만 존재하는지 확인한다.
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.STORE_BACKEND = 'file';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'emotihak-growth0-'));

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

const { withDB } = await import('../src/lib/store');
const waitlist = await import('../src/lib/waitlist');
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
assert.ok(read);

console.log('\n[1] 웨이트리스트 등록·카운터');
const r1 = await waitlist.joinWaitlist({ email: '  Friend@Example.com ', utm: { source: 'instagram', medium: 'reels', campaign: 'launch1207' } });
check('첫 등록 created=true', r1.created === true);
check('total=1', r1.total === 1);
check('카운터 1', (await waitlist.waitlistCount()) === 1);

console.log('\n[2] 중복·정규화·검증');
const r2 = await waitlist.joinWaitlist({ email: 'friend@example.com' });
check('대소문자 변형 중복도 조용히 성공', r2.ok === true && r2.created === false);
check('카운터 그대로 1', (await waitlist.waitlistCount()) === 1);
let invalid: unknown = null;
try { await waitlist.joinWaitlist({ email: 'not-an-email' }); } catch (e) { invalid = e; }
check('잘못된 이메일은 INVALID_EMAIL', (invalid as { code?: string })?.code === 'INVALID_EMAIL');
const stored = await withDB((db) => db.waitlist[0]);
check('이메일 소문자 정규화 저장', stored.email === 'friend@example.com');
check('UTM 스냅샷 저장', stored.utm?.source === 'instagram' && stored.utm?.campaign === 'launch1207');
check('emailHash 64자리', /^[a-f0-9]{64}$/.test(stored.emailHash));
check('이메일 원문은 해시와 분리 저장', stored.emailHash !== stored.email);

console.log('\n[3] 초대 코드·채널 집계');
await waitlist.joinWaitlist({ email: 'b@test.co', refCode: 'AB12cd34', utm: { source: 'blog', medium: 'post', campaign: 'pets' } });
const storedB = await withDB((db) => db.waitlist.find((r) => r.email === 'b@test.co'));
check('refCode 소문자 정규화', storedB?.refCode === 'ab12cd34');
const bySource = await waitlist.waitlistBySource();
check('채널 집계 2건', bySource.length === 2 && bySource.every((r) => r.count === 1));
check('집계에 이메일 없음', JSON.stringify(bySource).includes('@') === false);

console.log('\n[4] 페이지·API 파일 존재');
for (const f of [
  'src/app/waitlist/page.tsx',
  'src/components/waitlist/WaitlistForm.tsx',
  'src/app/api/waitlist/route.ts',
  'src/app/invite/page.tsx',
  'src/components/referral/InvitePanel.tsx',
  'src/app/pets/page.tsx',
  'src/app/couple/page.tsx',
  'src/app/team/page.tsx',
  'src/components/landing/ChannelLanding.tsx',
  'public/og/emotihak-og.png',
]) {
  check(f, existsSync(join(process.cwd(), f)));
}
check('sharp 미사용 (vinext 비호환 라우트 없음)', existsSync(join(process.cwd(), 'src/app/api/share/[token]/og/route.ts')) === false);

console.log('\n[5] 그로스 연결 정합성');
check('초대 페이지는 기존 referral 서버 사용', read('src/app/invite/page.tsx').includes('referralSummaryFor'));
check('웨이트리스트 API rate limit', read('src/app/api/waitlist/route.ts').includes('enforceRateLimit'));
check('푸터에 사전예약·초대 링크', read('src/components/SiteFooter.tsx').includes('/waitlist') && read('src/components/SiteFooter.tsx').includes('/invite'));
const sitemap = read('public/sitemap.xml');
for (const path of ['/waitlist', '/invite', '/pets', '/couple', '/team']) {
  check(`사이트맵 ${path}`, sitemap.includes(`https://emotihak.com${path}<`));
}
for (const [file, kw] of [['src/app/pets/page.tsx', '강아지 이모티콘'], ['src/app/couple/page.tsx', '커플 이모티콘'], ['src/app/team/page.tsx', '팀 단톡']] as const) {
  check(`${file} SEO 키워드`, read(file).includes(kw));
}

console.log('\n[6] 판매 단위·가격 정합성 (12컷 미리보기 + 단건 잠금 해제)');
const { SKUS } = await import('../src/lib/pricing');
check('2인 케미 완성권 7,900원', SKUS['pack-unlock-duo']?.price === 7900);
check('반려동물 완성권 6,900원', SKUS['pack-unlock-pet']?.price === 6900);
for (const file of ['src/app/pets/page.tsx', 'src/app/couple/page.tsx', 'src/app/team/page.tsx', 'src/app/waitlist/page.tsx']) {
  check(`${file} 24컷 약속 없음`, read(file).includes('24컷') === false);
}
check('반려 FAQ 가격 6,900원', read('src/app/pets/page.tsx').includes('6,900원'));
check('커플 FAQ 가격 7,900원', read('src/app/couple/page.tsx').includes('7,900원'));
check('실물 굿즈 약속 없음(준비 중)', read('src/app/couple/page.tsx').includes('포토카드') === false);

console.log(`\n통과 ${passed} · 실패 ${failed}`);
if (failed > 0) process.exit(1);
