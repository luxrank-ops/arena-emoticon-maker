// ─────────────────────────────────────────────────────────────
// 표준 고빈도·시즌·관계 큐레이션 카탈로그 점검 (외부 호출 없음)
//  · 기본 고빈도 24컷 + 시즌 6종 + 친구/팀팩 + 기존 커플/직장인/일상팩
//  · 마스터 프리셋 ID·컷 순서·한/영 카피·표준 슬롯·12월 앵글 검증
//  · 큐레이션 ID로 생성된 팩의 대사 레이어·크레딧·12컷 미리보기 연동 검증
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

// 고정된 카탈로그 순서·마스터 프리셋 ID (콘텐츠 변경은 의도적으로 이 테스트도 갱신한다)
const EXPECTED: Record<string, number[]> = {
  'basic-high-frequency': [3, 52, 54, 50, 149, 59, 56, 67, 66, 19, 7, 21, 46, 47, 53, 55, 114, 57, 58, 62, 10, 13, 31, 17],
  'year-end': [127, 50, 48, 126, 59, 78, 79, 80, 81, 135, 89, 58, 133, 60, 62, 10, 5, 18, 17, 42, 128, 47, 2, 150],
  'new-year': [126, 134, 28, 74, 69, 60, 51, 56, 57, 133, 2, 5, 43, 128, 135, 38, 47, 48, 59, 89, 17, 19, 146, 150],
  'lunar-new-year': [126, 48, 49, 50, 40, 41, 38, 149, 60, 62, 10, 135, 80, 47, 54, 23, 17, 18, 42, 128, 133, 2, 3, 150],
  'exam-season': [69, 28, 60, 42, 71, 32, 16, 31, 133, 2, 17, 18, 40, 19, 38, 149, 56, 57, 58, 30, 23, 5, 83, 82],
  'monday-blues': [90, 66, 87, 71, 17, 19, 18, 68, 88, 49, 4, 85, 82, 31, 25, 76, 77, 23, 20, 42, 5, 67, 89, 56],
  overtime: [76, 68, 17, 66, 71, 85, 88, 25, 31, 23, 77, 79, 80, 84, 49, 4, 18, 19, 42, 67, 5, 57, 56, 147],
  'friends-group': [46, 52, 53, 3, 114, 54, 50, 56, 57, 58, 59, 40, 10, 65, 9, 22, 31, 116, 120, 125, 147, 150, 7, 30],
  'team-department': [47, 49, 51, 84, 68, 85, 88, 86, 71, 66, 76, 67, 89, 81, 56, 57, 58, 59, 50, 53, 52, 31, 23, 80],
  'office-survival': [47, 4, 49, 51, 84, 66, 71, 86, 68, 85, 88, 77, 31, 25, 23, 17, 76, 67, 78, 79, 80, 89, 81, 90],
  'couple-sweet': [46, 6, 61, 7, 62, 63, 64, 10, 65, 111, 112, 9, 8, 22, 26, 149, 117, 70, 75, 120, 113, 125, 135, 42],
  'daily-meme': [46, 52, 53, 114, 54, 50, 1, 3, 2, 143, 11, 13, 16, 18, 19, 21, 142, 145, 30, 33, 144, 36, 37, 116, 124, 56, 59, 40, 91, 96, 147, 150],
};
const EXPECTED_ORDER = [
  'basic-high-frequency', 'year-end', 'new-year', 'lunar-new-year', 'exam-season',
  'monday-blues', 'overtime', 'friends-group', 'team-department', 'office-survival', 'couple-sweet', 'daily-meme',
];
const CORE_LABELS = ['ㅋㅋ', 'ㅇㅋ', 'ㄴㄴ', '감사', '미안', '축하', '힘내', '퇴근', '출근', '멍', '심쿵', '분노'];
const CORE_LINES = ['ㅋㅋ', 'ㅇㅋ', 'ㄴㄴ', '고마워!', '미안해', '축하해!', '힘내!', '퇴근!', '출근...', '멍...', '심쿵!', '분노!'];

