// ─────────────────────────────────────────────────────────────
// 카카오·라인 작가 심사 시트 — 컨셉·제목 5개·해시태그 10개·체크리스트
// 실행: npx tsx scripts/test-reviewer-sheet.ts
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const { buildReviewSheet, reviewSheetText } = await import('../src/lib/reviewer-sheet');

const input = {
  title: '나의 이모티콘 팩',
  tone: '2d-cute',
  format: 'duo-chemi',
  subjectKind: 'person' as const,
  frames: [
    { label: '퇴근 치맥 콜', line: '퇴근 후 치맥 콜?' },
    { label: '야근 살려줘', line: '야근 중 살려줘' },
    { label: '삐짐 vs 달래기', line: '삐짐 vs 달래기' },
  ],
};

console.log('\n[1] 심사 시트 초안');
const sheet = buildReviewSheet(input);
check('캐릭터 컨셉 문장이 있다', sheet.concept.length > 40 && sheet.concept.includes('2D 캐릭터'));
check('테마 이름이 컨셉에 반영', sheet.concept.includes('커플·단톡방 케미'));
check('제목 후보 정확히 5개 · 서로 다르다', sheet.titles.length === 5 && new Set(sheet.titles).size === 5);
check('해시태그 정확히 10개 · 모두 # 없이 저장', sheet.hashtags.length === 10 && sheet.hashtags.every((tag) => tag.length > 1 && !tag.startsWith('#')));
check('테마 해시태그 포함', sheet.hashtags.includes('커플이모티콘') && sheet.hashtags.includes('단톡방'));
check('제출 체크리스트에 32종·150KB 안내', sheet.checklist.some((line) => line.includes('32종')) && sheet.checklist.some((line) => line.includes('150KB')));
const again = buildReviewSheet(input);
check('같은 입력 → 같은 제목·해시태그 (결정적)', again.titles.join('|') === sheet.titles.join('|') && again.hashtags.join('|') === sheet.hashtags.join('|'));

console.log('\n[2] 반려동물 팩');
const petSheet = buildReviewSheet({ ...input, format: 'pet-meme', subjectKind: 'pet', title: '집사 밈' });
check('반려동물 컨셉', petSheet.concept.includes('반려동물') && petSheet.concept.includes('반려동물 집사 밈'));
check('반려동물 해시태그', petSheet.hashtags.includes('반려동물이모티콘') && petSheet.hashtags.includes('집사밈'));
check('집사 밈 제목 후보', petSheet.titles.some((title) => title.includes('집사')));

console.log('\n[3] 내보내기 · 화면');
const text = reviewSheetText(sheet);
check('텍스트에 컨셉·제목·해시태그·체크리스트', text.includes('캐릭터 컨셉') && text.includes('해시태그') && text.includes('제출 전 체크리스트'));
const exporter = read('src/lib/export.ts');
check('카카오 ZIP 에 review-sheet.txt·json 을 넣는다', exporter.includes("'review-sheet.txt'") && exporter.includes("'review-sheet.json'"));
check('Creator Pro 내보내기 옵션으로 심사 시트를 받는다', exporter.includes('reviewSheet?:'));
const viewer = read('src/components/studio/PackViewer.tsx');
check('팩 화면에 심사 시트 카드', viewer.includes('작가 심사 시트') && viewer.includes('reviewSheet'));
const page = read('src/app/studio/pack/[id]/page.tsx');
check('Creator Pro 에게만 심사 시트를 만든다', page.includes("plan === 'STUDIO'") && page.includes('buildReviewSheet'));

console.log(`\n심사 시트 테스트: ${passed} 통과, ${failed} 실패`);
assert.equal(failed, 0, '심사 시트 테스트 실패');
