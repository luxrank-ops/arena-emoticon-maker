// ─────────────────────────────────────────────────────────────
// 3대 큐레이션 패키지 점검 (외부 호출 없음)
//  · 직장인 생존 24 · 달달 꽁냥 커플 24 · 만능 일상 & 병맛 티키타카 32
//  · 사용자가 지정한 순번·마스터 ID 가 그대로인지 (순서 일치·중복 없음)
//  · emoticon-presets-150.ts 원본과 대사·표정·포즈·이펙트 100% 일치
//  · 기획 의도 문구(한/영) — 영문에 한글 없음
//  · 패키지 → 팩 생성 연동 (24컷·32컷, 순서대로 presetIds·컷 템플릿·글자 레이어)
// 실행: npm run test:curation
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-curation-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}

// 사용자가 지정한 순서 (이 배열과 100% 같아야 한다)
const EXPECTED: Record<string, number[]> = {
  'office-survival': [47, 4, 49, 51, 84, 66, 71, 86, 68, 85, 88, 77, 31, 25, 23, 17, 76, 67, 78, 79, 80, 89, 81, 90],
  'couple-sweet': [46, 6, 61, 7, 62, 63, 64, 10, 65, 111, 112, 9, 8, 22, 26, 149, 117, 70, 75, 120, 113, 125, 135, 42],
  'daily-meme': [46, 52, 53, 114, 54, 50, 1, 3, 2, 143, 11, 13, 16, 18, 19, 21, 142, 145, 30, 33, 144, 36, 37, 116, 124, 56, 59, 40, 91, 96, 147, 150],
};

