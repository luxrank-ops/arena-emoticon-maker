// ─────────────────────────────────────────────────────────────
// 킬러 콘텐츠 2종 — 2인 케미 팩 · 반려동물 집사 밈 팩
// 실행: npx tsx scripts/test-killer-packs.ts
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.STORE_BACKEND = 'file';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'emotihak-killer-'));

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

const { PACK_FORMATS, packFormatById, formatCuts, PACK_FORMAT_IDS } = await import('../src/lib/pack-formats');
const { withDB } = await import('../src/lib/store');
const { createSheet, chooseSheet, createPack } = await import('../src/lib/packs');
const { newImageId, saveImage } = await import('../src/lib/images');
const { DEFAULT_PALETTE, DEFAULT_SIGNATURE } = await import('../src/lib/art/sticker');
const { unlockSkuForPack } = await import('../src/lib/pricing');
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

console.log('\n[1] 킬러 테마 데이터');
const duo = packFormatById('duo-chemi')!;
const pet = packFormatById('pet-meme')!;
check('2인 케미 팩 · 반려동물 집사 밈 팩이 있다', !!duo && !!pet && duo.killer === true && pet.killer === true);
check('둘 다 12컷', duo.cuts.length === 12 && pet.cuts.length === 12);
check('2인 케미는 사진 2장 · ₩7,900', duo.needsSecondPhoto === true && duo.unlockPrice === 7900);
check('반려동물은 사진 1장 · ₩6,900', pet.needsSecondPhoto === false && pet.unlockPrice === 6900);
const duoLines = duo.cuts.map((cut) => cut.line);
check('2인 상호작용 전용 대사 포함', ['퇴근 후 치맥 콜?', '야근 중 살려줘', '삐짐 vs 달래기'].every((line) => duoLines.includes(line)));
const petLines = pet.cuts.map((cut) => cut.line);
// 대사는 사람이 단톡방에 쓰는 말투 — 명령조 키워드가 아니라 감정·눈치가 담긴 문장이어야 한다.
check('집사 밈 대사 포함', ['지금 뭐 먹어?', '나 좀 봐줘', '삐졌어 건들지마', '오늘 늦게 와?', '진짜 실화야?'].every((line) => petLines.includes(line)));
check('명령조 키워드 대사는 없다', !petLines.some((line) => ['간식 내놔', '산책 가자', '집사야 일해라', '밥 줘'].includes(line)));
check('컷마다 표정·포즈·카메라 각도가 다르다', new Set(pet.cuts.map((cut) => cut.action)).size === pet.cuts.length && pet.cuts.every((cut) => /angle|camera|close-up|overhead|wide shot|from the floor/i.test(cut.action)));
check('반려동물 프롬프트가 정면 앉은 자세 반복을 막는다', /different expression, pose and camera angle/i.test(pet.prompt.scene) && /never the same straight-on sitting portrait/i.test(pet.prompt.scene));
check('모든 컷에 한글 대사·영문 대사·장면 지시', [...duo.cuts, ...pet.cuts].every((cut) => /[가-힣]/.test(cut.line) && cut.lineEn.length > 0 && cut.action.length > 20));
check('완성권 SKU 자동 선택', unlockSkuForPack('duo-chemi', 'person') === 'pack-unlock-duo' && unlockSkuForPack('pet-meme', 'pet') === 'pack-unlock-pet');
check('API 스키마 목록에 두 테마 포함', PACK_FORMAT_IDS.includes('duo-chemi') && PACK_FORMAT_IDS.includes('pet-meme'));
check('12컷 선택 시 순서·대사 유지', formatCuts('duo-chemi', 12).map((cut) => cut.line).join('|') === duoLines.join('|'));

console.log('\n[2] 팩 생성 파이프라인');
const now = new Date().toISOString();
await withDB((db) => {
  db.users.push({ id: 'u-k', name: 'k', plan: 'FREE', credits: 40, role: 'user', createdAt: now, lastGrantAt: now });
  db.faces.push({
    id: 'face-k', userId: 'u-k', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE,
    metrics: { coverage: 0.5, centering: 0.9, brightness: 0.5, sharpness: 0.9, faceDetected: true },
    consent: { at: now, version: 'v1.2', ip: '0.0.0.0', overseas: true },
    createdAt: now, purgedAt: new Date(Date.now() + 86400000).toISOString(),
  });
});
const imageId = newImageId();
await saveImage(imageId, 'u-k', new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]));
const sheet = await createSheet('u-k', 'face-k', '2d-cute', 'face', 'person', 'duo-chemi');
await withDB((db) => { db.sheets.find((s) => s.id === sheet.id)!.variants[0].imageId = imageId; });
await chooseSheet('u-k', sheet.id, 'A');
const pack = await createPack('u-k', sheet.id, 12, '2인 케미', false, undefined, 'ko');
check('12컷 템플릿이 duo-chemi 로 채워진다', pack.frames.length === 12 && pack.frames.every((frame) => frame.templateId.startsWith('fmt-duo-chemi-')));
check('컷 대사가 전용 프리셋 그대로', pack.frames.some((frame) => frame.line === '퇴근 후 치맥 콜?') && pack.frames.some((frame) => frame.line === '삐짐 vs 달래기'));
check('모든 컷에 편집 가능한 한글 레이어', pack.frames.every((frame) => /[가-힣]/.test(frame.textLayers?.[0]?.text ?? '')));
let petGuard: unknown = null;
const petSheet = await createSheet('u-k', 'face-k', '2d-cute', 'face', 'person', 'pet-meme');
await withDB((db) => { db.sheets.find((s) => s.id === petSheet.id)!.variants[0].imageId = imageId; });
await chooseSheet('u-k', petSheet.id, 'A');
try { await createPack('u-k', petSheet.id, 12, '펫', false, undefined, 'ko'); } catch (e) { petGuard = e; }
check('반려동물 팩은 반려동물 사진이 없으면 거부', (petGuard as { code?: string })?.code === 'PET_PHOTO_REQUIRED');

console.log('\n[3] 홈 · 만들기 · 프리셋 전면 배치');
const home = read('src/app/page.tsx');
check('홈에 두 킬러 테마 카드', home.includes('요즘 제일 많이 만드는 두 팩') && home.includes('/studio/upload?format=duo-chemi') && home.includes('/studio/upload?format=pet-meme&subject=pet'));
const picker = read('src/components/studio/PackFormatPicker.tsx');
check('만들기 화면 맨 위 킬러 테마 섹션', picker.includes('킬러 테마') && picker.includes('killerFormats'));
const presets = read('src/app/presets/page.tsx');
check('프리셋 화면 상단 킬러 테마 섹션', presets.includes('KILLER THEMES') && presets.includes("format.killer"));
check('업로드가 ?format=·?subject=pet 딥링크를 읽는다', read('src/components/studio/UploadFlow.tsx').includes("searchParams.get('format')") && read('src/components/studio/UploadFlow.tsx').includes("searchParams.get('subject') === 'pet'"));
check('영문 홈에도 두 킬러 테마', read('src/components/home/EnglishLanding.tsx').includes('Duo chemistry pack') && read('src/components/home/EnglishLanding.tsx').includes('Pet butler meme pack'));

console.log(`\n킬러 콘텐츠 테스트: ${passed} 통과, ${failed} 실패`);
assert.equal(failed, 0, '킬러 콘텐츠 테스트 실패');