try {
  const pkgData = await import('../src/data/curation-packages');
  const presets = await import('../src/data/emoticon-presets-150');
  const { withDB } = await import('../src/lib/store');
  const { createSheet, chooseSheet, createPack, PackError } = await import('../src/lib/packs');
  const { newImageId, saveImage } = await import('../src/lib/images');
  const { DEFAULT_PALETTE, DEFAULT_SIGNATURE } = await import('../src/lib/art/sticker');

  // ── 1. 카탈로그 구조·순서·마스터 데이터 ───────────────────
  check('12개 큐레이션 세트', pkgData.CURATION_PACKAGES.length === 12 && pkgData.CURATION_PACKAGE_COUNT === 12);
  check('기본 → 시즌 6종 → 관계/일상 순서 고정', pkgData.CURATION_PACKAGES.map((pkg) => pkg.id).join(',') === EXPECTED_ORDER.join(','));
  check('기본 1 · 시즌 6 · 관계 4 · 일상 1', pkgData.CURATION_PACKAGES.filter((pkg) => pkg.group === 'core').length === 1
    && pkgData.CURATION_PACKAGES.filter((pkg) => pkg.group === 'season').length === 6
    && pkgData.CURATION_PACKAGES.filter((pkg) => pkg.group === 'relationship').length === 4
    && pkgData.CURATION_PACKAGES.filter((pkg) => pkg.group === 'everyday').length === 1);
  for (const pkg of pkgData.CURATION_PACKAGES) {
    const expected = EXPECTED[pkg.id];
    check(`${pkg.id}: 고정 ID 순서`, JSON.stringify(pkg.cuts.map((cut) => cut.presetId)) === JSON.stringify(expected));
    check(`${pkg.id}: 컷 수 ${expected.length}`, pkg.cuts.length === expected.length && pkg.count === expected.length);
    check(`${pkg.id}: 세트 내 프리셋 중복 없음`, new Set(pkg.cuts.map((cut) => cut.presetId)).size === pkg.cuts.length);
    check(`${pkg.id}: 모든 ID가 1~150 마스터에 존재`, pkg.cuts.every((cut) => !!presets.presetById(cut.presetId)));
    check(`${pkg.id}: presetIds 헬퍼 순서 일치`, JSON.stringify(pkgData.curationPackagePresetIds(pkg.id)) === JSON.stringify(expected));
  }
  check('24컷 11개 + 기존 일상 32컷', pkgData.CURATION_PACKAGES.filter((pkg) => pkg.count === 24).length === 11
    && pkgData.curationPackageById('daily-meme')?.count === 32);
  check('커플·친구·팀/부서 관계팩 ID 존재', ['couple-sweet', 'friends-group', 'team-department'].every((id) =>
    pkgData.curationPackageById(id)?.group === 'relationship'));
  check('패키지 ID 조회·검증', pkgData.isCurationPackageId('basic-high-frequency')
    && pkgData.isCurationPackageId('friends-group') && pkgData.isCurationPackageId('team-department')
    && pkgData.isCurationPackageId('office-survival')
    && !pkgData.isCurationPackageId('nope') && pkgData.curationPackageById('nope') === undefined);
  check('없는 패키지의 presetIds는 빈 배열', pkgData.curationPackagePresetIds('nope' as never).length === 0);
  check('기본 고빈도 슬롯 12개가 요청 순서 그대로', JSON.stringify(pkgData.curationPackageById('basic-high-frequency')!.cuts.slice(0, 12).map((cut) => cut.slot)) === JSON.stringify(pkgData.HIGH_FREQUENCY_SLOT_ORDER));
  check('기본 슬롯 표시명 12개가 요청 문자열 그대로', JSON.stringify(pkgData.curationPackageById('basic-high-frequency')!.cuts.slice(0, 12).map((cut) => cut.displayLabel)) === JSON.stringify(CORE_LABELS));
  check('기본 슬롯 출력 대사가 정규화됨', JSON.stringify(pkgData.curationPackageById('basic-high-frequency')!.cuts.slice(0, 12).map((cut) => cut.line)) === JSON.stringify(CORE_LINES));
  const yearEnd = pkgData.curationPackageById('year-end')!;
  check('연말팩은 12월 추천 + 선물·새해 앵글', yearEnd.recommendedMonth === 12
    && yearEnd.seasonalAngle!.includes('선물') && yearEnd.seasonalAngle!.includes('새해')
    && yearEnd.cuts.some((cut) => cut.presetId === 50) && yearEnd.cuts.some((cut) => cut.presetId === 126));
  const teamPack = pkgData.curationPackageById('team-department')!;
  check('팀·부서팩은 24개 업무 상황별 한/영 전용 대사', teamPack.count === 24
    && teamPack.concept.includes('인수인계')
    && teamPack.cuts.every((cut) => !!cut.line?.trim() && !!cut.lineEn?.trim() && !/[가-힣]/.test(cut.lineEn!)));

  // ── 2. 원본·카피·기획 의도 ────────────────────────────────
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
  check('표정·포즈·이펙트는 원본 150 프리셋 그대로', mismatch.length === 0);
  check('컷 순번은 1부터 연속', pkgData.CURATION_PACKAGES.every((pkg) =>
    pkgData.curationPackageCuts(pkg).every((cut, index) => cut.order === index + 1)));
  check('한/영 제목·태그라인·컨셉 채움', pkgData.CURATION_PACKAGES.every((pkg) =>
    [pkg.title, pkg.titleEn, pkg.concept, pkg.conceptEn, pkg.tagline, pkg.taglineEn].every((text) => text.trim().length > 5)));
  check('영문 제목·설명에 한글 없음', pkgData.CURATION_PACKAGES.every((pkg) =>
    ![pkg.titleEn, pkg.conceptEn, pkg.taglineEn, pkg.seasonalAngleEn ?? ''].some((text) => /[가-힣]/.test(text))));
  check('모든 컷에 한/영 사용 의도', pkgData.CURATION_PACKAGES.every((pkg) =>
    pkg.cuts.every((cut) => cut.intent.trim().length > 5 && cut.intentEn.trim().length > 5 && /[가-힣]/.test(cut.intent) && !/[가-힣]/.test(cut.intentEn))));
  check('패키지별 사용 의도는 중복 없음', pkgData.CURATION_PACKAGES.every((pkg) =>
    new Set(pkg.cuts.map((cut) => cut.intent)).size === pkg.cuts.length));
  check('기존 직장인·커플·일상 패키지 컨셉 보존', pkgData.curationPackageById('office-survival')!.concept.includes('5:5')
    && pkgData.curationPackageById('couple-sweet')!.concept.includes('삐짐')
    && pkgData.curationPackageById('daily-meme')!.concept.includes('병맛'));
  for (const pkg of pkgData.CURATION_PACKAGES) {
    const categories = pkgData.curationPackageCategories(pkg);
    check(`${pkg.id}: 카테고리 수 합계 = 컷 수`, categories.reduce((sum, item) => sum + item.count, 0) === pkg.count);
    check(`${pkg.id}: 카테고리 한/영 라벨·이모지`, categories.every((item) => item.label && item.labelEn && item.emoji && !/[가-힣]/.test(item.labelEn)));
  }

  // ── 3. 큐레이션 ID → 실제 생성 파이프라인 ─────────────────
  const now = new Date().toISOString();
  await withDB((db) => {
    db.users.push({ id: 'u-curation', name: 'curation', plan: 'FREE', credits: 1000, role: 'user', createdAt: now, lastGrantAt: now });
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
  await withDB((db) => { db.sheets.find((item) => item.id === sheet.id)!.variants[0].imageId = imageId; });
  await chooseSheet('u-curation', sheet.id, 'A');

  const created = new Map<string, Awaited<ReturnType<typeof createPack>>>();
  for (const pkg of pkgData.CURATION_PACKAGES) {
    const ids = pkgData.curationPackagePresetIds(pkg.id);
    const pack = await createPack('u-curation', sheet.id, pkg.count, pkg.title, false, undefined, 'ko', undefined, undefined, { curationPackageId: pkg.id });
    created.set(pkg.id, pack);
    check(`${pkg.id}: ${pkg.count}컷 팩 + 카탈로그 ID 저장`, pack.size === pkg.count && pack.frames.length === pkg.count && pack.curationPackageId === pkg.id);
    check(`${pkg.id}: 프레임 순서·원본 presetId 유지`, pack.frames.every((frame, index) => frame.presetId === ids[index] && frame.templateId === `preset-${ids[index]}`));
    check(`${pkg.id}: 큐레이션 대사·라벨을 프레임에 반영`, pack.frames.every((frame, index) => {
      const cut = pkg.cuts[index]!;
      const preset = presets.presetById(ids[index])!;
      return frame.line === (cut.line ?? preset.line) && frame.label === (cut.displayLabel ?? preset.keyword);
    }));
    check(`${pkg.id}: 글자 레이어가 대사와 일치`, pack.frames.every((frame) => (frame.textLayers?.length ?? 0) === 1 && frame.textLayers![0].text === frame.line));
    check(`${pkg.id}: 감정 축은 원본 프리셋 유지`, pack.frames.every((frame, index) => frame.emotion === presets.presetById(ids[index])!.emotion));
  }
  check('기본팩 12개 요청 슬롯 라벨·대사가 실제 프레임에 들어감', created.get('basic-high-frequency')!.frames.slice(0, 12).every((frame, index) =>
    frame.label === CORE_LABELS[index] && frame.line === CORE_LINES[index]));
  check('총 생성 비용은 실제 컷 수 296크레딧', (await withDB((db) => db.users.find((u) => u.id === 'u-curation')!.credits)) === 1000 - 296);

  // 12컷 미리보기는 기본 24컷 패키지의 앞 12개를 그대로 사용한다.
  const preview = await createPack('u-curation', sheet.id, 12, undefined, false, undefined, 'ko', undefined, undefined, {
    preview: true,
    curationPackageId: 'basic-high-frequency',
  });
  check('기본 고빈도 12컷 미리보기는 표준 슬롯 순서를 유지', preview.size === 12
    && preview.frames.every((frame, index) => frame.line === CORE_LINES[index])
    && preview.preview?.cuts === 12);

  // 잘못된 요청은 컷 생성 전에 거부한다.
  await assert.rejects(
    () => createPack('u-curation', sheet.id, 24, '잘못된 크기', false, undefined, 'ko', undefined, undefined, { curationPackageId: 'daily-meme' }),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_SIZE',
  );
  check('카탈로그 크기와 다른 팩 요청 거부', true);
  await assert.rejects(
    () => createPack('u-curation', sheet.id, 24, '중복 구성', false, undefined, 'ko', undefined, pkgData.curationPackagePresetIds('basic-high-frequency'), { curationPackageId: 'basic-high-frequency' }),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_PRESET_SELECTION',
  );
  check('큐레이션 패키지와 임의 프리셋 동시 전송 거부', true);
  await assert.rejects(
    () => createPack('u-curation', sheet.id, 24, '없는 패키지', false, undefined, 'ko', undefined, undefined, { curationPackageId: 'nope' }),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_CURATION_PACKAGE',
  );
  check('알 수 없는 카탈로그 ID 거부', true);

  // 기본팩의 영어 문구 override도 영문으로 유지된다.
  const enCore = await createPack('u-curation', sheet.id, 24, undefined, true, undefined, 'en', undefined, undefined, { curationPackageId: 'basic-high-frequency' });
  check('영문 기본팩 24컷 순서·대사 현지화', enCore.frames.length === 24
    && enCore.frames.every((frame) => !/[가-힣]/.test(frame.label) && !/[가-힣]/.test(frame.line) && frame.textLayers?.[0]?.text === frame.line)
    && enCore.frames[0]?.line === 'LOL' && enCore.frames[0]?.label === 'LOL');

  console.log(`\n표준 큐레이션 패키지 ${pkgData.CURATION_PACKAGE_COUNT}종: ${passed}개 통과`);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