try {
  const pkgData = await import('../src/data/curation-packages');
  const presets = await import('../src/data/emoticon-presets-150');
  const { withDB } = await import('../src/lib/store');
  const { createSheet, chooseSheet, createPack, PackError } = await import('../src/lib/packs');
  const { newImageId, saveImage } = await import('../src/lib/images');
  const { DEFAULT_PALETTE, DEFAULT_SIGNATURE } = await import('../src/lib/art/sticker');

  // ── 1. 패키지 구조·ID 무결성 ─────────────────────────────
  check('패키지 3종', pkgData.CURATION_PACKAGES.length === 3 && pkgData.CURATION_PACKAGE_COUNT === 3);
  check('패키지 id 순서 고정', pkgData.CURATION_PACKAGES.map((pkg) => pkg.id).join(',') === 'office-survival,couple-sweet,daily-meme');
  for (const pkg of pkgData.CURATION_PACKAGES) {
    const expected = EXPECTED[pkg.id];
    check(`${pkg.id}: 지정 ID 순서 그대로`, JSON.stringify(pkg.cuts.map((cut) => cut.presetId)) === JSON.stringify(expected));
    check(`${pkg.id}: 컷 수 ${expected.length}`, pkg.cuts.length === expected.length && pkg.count === expected.length);
    check(`${pkg.id}: 중복 없음`, new Set(pkg.cuts.map((cut) => cut.presetId)).size === pkg.cuts.length);
    check(`${pkg.id}: 모든 ID 가 1~150 원본에 존재`, pkg.cuts.every((cut) => !!presets.presetById(cut.presetId)));
    check(`${pkg.id}: curationPackagePresetIds 일치`, JSON.stringify(pkgData.curationPackagePresetIds(pkg.id)) === JSON.stringify(expected));
  }
  check('24·24·32 구성', pkgData.CURATION_PACKAGES.map((pkg) => pkg.count).join(',') === '24,24,32');
  check('curationPackageById · isCurationPackageId', pkgData.curationPackageById('daily-meme')?.count === 32
    && pkgData.isCurationPackageId('office-survival') && !pkgData.isCurationPackageId('nope') && pkgData.curationPackageById('nope') === undefined);
  check('없는 패키지의 presetIds 는 빈 배열', pkgData.curationPackagePresetIds('nope' as never).length === 0);

  // ── 2. 원본 150종과 100% 일치 ────────────────────────────
  const mismatch: string[] = [];
  for (const pkg of pkgData.CURATION_PACKAGES) {
    for (const cut of pkgData.curationPackageCuts(pkg)) {
      const source = presets.PRESET_SOURCE[cut.presetId - 1];
      const same = source
        && source.id === cut.preset.id
        && source.category === cut.preset.category
        && source.keyword === cut.preset.keyword
        && source.expression === cut.preset.expression
        && source.pose === cut.preset.pose
        && source.effect === cut.preset.effect
        && source.dialogue === cut.preset.dialogue;
      if (!same) mismatch.push(`${pkg.id}#${cut.order}(${cut.presetId})`);
    }
  }
  check('컷의 표정·포즈·이펙트·대사가 원본과 100% 일치', mismatch.length === 0);
  check('직장인 1번 = 90도 폴더 인사(47)', presets.presetById(EXPECTED['office-survival'][0])!.keyword === '90도 폴더 인사'
    && presets.presetById(EXPECTED['office-survival'][0])!.dialogue === '안녕하세요 / 꾸벅');
  check('커플 24번(42) = 졸림/굿나잇', presets.presetById(EXPECTED['couple-sweet'][23])!.keyword === '졸림 / 비몽사몽');
  check('일상·병맛 32번(150) = 엔딩/퇴장 인사', presets.presetById(EXPECTED['daily-meme'][31])!.dialogue === '이만총총 / 다음에봐!');
  check('화면용 컷은 순번 1부터 연속', pkgData.CURATION_PACKAGES.every((pkg) =>
    pkgData.curationPackageCuts(pkg).every((cut, index) => cut.order === index + 1)));

  // ── 3. 제목·컨셉·기획 의도 문구 ──────────────────────────
  check('한/영 제목·컨셉·태그라인 모두 채워짐', pkgData.CURATION_PACKAGES.every((pkg) =>
    [pkg.title, pkg.titleEn, pkg.concept, pkg.conceptEn, pkg.tagline, pkg.taglineEn].every((text) => text.trim().length > 5)));
  check('영문 제목·컨셉에 한글 없음', pkgData.CURATION_PACKAGES.every((pkg) =>
    ![pkg.titleEn, pkg.conceptEn, pkg.taglineEn].some((text) => /[가-힣]/.test(text))));
  check('모든 컷에 기획 의도(한/영)', pkgData.CURATION_PACKAGES.every((pkg) =>
    pkg.cuts.every((cut) => cut.intent.trim().length > 5 && cut.intentEn.trim().length > 5 && /[가-힣]/.test(cut.intent) && !/[가-힣]/.test(cut.intentEn))));
  check('기획 의도는 컷마다 다름', pkgData.CURATION_PACKAGES.every((pkg) =>
    new Set(pkg.cuts.map((cut) => cut.intent)).size === pkg.cuts.length));
  check('컨셉 문구가 사용자 지정과 일치', pkgData.curationPackageById('office-survival')!.concept.includes('5:5')
    && pkgData.curationPackageById('couple-sweet')!.concept.includes('삐짐')
    && pkgData.curationPackageById('daily-meme')!.concept.includes('병맛'));

  // ── 4. 패키지 내부 카테고리 집계 ─────────────────────────
  for (const pkg of pkgData.CURATION_PACKAGES) {
    const categories = pkgData.curationPackageCategories(pkg);
    check(`${pkg.id}: 카테고리 합계 = 컷 수`, categories.reduce((sum, item) => sum + item.count, 0) === pkg.count);
    check(`${pkg.id}: 카테고리 라벨·이모지 채워짐`, categories.every((item) => item.label && item.labelEn && item.emoji && !/[가-힣]/.test(item.labelEn)));
  }

  // ── 5. 패키지 → 팩 생성 연동 ─────────────────────────────
  const now = new Date().toISOString();
  await withDB((db) => {
    db.users.push({ id: 'u-curation', name: 'curation', plan: 'FREE', credits: 200, role: 'user', createdAt: now, lastGrantAt: now });
    db.faces.push({
      id: 'face-curation',
      userId: 'u-curation',
      palette: DEFAULT_PALETTE,
      signature: DEFAULT_SIGNATURE,
      metrics: { coverage: 0.5, centering: 0.9, brightness: 0.5, sharpness: 0.9, faceDetected: true },
      consent: { at: now, version: 'v1.2', ip: '0.0.0.0', overseas: true },
      createdAt: now,
      purgedAt: new Date(Date.now() + 86400000).toISOString(),
    });
  });
  const imageId = newImageId();
  await saveImage(imageId, 'u-curation', new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]));
  const sheet = await createSheet('u-curation', 'face-curation', '2d-cute', 'face', 'person');
  await withDB((db) => {
    db.sheets.find((item) => item.id === sheet.id)!.variants[0].imageId = imageId;
  });
  await chooseSheet('u-curation', sheet.id, 'A');

  for (const pkg of pkgData.CURATION_PACKAGES) {
    const ids = pkgData.curationPackagePresetIds(pkg.id);
    const pack = await createPack('u-curation', sheet.id, pkg.count, pkg.title, false, undefined, 'ko', undefined, ids);
    check(`${pkg.id}: ${pkg.count}컷 팩 생성`, pack.size === pkg.count && pack.frames.length === pkg.count);
    check(`${pkg.id}: 컷 순서 = 패키지 순서`, pack.frames.every((frame, index) => frame.presetId === ids[index]));
    check(`${pkg.id}: 컷 템플릿·대사가 원본`, pack.frames.every((frame, index) => {
      const preset = presets.presetById(ids[index])!;
      return frame.templateId === `preset-${preset.id}` && frame.line === preset.line && frame.label === preset.keyword;
    }));
    check(`${pkg.id}: 글자 레이어가 컷마다 1개`, pack.frames.every((frame) => (frame.textLayers?.length ?? 0) === 1));
    check(`${pkg.id}: 첫 컷 레이어 대사`, pack.frames[0].textLayers![0].text === presets.presetById(ids[0])!.line);
    check(`${pkg.id}: 감정 축이 원본과 동일`, pack.frames.every((frame, index) => frame.emotion === presets.presetById(ids[index])!.emotion));
  }
  check('크레딧이 패키지 컷 수만큼 차감', (await withDB((db) => db.users.find((u) => u.id === 'u-curation')!.credits)) === 200 - 24 - 24 - 32);

  // 컷 수와 다른 presetIds 는 거부
  await assert.rejects(
    () => createPack('u-curation', sheet.id, 24, '수 불일치', false, undefined, 'ko', undefined, pkgData.curationPackagePresetIds('daily-meme').slice(0, 23)),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_PRESET_SELECTION',
  );
  check('컷 수와 다른 presetIds 는 거부', true);

  // 영문 팩에서도 순서 유지 + 영문 대사
  const enPack = await createPack('u-curation', sheet.id, 24, 'Office', false, undefined, 'en', undefined, pkgData.curationPackagePresetIds('office-survival'));
  check('영문 팩도 무결성 유지', enPack.frames.length === 24
    && enPack.frames.every((frame, index) => frame.presetId === EXPECTED['office-survival'][index])
    && !/[가-힣]/.test(enPack.frames[0].textLayers![0].text));

  console.log(`\n큐레이션 패키지 3종: ${passed}개 통과`);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
