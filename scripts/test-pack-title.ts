// ─────────────────────────────────────────────────────────────
// 팩 제목 컷 수 정합성 테스트 (외부 호출 없음)
//  · 무료 12컷 미리보기가 24컷 큐레이션 제목("기본 고빈도 24컷")을 물려받지 않는지
//  · 저장 시점(createPack)과 표시 시점(packDisplayTitle) 모두에서 실제 컷 수로 보이는지
// 실행: npm run test:pack-title
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-pack-title-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}

try {
  const { curationTitleForSize, packDisplayTitle } = await import('../src/lib/pack-title');
  const { withDB } = await import('../src/lib/store');
  const { createSheet, chooseSheet, createPack } = await import('../src/lib/packs');
  const { newImageId, saveImage } = await import('../src/lib/images');
  const { DEFAULT_PALETTE, DEFAULT_SIGNATURE } = await import('../src/lib/art/sticker');

  console.log('[1] 제목의 컷 수 표기 바꾸기');
  check('한국어 24컷 → 12컷', curationTitleForSize('기본 고빈도 24컷', 24, 12, 'ko') === '기본 고빈도 12컷');
  check('영어 24 → 12', curationTitleForSize('Everyday High-Frequency 24', 24, 12, 'en') === 'Everyday High-Frequency 12');
  check('컷 수가 같으면 원문 유지', curationTitleForSize('기본 고빈도 24컷', 24, 24, 'ko') === '기본 고빈도 24컷');
  check('제목에 컷 수가 없으면 뒤에 붙인다(ko)', curationTitleForSize('직장인 생존 패키지', 24, 12, 'ko') === '직장인 생존 패키지 · 12컷');
  check('제목에 숫자가 없으면 뒤에 붙인다(en)', curationTitleForSize('Office Survival Pack', 24, 12, 'en') === 'Office Survival Pack · 12 cuts');
  check('원본과 다른 컷 수(32컷 패키지)도 12컷으로', curationTitleForSize('만능 일상 & 병맛 티키타카 패키지', 32, 12, 'ko') === '만능 일상 & 병맛 티키타카 패키지 · 12컷');

  console.log('[2] 화면 표시 제목(이미 저장된 팩 포함)');
  check('저장된 제목이 24컷이어도 12컷 팩이면 12컷으로 보인다', packDisplayTitle({ title: '기본 고빈도 24컷', size: 12, curationPackageId: 'basic-high-frequency' }, 'ko') === '기본 고빈도 12컷');
  check('영문 저장 제목도 12로 보인다', packDisplayTitle({ title: 'Everyday High-Frequency 24', size: 12, curationPackageId: 'basic-high-frequency' }, 'en') === 'Everyday High-Frequency 12');
  check('24컷 팩은 그대로', packDisplayTitle({ title: '기본 고빈도 24컷', size: 24, curationPackageId: 'basic-high-frequency' }, 'ko') === '기본 고빈도 24컷');
  check('사용자 지정 제목은 건드리지 않는다', packDisplayTitle({ title: '내 생일 팩', size: 12, curationPackageId: 'basic-high-frequency' }, 'ko') === '내 생일 팩');
  check('큐레이션 팩이 아니면 그대로', packDisplayTitle({ title: '나의 이모티콘 팩', size: 12 }, 'ko') === '나의 이모티콘 팩');
  check('관계 패키지 12컷 미리보기도 컷 수를 밝힌다', packDisplayTitle({ title: '직장인 생존 패키지', size: 12, curationPackageId: 'office-survival' }, 'ko') === '직장인 생존 패키지 · 12컷');

  console.log('[3] 실제 생성 경로 — 12컷 무료 미리보기 팩 제목');
  const now = new Date().toISOString();
  await withDB((db) => {
    db.users.push({ id: 'u-title', name: 'title', plan: 'FREE', credits: 1000, role: 'user', createdAt: now, lastGrantAt: now });
    db.faces.push({
      id: 'face-title',
      userId: 'u-title',
      palette: DEFAULT_PALETTE,
      signature: DEFAULT_SIGNATURE,
      metrics: { coverage: 0.5, centering: 0.9, brightness: 0.5, sharpness: 0.9, faceDetected: true },
      consent: { at: now, version: 'v1.2', ip: '0.0.0.0', overseas: true },
      createdAt: now,
      purgedAt: new Date(Date.now() + 86400000).toISOString(),
    });
  });
  const imageId = newImageId();
  await saveImage(imageId, 'u-title', new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]));
  const sheet = await createSheet('u-title', 'face-title', '2d-cute', 'face', 'person');
  await withDB((db) => { db.sheets.find((item) => item.id === sheet.id)!.variants[0].imageId = imageId; });
  await chooseSheet('u-title', sheet.id, 'A');

  const preview = await createPack('u-title', sheet.id, 12, undefined, false, undefined, 'ko', undefined, undefined, {
    preview: true,
    curationPackageId: 'basic-high-frequency',
  });
  check('무료 12컷 미리보기 제목은 "기본 고빈도 12컷"', preview.title === '기본 고빈도 12컷');
  check('컷은 12장이고 0크레딧', preview.frames.length === 12 && preview.creditsSpent === 0 && preview.preview?.cuts === 12);

  const enPreview = await createPack('u-title', sheet.id, 12, undefined, false, undefined, 'en', undefined, undefined, {
    preview: true,
    curationPackageId: 'basic-high-frequency',
  });
  check('영문 미리보기 제목은 "Everyday High-Frequency 12"', enPreview.title === 'Everyday High-Frequency 12');

  const full = await createPack('u-title', sheet.id, 24, undefined, false, undefined, 'ko', undefined, undefined, {
    curationPackageId: 'basic-high-frequency',
  });
  check('24컷 정식 팩 제목은 "기본 고빈도 24컷" 그대로', full.title === '기본 고빈도 24컷' && full.frames.length === 24);

  const custom = await createPack('u-title', sheet.id, 24, '내가 붙인 이름', false, undefined, 'ko', undefined, undefined, {
    curationPackageId: 'basic-high-frequency',
  });
  check('직접 붙인 제목은 그대로 저장', custom.title === '내가 붙인 이름');

  console.log(`\n✔ pack title tests passed (${passed})`);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
